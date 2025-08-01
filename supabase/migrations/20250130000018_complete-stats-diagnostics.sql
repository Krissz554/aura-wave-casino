-- Complete stats diagnostics with all functions included
-- Based on actual database schema provided

-- =============================================================================
-- 1. CREATE ALL DIAGNOSTIC FUNCTIONS
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
      'level', COALESCE(stats_before.current_level, 0),
      'lifetime_xp', COALESCE(stats_before.lifetime_xp, 0),
      'current_xp', COALESCE(stats_before.current_level_xp, 0),
      'total_games', COALESCE(stats_before.total_games, 0)
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
      'level', COALESCE(stats_after.current_level, 0),
      'lifetime_xp', COALESCE(stats_after.lifetime_xp, 0),
      'current_xp', COALESCE(stats_after.current_level_xp, 0),
      'total_games', COALESCE(stats_after.total_games, 0),
      'xp_increased', COALESCE(stats_after.lifetime_xp, 0) - COALESCE(stats_before.lifetime_xp, 0),
      'games_increased', COALESCE(stats_after.total_games, 0) - COALESCE(stats_before.total_games, 0)
    );
  
  -- Step 4: Summary
  IF COALESCE(stats_after.lifetime_xp, 0) > COALESCE(stats_before.lifetime_xp, 0) THEN
    RETURN QUERY SELECT 
      'RESULT'::TEXT,
      'SUCCESS - Stats Updated!'::TEXT,
      jsonb_build_object(
        'xp_gained', COALESCE(stats_after.lifetime_xp, 0) - COALESCE(stats_before.lifetime_xp, 0),
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
  check_status TEXT,
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
  FROM public.roulette_rounds rr
  WHERE rr.status = 'completed' 
    AND rr.created_at > NOW() - INTERVAL '1 hour';
  
  RETURN QUERY SELECT 
    'COMPLETED_ROUNDS'::TEXT,
    'INFO'::TEXT,
    jsonb_build_object(
      'completed_rounds_last_hour', completed_rounds_count,
      'timestamp_checked', NOW()
    );
  
  -- Get most recent round
  SELECT * INTO recent_round
  FROM public.roulette_rounds rr
  ORDER BY rr.created_at DESC
  LIMIT 1;
  
  IF recent_round IS NOT NULL THEN
    -- Count bets for this round
    SELECT COUNT(*) INTO round_bets_count
    FROM public.roulette_bets rb
    WHERE rb.round_id = recent_round.id;
    
    -- Count game history entries
    SELECT COUNT(*) INTO history_count
    FROM public.game_history gh
    WHERE gh.game_type = 'roulette'
      AND (gh.game_data->>'round_id')::uuid = recent_round.id;
    
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

-- Simple manual stats update for testing
CREATE OR REPLACE FUNCTION public.manual_stats_update_test(
  p_user_id UUID,
  p_xp_amount INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats_before RECORD;
  stats_after RECORD;
BEGIN
  -- Get stats before
  SELECT current_level, lifetime_xp, current_level_xp, total_games
  INTO stats_before
  FROM public.user_level_stats
  WHERE user_id = p_user_id;
  
  -- Update stats manually
  UPDATE public.user_level_stats
  SET 
    lifetime_xp = lifetime_xp + p_xp_amount,
    current_level_xp = current_level_xp + p_xp_amount,
    total_games = total_games + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Get stats after
  SELECT current_level, lifetime_xp, current_level_xp, total_games
  INTO stats_after
  FROM public.user_level_stats
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'xp_added', p_xp_amount,
    'before', row_to_json(stats_before),
    'after', row_to_json(stats_after)
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.test_stats_function_direct() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_stats_function_direct() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_roulette_rounds() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_roulette_rounds() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_function_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_function_status() TO service_role;
GRANT EXECUTE ON FUNCTION public.manual_stats_update_test(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manual_stats_update_test(UUID, INTEGER) TO service_role;

-- =============================================================================
-- 2. RUN ALL DIAGNOSTIC TESTS
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

-- Test 6: Check if user_level_stats record exists
SELECT '=== USER RECORD CHECK ===' as test_section;
SELECT 
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.user_level_stats WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f') 
    THEN 'USER_RECORD_EXISTS' 
    ELSE 'USER_RECORD_MISSING' 
  END as status,
  CASE 
    WHEN EXISTS(SELECT 1 FROM public.profiles WHERE id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f') 
    THEN 'PROFILE_EXISTS' 
    ELSE 'PROFILE_MISSING' 
  END as profile_status;

-- Test 7: Manual stats test
SELECT '=== MANUAL STATS TEST ===' as test_section;
SELECT public.manual_stats_update_test('7ac60cfe-e3f4-4009-81f5-e190ad6de75f', 1) as manual_test_result;

-- Summary message
SELECT '🎯 DIAGNOSTIC COMPLETE - Check results above!' as summary;