-- Fix Level Daily Cases Functions
-- This script updates all RPC functions to use user_level_stats table instead of profiles.level

-- 1. Update the get_user_level_daily_cases function
CREATE OR REPLACE FUNCTION public.get_user_level_daily_cases(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    level_required INTEGER,
    is_available BOOLEAN,
    last_reset_date DATE,
    user_level INTEGER
) AS $$
BEGIN
    -- First, ensure all cases exist for this user
    PERFORM public.initialize_level_daily_cases(user_uuid);
    
    -- Reset cases if needed
    PERFORM public.reset_daily_cases();
    
    -- Return cases with user's current level from user_level_stats
    RETURN QUERY
    SELECT 
        ldc.id,
        ldc.level_required,
        ldc.is_available,
        ldc.last_reset_date,
        COALESCE(uls.current_level, 1) AS user_level
    FROM public.level_daily_cases ldc
    LEFT JOIN public.user_level_stats uls ON uls.user_id = user_uuid
    WHERE ldc.user_id = user_uuid
    ORDER BY ldc.level_required;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the open_level_daily_case function
CREATE OR REPLACE FUNCTION public.open_level_daily_case(case_id UUID, user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    case_record RECORD;
    user_level INTEGER;
    reward_amount DECIMAL(10,2);
    result JSON;
BEGIN
    -- Get case details and user level from user_level_stats
    SELECT 
        ldc.*,
        COALESCE(uls.current_level, 1) as level
    INTO case_record
    FROM public.level_daily_cases ldc
    LEFT JOIN public.user_level_stats uls ON uls.user_id = user_uuid
    WHERE ldc.id = case_id AND ldc.user_id = user_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Case not found';
    END IF;
    
    user_level := case_record.level;
    
    -- Check if user meets level requirement
    IF user_level < case_record.level_required THEN
        RAISE EXCEPTION 'User level % is below required level %', user_level, case_record.level_required;
    END IF;
    
    -- Check if case is available
    IF NOT case_record.is_available THEN
        RAISE EXCEPTION 'Case is not available today';
    END IF;
    
    -- Calculate reward based on level requirement
    reward_amount := case_record.level_required * 0.5; -- $0.50 per level requirement
    
    -- Mark case as used for today
    UPDATE public.level_daily_cases 
    SET is_available = FALSE,
        last_reset_date = CURRENT_DATE
    WHERE id = case_id;
    
    -- Add reward to user's balance
    UPDATE public.profiles 
    SET balance = balance + reward_amount
    WHERE id = user_uuid;
    
    -- Create case reward record
    INSERT INTO public.case_rewards (user_id, level_unlocked, rarity, reward_amount, case_type)
    VALUES (user_uuid, case_record.level_required, 'common', reward_amount, 'level');
    
    -- Return result
    result := json_build_object(
        'success', true,
        'reward_amount', reward_amount,
        'level_required', case_record.level_required,
        'case_id', case_id
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update the initialize_level_daily_cases function
CREATE OR REPLACE FUNCTION public.initialize_level_daily_cases(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    level_req INTEGER;
    user_current_level INTEGER;
BEGIN
    -- Get user's current level from user_level_stats
    SELECT COALESCE(current_level, 1) INTO user_current_level
    FROM public.user_level_stats
    WHERE user_id = user_uuid;
    
    -- If no level stats found, default to level 1
    IF user_current_level IS NULL THEN
        user_current_level := 1;
    END IF;
    
    -- Create cases for levels 10, 20, 30, etc. up to user's current level
    FOR level_req IN 10..user_current_level BY 10 LOOP
        INSERT INTO public.level_daily_cases (user_id, level_required, case_type, is_available)
        VALUES (user_uuid, level_req, 'level', true)
        ON CONFLICT (user_id, level_required) DO NOTHING;
    END LOOP;
    
    -- Also ensure cases exist for some future levels (in case user levels up)
    FOR level_req IN (user_current_level + 10)..(user_current_level + 50) BY 10 LOOP
        INSERT INTO public.level_daily_cases (user_id, level_required, case_type, is_available)
        VALUES (user_uuid, level_req, 'level', false) -- Not available until user reaches level
        ON CONFLICT (user_id, level_required) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Verify the functions are working
SELECT 'Level daily cases functions updated successfully' as status;

-- Test the functions (optional - you can run this to verify)
-- SELECT * FROM get_user_level_daily_cases('your-user-id-here');