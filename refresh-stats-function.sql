-- REFRESH STATS FUNCTION
-- Since the table structure is correct, let's refresh the function to clear any caching issues

-- Drop and recreate the function to clear any caching
DROP FUNCTION IF EXISTS public.update_user_stats_and_level CASCADE;

CREATE OR REPLACE FUNCTION public.update_user_stats_and_level(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount NUMERIC,
  p_result TEXT,
  p_profit NUMERIC,
  p_streak_length INTEGER DEFAULT 0,
  p_winning_color TEXT DEFAULT NULL,
  p_bet_color TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stats RECORD;
  new_xp INTEGER;
  old_level INTEGER;
  new_level INTEGER;
  is_win BOOLEAN;
  v_rows_affected INTEGER;
  new_roulette_streak INTEGER := 0;
BEGIN
  -- Log function call
  RAISE NOTICE '🎰 update_user_stats_and_level called: user=%, game=%, bet=%, result=%, profit=%', 
    p_user_id, p_game_type, p_bet_amount, p_result, p_profit;
  
  -- Determine if this is a win
  is_win := (p_result = 'win' OR p_result = 'cash_out') AND p_profit > 0;
  
  -- Ensure user has stats record
  INSERT INTO public.user_level_stats (user_id) 
  VALUES (p_user_id) 
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current stats
  SELECT * INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  IF current_stats IS NULL THEN
    RAISE EXCEPTION 'Failed to get user stats for user_id: %', p_user_id;
  END IF;
  
  -- Calculate XP and level
  old_level := COALESCE(current_stats.current_level, 1);
  new_xp := COALESCE(current_stats.lifetime_xp, 0) + GREATEST(1, p_bet_amount::INTEGER);
  new_level := GREATEST(1, new_xp / 1000);
  
  -- Calculate roulette streak
  IF p_game_type = 'roulette' THEN
    IF is_win THEN
      new_roulette_streak := COALESCE(current_stats.roulette_current_streak, 0) + 1;
    ELSE
      new_roulette_streak := 0;
    END IF;
  ELSE
    new_roulette_streak := COALESCE(current_stats.roulette_current_streak, 0);
  END IF;
  
  RAISE NOTICE '📈 Updating stats: old_level=%, new_level=%, new_xp=%, is_win=%', 
    old_level, new_level, new_xp, is_win;
  
  -- Update stats (using explicit column references)
  UPDATE public.user_level_stats 
  SET 
    -- Level data
    current_level = new_level,
    lifetime_xp = new_xp,
    current_level_xp = new_xp % 1000,
    xp_to_next_level = 1000 - (new_xp % 1000),
    
    -- Roulette stats
    roulette_games = CASE 
      WHEN p_game_type = 'roulette' THEN COALESCE(roulette_games, 0) + 1 
      ELSE COALESCE(roulette_games, 0) 
    END,
    roulette_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win THEN COALESCE(roulette_wins, 0) + 1 
      ELSE COALESCE(roulette_wins, 0) 
    END,
    roulette_wagered = CASE 
      WHEN p_game_type = 'roulette' THEN COALESCE(roulette_wagered, 0) + p_bet_amount 
      ELSE COALESCE(roulette_wagered, 0) 
    END,
    roulette_profit = CASE 
      WHEN p_game_type = 'roulette' THEN COALESCE(roulette_profit, 0) + p_profit 
      ELSE COALESCE(roulette_profit, 0) 
    END,
    
    -- Enhanced roulette stats
    roulette_highest_win = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_profit > COALESCE(roulette_highest_win, 0) 
      THEN p_profit 
      ELSE COALESCE(roulette_highest_win, 0) 
    END,
    roulette_green_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'green' 
      THEN COALESCE(roulette_green_wins, 0) + 1 
      ELSE COALESCE(roulette_green_wins, 0) 
    END,
    roulette_red_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'red' 
      THEN COALESCE(roulette_red_wins, 0) + 1 
      ELSE COALESCE(roulette_red_wins, 0) 
    END,
    roulette_black_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'black' 
      THEN COALESCE(roulette_black_wins, 0) + 1 
      ELSE COALESCE(roulette_black_wins, 0) 
    END,
    roulette_current_streak = new_roulette_streak,
    roulette_best_streak = CASE 
      WHEN p_game_type = 'roulette' AND new_roulette_streak > COALESCE(roulette_best_streak, 0) 
      THEN new_roulette_streak 
      ELSE COALESCE(roulette_best_streak, 0) 
    END,
    roulette_biggest_bet = CASE 
      WHEN p_game_type = 'roulette' AND p_bet_amount > COALESCE(roulette_biggest_bet, 0) 
      THEN p_bet_amount 
      ELSE COALESCE(roulette_biggest_bet, 0) 
    END,
    
    -- Overall stats
    total_games = COALESCE(total_games, 0) + 1,
    total_wins = CASE WHEN is_win THEN COALESCE(total_wins, 0) + 1 ELSE COALESCE(total_wins, 0) END,
    total_wagered = COALESCE(total_wagered, 0) + p_bet_amount,
    total_profit = COALESCE(total_profit, 0) + p_profit,
    biggest_win = CASE WHEN is_win AND p_profit > COALESCE(biggest_win, 0) THEN p_profit ELSE COALESCE(biggest_win, 0) END,
    biggest_loss = CASE WHEN NOT is_win AND ABS(p_profit) > COALESCE(biggest_loss, 0) THEN ABS(p_profit) ELSE COALESCE(biggest_loss, 0) END,
    
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  RAISE NOTICE '✅ Stats updated successfully: % rows affected', v_rows_affected;
  
  -- Insert game history
  INSERT INTO public.game_history (
    user_id, game_type, bet_amount, result, profit, created_at
  ) VALUES (
    p_user_id, p_game_type, p_bet_amount, p_result, p_profit, NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'method', 'refreshed_stats_function',
    'xp_gained', GREATEST(1, p_bet_amount::INTEGER),
    'leveled_up', new_level > old_level,
    'old_level', old_level,
    'new_level', new_level,
    'rows_affected', v_rows_affected,
    'is_win', is_win,
    'roulette_stats_updated', p_game_type = 'roulette'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error in update_user_stats_and_level: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'method', 'refreshed_stats_function',
      'error_message', SQLERRM,
      'sql_state', SQLSTATE,
      'user_id', p_user_id,
      'game_type', p_game_type,
      'bet_amount', p_bet_amount
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- Test the refreshed function
DO $$
DECLARE
  test_user_id UUID;
  test_result JSONB;
BEGIN
  -- Get a real user ID from your system
  SELECT user_id INTO test_user_id FROM public.user_level_stats LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE '🧪 Testing refreshed function with user: %', test_user_id;
    
    -- Test with a small roulette bet
    SELECT public.update_user_stats_and_level(
      test_user_id,
      'roulette',
      1.0,
      'win',
      1.0,
      0,
      'red',
      'red'
    ) INTO test_result;
    
    RAISE NOTICE '✅ Test result: %', test_result;
    
    IF (test_result->>'success')::BOOLEAN THEN
      RAISE NOTICE '🎉 SUCCESS! Function is working correctly now.';
    ELSE
      RAISE NOTICE '❌ STILL FAILED! Error: %', test_result->>'error_message';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ No users found for testing';
  END IF;
END $$;

SELECT 
  '🔄 STATS FUNCTION REFRESHED' as status,
  'Function has been dropped and recreated to clear any caching issues' as message;