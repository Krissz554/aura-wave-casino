-- Test XP Calculation Function
-- Run this in Supabase Dashboard SQL Editor to test XP calculation

-- Test the calculate_xp_from_bet function directly
SELECT 
  'Test calculate_xp_from_bet function' as test_name,
  public.calculate_xp_from_bet(1.00) as xp_for_1_dollar,
  public.calculate_xp_from_bet(0.10) as xp_for_10_cents,
  public.calculate_xp_from_bet(10.00) as xp_for_10_dollars,
  public.calculate_xp_from_bet(0.01) as xp_for_1_cent;

-- Check if the function exists and its definition
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'calculate_xp_from_bet' 
  AND routine_schema = 'public';

-- Check if the handle_game_history_insert trigger function exists
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_game_history_insert' 
  AND routine_schema = 'public';

-- Check if the game_history trigger is active
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'game_history_trigger';

-- Check recent game history entries to see actual XP calculations
SELECT 
  gh.bet_amount,
  public.calculate_xp_from_bet(gh.bet_amount) as expected_xp,
  gh.created_at
FROM public.game_history gh
ORDER BY gh.created_at DESC 
LIMIT 5;