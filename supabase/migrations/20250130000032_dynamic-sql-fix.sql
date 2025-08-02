-- Dynamic SQL approach to bypass PostgreSQL context issues
-- Sometimes PL/pgSQL has issues with column references in certain contexts

-- Drop existing broken functions
DROP FUNCTION IF EXISTS public.update_user_stats_and_level CASCADE;

-- Create function using dynamic SQL to avoid context issues
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
DECLARE
  v_xp_gained INTEGER;
  v_sql TEXT;
  v_result RECORD;
  v_stats_before RECORD;
  v_stats_after RECORD;
BEGIN
  -- Calculate XP
  v_xp_gained := FLOOR(p_bet_amount * 0.1)::INTEGER;
  
  -- Get stats before using dynamic SQL
  v_sql := 'SELECT lifetime_xp, current_level_xp, total_games, roulette_games FROM user_level_stats WHERE user_id = $1';
  EXECUTE v_sql INTO v_stats_before USING p_user_id;
  
  IF v_stats_before IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_message', 'User not found in user_level_stats',
      'user_id', p_user_id
    );
  END IF;
  
  -- Build dynamic UPDATE SQL
  v_sql := 'UPDATE user_level_stats SET ' ||
    'lifetime_xp = lifetime_xp + $1, ' ||
    'current_level_xp = current_level_xp + $1, ' ||
    'total_games = total_games + 1, ' ||
    'total_wagered = total_wagered + $2, ' ||
    'total_profit = total_profit + $3, ' ||
    'roulette_games = CASE WHEN $4 = ''roulette'' THEN roulette_games + 1 ELSE roulette_games END, ' ||
    'roulette_wagered = CASE WHEN $4 = ''roulette'' THEN roulette_wagered + $2 ELSE roulette_wagered END, ' ||
    'roulette_profit = CASE WHEN $4 = ''roulette'' THEN roulette_profit + $3 ELSE roulette_profit END, ' ||
    'roulette_wins = CASE WHEN $4 = ''roulette'' AND $5 = ''win'' THEN roulette_wins + 1 ELSE roulette_wins END, ' ||
    'total_wins = CASE WHEN $5 = ''win'' THEN total_wins + 1 ELSE total_wins END, ' ||
    'updated_at = NOW() ' ||
    'WHERE user_id = $6';
  
  -- Execute the dynamic UPDATE
  EXECUTE v_sql USING v_xp_gained, p_bet_amount, p_profit, p_game_type, p_result, p_user_id;
  
  -- Insert game history using dynamic SQL
  v_sql := 'INSERT INTO game_history (user_id, game_type, bet_amount, result, profit, game_data, created_at) ' ||
    'VALUES ($1, $2, $3, $4, $5, $6, NOW())';
  
  EXECUTE v_sql USING 
    p_user_id, 
    p_game_type, 
    p_bet_amount, 
    p_result, 
    p_profit,
    jsonb_build_object(
      'bet_color', p_bet_color,
      'result_color', p_result_color,
      'xp_gained', v_xp_gained
    );
  
  -- Get stats after using dynamic SQL
  EXECUTE 'SELECT lifetime_xp, current_level_xp, total_games, roulette_games FROM user_level_stats WHERE user_id = $1' 
    INTO v_stats_after USING p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'method', 'dynamic_sql',
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
    RETURN jsonb_build_object(
      'success', false,
      'method', 'dynamic_sql',
      'error_message', SQLERRM,
      'sql_state', SQLSTATE,
      'context', 'Dynamic SQL execution'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- Test the dynamic SQL function
SELECT 
  'DYNAMIC_SQL_TEST' as test_name,
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