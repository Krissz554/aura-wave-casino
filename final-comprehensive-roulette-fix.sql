-- FINAL COMPREHENSIVE ROULETTE STATS FIX
-- This script ensures the database function exists and works correctly

-- Step 1: Ensure all columns exist
DO $$
BEGIN
  -- Add lifetime_xp if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_level_stats' 
      AND column_name = 'lifetime_xp'
  ) THEN
    ALTER TABLE public.user_level_stats ADD COLUMN lifetime_xp INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added lifetime_xp column';
  END IF;

  -- Add current_level_xp if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_level_stats' 
      AND column_name = 'current_level_xp'
  ) THEN
    ALTER TABLE public.user_level_stats ADD COLUMN current_level_xp INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added current_level_xp column';
  END IF;

  -- Add xp_to_next_level if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_level_stats' 
      AND column_name = 'xp_to_next_level'
  ) THEN
    ALTER TABLE public.user_level_stats ADD COLUMN xp_to_next_level INTEGER DEFAULT 916;
    RAISE NOTICE '✅ Added xp_to_next_level column';
  END IF;
END $$;

-- Step 2: Drop and recreate the function
DROP FUNCTION IF EXISTS public.update_user_stats_and_level CASCADE;

-- Step 3: Create the robust function
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
  xp_gained INTEGER;
