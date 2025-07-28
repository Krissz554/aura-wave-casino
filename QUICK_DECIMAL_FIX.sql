-- ===================================================
-- QUICK DECIMAL FIX - Update Table to Support Decimals
-- ===================================================
-- Simpler approach: Just update table structure first and test

-- ===================================================
-- STEP 1: Update profiles table to support decimal XP
-- ===================================================

-- Update all XP columns to support 3 decimal places
ALTER TABLE public.profiles 
  ALTER COLUMN lifetime_xp TYPE NUMERIC(15,3),
  ALTER COLUMN current_xp TYPE NUMERIC(15,3),
  ALTER COLUMN total_xp TYPE NUMERIC(15,3),
  ALTER COLUMN xp TYPE NUMERIC(15,3);

-- ===================================================
-- STEP 2: Test if existing functions work with decimals
-- ===================================================

-- Test if we can add decimal XP directly to a user
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users
DO $$
DECLARE
    test_user_id uuid;
    old_xp NUMERIC(15,3);
    new_xp NUMERIC(15,3);
BEGIN
    -- Get the first user with XP > 0 for testing
    SELECT id INTO test_user_id 
    FROM public.profiles 
    WHERE lifetime_xp > 0 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Get current XP
        SELECT lifetime_xp INTO old_xp 
        FROM public.profiles 
        WHERE id = test_user_id;
        
        RAISE NOTICE 'Testing decimal XP update for user: %', test_user_id;
        RAISE NOTICE 'Current XP: %', old_xp;
        
        -- Add 0.123 XP directly to test decimal precision
        UPDATE public.profiles 
        SET 
            lifetime_xp = lifetime_xp + 0.123,
            total_xp = total_xp + 0.123,
            xp = xp + 0.123,
            updated_at = now()
        WHERE id = test_user_id;
        
        -- Get new XP
        SELECT lifetime_xp INTO new_xp 
        FROM public.profiles 
        WHERE id = test_user_id;
        
        RAISE NOTICE 'New XP after +0.123: %', new_xp;
        RAISE NOTICE 'Decimal precision test: %', (new_xp - old_xp);
        
        IF (new_xp - old_xp) = 0.123 THEN
            RAISE NOTICE 'SUCCESS: Decimal XP precision is working!';
        ELSE
            RAISE NOTICE 'ISSUE: Expected 0.123 difference, got %', (new_xp - old_xp);
        END IF;
    ELSE
        RAISE NOTICE 'No users with XP found for testing';
    END IF;
END;
$$;

-- ===================================================
-- STEP 3: Test XP functions with decimals (if they exist)
-- ===================================================

DO $$
BEGIN
    -- Test add_xp_and_check_levelup if it exists
    IF EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'add_xp_and_check_levelup') THEN
        RAISE NOTICE 'add_xp_and_check_levelup function exists - testing with decimals...';
        
        -- You can manually test this in the frontend test button
        RAISE NOTICE 'Use the frontend test button to test: add_xp_and_check_levelup(user_id, 0.5)';
    ELSE
        RAISE NOTICE 'add_xp_and_check_levelup function does not exist';
    END IF;
END;
$$;

-- ===================================================
-- STEP 4: Show updated table structure
-- ===================================================

-- Verify the column types are now NUMERIC(15,3)
SELECT 
    'UPDATED COLUMN TYPES' as check_name,
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
  AND column_name IN ('lifetime_xp', 'current_xp', 'total_xp', 'xp');

SELECT 'QUICK DECIMAL FIX COMPLETE' as status,
       'Table structure updated for decimal precision' as result,
       'Test the frontend now - XP should show and update with decimals' as next_step;