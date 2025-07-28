-- ===================================================
-- DIAGNOSE XP SYSTEM - Check Current Database State
-- ===================================================
-- Run this in Supabase Dashboard SQL Editor to see current XP system status

-- ===================================================
-- STEP 1: Check current table structure
-- ===================================================

-- Check profiles table XP column types
SELECT 
  'PROFILES TABLE STRUCTURE' as check_name,
  column_name,
  data_type,
  numeric_precision,
  numeric_scale
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
  AND column_name IN ('lifetime_xp', 'current_xp', 'total_xp', 'xp');

-- ===================================================
-- STEP 2: Check existing XP functions
-- ===================================================

-- List all XP-related functions
SELECT 
  'XP FUNCTIONS CHECK' as check_name,
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname IN ('calculate_xp_from_bet', 'add_xp_and_check_levelup', 'handle_game_history_insert')
ORDER BY proname;

-- ===================================================
-- STEP 3: Test XP calculation function
-- ===================================================

-- Test if calculate_xp_from_bet exists and works with decimals
SELECT 
  'XP CALCULATION TEST' as test_name,
  CASE 
    WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'calculate_xp_from_bet') THEN
      'FUNCTION EXISTS'
    ELSE 
      'FUNCTION MISSING'
  END as function_status;

-- Try to test the function if it exists
DO $$
BEGIN
  -- Test XP calculation if function exists
  IF EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'calculate_xp_from_bet') THEN
    BEGIN
      RAISE NOTICE 'Testing calculate_xp_from_bet function:';
      RAISE NOTICE '$100 bet should give 10.000 XP: %', public.calculate_xp_from_bet(100.00);
      RAISE NOTICE '$1 bet should give 0.100 XP: %', public.calculate_xp_from_bet(1.00);
      RAISE NOTICE '$0.10 bet should give 0.010 XP: %', public.calculate_xp_from_bet(0.10);
      RAISE NOTICE '$0.01 bet should give 0.001 XP: %', public.calculate_xp_from_bet(0.01);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR testing calculate_xp_from_bet: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'calculate_xp_from_bet function does not exist';
  END IF;
END;
$$;

-- ===================================================
-- STEP 4: Check current user XP values
-- ===================================================

-- Show current XP values for all users (limit 5)
SELECT 
  'CURRENT USER XP VALUES' as check_name,
  username,
  lifetime_xp,
  current_xp,
  total_xp,
  xp,
  current_level
FROM public.profiles 
WHERE lifetime_xp > 0 OR current_xp > 0 OR total_xp > 0 OR xp > 0
ORDER BY lifetime_xp DESC 
LIMIT 5;

-- ===================================================
-- STEP 5: Check triggers
-- ===================================================

-- Check if game_history trigger exists
SELECT 
  'TRIGGER CHECK' as check_name,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'game_history_trigger';

-- ===================================================
-- SUMMARY
-- ===================================================

SELECT 
  'DIAGNOSIS COMPLETE' as status,
  'Check the results above to see:' as instructions,
  '1. Column types (should be numeric with precision 15,3)' as step_1,
  '2. Function signatures (should accept numeric parameters)' as step_2,
  '3. XP calculation test results (should show decimals)' as step_3,
  '4. Current user XP values (check if decimals exist)' as step_4,
  '5. Trigger existence (should show game_history_trigger)' as step_5;