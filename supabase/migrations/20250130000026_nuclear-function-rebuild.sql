-- Nuclear option: Completely destroy and rebuild with a new name
-- This will avoid any caching or old function issues

-- 1. Drop ALL possible versions of the old function
DROP FUNCTION IF EXISTS public.update_user_stats_and_level CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC) CASCADE;

-- 2. Create a completely NEW function with a different name
CREATE OR REPLACE FUNCTION public.roulette_stats_update_v2(
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp_gained INTEGER;
  v_stats_before RECORD;
  v_stats_after RECORD;
BEGIN
  -- Calculate XP (1 XP per $10 bet)
  v_xp_gained := FLOOR(p_bet_amount * 0.1)::INTEGER;
  
  -- Get current stats for logging
  SELECT lifetime_xp, total_games, roulette_games 
  INTO v_stats_before
  FROM user_level_stats 
  WHERE user_id = p_user_id;
  
  -- Update stats using simple column references
  UPDATE user_level_stats
  SET 
    lifetime_xp = lifetime_xp + v_xp_gained,
    current_level_xp = current_level_xp + v_xp_gained,
    total_games = total_games + 1,
    total_wagered = total_wagered + p_bet_amount,
    total_profit = total_profit + p_profit,
    roulette_games = roulette_games + 1,
    roulette_wagered = roulette_wagered + p_bet_amount,
    roulette_profit = roulette_profit + p_profit,
    roulette_wins = CASE WHEN p_result = 'win' THEN roulette_wins + 1 ELSE roulette_wins END,
    total_wins = CASE WHEN p_result = 'win' THEN total_wins + 1 ELSE total_wins END,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Insert game history
  INSERT INTO game_history (
    user_id, game_type, bet_amount, result, profit, game_data, created_at
  ) VALUES (
    p_user_id, p_game_type, p_bet_amount, p_result, p_profit,
    jsonb_build_object(
      'bet_color', p_bet_color,
      'result_color', p_result_color,
      'xp_gained', v_xp_gained
    ),
    NOW()
  );
  
  -- Get updated stats
  SELECT lifetime_xp, total_games, roulette_games 
  INTO v_stats_after
  FROM user_level_stats 
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
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
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_message', SQLERRM,
      'sql_state', SQLSTATE,
      'context', 'roulette_stats_update_v2'
    );
END;
$$;

-- 3. Grant permissions to the new function
GRANT EXECUTE ON FUNCTION public.roulette_stats_update_v2(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roulette_stats_update_v2(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- 4. Create an alias with the old name that calls the new function
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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Just call the new working function
  RETURN public.roulette_stats_update_v2(
    p_user_id, p_game_type, p_bet_amount, p_result, p_profit, 
    p_streak_length, p_bet_color, p_result_color
  );
END;
$$;

-- Grant permissions to the alias
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- 5. Test both functions
SELECT 
  'NEW_FUNCTION_TEST' as test_type,
  public.roulette_stats_update_v2(
    '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID,
    'roulette', 10.0, 'win', 5.0, 0, 'red', 'red'
  ) as result
UNION ALL
SELECT 
  'OLD_NAME_TEST' as test_type,
  public.update_user_stats_and_level(
    '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID,
    'roulette', 5.0, 'loss', -5.0, 0, 'black', 'red'
  ) as result;