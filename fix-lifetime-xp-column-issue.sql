-- FIX: Lifetime XP Column Issue in update_user_stats_and_level Function
-- This addresses the "column lifetime_xp does not exist" error

-- Step 1: Check what XP columns actually exist in user_level_stats
DO $$
DECLARE
  lifetime_xp_exists BOOLEAN;
  current_level_xp_exists BOOLEAN;
  xp_to_next_level_exists BOOLEAN;
BEGIN
  -- Check if lifetime_xp column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_level_stats' AND column_name = 'lifetime_xp'
  ) INTO lifetime_xp_exists;
  
  -- Check if current_level_xp column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_level_stats' AND column_name = 'current_level_xp'
  ) INTO current_level_xp_exists;
  
  -- Check if xp_to_next_level column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_level_stats' AND column_name = 'xp_to_next_level'
  ) INTO xp_to_next_level_exists;
  
  RAISE NOTICE '🔍 XP Column Status:';
  RAISE NOTICE '   - lifetime_xp: %', CASE WHEN lifetime_xp_exists THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '   - current_level_xp: %', CASE WHEN current_level_xp_exists THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '   - xp_to_next_level: %', CASE WHEN xp_to_next_level_exists THEN 'EXISTS' ELSE 'MISSING' END;
  
  -- Add missing XP columns if they don't exist
  IF NOT lifetime_xp_exists THEN
    RAISE NOTICE '➕ Adding missing lifetime_xp column...';
    ALTER TABLE public.user_level_stats ADD COLUMN lifetime_xp INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT current_level_xp_exists THEN
    RAISE NOTICE '➕ Adding missing current_level_xp column...';
    ALTER TABLE public.user_level_stats ADD COLUMN current_level_xp INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT xp_to_next_level_exists THEN
    RAISE NOTICE '➕ Adding missing xp_to_next_level column...';
    ALTER TABLE public.user_level_stats ADD COLUMN xp_to_next_level INTEGER NOT NULL DEFAULT 1000;
  END IF;
  
  RAISE NOTICE '✅ XP columns have been ensured in user_level_stats table';
END $$;

-- Step 2: Create a safer version of the update_user_stats_and_level function
-- This version checks for column existence and handles missing columns gracefully
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
  old_level_val INTEGER;
  new_level_val INTEGER;
  cases_to_add INTEGER := 0;
  did_level_up BOOLEAN := false;
  is_win BOOLEAN;
  new_roulette_streak INTEGER := 0;
  is_roulette_win BOOLEAN := false;
  v_rows_affected INTEGER;
  
  -- Column existence flags
  lifetime_xp_exists BOOLEAN;
  current_level_xp_exists BOOLEAN;
  xp_to_next_level_exists BOOLEAN;
