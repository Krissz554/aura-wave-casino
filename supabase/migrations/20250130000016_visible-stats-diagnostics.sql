-- Visible stats diagnostics that return actual results
-- This version returns data you can see in Supabase SQL Editor

-- =============================================================================
-- 1. CREATE DIAGNOSTIC FUNCTIONS THAT RETURN VISIBLE RESULTS
-- =============================================================================

-- Function to test stats update directly
CREATE OR REPLACE FUNCTION public.test_stats_function_direct()
RETURNS TABLE(
  test_step TEXT,
  result TEXT,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  test_user_id UUID := '7ac60cfe-e3f4-4009-81f5-e190ad6de75f';
  stats_before RECORD;
  stats_after RECORD;
  function_result JSONB;
BEGIN
  -- Step 1: Get stats before
  SELECT current_level, lifetime_xp, current_level_xp, roulette_games, total_games
  INTO stats_before
  FROM public.user_level_stats
  WHERE user_id = test_user_id;
  
  RETURN QUERY SELECT 
    'BEFORE_TEST'::TEXT,
    'Stats retrieved'::TEXT,
    jsonb_build_object(
      'user_id', test_user_id,
      'level', stats_before.current_level,
      'lifetime_xp', stats_before.lifetime_xp,
      'current_xp', stats_before.current_level_xp,
      'total_games', stats_before.total_games
    );
  
  -- Step 2: Test the function
  BEGIN
    SELECT public.update_user_stats_and_level(
      test_user_id,
      'roulette',
      10.0,  -- $10 bet
      'win',
      5.0,   -- $5 profit
      0,
      'red',
      'red'
    ) INTO function_result;
    
    RETURN QUERY SELECT 
      'FUNCTION_CALL'::TEXT,
      'SUCCESS'::TEXT,
      function_result;
      
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 
        'FUNCTION_CALL'::TEXT,
        'ERROR'::TEXT,
        jsonb_build_object('error', SQLERRM);
      RETURN;
  END;
  
  -- Step 3: Get stats after
  SELECT current_level, lifetime_xp, current_level_xp, roulette_games, total_games
  INTO stats_after
  FROM public.user_level_stats
  WHERE user_id = test_user_id;
  
  RETURN QUERY SELECT 
    'AFTER_TEST'::TEXT,
    'Stats retrieved'::TEXT,
    jsonb_build_object(
      'level', stats_after.current_level,
      'lifetime_xp', stats_after.lifetime_xp,
      'current_xp', stats_after.current_level_xp,
      'total_games', stats_after.total_games,
      'xp_increased', stats_after.lifetime_xp - stats_before.lifetime_xp,
      'games_increased', stats_after.total_games - stats_before.total_games
    );
  
  -- Step 4: Summary
  IF stats_after.lifetime_xp > stats_before.lifetime_xp THEN
    RETURN QUERY SELECT 
      'RESULT'::TEXT,
      'SUCCESS - Stats Updated!'::TEXT,
      jsonb_build_object(
        'xp_gained', stats_after.lifetime_xp - stats_before.lifetime_xp,
        'function_works', true
      );
  ELSE
    RETURN QUERY SELECT 
      'RESULT'::TEXT,
      'FAILURE - Stats NOT Updated'::TEXT,
      jsonb_build_object(
        'xp_gained', 0,
        'function_works', false
      );
  END IF;
END;
$$;

-- Function to check roulette rounds
CREATE OR REPLACE FUNCTION public.check_roulette_rounds()
RETURNS TABLE(
  check_type TEXT,
  status TEXT,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_round RECORD;
  round_bets_count INTEGER;
  completed_rounds_count INTEGER;
  history_count INTEGER;
BEGIN
  -- Count completed rounds in last hour
  SELECT COUNT(*) INTO completed_rounds_count
  FROM public.roulette_rounds
  WHERE status = 'completed' 
    AND created_at > NOW() - INTERVAL '1 hour';
  
  RETURN QUERY SELECT 
    'COMPLETED_ROUNDS'::TEXT,
    'INFO'::TEXT,
    jsonb_build_object(
      'completed_rounds_last_hour', completed_rounds_count,
      'timestamp_checked', NOW()
    );
  
  -- Get most recent round
  SELECT * INTO recent_round
  FROM public.roulette_rounds
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF recent_round IS NOT NULL THEN
    -- Count bets for this round
    SELECT COUNT(*) INTO round_bets_count
    FROM public.roulette_bets
    WHERE round_id = recent_round.id;
    
    -- Count game history entries
    SELECT COUNT(*) INTO history_count
    FROM public.game_history
    WHERE game_type = 'roulette'
      AND (game_data->>'round_id')::uuid = recent_round.id;
    
    RETURN QUERY SELECT 
      'RECENT_ROUND'::TEXT,
      recent_round.status::TEXT,
      jsonb_build_object(
        'round_id', recent_round.id,
        'status', recent_round.status,
        'result_color', recent_round.result_color,
        'result_slot', recent_round.result_slot,
        'created_at', recent_round.created_at,
        'bets_placed', round_bets_count,
        'game_history_entries', history_count,
        'should_have_updated_stats', (recent_round.status = 'completed' AND round_bets_count > 0)
      );
  ELSE
    RETURN QUERY SELECT 
      'RECENT_ROUND'::TEXT,
      'NO_ROUNDS'::TEXT,
      jsonb_build_object('message', 'No roulette rounds found');
  END IF;
END;
$$;

-- Function to check if functions exist and are being called
CREATE OR REPLACE FUNCTION public.check_function_status()
RETURNS TABLE(
  function_name TEXT,
  exists_status TEXT,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  func_exists BOOLEAN;
  call_count BIGINT;
BEGIN
  -- Check if update_user_stats_and_level exists
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' 
      AND p.proname = 'update_user_stats_and_level'
  ) INTO func_exists;
  
  -- Get call count if available
  SELECT COALESCE(calls, 0) INTO call_count
  FROM pg_stat_user_functions 
  WHERE schemaname = 'public' 
    AND funcname = 'update_user_stats_and_level';
  
  RETURN QUERY SELECT 
    'update_user_stats_and_level'::TEXT,
    CASE WHEN func_exists THEN 'EXISTS' ELSE 'MISSING' END::TEXT,
    jsonb_build_object(
      'function_exists', func_exists,
      'total_calls', call_count,
      'checked_at', NOW()
    );
  
  -- Check atomic_bet_balance_check
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' 
      AND p.proname = 'atomic_bet_balance_check'
  ) INTO func_exists;
  
  RETURN QUERY SELECT 
    'atomic_bet_balance_check'::TEXT,
    CASE WHEN func_exists THEN 'EXISTS' ELSE 'MISSING' END::TEXT,
    jsonb_build_object('function_exists', func_exists);
  
  -- Check process_roulette_bet_results  
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' 
      AND p.proname = 'process_roulette_bet_results'
  ) INTO func_exists;
  
  RETURN QUERY SELECT 
    'process_roulette_bet_results'::TEXT,
    CASE WHEN func_exists THEN 'EXISTS' ELSE 'MISSING' END::TEXT,
    jsonb_build_object('function_exists', func_exists);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.test_stats_function_direct() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_stats_function_direct() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_roulette_rounds() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_roulette_rounds() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_function_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_function_status() TO service_role;

