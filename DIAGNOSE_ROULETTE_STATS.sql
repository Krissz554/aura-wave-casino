-- =====================================================
-- DIAGNOSE ROULETTE STATS FUNCTIONS
-- =====================================================
-- This script checks if all required functions exist and work properly

-- =====================================================
-- STEP 1: Check if functions exist
-- =====================================================

SELECT 
  'FUNCTION EXISTENCE CHECK' as check_type,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'process_roulette_bet_complete',
  'update_user_roulette_stats',
  'add_xp_for_wager',
  'calculate_level_from_xp_new'
)
ORDER BY routine_name;

-- =====================================================
-- STEP 2: Check function signatures
-- =====================================================

SELECT 
  'FUNCTION PARAMETERS' as check_type,
  r.routine_name,
  p.parameter_name,
  p.data_type,
  p.parameter_mode
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public' 
AND r.routine_name IN (
  'process_roulette_bet_complete',
  'update_user_roulette_stats',
  'add_xp_for_wager'
)
ORDER BY r.routine_name, p.ordinal_position;

-- =====================================================
-- STEP 3: Check if user_level_stats table structure is correct
-- =====================================================

SELECT 
  'USER_LEVEL_STATS COLUMNS' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_level_stats'
AND column_name IN (
  'roulette_games',
  'roulette_wins', 
  'roulette_wagered',
  'roulette_profit',
  'lifetime_xp',
  'current_level'
)
ORDER BY column_name;

-- =====================================================
-- STEP 4: Test function calls with dummy data (safe test)
-- =====================================================

DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- Dummy UUID
  test_result JSONB;
  function_exists BOOLEAN;
BEGIN
  RAISE NOTICE '🧪 TESTING ROULETTE STATS FUNCTIONS';
  RAISE NOTICE '=====================================';
  
  -- Test 1: Check if process_roulette_bet_complete exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'process_roulette_bet_complete'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE NOTICE '✅ process_roulette_bet_complete function exists';
  ELSE
    RAISE NOTICE '❌ process_roulette_bet_complete function MISSING';
  END IF;
  
  -- Test 2: Check if update_user_roulette_stats exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'update_user_roulette_stats'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE NOTICE '✅ update_user_roulette_stats function exists';
  ELSE
    RAISE NOTICE '❌ update_user_roulette_stats function MISSING';
  END IF;
  
  -- Test 3: Check if add_xp_for_wager exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'add_xp_for_wager'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE NOTICE '✅ add_xp_for_wager function exists';
  ELSE
    RAISE NOTICE '❌ add_xp_for_wager function MISSING';
  END IF;
  
  -- Test 4: Check if calculate_level_from_xp_new exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'calculate_level_from_xp_new'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE NOTICE '✅ calculate_level_from_xp_new function exists';
  ELSE
    RAISE NOTICE '❌ calculate_level_from_xp_new function MISSING - This is required for XP calculations!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 DIAGNOSIS COMPLETE';
  RAISE NOTICE 'Check the results above to see which functions are missing.';
  RAISE NOTICE 'If any functions are missing, run FIX_ROULETTE_STATS_COMPREHENSIVE.sql';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error during diagnosis: %', SQLERRM;
END $$;

-- =====================================================
-- STEP 5: Check recent roulette bets and stats
-- =====================================================

-- Show recent roulette bets
SELECT 
  'RECENT ROULETTE BETS' as check_type,
  rb.id,
  rb.user_id,
  rb.bet_amount,
  rb.bet_color,
  rb.is_winner,
  rb.profit,
  rb.created_at
FROM roulette_bets rb
ORDER BY rb.created_at DESC
LIMIT 5;

-- Show user stats for users who have placed recent bets
SELECT 
  'USER STATS FOR RECENT BETTORS' as check_type,
  uls.user_id,
  uls.roulette_games,
  uls.roulette_wins,
  uls.roulette_wagered,
  uls.roulette_profit,
  uls.lifetime_xp,
  uls.current_level,
  uls.updated_at
FROM user_level_stats uls
WHERE uls.user_id IN (
  SELECT DISTINCT rb.user_id 
  FROM roulette_bets rb 
  ORDER BY rb.created_at DESC 
  LIMIT 5
)
ORDER BY uls.updated_at DESC;

-- =====================================================
-- FINAL DIAGNOSIS SUMMARY
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎯 ROULETTE STATS DIAGNOSIS SUMMARY';
  RAISE NOTICE '===================================';
  RAISE NOTICE 'If you see missing functions above, run: FIX_ROULETTE_STATS_COMPREHENSIVE.sql';
  RAISE NOTICE 'If functions exist but stats aren''t updating, check the edge function logs for errors';
  RAISE NOTICE 'The stats should update when the roulette round COMPLETES, not when bets are placed';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 To debug further:';
  RAISE NOTICE '1. Check Supabase edge function logs for process_roulette_bet_complete calls';
  RAISE NOTICE '2. Look for any error messages in the logs';
  RAISE NOTICE '3. Verify that the completeRound function is being called';
  RAISE NOTICE '4. Check if user_level_stats records exist for the betting users';
END $$;