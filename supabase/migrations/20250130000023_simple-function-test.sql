-- Simple test to verify the fixed stats function works
-- Shows all results in one easy-to-read table

CREATE OR REPLACE FUNCTION public.test_fixed_stats_function()
RETURNS TABLE(
  step_name TEXT,
  result_status TEXT,
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
  history_count_before INTEGER;
  history_count_after INTEGER;
BEGIN
  -- Get stats before test
  SELECT current_level, lifetime_xp, current_level_xp, total_games, roulette_games, roulette_wins
  INTO stats_before
  FROM public.user_level_stats
  WHERE user_id = test_user_id;
  
  -- Count game history before
  SELECT COUNT(*) INTO history_count_before
  FROM public.game_history
  WHERE user_id = test_user_id AND game_type = 'roulette';
  
  RETURN QUERY SELECT 
    'BEFORE_TEST'::TEXT,
    'INFO'::TEXT,
    format('XP: %s, Games: %s, Roulette: %s, History: %s', 
      COALESCE(stats_before.lifetime_xp, 0),
      COALESCE(stats_before.total_games, 0),
      COALESCE(stats_before.roulette_games, 0),
      history_count_before
    )::TEXT,
    jsonb_build_object(
      'lifetime_xp', COALESCE(stats_before.lifetime_xp, 0),
      'total_games', COALESCE(stats_before.total_games, 0),
      'roulette_games', COALESCE(stats_before.roulette_games, 0),
      'history_entries', history_count_before
    );

  -- Test the function
  BEGIN
    SELECT public.update_user_stats_and_level(
      test_user_id, 'roulette', 10.0, 'win', 5.0, 0, 'red', 'red'
    ) INTO function_result;
    
    RETURN QUERY SELECT 
      'FUNCTION_CALL'::TEXT,
      CASE WHEN (function_result->>'success')::BOOLEAN THEN 'SUCCESS' ELSE 'ERROR' END::TEXT,
      CASE 
        WHEN (function_result->>'success')::BOOLEAN THEN 'Function executed successfully'
        ELSE format('Error: %s', function_result->>'error_message')
      END::TEXT,
      function_result;
      
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 
        'FUNCTION_CALL'::TEXT,
        'ERROR'::TEXT,
        format('Exception: %s', SQLERRM)::TEXT,
        jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE);
      RETURN;
  END;

  -- Get stats after test
  SELECT current_level, lifetime_xp, current_level_xp, total_games, roulette_games, roulette_wins
  INTO stats_after
  FROM public.user_level_stats
  WHERE user_id = test_user_id;
  
  -- Count game history after
  SELECT COUNT(*) INTO history_count_after
  FROM public.game_history
  WHERE user_id = test_user_id AND game_type = 'roulette';
  
  RETURN QUERY SELECT 
    'AFTER_TEST'::TEXT,
    CASE WHEN COALESCE(stats_after.lifetime_xp, 0) > COALESCE(stats_before.lifetime_xp, 0) THEN 'UPDATED' ELSE 'NO_CHANGE' END::TEXT,
    format('XP: %s→%s (+%s), Games: %s→%s (+%s), Roulette: %s→%s (+%s), History: %s→%s (+%s)', 
      COALESCE(stats_before.lifetime_xp, 0), COALESCE(stats_after.lifetime_xp, 0), 
      COALESCE(stats_after.lifetime_xp, 0) - COALESCE(stats_before.lifetime_xp, 0),
      COALESCE(stats_before.total_games, 0), COALESCE(stats_after.total_games, 0),
      COALESCE(stats_after.total_games, 0) - COALESCE(stats_before.total_games, 0),
      COALESCE(stats_before.roulette_games, 0), COALESCE(stats_after.roulette_games, 0),
      COALESCE(stats_after.roulette_games, 0) - COALESCE(stats_before.roulette_games, 0),
      history_count_before, history_count_after,
      history_count_after - history_count_before
    )::TEXT,
    jsonb_build_object(
      'xp_gained', COALESCE(stats_after.lifetime_xp, 0) - COALESCE(stats_before.lifetime_xp, 0),
      'games_added', COALESCE(stats_after.total_games, 0) - COALESCE(stats_before.total_games, 0),
      'roulette_games_added', COALESCE(stats_after.roulette_games, 0) - COALESCE(stats_before.roulette_games, 0),
      'history_entries_added', history_count_after - history_count_before
    );

  -- Final result
  IF COALESCE(stats_after.lifetime_xp, 0) > COALESCE(stats_before.lifetime_xp, 0) THEN
    RETURN QUERY SELECT 
      'FINAL_RESULT'::TEXT,
      'SUCCESS'::TEXT,
      '🎉 STATS FUNCTION IS WORKING! XP and stats updated correctly.'::TEXT,
      jsonb_build_object('fixed', true);
  ELSE
    RETURN QUERY SELECT 
      'FINAL_RESULT'::TEXT,
      'FAILED'::TEXT,
      '❌ Stats function still not working - no XP gained.'::TEXT,
      jsonb_build_object('fixed', false);
  END IF;

END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.test_fixed_stats_function() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_fixed_stats_function() TO service_role;

-- Run the test
SELECT * FROM public.test_fixed_stats_function();