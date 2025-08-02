-- Fix lifetime_xp column error in update_user_stats_and_level function
-- The function is trying to update lifetime_xp in the wrong table

-- First, let's see what the current function looks like and fix it
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stats RECORD;
  new_xp INTEGER;
  xp_per_dollar NUMERIC := 0.1; -- 1 XP per $10 bet
  level_up_occurred BOOLEAN := FALSE;
  new_level INTEGER;
BEGIN
  -- 🎰 Enhanced logging for debugging
  RAISE NOTICE '🎰 STATS UPDATE START: User %, Game %, Bet $%, Result %', 
    p_user_id, p_game_type, p_bet_amount, p_result;
  
  -- Calculate XP gained (based on bet amount)
  new_xp := FLOOR(p_bet_amount * xp_per_dollar)::INTEGER;
  RAISE NOTICE '🎰 XP CALCULATION: $% * % = % XP', p_bet_amount, xp_per_dollar, new_xp;
  
  -- Get current stats from user_level_stats (the correct table)
  SELECT * INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE '🎰 ERROR: No user_level_stats record found for user %', p_user_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No user_level_stats record found'
    );
  END IF;
  
  RAISE NOTICE '🎰 BEFORE UPDATE: Level %, Lifetime XP %, Current XP %, Games %', 
    current_stats.current_level, current_stats.lifetime_xp, current_stats.current_level_xp, current_stats.total_games;
  
  -- Update user_level_stats table (this is where lifetime_xp actually exists)
  UPDATE public.user_level_stats
  SET 
    -- Update XP
    lifetime_xp = lifetime_xp + new_xp,
    current_level_xp = current_level_xp + new_xp,
    
    -- Update game-specific stats
    total_games = total_games + 1,
    total_wagered = total_wagered + p_bet_amount,
    total_profit = total_profit + p_profit,
    
    -- Update roulette-specific stats
    roulette_games = CASE WHEN p_game_type = 'roulette' THEN roulette_games + 1 ELSE roulette_games END,
    roulette_wagered = CASE WHEN p_game_type = 'roulette' THEN roulette_wagered + p_bet_amount ELSE roulette_wagered END,
    roulette_profit = CASE WHEN p_game_type = 'roulette' THEN roulette_profit + p_profit ELSE roulette_profit END,
    roulette_wins = CASE WHEN p_game_type = 'roulette' AND p_result = 'win' THEN roulette_wins + 1 ELSE roulette_wins END,
    
    -- Update color-specific wins for roulette
    roulette_red_wins = CASE WHEN p_game_type = 'roulette' AND p_result = 'win' AND p_bet_color = 'red' THEN roulette_red_wins + 1 ELSE roulette_red_wins END,
    roulette_black_wins = CASE WHEN p_game_type = 'roulette' AND p_result = 'win' AND p_bet_color = 'black' THEN roulette_black_wins + 1 ELSE roulette_black_wins END,
    roulette_green_wins = CASE WHEN p_game_type = 'roulette' AND p_result = 'win' AND p_bet_color = 'green' THEN roulette_green_wins + 1 ELSE roulette_green_wins END,
    
    -- Update general stats
    total_wins = CASE WHEN p_result = 'win' THEN total_wins + 1 ELSE total_wins END,
    biggest_win = CASE WHEN p_profit > biggest_win THEN p_profit ELSE biggest_win END,
    biggest_loss = CASE WHEN p_profit < 0 AND ABS(p_profit) > biggest_loss THEN ABS(p_profit) ELSE biggest_loss END,
    biggest_single_bet = CASE WHEN p_bet_amount > biggest_single_bet THEN p_bet_amount ELSE biggest_single_bet END,
    
    -- Update timestamp
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Insert into game_history table (using correct column name 'profit')
  INSERT INTO public.game_history (
    user_id,
    game_type,
    bet_amount,
    result,
    profit,  -- Correct column name from schema
    game_data,
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
      'xp_gained', new_xp
    ),
    NOW()
  );
  
  -- Get updated stats
  SELECT * INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  RAISE NOTICE '🎰 AFTER UPDATE: Level %, Lifetime XP %, Current XP %, Games %', 
    current_stats.current_level, current_stats.lifetime_xp, current_stats.current_level_xp, current_stats.total_games;
  
  RAISE NOTICE '🎰 STATS UPDATE COMPLETE: Success!';
  
  RETURN jsonb_build_object(
    'success', true,
    'xp_gained', new_xp,
    'new_lifetime_xp', current_stats.lifetime_xp,
    'new_total_games', current_stats.total_games,
    'level', current_stats.current_level
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '🎰 STATS UPDATE ERROR: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error_message', SQLERRM,
      'sql_state', SQLSTATE
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- Test the fixed function
SELECT '=== TESTING FIXED FUNCTION ===' as test_section;
SELECT public.update_user_stats_and_level(
  '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID,
  'roulette',
  10.0,
  'win',
  5.0,
  0,
  'red',
  'red'
) as test_result;

-- Check stats after test
SELECT '=== STATS AFTER FIX ===' as test_section;
SELECT 
  user_id,
  current_level,
  lifetime_xp,
  current_level_xp,
  total_games,
  roulette_games,
  roulette_wins,
  updated_at
FROM public.user_level_stats 
WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f';

-- Check recent game history
SELECT '=== RECENT GAME HISTORY ===' as test_section;
SELECT 
  id,
  game_type,
  bet_amount,
  result,
  profit,
  game_data,
  created_at
FROM public.game_history 
WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'
ORDER BY created_at DESC 
LIMIT 3;