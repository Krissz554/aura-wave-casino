-- Comprehensive Fix for All Level/XP Functions
-- This script updates ALL database functions to use user_level_stats table

-- 1. Fix Level Daily Cases Functions
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
    reward_amount := case_record.level_required * 0.5;
    
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
        VALUES (user_uuid, level_req, 'level', false)
        ON CONFLICT (user_id, level_required) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix Admin User Function (if it exists)
-- Check if the function exists first and update it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_users_admin') THEN
        -- Update the admin function to use user_level_stats
        CREATE OR REPLACE FUNCTION public.get_all_users_admin()
        RETURNS TABLE (
            id UUID,
            email TEXT,
            username TEXT,
            level INTEGER,
            xp INTEGER,
            balance NUMERIC,
            total_wagered NUMERIC,
            created_at TIMESTAMPTZ,
            last_seen TIMESTAMPTZ
        ) AS $$
        BEGIN
            -- Return all users with level data from user_level_stats
            RETURN QUERY
            SELECT 
                p.id,
                au.email,
                p.username,
                COALESCE(uls.current_level, 1) as level,
                COALESCE(uls.current_level_xp, 0) as xp,
                p.balance,
                p.total_wagered,
                p.created_at,
                au.last_sign_in_at as last_seen
            FROM public.profiles p
            LEFT JOIN auth.users au ON au.id = p.id
            LEFT JOIN public.user_level_stats uls ON uls.user_id = p.id
            ORDER BY p.created_at DESC;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        RAISE NOTICE 'Updated get_all_users_admin function to use user_level_stats';
    ELSE
        RAISE NOTICE 'get_all_users_admin function does not exist, skipping';
    END IF;
END $$;

-- 3. Ensure all users have user_level_stats records
INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level)
SELECT 
    p.id,
    1,   -- Default level
    0,   -- Default lifetime XP
    0,   -- Default current level XP
    100  -- Default XP to next level
FROM public.profiles p
WHERE p.id NOT IN (SELECT user_id FROM public.user_level_stats WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Verification
SELECT 'All level/XP functions updated successfully!' as status;

SELECT 
    COUNT(*) as total_profiles,
    (SELECT COUNT(*) FROM public.user_level_stats) as total_level_stats,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM public.user_level_stats) 
        THEN 'All users have level stats ✅'
        ELSE 'Some users missing level stats ❌'
    END as level_stats_status
FROM public.profiles;