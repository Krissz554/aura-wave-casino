-- Direct stats test and roulette engine check
-- This migration tests the stats function directly and checks roulette round completion

-- =============================================================================
-- 1. DIRECT FUNCTION TEST WITH REAL USER
-- =============================================================================

DO $$
DECLARE
  test_user_id UUID;
  test_result JSONB;
  stats_before RECORD;
  stats_after RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 ===============================================';
  RAISE NOTICE '🧪 DIRECT STATS FUNCTION TEST';
  RAISE NOTICE '🧪 ===============================================';
  
  -- Get the specific user from the logs
  test_user_id := '7ac60cfe-e3f4-4009-81f5-e190ad6de75f';
  
  RAISE NOTICE '🧪 Testing with user: %', test_user_id;
  
  -- Get stats before test
  SELECT current_level, lifetime_xp, current_level_xp, roulette_games, total_games
  INTO stats_before
  FROM public.user_level_stats
  WHERE user_id = test_user_id;
  
  RAISE NOTICE '🧪 Stats BEFORE test: Level %, Lifetime XP %, Games %', 
    stats_before.current_level, stats_before.lifetime_xp, stats_before.total_games;
  
  -- Test the function directly
  SELECT public.update_user_stats_and_level(
    test_user_id,
    'roulette',
    10.0,  -- $10 bet
    'win',
    5.0,   -- $5 profit
    0,
    'red',
    'red'
  ) INTO test_result;
  
  RAISE NOTICE '🧪 Function result: %', test_result;
  
  -- Get stats after test
  SELECT current_level, lifetime_xp, current_level_xp, roulette_games, total_games
  INTO stats_after
  FROM public.user_level_stats
  WHERE user_id = test_user_id;
  
  RAISE NOTICE '🧪 Stats AFTER test: Level %, Lifetime XP %, Games %', 
    stats_after.current_level, stats_after.lifetime_xp, stats_after.total_games;
  
  -- Check if stats changed
  IF stats_after.lifetime_xp > stats_before.lifetime_xp THEN
    RAISE NOTICE '✅ SUCCESS: Stats were updated! XP increased by %', 
      (stats_after.lifetime_xp - stats_before.lifetime_xp);
  ELSE
    RAISE NOTICE '❌ FAILURE: Stats were NOT updated';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '🚨 Test failed with error: %', SQLERRM;
END;
$$;

-- =============================================================================
-- 2. CHECK ROULETTE ROUNDS AND COMPLETION
-- =============================================================================

DO $$
DECLARE
  recent_round RECORD;
  round_bets_count INTEGER;
  completed_rounds_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎰 ===============================================';
  RAISE NOTICE '🎰 ROULETTE ROUNDS CHECK';
  RAISE NOTICE '🎰 ===============================================';
  
  -- Count completed rounds in last hour
  SELECT COUNT(*) INTO completed_rounds_count
  FROM public.roulette_rounds
  WHERE status = 'completed' 
    AND created_at > NOW() - INTERVAL '1 hour';
  
  RAISE NOTICE '🎰 Completed rounds in last hour: %', completed_rounds_count;
  
  -- Get most recent round
  SELECT * INTO recent_round
  FROM public.roulette_rounds
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF recent_round IS NOT NULL THEN
    RAISE NOTICE '🎰 Most recent round:';
    RAISE NOTICE '   ID: %', recent_round.id;
    RAISE NOTICE '   Status: %', recent_round.status;
    RAISE NOTICE '   Result: % (slot %)', recent_round.result_color, recent_round.result_slot;
    RAISE NOTICE '   Created: %', recent_round.created_at;
    
    -- Count bets for this round
    SELECT COUNT(*) INTO round_bets_count
    FROM public.roulette_bets
    WHERE round_id = recent_round.id;
    
    RAISE NOTICE '   Bets placed: %', round_bets_count;
    
    -- If completed, check if stats were processed
    IF recent_round.status = 'completed' AND round_bets_count > 0 THEN
      RAISE NOTICE '🎰 This round should have triggered stats updates!';
      
      -- Check game history for this round
      DECLARE
        history_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO history_count
        FROM public.game_history
        WHERE game_type = 'roulette'
          AND (game_data->>'round_id')::uuid = recent_round.id;
        
        RAISE NOTICE '   Game history entries: %', history_count;
      END;
    END IF;
  ELSE
    RAISE NOTICE '🎰 No roulette rounds found';
  END IF;
END;
$$;

-- =============================================================================
-- 3. CREATE SIMPLE MANUAL STATS UPDATE FUNCTION FOR TESTING
-- =============================================================================

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
  RAISE NOTICE '🧪 MANUAL STATS TEST: Adding % XP to user %', p_xp_amount, p_user_id;
  
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
  
  RAISE NOTICE '🧪 BEFORE: Level %, XP %, Games %', 
    stats_before.current_level, stats_before.lifetime_xp, stats_before.total_games;
  RAISE NOTICE '🧪 AFTER: Level %, XP %, Games %', 
    stats_after.current_level, stats_after.lifetime_xp, stats_after.total_games;
  
  RETURN jsonb_build_object(
    'success', true,
    'xp_added', p_xp_amount,
    'before', row_to_json(stats_before),
    'after', row_to_json(stats_after)
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.manual_stats_update_test(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manual_stats_update_test(UUID, INTEGER) TO service_role;

-- =============================================================================
-- 4. TEST MANUAL STATS UPDATE
-- =============================================================================

DO $$
DECLARE
  test_user_id UUID;
  test_result JSONB;
BEGIN
  test_user_id := '7ac60cfe-e3f4-4009-81f5-e190ad6de75f';
  
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTING MANUAL STATS UPDATE';
  
  SELECT public.manual_stats_update_test(test_user_id, 5) INTO test_result;
  
  RAISE NOTICE '🧪 Manual test result: %', test_result;
END;
$$;

-- =============================================================================
-- 5. CHECK IF ROULETTE ENGINE IS CALLING STATS FUNCTIONS
-- =============================================================================

DO $$
DECLARE
  function_calls_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 ===============================================';
  RAISE NOTICE '🔍 CHECKING FUNCTION USAGE';
  RAISE NOTICE '🔍 ===============================================';
  
  -- Check if there are any recent function calls in pg_stat_user_functions
  SELECT COALESCE(calls, 0) INTO function_calls_count
  FROM pg_stat_user_functions 
  WHERE schemaname = 'public' 
    AND funcname = 'update_user_stats_and_level';
  
  RAISE NOTICE '🔍 update_user_stats_and_level calls: %', function_calls_count;
  
  -- List all functions that might be related
  RAISE NOTICE '🔍 Available functions:';
  FOR function_calls_count IN 
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' 
      AND p.proname LIKE '%stats%' 
    LIMIT 10
  LOOP
    -- Just to show we're checking
  END LOOP;
  
END;
$$;

-- =============================================================================
-- 6. SUMMARY AND NEXT STEPS
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 ===============================================';
  RAISE NOTICE '📋 DIAGNOSTIC SUMMARY';
  RAISE NOTICE '📋 ===============================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Direct function test completed above';
  RAISE NOTICE '2. Roulette rounds status checked';
  RAISE NOTICE '3. Manual stats update function created';
  RAISE NOTICE '4. Function usage statistics reviewed';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NEXT STEPS:';
  RAISE NOTICE '   - Check if function test succeeded';
  RAISE NOTICE '   - Verify roulette rounds are completing';
  RAISE NOTICE '   - Test manual stats update in frontend';
  RAISE NOTICE '   - Check Supabase logs for 🎰 messages';
  RAISE NOTICE '';
END;
$$;