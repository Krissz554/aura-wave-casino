-- DEBUG XP SYSTEM - Check current state
-- Run this in Supabase Dashboard SQL Editor to diagnose the issue

-- Step 1: Check if functions exist and their definitions
SELECT 
  'Function Check' as test_type,
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_name IN ('calculate_xp_from_bet', 'add_xp_and_check_levelup', 'handle_game_history_insert')
  AND routine_schema = 'public';

-- Step 2: Test the calculate_xp_from_bet function directly
SELECT 
  'Direct Function Test' as test_type,
  'Testing calculate_xp_from_bet function' as description;

-- These should return exact /10 values:
SELECT 
  0.01 as bet_amount,
  public.calculate_xp_from_bet(0.01) as calculated_xp,
  'Should be 0.001' as expected;

SELECT 
  1.00 as bet_amount,
  public.calculate_xp_from_bet(1.00) as calculated_xp,
  'Should be 0.100' as expected;

SELECT 
  10.00 as bet_amount,
  public.calculate_xp_from_bet(10.00) as calculated_xp,
  'Should be 1.000' as expected;

-- Step 3: Check the game_history trigger
SELECT 
  'Trigger Check' as test_type,
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'game_history_trigger';

-- Step 4: Check recent game history and XP changes
SELECT 
  'Recent Activity' as test_type,
  'Last 5 game history entries' as description;

SELECT 
  gh.bet_amount,
  gh.game_type,
  gh.created_at,
  public.calculate_xp_from_bet(gh.bet_amount) as expected_xp_gain
FROM public.game_history gh
ORDER BY gh.created_at DESC 
LIMIT 5;

-- Step 5: Check profiles table structure
SELECT 
  'Table Structure' as test_type,
  column_name,
  data_type,
  numeric_precision,
  numeric_scale
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('lifetime_xp', 'current_xp')
  AND table_schema = 'public';

-- Step 6: Check user XP data
SELECT 
  'User XP Data' as test_type,
  'Current XP values in profiles table' as description;

SELECT 
  username,
  lifetime_xp,
  current_xp,
  current_level
FROM public.profiles 
ORDER BY lifetime_xp DESC 
LIMIT 5;