-- =============================================================================
-- 2. RUN THE TESTS AND SHOW RESULTS
-- =============================================================================

-- Test 1: Direct stats function test
SELECT '=== DIRECT STATS FUNCTION TEST ===' as test_section;
SELECT * FROM public.test_stats_function_direct();

-- Test 2: Roulette rounds check  
SELECT '=== ROULETTE ROUNDS CHECK ===' as test_section;
SELECT * FROM public.check_roulette_rounds();

-- Test 3: Function status check
SELECT '=== FUNCTION STATUS CHECK ===' as test_section;
SELECT * FROM public.check_function_status();

-- Test 4: Current user stats
SELECT '=== CURRENT USER STATS ===' as test_section;
SELECT 
  user_id,
  current_level,
  lifetime_xp,
  current_level_xp,
  xp_to_next_level,
  total_games,
  roulette_games,
  updated_at
FROM public.user_level_stats 
WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f';

-- Test 5: Recent game history
SELECT '=== RECENT GAME HISTORY ===' as test_section;
SELECT 
  id,
  user_id,
  game_type,
  bet_amount,
  result,
  profit_loss,
  created_at,
  game_data
FROM public.game_history 
WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'
  AND game_type = 'roulette'
ORDER BY created_at DESC 
LIMIT 5;

-- Summary message
SELECT '🎯 DIAGNOSTIC COMPLETE - Check results above!' as summary;