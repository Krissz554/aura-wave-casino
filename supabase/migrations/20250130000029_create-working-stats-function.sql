-- Create working stats function based on exact database schema
-- The schema shows user_level_stats DOES have lifetime_xp and all needed columns

-- Drop any existing broken functions
DROP FUNCTION IF EXISTS public.update_user_stats_and_level CASCADE;
DROP FUNCTION IF EXISTS public.roulette_stats_update_v2 CASCADE;

-- Create the working function using the exact schema
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
  v_user_exists BOOLEAN;
  v_stats_before RECORD;
  v_stats_after RECORD;
BEGIN
  -- Calculate XP (1 XP per $10 bet)
  v_xp_gained := FLOOR(p_bet_amount * 0.1)::INTEGER;
  
  -- Check if user exists in user_level_stats
  SELECT EXISTS(
    SELECT 1 FROM user_level_stats WHERE user_id = p_user_id
  ) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_message', 'User not found in user_level_stats table',
      'user_id', p_user_id
    );
  END IF;
  
  -- Get current stats
  SELECT 
    lifetime_xp, 
    current_level_xp, 
    total_games, 
    roulette_games,
    total_wagered,
    total_profit,
    roulette_wagered,
    roulette_profit,
    roulette_wins,
    total_wins
  INTO v_stats_before
  FROM user_level_stats 
  WHERE user_id = p_user_id;
  
  -- Update user_level_stats using the exact column names from schema
  UPDATE user_level_stats
  SET 
    -- XP columns (confirmed in schema)
    lifetime_xp = lifetime_xp + v_xp_gained,
    current_level_xp = current_level_xp + v_xp_gained,
    
    -- Game totals (confirmed in schema)
    total_games = total_games + 1,
    total_wagered = total_wagered + p_bet_amount,
    total_profit = total_profit + p_profit,
    
    -- Roulette specific (confirmed in schema)
    roulette_games = CASE WHEN p_game_type = 'roulette' THEN roulette_games + 1 ELSE roulette_games END,
    roulette_wagered = CASE WHEN p_game_type = 'roulette' THEN roulette_wagered + p_bet_amount ELSE roulette_wagered END,
    roulette_profit = CASE WHEN p_game_type = 'roulette' THEN roulette_profit + p_profit ELSE roulette_profit END,
    roulette_wins = CASE WHEN p_game_type = 'roulette' AND p_result = 'win' THEN roulette_wins + 1 ELSE roulette_wins END,
    
    -- Color-specific wins (confirmed in schema)
    roulette_red_wins = CASE WHEN p_game_type = 'roulette' AND p_result = 'win' AND p_bet_color = 'red' THEN roulette_red_wins + 1 ELSE roulette_red_wins END,
    roulette_black_wins = CASE WHEN p_game_type = 'roulette' AND p_result = 'win' AND p_bet_color = 'black' THEN roulette_black_wins + 1 ELSE roulette_black_wins END,
    roulette_green_wins = CASE WHEN p_game_type = 'roulette' AND p_result = 'win' AND p_bet_color = 'green' THEN roulette_green_wins + 1 ELSE roulette_green_wins END,
    
    -- Win tracking (confirmed in schema)
    total_wins = CASE WHEN p_result = 'win' THEN total_wins + 1 ELSE total_wins END,
    biggest_win = CASE WHEN p_profit > biggest_win THEN p_profit ELSE biggest_win END,
    biggest_loss = CASE WHEN p_profit < 0 AND ABS(p_profit) > biggest_loss THEN ABS(p_profit) ELSE biggest_loss END,
    biggest_single_bet = CASE WHEN p_bet_amount > biggest_single_bet THEN p_bet_amount ELSE biggest_single_bet END,
    roulette_biggest_bet = CASE WHEN p_game_type = 'roulette' AND p_bet_amount > roulette_biggest_bet THEN p_bet_amount ELSE roulette_biggest_bet END,
    roulette_highest_win = CASE WHEN p_game_type = 'roulette' AND p_profit > roulette_highest_win THEN p_profit ELSE roulette_highest_win END,
    roulette_highest_loss = CASE WHEN p_game_type = 'roulette' AND p_profit < 0 AND ABS(p_profit) > roulette_highest_loss THEN ABS(p_profit) ELSE roulette_highest_loss END,
    
    -- Timestamp (confirmed in schema)
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Insert into game_history (using exact schema columns)
  INSERT INTO game_history (
    user_id,
    game_type,
    bet_amount,
    result,
    profit,
    game_data,
    streak_length,
    action,
    created_at
  ) VALUES (
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
    p_streak_length,
    'completed',
    NOW()
  );
  
  -- Get updated stats
  SELECT 
    lifetime_xp, 
    current_level_xp, 
    total_games, 
    roulette_games
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
    ),
    'changes', jsonb_build_object(
      'xp_gained', v_xp_gained,
      'games_added', 1,
      'roulette_games_added', CASE WHEN p_game_type = 'roulette' THEN 1 ELSE 0 END
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_message', SQLERRM,
      'sql_state', SQLSTATE,
      'context', 'update_user_stats_and_level'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- Test the function immediately
SELECT 
  'FINAL_TEST' as test_name,
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