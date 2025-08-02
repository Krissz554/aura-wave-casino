-- FIX RLS BLOCKING STATS FUNCTION
-- The issue is RLS policies blocking function access to user_level_stats

-- Option 1: Create a SECURITY DEFINER function that bypasses RLS
DROP FUNCTION IF EXISTS public.update_user_stats_and_level CASCADE;

CREATE OR REPLACE FUNCTION public.update_user_stats_and_level(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount NUMERIC,
  p_result TEXT,
  p_profit NUMERIC,
  p_streak_length INTEGER DEFAULT 0,
  p_bet_color TEXT DEFAULT NULL,
  p_result_color TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- This bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_xp_gained INTEGER;
  v_stats_before RECORD;
  v_stats_after RECORD;
BEGIN
  -- Calculate XP
  v_xp_gained := FLOOR(p_bet_amount * 0.1)::INTEGER;
  
  RAISE NOTICE '🎰 STATS UPDATE START: user_id=%, game=%, bet=%, xp=%', 
    p_user_id, p_game_type, p_bet_amount, v_xp_gained;
  
  -- Get stats before (with SECURITY DEFINER, this should work)
  SELECT lifetime_xp, current_level_xp, total_games, roulette_games
  INTO v_stats_before
  FROM user_level_stats 
  WHERE user_id = p_user_id;
  
  IF v_stats_before IS NULL THEN
    RAISE NOTICE '🚨 USER NOT FOUND in user_level_stats: %', p_user_id;
    RETURN jsonb_build_object(
      'success', false,
      'error_message', 'User not found in user_level_stats',
      'user_id', p_user_id
    );
  END IF;
  
  RAISE NOTICE '📊 BEFORE: lifetime_xp=%, total_games=%, roulette_games=%', 
    v_stats_before.lifetime_xp, v_stats_before.total_games, v_stats_before.roulette_games;
  
  -- Update stats (SECURITY DEFINER bypasses RLS)
  UPDATE user_level_stats SET
    lifetime_xp = lifetime_xp + v_xp_gained,
    current_level_xp = current_level_xp + v_xp_gained,
    total_games = total_games + 1,
    total_wagered = total_wagered + p_bet_amount,
    total_profit = total_profit + p_profit,
    roulette_games = CASE WHEN p_game_type = 'roulette' THEN roulette_games + 1 ELSE roulette_games END,
    roulette_wagered = CASE WHEN p_game_type = 'roulette' THEN roulette_wagered + p_bet_amount ELSE roulette_wagered END,
    roulette_profit = CASE WHEN p_game_type = 'roulette' THEN roulette_profit + p_profit ELSE roulette_profit END,
    roulette_wins = CASE WHEN p_game_type = 'roulette' AND p_result = 'win' THEN roulette_wins + 1 ELSE roulette_wins END,
    total_wins = CASE WHEN p_result = 'win' THEN total_wins + 1 ELSE total_wins END,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Check if update worked
  IF NOT FOUND THEN
    RAISE NOTICE '🚨 UPDATE FAILED - no rows affected for user: %', p_user_id;
    RETURN jsonb_build_object(
      'success', false,
      'error_message', 'Update failed - no rows affected',
      'user_id', p_user_id
    );
  END IF;
  
  -- Insert game history
  INSERT INTO game_history (user_id, game_type, bet_amount, result, profit, game_data, created_at)
  VALUES (
    p_user_id, 
    p_game_type, 
    p_bet_amount, 
    p_result, 
    p_profit,
    jsonb_build_object(
      'bet_color', p_bet_color,
      'result_color', p_result_color,
      'xp_gained', v_xp_gained
    ),
    NOW()
  );
  
  -- Get stats after
  SELECT lifetime_xp, current_level_xp, total_games, roulette_games
  INTO v_stats_after
  FROM user_level_stats 
  WHERE user_id = p_user_id;
  
  RAISE NOTICE '📊 AFTER: lifetime_xp=%, total_games=%, roulette_games=%', 
    v_stats_after.lifetime_xp, v_stats_after.total_games, v_stats_after.roulette_games;
  
  RAISE NOTICE '✅ STATS UPDATE SUCCESS: XP gained=%, games added=%', 
    v_stats_after.lifetime_xp - v_stats_before.lifetime_xp,
    v_stats_after.total_games - v_stats_before.total_games;
  
  RETURN jsonb_build_object(
    'success', true,
    'method', 'security_definer_bypass_rls',
    'xp_gained', v_xp_gained,
    'stats_before', jsonb_build_object(
      'lifetime_xp', v_stats_before.lifetime_xp,
      'total_games', v_stats_before.total_games,
      'roulette_games', v_stats_before.roulette_games
    ),
    'stats_after', jsonb_build_object(
      'lifetime_xp', v_stats_after.lifetime_xp,
      'total_games', v_stats_after.total_games,
      'roulette_games', v_stats_after.roulette_games
    ),
    'changes', jsonb_build_object(
      'xp_gained', v_stats_after.lifetime_xp - v_stats_before.lifetime_xp,
      'games_added', v_stats_after.total_games - v_stats_before.total_games,
      'roulette_games_added', v_stats_after.roulette_games - v_stats_before.roulette_games
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '🚨 FUNCTION ERROR: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN jsonb_build_object(
      'success', false,
      'method', 'security_definer_bypass_rls',
      'error_message', SQLERRM,
      'sql_state', SQLSTATE,
      'context', 'SECURITY DEFINER function execution'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- Test the RLS bypass function
SELECT 
  'RLS_BYPASS_TEST' as test_name,
  public.update_user_stats_and_level(
    '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID,
    'roulette',
    10.0,
    'win',
    5.0,
    0,
    'red',
    'red'
  ) as result;