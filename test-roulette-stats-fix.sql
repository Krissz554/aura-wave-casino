-- TEST SCRIPT: Verify Roulette Stats Tracking Fix
-- Run this after applying the roulette stats fix

-- Step 1: Check if all required columns exist
SELECT 
  'COLUMN CHECK' as test_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_level_stats' 
AND column_name IN (
  'roulette_games', 'roulette_wins', 'roulette_wagered', 'roulette_profit',
  'roulette_highest_win', 'roulette_highest_loss', 'roulette_green_wins',
  'roulette_red_wins', 'roulette_black_wins', 'roulette_favorite_color',
  'roulette_best_streak', 'roulette_current_streak', 'roulette_biggest_bet'
)
ORDER BY column_name;

-- Step 2: Check if the function exists and has correct signature
SELECT 
  'FUNCTION CHECK' as test_type,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public' 
AND p.proname = 'update_user_stats_and_level';

-- Step 3: Test the function with sample data
DO $$
DECLARE
  test_user_id UUID;
  test_result JSONB;
  stats_before RECORD;
  stats_after RECORD;
BEGIN
  -- Get or create a test user
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ No users found in auth.users table';
    RETURN;
  END IF;
  
  RAISE NOTICE '🧪 Testing roulette stats with user: %', test_user_id;
  
  -- Ensure user has stats record
  INSERT INTO public.user_level_stats (user_id) 
  VALUES (test_user_id) 
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get stats before
  SELECT * INTO stats_before FROM public.user_level_stats WHERE user_id = test_user_id;
  
  RAISE NOTICE '📊 Stats before test:';
  RAISE NOTICE '   - roulette_games: %', stats_before.roulette_games;
  RAISE NOTICE '   - roulette_wins: %', stats_before.roulette_wins;
  RAISE NOTICE '   - roulette_wagered: %', stats_before.roulette_wagered;
  RAISE NOTICE '   - roulette_profit: %', stats_before.roulette_profit;
  
  -- Test 1: Winning red bet
  SELECT public.update_user_stats_and_level(
    test_user_id,
    'roulette',
    10.0,
    'win',
    10.0,
    0,
    'red',
    'red'
  ) INTO test_result;
  
  RAISE NOTICE '✅ Test 1 (winning red bet) result: %', test_result;
  
  -- Test 2: Losing black bet
  SELECT public.update_user_stats_and_level(
    test_user_id,
    'roulette',
    5.0,
    'loss',
    -5.0,
    0,
    'green',
    'black'
  ) INTO test_result;
  
  RAISE NOTICE '✅ Test 2 (losing black bet) result: %', test_result;
  
  -- Test 3: Winning green bet (big multiplier)
  SELECT public.update_user_stats_and_level(
    test_user_id,
    'roulette',
    2.0,
    'win',
    26.0,
    0,
    'green',
    'green'
  ) INTO test_result;
  
  RAISE NOTICE '✅ Test 3 (winning green bet) result: %', test_result;
  
  -- Get stats after
  SELECT * INTO stats_after FROM public.user_level_stats WHERE user_id = test_user_id;
  
  RAISE NOTICE '📊 Stats after tests:';
  RAISE NOTICE '   - roulette_games: % (should be +3)', stats_after.roulette_games;
  RAISE NOTICE '   - roulette_wins: % (should be +2)', stats_after.roulette_wins;
  RAISE NOTICE '   - roulette_wagered: % (should be +17.0)', stats_after.roulette_wagered;
  RAISE NOTICE '   - roulette_profit: % (should be +31.0)', stats_after.roulette_profit;
  RAISE NOTICE '   - roulette_red_wins: % (should be +1)', stats_after.roulette_red_wins;
  RAISE NOTICE '   - roulette_green_wins: % (should be +1)', stats_after.roulette_green_wins;
  RAISE NOTICE '   - roulette_black_wins: % (should be +0)', stats_after.roulette_black_wins;
  RAISE NOTICE '   - roulette_highest_win: % (should be 26.0)', stats_after.roulette_highest_win;
  RAISE NOTICE '   - roulette_biggest_bet: % (should be 10.0)', stats_after.roulette_biggest_bet;
  
  -- Verify the changes
  IF (stats_after.roulette_games - stats_before.roulette_games) = 3 AND
     (stats_after.roulette_wins - stats_before.roulette_wins) = 2 AND
     (stats_after.roulette_wagered - stats_before.roulette_wagered) = 17.0 AND
     (stats_after.roulette_profit - stats_before.roulette_profit) = 31.0 THEN
    RAISE NOTICE '✅ ALL TESTS PASSED! Roulette stats tracking is working correctly.';
  ELSE
    RAISE NOTICE '❌ TESTS FAILED! Expected changes do not match actual changes.';
  END IF;
  
END $$;

-- Step 4: Show current roulette stats for all users (to verify tracking)
SELECT 
  'USER STATS SUMMARY' as test_type,
  COUNT(*) as total_users,
  SUM(roulette_games) as total_roulette_games,
  SUM(roulette_wins) as total_roulette_wins,
  SUM(roulette_wagered) as total_roulette_wagered,
  SUM(roulette_profit) as total_roulette_profit,
  AVG(CASE WHEN roulette_games > 0 THEN roulette_wins::FLOAT / roulette_games ELSE 0 END) as avg_win_rate
FROM public.user_level_stats
WHERE roulette_games > 0;

-- Step 5: Show top roulette players (to verify data visibility)
SELECT 
  'TOP PLAYERS' as test_type,
  user_id,
  roulette_games,
  roulette_wins,
  roulette_wagered,
  roulette_profit,
  roulette_favorite_color,
  roulette_best_streak
FROM public.user_level_stats
WHERE roulette_games > 0
ORDER BY roulette_wagered DESC
LIMIT 5;

SELECT 
  '🎰 ROULETTE STATS TRACKING TEST COMPLETE' as status,
  'Check the output above to verify the fix is working' as instructions;