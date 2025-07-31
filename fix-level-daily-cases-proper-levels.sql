-- Fix Level Daily Cases to Only Create Proper Level Cases
-- This fixes cases appearing for levels like 18, 28, 38 instead of just 10, 20, 30, etc.

-- 1. Clean up incorrect level cases first
DELETE FROM public.level_daily_cases 
WHERE level_required % 10 != 0;

-- 2. Update the initialize_level_daily_cases function to only create proper level cases
CREATE OR REPLACE FUNCTION public.initialize_level_daily_cases(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    level_req INTEGER;
    user_current_level INTEGER;
    max_case_level INTEGER;
BEGIN
    -- Get user's current level from user_level_stats
    SELECT COALESCE(current_level, 1) INTO user_current_level
    FROM public.user_level_stats
    WHERE user_id = user_uuid;
    
    -- If no level stats found, default to level 1
    IF user_current_level IS NULL THEN
        user_current_level := 1;
    END IF;
    
    -- Calculate the highest case level the user should have access to
    -- Cases are available for levels 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
    max_case_level := (user_current_level / 10) * 10;
    
    -- Only create cases for levels 10, 20, 30, etc. up to user's level
    FOR level_req IN 10..max_case_level BY 10 LOOP
        INSERT INTO public.level_daily_cases (user_id, level_required, case_type, is_available)
        VALUES (user_uuid, level_req, 'level', true)
        ON CONFLICT (user_id, level_required) DO NOTHING;
    END LOOP;
    
    -- Create future level cases (not available yet) up to level 100
    FOR level_req IN (max_case_level + 10)..100 BY 10 LOOP
        INSERT INTO public.level_daily_cases (user_id, level_required, case_type, is_available)
        VALUES (user_uuid, level_req, 'level', false) -- Not available until user reaches level
        ON CONFLICT (user_id, level_required) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update the get_user_level_daily_cases function to ensure availability logic is correct
CREATE OR REPLACE FUNCTION public.get_user_level_daily_cases(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    level_required INTEGER,
    is_available BOOLEAN,
    last_reset_date DATE,
    user_level INTEGER
) AS $$
DECLARE
    user_current_level INTEGER;
BEGIN
    -- Get user's current level
    SELECT COALESCE(current_level, 1) INTO user_current_level
    FROM public.user_level_stats
    WHERE user_id = user_uuid;
    
    -- First, ensure all cases exist for this user
    PERFORM public.initialize_level_daily_cases(user_uuid);
    
    -- Reset cases if needed
    PERFORM public.reset_daily_cases();
    
    -- Update case availability based on user's current level
    UPDATE public.level_daily_cases
    SET is_available = (level_required <= user_current_level AND last_reset_date < CURRENT_DATE)
    WHERE user_id = user_uuid;
    
    -- Return cases with user's current level from user_level_stats
    RETURN QUERY
    SELECT 
        ldc.id,
        ldc.level_required,
        (ldc.level_required <= user_current_level AND ldc.last_reset_date < CURRENT_DATE) as is_available,
        ldc.last_reset_date,
        user_current_level AS user_level
    FROM public.level_daily_cases ldc
    WHERE ldc.user_id = user_uuid
    AND ldc.level_required % 10 = 0  -- Only return cases for levels that are multiples of 10
    ORDER BY ldc.level_required;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Clean up any existing incorrect cases for all users
DELETE FROM public.level_daily_cases 
WHERE level_required % 10 != 0 
OR level_required > 100 
OR level_required < 10;

-- 5. Reinitialize cases for all existing users to ensure consistency
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM public.level_daily_cases
    LOOP
        PERFORM public.initialize_level_daily_cases(user_record.user_id);
    END LOOP;
    
    RAISE NOTICE 'Reinitialized level daily cases for all users';
END $$;

-- 6. Verification
SELECT 'Level daily cases fixed - only proper levels now exist' as status;

SELECT 
    'Available level cases:' as info,
    array_agg(DISTINCT level_required ORDER BY level_required) as available_levels
FROM public.level_daily_cases;

SELECT 
    level_required,
    COUNT(*) as user_count
FROM public.level_daily_cases
GROUP BY level_required
ORDER BY level_required;