BEGIN
  -- Log the function call for debugging
  RAISE NOTICE '🎰 update_user_stats_and_level called: user=%, game=%, bet=%, result=%, profit=%', 
    p_user_id, p_game_type, p_bet_amount, p_result, p_profit;
  
  -- Check which XP columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_level_stats' AND column_name = 'lifetime_xp'
  ) INTO lifetime_xp_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_level_stats' AND column_name = 'current_level_xp'
  ) INTO current_level_xp_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_level_stats' AND column_name = 'xp_to_next_level'
  ) INTO xp_to_next_level_exists;
  
  RAISE NOTICE '🔍 Column check: lifetime_xp=%, current_level_xp=%, xp_to_next_level=%', 
    lifetime_xp_exists, current_level_xp_exists, xp_to_next_level_exists;
  
  -- Determine if this is a win
  is_win := (p_result = 'win' OR p_result = 'cash_out') AND p_profit > 0;
  is_roulette_win := p_game_type = 'roulette' AND is_win;
  
  -- Get current stats
  SELECT * INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  -- If no stats exist, create them
  IF current_stats IS NULL THEN
    RAISE NOTICE '📊 Creating new user_level_stats record for user %', p_user_id;
    INSERT INTO public.user_level_stats (user_id) VALUES (p_user_id);
    SELECT * INTO current_stats FROM public.user_level_stats WHERE user_id = p_user_id;
  END IF;
  
  -- Get current level and XP safely
  old_level_val := COALESCE(current_stats.current_level, 1);
  
  -- Calculate new XP (1 XP per $1 wagered, minimum 1)
  IF lifetime_xp_exists THEN
    new_xp := COALESCE(current_stats.lifetime_xp, 0) + GREATEST(1, p_bet_amount::INTEGER);
  ELSE
    new_xp := GREATEST(1, p_bet_amount::INTEGER);
  END IF;
  
  RAISE NOTICE '📈 XP calculation: old=%, bet=%, new=%', 
    COALESCE(current_stats.lifetime_xp, 0), GREATEST(1, p_bet_amount::INTEGER), new_xp;
  
  -- Simple level calculation (every 1000 XP = 1 level)
  new_level_val := GREATEST(1, new_xp / 1000);
  
  -- Check if leveled up
  IF new_level_val > old_level_val THEN
    did_level_up := true;
    RAISE NOTICE '🎉 User leveled up from % to %!', old_level_val, new_level_val;
  END IF;
  
  -- Calculate roulette streak
  IF p_game_type = 'roulette' THEN
    IF is_roulette_win THEN
      new_roulette_streak := COALESCE(current_stats.roulette_current_streak, 0) + 1;
    ELSE
      new_roulette_streak := 0;
    END IF;
  ELSE
    new_roulette_streak := COALESCE(current_stats.roulette_current_streak, 0);
  END IF;
  
  RAISE NOTICE '🎲 Roulette stats update: is_win=%, winning_color=%, new_streak=%', 
    is_roulette_win, p_winning_color, new_roulette_streak;
  
  -- Build dynamic UPDATE statement based on which columns exist
  EXECUTE format('
    UPDATE public.user_level_stats 
    SET 
      current_level = %s,
      %s
      %s
      %s
      
      -- 🎰 ROULETTE STATS - This is the main fix!
      roulette_games = CASE WHEN %L = ''roulette'' THEN COALESCE(roulette_games, 0) + 1 ELSE COALESCE(roulette_games, 0) END,
      roulette_wins = CASE WHEN %L = ''roulette'' AND %s THEN COALESCE(roulette_wins, 0) + 1 ELSE COALESCE(roulette_wins, 0) END,
      roulette_wagered = CASE WHEN %L = ''roulette'' THEN COALESCE(roulette_wagered, 0) + %s ELSE COALESCE(roulette_wagered, 0) END,
      roulette_profit = CASE WHEN %L = ''roulette'' THEN COALESCE(roulette_profit, 0) + %s ELSE COALESCE(roulette_profit, 0) END,
      
      -- Enhanced roulette stats (with null checks)
      roulette_highest_win = CASE 
        WHEN %L = ''roulette'' AND %s AND %s > COALESCE(roulette_highest_win, 0) 
        THEN %s 
        ELSE COALESCE(roulette_highest_win, 0) 
      END,
      roulette_green_wins = CASE 
        WHEN %L = ''roulette'' AND %s AND %L = ''green'' 
        THEN COALESCE(roulette_green_wins, 0) + 1 
        ELSE COALESCE(roulette_green_wins, 0) 
      END,
      roulette_red_wins = CASE 
        WHEN %L = ''roulette'' AND %s AND %L = ''red'' 
        THEN COALESCE(roulette_red_wins, 0) + 1 
        ELSE COALESCE(roulette_red_wins, 0) 
      END,
      roulette_black_wins = CASE 
        WHEN %L = ''roulette'' AND %s AND %L = ''black'' 
        THEN COALESCE(roulette_black_wins, 0) + 1 
        ELSE COALESCE(roulette_black_wins, 0) 
      END,
      roulette_current_streak = %s,
      roulette_best_streak = CASE 
        WHEN %L = ''roulette'' AND %s > COALESCE(roulette_best_streak, 0) 
        THEN %s 
        ELSE COALESCE(roulette_best_streak, 0) 
      END,
      
      -- Overall stats
      total_games = COALESCE(total_games, 0) + 1,
      total_wins = CASE WHEN %s THEN COALESCE(total_wins, 0) + 1 ELSE COALESCE(total_wins, 0) END,
      total_wagered = COALESCE(total_wagered, 0) + %s,
      total_profit = COALESCE(total_profit, 0) + %s,
      
      updated_at = now()
    WHERE user_id = %L',
    new_level_val,
    CASE WHEN lifetime_xp_exists THEN format('lifetime_xp = %s,', new_xp) ELSE '' END,
    CASE WHEN current_level_xp_exists THEN format('current_level_xp = %s,', new_xp % 1000) ELSE '' END,
    CASE WHEN xp_to_next_level_exists THEN format('xp_to_next_level = %s,', 1000 - (new_xp % 1000)) ELSE '' END,
    p_game_type, p_game_type, is_win, p_game_type, p_bet_amount, p_game_type, p_profit,
    p_game_type, is_win, p_profit, p_profit,
    p_game_type, is_win, p_winning_color,
    p_game_type, is_win, p_winning_color,
    p_game_type, is_win, p_winning_color,
    new_roulette_streak,
    p_game_type, new_roulette_streak, new_roulette_streak,
    is_win, p_bet_amount, p_profit,
    p_user_id
  );
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  RAISE NOTICE '✅ Stats updated successfully for user % (% rows affected)', p_user_id, v_rows_affected;
  
  -- Insert into game_history for tracking
  INSERT INTO public.game_history (
    user_id,
    game_type,
    bet_amount,
    result,
    profit,
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
      'winning_color', p_winning_color,
      'xp_gained', GREATEST(1, p_bet_amount::INTEGER),
      'leveled_up', did_level_up,
      'old_level', old_level_val,
      'new_level', new_level_val
    ),
    NOW()
  );

  -- Return comprehensive results
  RETURN jsonb_build_object(
    'success', true,
    'method', 'safe_roulette_stats_update',
    'xp_gained', GREATEST(1, p_bet_amount::INTEGER),
    'leveled_up', did_level_up,
    'old_level', old_level_val,
    'new_level', new_level_val,
    'cases_earned', cases_to_add,
    'rows_affected', v_rows_affected,
    'roulette_stats_updated', p_game_type = 'roulette',
    'is_win', is_win,
    'winning_color', p_winning_color,
    'new_roulette_streak', new_roulette_streak,
    'columns_found', jsonb_build_object(
      'lifetime_xp', lifetime_xp_exists,
      'current_level_xp', current_level_xp_exists,
      'xp_to_next_level', xp_to_next_level_exists
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error in update_user_stats_and_level: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'method', 'safe_roulette_stats_update',
      'error_message', SQLERRM,
      'sql_state', SQLSTATE,
      'user_id', p_user_id,
      'game_type', p_game_type,
      'bet_amount', p_bet_amount,
      'columns_checked', jsonb_build_object(
        'lifetime_xp', lifetime_xp_exists,
        'current_level_xp', current_level_xp_exists,
        'xp_to_next_level', xp_to_next_level_exists
      )
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- Step 3: Test the fixed function
DO $$
DECLARE
  test_user_id UUID;
  test_result JSONB;
BEGIN
  -- Get a test user ID
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE '🧪 Testing fixed roulette stats function with user: %', test_user_id;
    
    -- Test a roulette bet
    SELECT public.update_user_stats_and_level(
      test_user_id,
      'roulette',
      10.0,
      'win',
      5.0,
      0,
      'red',
      'red'
    ) INTO test_result;
    
    RAISE NOTICE '✅ Test result: %', test_result;
    
    IF (test_result->>'success')::BOOLEAN THEN
      RAISE NOTICE '🎉 SUCCESS! Function is working correctly now.';
    ELSE
      RAISE NOTICE '❌ FAILED! Error: %', test_result->>'error_message';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ No test user found, skipping function test';
  END IF;
END $$;

SELECT 
  '🔧 LIFETIME XP COLUMN FIX COMPLETE' as status,
  'The function now safely handles missing XP columns' as message;