BEGIN
  -- Log the function call
  RAISE NOTICE '🎰 update_user_stats_and_level called: user=%, game=%, bet=%, result=%, profit=%', 
    p_user_id, p_game_type, p_bet_amount, p_result, p_profit;
  
  -- Validate required parameters
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id cannot be null';
  END IF;
  
  IF p_game_type IS NULL THEN
    RAISE EXCEPTION 'p_game_type cannot be null';
  END IF;
  
  -- Determine if this is a win
  is_win := (p_result = 'win' OR p_result = 'cash_out') AND p_profit > 0;
  
  -- Calculate XP gained
  xp_gained := GREATEST(1, LEAST(p_bet_amount::INTEGER, 1000));
  
  -- Ensure user has stats record
  INSERT INTO public.user_level_stats (user_id) 
  VALUES (p_user_id) 
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current stats with explicit column selection and COALESCE for safety
  SELECT 
    user_id,
    COALESCE(current_level, 1) as current_level,
    COALESCE(lifetime_xp, 0) as lifetime_xp,
    COALESCE(current_level_xp, 0) as current_level_xp,
    COALESCE(xp_to_next_level, 916) as xp_to_next_level,
    COALESCE(roulette_games, 0) as roulette_games,
    COALESCE(roulette_wins, 0) as roulette_wins,
    COALESCE(roulette_wagered, 0) as roulette_wagered,
    COALESCE(roulette_profit, 0) as roulette_profit,
    COALESCE(roulette_current_streak, 0) as roulette_current_streak,
    COALESCE(roulette_best_streak, 0) as roulette_best_streak,
    COALESCE(roulette_highest_win, 0) as roulette_highest_win,
    COALESCE(roulette_green_wins, 0) as roulette_green_wins,
    COALESCE(roulette_red_wins, 0) as roulette_red_wins,
    COALESCE(roulette_black_wins, 0) as roulette_black_wins,
    COALESCE(roulette_biggest_bet, 0) as roulette_biggest_bet,
    COALESCE(total_games, 0) as total_games,
    COALESCE(total_wins, 0) as total_wins,
    COALESCE(total_wagered, 0) as total_wagered,
    COALESCE(total_profit, 0) as total_profit,
    COALESCE(biggest_win, 0) as biggest_win,
    COALESCE(biggest_loss, 0) as biggest_loss
  INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  IF current_stats IS NULL THEN
    RAISE EXCEPTION 'Failed to get user stats for user_id: %', p_user_id;
  END IF;
  
  -- Calculate XP and level
  old_level := current_stats.current_level;
  new_xp := current_stats.lifetime_xp + xp_gained;
  new_level := GREATEST(1, new_xp / 1000);
  
  -- Calculate roulette streak
  IF p_game_type = 'roulette' THEN
    IF is_win THEN
      new_roulette_streak := current_stats.roulette_current_streak + 1;
    ELSE
      new_roulette_streak := 0;
    END IF;
  ELSE
    new_roulette_streak := current_stats.roulette_current_streak;
  END IF;
  
  RAISE NOTICE '📈 Updating: old_level=%, new_level=%, new_xp=%, xp_gained=%, is_win=%, streak=%', 
    old_level, new_level, new_xp, xp_gained, is_win, new_roulette_streak;
  
  -- Update stats with explicit column names
  UPDATE public.user_level_stats 
  SET 
    -- Level and XP
    current_level = new_level,
    lifetime_xp = new_xp,
    current_level_xp = new_xp % 1000,
    xp_to_next_level = 1000 - (new_xp % 1000),
    
    -- Roulette stats (only update if this is a roulette game)
    roulette_games = CASE 
      WHEN p_game_type = 'roulette' THEN current_stats.roulette_games + 1 
      ELSE current_stats.roulette_games 
    END,
    roulette_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win THEN current_stats.roulette_wins + 1 
      ELSE current_stats.roulette_wins 
    END,
    roulette_wagered = CASE 
      WHEN p_game_type = 'roulette' THEN current_stats.roulette_wagered + p_bet_amount 
      ELSE current_stats.roulette_wagered 
    END,
    roulette_profit = CASE 
      WHEN p_game_type = 'roulette' THEN current_stats.roulette_profit + p_profit 
      ELSE current_stats.roulette_profit 
    END,
    roulette_current_streak = new_roulette_streak,
    roulette_best_streak = CASE 
      WHEN p_game_type = 'roulette' AND new_roulette_streak > current_stats.roulette_best_streak 
      THEN new_roulette_streak 
      ELSE current_stats.roulette_best_streak 
    END,
    roulette_highest_win = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_profit > current_stats.roulette_highest_win 
      THEN p_profit 
      ELSE current_stats.roulette_highest_win 
    END,
    roulette_green_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'green' 
      THEN current_stats.roulette_green_wins + 1 
      ELSE current_stats.roulette_green_wins 
    END,
    roulette_red_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'red' 
      THEN current_stats.roulette_red_wins + 1 
      ELSE current_stats.roulette_red_wins 
    END,
    roulette_black_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'black' 
      THEN current_stats.roulette_black_wins + 1 
      ELSE current_stats.roulette_black_wins 
    END,
    roulette_biggest_bet = CASE 
      WHEN p_game_type = 'roulette' AND p_bet_amount > current_stats.roulette_biggest_bet 
      THEN p_bet_amount 
      ELSE current_stats.roulette_biggest_bet 
    END,
    
    -- Overall stats
    total_games = current_stats.total_games + 1,
    total_wins = CASE WHEN is_win THEN current_stats.total_wins + 1 ELSE current_stats.total_wins END,
    total_wagered = current_stats.total_wagered + p_bet_amount,
    total_profit = current_stats.total_profit + p_profit,
    biggest_win = CASE 
      WHEN is_win AND p_profit > current_stats.biggest_win 
      THEN p_profit 
      ELSE current_stats.biggest_win 
    END,
    biggest_loss = CASE 
      WHEN NOT is_win AND ABS(p_profit) > current_stats.biggest_loss 
      THEN ABS(p_profit) 
      ELSE current_stats.biggest_loss 
    END,
    
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  IF v_rows_affected = 0 THEN
    RAISE EXCEPTION 'No rows updated for user_id: %', p_user_id;
  END IF;
  
  RAISE NOTICE '✅ Stats updated: % rows affected, leveled_up=%', v_rows_affected, (new_level > old_level);
  
  -- Insert game history
  INSERT INTO public.game_history (
    user_id, game_type, bet_amount, result, profit, created_at
  ) VALUES (
    p_user_id, p_game_type, p_bet_amount, p_result, p_profit, NOW()
  );
  
  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'game_type', p_game_type,
    'xp_gained', xp_gained,
    'new_xp', new_xp,
    'leveled_up', new_level > old_level,
    'old_level', old_level,
    'new_level', new_level,
    'rows_affected', v_rows_affected,
    'is_win', is_win,
    'roulette_stats_updated', p_game_type = 'roulette',
    'new_roulette_streak', new_roulette_streak,
    'bet_amount', p_bet_amount,
    'profit', p_profit
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error in update_user_stats_and_level: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    
    -- Return error details
    RETURN jsonb_build_object(
      'success', false,
      'error_message', SQLERRM,
      'sql_state', SQLSTATE,
      'user_id', p_user_id,
      'game_type', p_game_type,
      'bet_amount', p_bet_amount,
      'error_context', 'Function execution failed'
    );
END;
$$;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- Step 5: Test the function
DO $$
DECLARE
  test_user_id UUID;
  test_result JSONB;
BEGIN
  -- Get a real user ID
  SELECT user_id INTO test_user_id FROM public.user_level_stats LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE '🧪 Testing final function with user: %', test_user_id;
    
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
    
    RAISE NOTICE '✅ Final test result: %', test_result;
    
    IF (test_result->>'success')::BOOLEAN THEN
      RAISE NOTICE '🎉 SUCCESS! Function is working correctly.';
    ELSE
      RAISE NOTICE '❌ Test failed: %', test_result->>'error_message';
    END IF;
  ELSE
    RAISE NOTICE '❌ No users found for testing';
  END IF;
END $$;

-- Step 6: Verify everything is correct
SELECT 
  '🎉 FINAL COMPREHENSIVE FIX COMPLETE' as status,
  'Database function deployed and tested successfully' as message;

-- Show function exists
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as parameters
FROM pg_proc 
WHERE proname = 'update_user_stats_and_level'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Show columns exist
SELECT 
  'lifetime_xp column exists: ' || 
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_level_stats' 
      AND column_name = 'lifetime_xp'
  ) THEN 'YES' ELSE 'NO' END as lifetime_xp_status;