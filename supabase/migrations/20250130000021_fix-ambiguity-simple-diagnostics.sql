-- Fix column ambiguity in simple diagnostics
-- The issue is 'status' parameter conflicts with table column

CREATE OR REPLACE FUNCTION public.complete_roulette_diagnostics()
RETURNS TABLE(
  test_name TEXT,
  test_status TEXT,  -- Renamed from 'status' to avoid conflict
  details TEXT,
  data JSONB
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
  user_exists BOOLEAN;
  profile_exists BOOLEAN;
  func_exists BOOLEAN;
  recent_rounds INTEGER;
  recent_bets INTEGER;
  game_history_count INTEGER;
BEGIN
  -- Test 1: Check if user records exist
  SELECT EXISTS(SELECT 1 FROM public.user_level_stats WHERE user_id = test_user_id) INTO user_exists;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = test_user_id) INTO profile_exists;
  
  RETURN QUERY SELECT 
    'USER_RECORDS'::TEXT,
    CASE WHEN user_exists AND profile_exists THEN 'EXISTS' ELSE 'MISSING' END::TEXT,
    format('User stats: %s, Profile: %s', 
      CASE WHEN user_exists THEN 'EXISTS' ELSE 'MISSING' END,
      CASE WHEN profile_exists THEN 'EXISTS' ELSE 'MISSING' END
    )::TEXT,
    jsonb_build_object('user_stats_exists', user_exists, 'profile_exists', profile_exists);

  -- Test 2: Check if stats function exists
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'update_user_stats_and_level'
  ) INTO func_exists;
  
  RETURN QUERY SELECT 
    'STATS_FUNCTION'::TEXT,
    CASE WHEN func_exists THEN 'EXISTS' ELSE 'MISSING' END::TEXT,
    CASE WHEN func_exists THEN 'update_user_stats_and_level function found' ELSE 'update_user_stats_and_level function NOT FOUND' END::TEXT,
    jsonb_build_object('function_exists', func_exists);

  -- Test 3: Get current stats
  IF user_exists THEN
    SELECT current_level, lifetime_xp, current_level_xp, total_games, roulette_games
    INTO stats_before
    FROM public.user_level_stats
    WHERE user_id = test_user_id;
    
    RETURN QUERY SELECT 
      'CURRENT_STATS'::TEXT,
      'INFO'::TEXT,
      format('Level %s, XP %s/%s, Games %s (Roulette: %s)', 
        COALESCE(stats_before.current_level, 0),
        COALESCE(stats_before.lifetime_xp, 0),
        COALESCE(stats_before.current_level_xp, 0),
        COALESCE(stats_before.total_games, 0),
        COALESCE(stats_before.roulette_games, 0)
      )::TEXT,
      jsonb_build_object(
        'level', COALESCE(stats_before.current_level, 0),
        'lifetime_xp', COALESCE(stats_before.lifetime_xp, 0),
        'current_xp', COALESCE(stats_before.current_level_xp, 0),
        'total_games', COALESCE(stats_before.total_games, 0),
        'roulette_games', COALESCE(stats_before.roulette_games, 0)
      );
  ELSE
    RETURN QUERY SELECT 
      'CURRENT_STATS'::TEXT,
      'ERROR'::TEXT,
      'No user_level_stats record found'::TEXT,
      '{}'::JSONB;
  END IF;

  -- Test 4: Test stats function if it exists
  IF func_exists AND user_exists THEN
    BEGIN
      SELECT public.update_user_stats_and_level(
        test_user_id, 'roulette', 10.0, 'win', 5.0, 0, 'red', 'red'
      ) INTO function_result;
      
      RETURN QUERY SELECT 
        'FUNCTION_TEST'::TEXT,
        'SUCCESS'::TEXT,
        'Stats function executed successfully'::TEXT,
        function_result;
        
    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT 
          'FUNCTION_TEST'::TEXT,
          'ERROR'::TEXT,
          format('Function failed: %s', SQLERRM)::TEXT,
          jsonb_build_object('error', SQLERRM);
    END;
  ELSE
    RETURN QUERY SELECT 
      'FUNCTION_TEST'::TEXT,
      'SKIPPED'::TEXT,
      CASE 
        WHEN NOT func_exists THEN 'Function does not exist'
        WHEN NOT user_exists THEN 'User record missing'
        ELSE 'Unknown reason'
      END::TEXT,
      '{}'::JSONB;
  END IF;

  -- Test 5: Check stats after function test
  IF user_exists THEN
    SELECT current_level, lifetime_xp, current_level_xp, total_games, roulette_games
    INTO stats_after
    FROM public.user_level_stats
    WHERE user_id = test_user_id;
    
    RETURN QUERY SELECT 
      'STATS_AFTER_TEST'::TEXT,
      CASE WHEN COALESCE(stats_after.lifetime_xp, 0) > COALESCE(stats_before.lifetime_xp, 0) THEN 'UPDATED' ELSE 'NO_CHANGE' END::TEXT,
      format('XP changed from %s to %s (diff: %s)', 
        COALESCE(stats_before.lifetime_xp, 0),
        COALESCE(stats_after.lifetime_xp, 0),
        COALESCE(stats_after.lifetime_xp, 0) - COALESCE(stats_before.lifetime_xp, 0)
      )::TEXT,
      jsonb_build_object(
        'xp_before', COALESCE(stats_before.lifetime_xp, 0),
        'xp_after', COALESCE(stats_after.lifetime_xp, 0),
        'xp_gained', COALESCE(stats_after.lifetime_xp, 0) - COALESCE(stats_before.lifetime_xp, 0)
      );
  END IF;

  -- Test 6: Check recent roulette activity (FIXED column qualification)
  SELECT COUNT(*) INTO recent_rounds
  FROM public.roulette_rounds rr
  WHERE rr.status = 'completed' AND rr.created_at > NOW() - INTERVAL '1 hour';
  
  SELECT COUNT(*) INTO recent_bets
  FROM public.roulette_bets rb
  WHERE rb.user_id = test_user_id AND rb.created_at > NOW() - INTERVAL '1 hour';
  
  SELECT COUNT(*) INTO game_history_count
  FROM public.game_history gh
  WHERE gh.user_id = test_user_id AND gh.game_type = 'roulette' AND gh.created_at > NOW() - INTERVAL '1 hour';
  
  RETURN QUERY SELECT 
    'RECENT_ACTIVITY'::TEXT,
    'INFO'::TEXT,
    format('Rounds: %s completed, Bets: %s placed, History: %s entries', 
      recent_rounds, recent_bets, game_history_count)::TEXT,
    jsonb_build_object(
      'completed_rounds', recent_rounds,
      'user_bets', recent_bets,
      'history_entries', game_history_count
    );

  -- Test 7: Manual stats update test
  IF user_exists THEN
    BEGIN
      UPDATE public.user_level_stats
      SET lifetime_xp = lifetime_xp + 1, updated_at = NOW()
      WHERE user_id = test_user_id;
      
      RETURN QUERY SELECT 
        'MANUAL_UPDATE'::TEXT,
        'SUCCESS'::TEXT,
        'Direct database update worked'::TEXT,
        jsonb_build_object('manual_update', true);
        
    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT 
          'MANUAL_UPDATE'::TEXT,
          'ERROR'::TEXT,
          format('Direct update failed: %s', SQLERRM)::TEXT,
          jsonb_build_object('error', SQLERRM);
    END;
  END IF;

END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.complete_roulette_diagnostics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_roulette_diagnostics() TO service_role;

-- Run the complete diagnostics
SELECT * FROM public.complete_roulette_diagnostics();