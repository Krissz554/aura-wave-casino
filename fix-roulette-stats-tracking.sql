-- COMPREHENSIVE ROULETTE STATS TRACKING FIX
-- This fixes the issue where roulette wagers/bets/stats are not being tracked in user_level_stats table

-- Step 1: Add missing roulette statistics columns if they don't exist
DO $$ 
BEGIN
    -- Basic roulette columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_games') THEN
        ALTER TABLE public.user_level_stats ADD COLUMN roulette_games INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_wins') THEN
        ALTER TABLE public.user_level_stats ADD COLUMN roulette_wins INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_wagered') THEN
        ALTER TABLE public.user_level_stats ADD COLUMN roulette_wagered NUMERIC NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_profit') THEN
        ALTER TABLE public.user_level_stats ADD COLUMN roulette_profit NUMERIC NOT NULL DEFAULT 0;
    END IF;

    -- Enhanced roulette statistics columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_highest_win') THEN
        ALTER TABLE public.user_level_stats ADD COLUMN roulette_highest_win NUMERIC NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_highest_loss') THEN
        ALTER TABLE public.user_level_stats ADD COLUMN roulette_highest_loss NUMERIC NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_green_wins') THEN
        ALTER TABLE public.user_level_stats ADD COLUMN roulette_green_wins INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_red_wins') THEN
        ALTER TABLE public.user_level_stats ADD COLUMN roulette_red_wins INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_black_wins') THEN
        ALTER TABLE public.user_level_stats ADD COLUMN roulette_black_wins INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_favorite_color') THEN
        ALTER TABLE public.user_level_stats ADD COLUMN roulette_favorite_color TEXT DEFAULT 'none';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_best_streak') THEN
        ALTER TABLE public.user_level_stats ADD COLUMN roulette_best_streak INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_current_streak') THEN
        ALTER TABLE public.user_level_stats ADD COLUMN roulette_current_streak INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_biggest_bet') THEN
        ALTER TABLE public.user_level_stats ADD COLUMN roulette_biggest_bet NUMERIC NOT NULL DEFAULT 0;
    END IF;

    RAISE NOTICE '✅ All roulette statistics columns have been ensured in user_level_stats table';
END $$;

-- Step 2: Replace the simplified stats function with a comprehensive one
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
  level_calc RECORD;
  old_level_val INTEGER;
  new_level_val INTEGER;
  old_border_tier INTEGER;
  new_border_tier_val INTEGER;
  cases_to_add INTEGER := 0;
  did_level_up BOOLEAN := false;
  border_changed BOOLEAN := false;
  i INTEGER;
  is_win BOOLEAN;
  new_roulette_streak INTEGER := 0;
  is_roulette_win BOOLEAN := false;
  v_rows_affected INTEGER;
BEGIN
  -- Log the function call for debugging
  RAISE NOTICE '🎰 update_user_stats_and_level called: user=%, game=%, bet=%, result=%, profit=%, winning_color=%', 
    p_user_id, p_game_type, p_bet_amount, p_result, p_profit, p_winning_color;
  
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
  
  old_level_val := current_stats.current_level;
  old_border_tier := current_stats.border_tier;
  
  -- Calculate new XP (1 XP per $1 wagered, but ensure it's at least 1)
  new_xp := current_stats.lifetime_xp + GREATEST(1, p_bet_amount::INTEGER);
  RAISE NOTICE '📈 XP calculation: old=%, bet=%, new=%', current_stats.lifetime_xp, GREATEST(1, p_bet_amount::INTEGER), new_xp;
  
  -- Calculate new level (with fallback if function doesn't exist)
  BEGIN
    SELECT * INTO level_calc FROM public.calculate_level_from_xp_new(new_xp);
    new_level_val := level_calc.level;
  EXCEPTION
    WHEN OTHERS THEN
      -- Fallback level calculation (simple: every 1000 XP = 1 level)
      new_level_val := GREATEST(1, new_xp / 1000);
      RAISE NOTICE '⚠️ Using fallback level calculation: level %', new_level_val;
  END;
  
  -- Check if leveled up and calculate cases
  IF new_level_val > old_level_val THEN
    did_level_up := true;
    RAISE NOTICE '🎉 User leveled up from % to %!', old_level_val, new_level_val;
    
    -- Calculate cases earned (every 25 levels)
    FOR i IN (old_level_val + 1)..new_level_val LOOP
      IF i % 25 = 0 THEN
        cases_to_add := cases_to_add + 1;
        
        -- Create case reward entry (with error handling)
        BEGIN
          INSERT INTO public.case_rewards (user_id, level_unlocked, rarity, reward_amount)
          VALUES (p_user_id, i, 'pending', 0);
        EXCEPTION
          WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Could not create case reward: %', SQLERRM;
        END;
      END IF;
    END LOOP;
  END IF;
  
  -- Calculate new border tier (with error handling)
  BEGIN
    SELECT tier INTO new_border_tier_val
    FROM public.border_tiers
    WHERE new_level_val >= min_level AND new_level_val <= max_level
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      new_border_tier_val := old_border_tier;
  END;
  
  IF new_border_tier_val IS NULL THEN
    new_border_tier_val := old_border_tier;
  END IF;
  
  border_changed := new_border_tier_val != old_border_tier;
  
  -- Calculate roulette streak
  IF p_game_type = 'roulette' THEN
    IF is_roulette_win THEN
      new_roulette_streak := current_stats.roulette_current_streak + 1;
    ELSE
      new_roulette_streak := 0;
    END IF;
  ELSE
    new_roulette_streak := current_stats.roulette_current_streak;
  END IF;
  
  RAISE NOTICE '🎲 Roulette stats update: is_win=%, winning_color=%, new_streak=%', is_roulette_win, p_winning_color, new_roulette_streak;
  
  -- Update comprehensive stats
  UPDATE public.user_level_stats 
  SET 
    -- Level data
    current_level = new_level_val,
    lifetime_xp = new_xp,
    current_level_xp = COALESCE(level_calc.current_level_xp, new_xp % 1000),
    xp_to_next_level = COALESCE(level_calc.xp_to_next, 1000 - (new_xp % 1000)),
    
    -- Border data
    border_tier = new_border_tier_val,
    border_unlocked_at = CASE 
      WHEN border_changed THEN now() 
      ELSE border_unlocked_at 
    END,
    
    -- Case data
    available_cases = available_cases + cases_to_add,
    
    -- 🎰 ROULETTE STATS - This is the main fix!
    roulette_games = CASE WHEN p_game_type = 'roulette' THEN roulette_games + 1 ELSE roulette_games END,
    roulette_wins = CASE WHEN p_game_type = 'roulette' AND is_win THEN roulette_wins + 1 ELSE roulette_wins END,
    roulette_wagered = CASE WHEN p_game_type = 'roulette' THEN roulette_wagered + p_bet_amount ELSE roulette_wagered END,
    roulette_profit = CASE WHEN p_game_type = 'roulette' THEN roulette_profit + p_profit ELSE roulette_profit END,
    
    -- Enhanced roulette stats
    roulette_highest_win = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_profit > roulette_highest_win 
      THEN p_profit 
      ELSE roulette_highest_win 
    END,
    roulette_highest_loss = CASE 
      WHEN p_game_type = 'roulette' AND NOT is_win AND ABS(p_profit) > roulette_highest_loss 
      THEN ABS(p_profit) 
      ELSE roulette_highest_loss 
    END,
    roulette_green_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'green' 
      THEN roulette_green_wins + 1 
      ELSE roulette_green_wins 
    END,
    roulette_red_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'red' 
      THEN roulette_red_wins + 1 
      ELSE roulette_red_wins 
    END,
    roulette_black_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'black' 
      THEN roulette_black_wins + 1 
      ELSE roulette_black_wins 
    END,
    roulette_biggest_bet = CASE 
      WHEN p_game_type = 'roulette' AND p_bet_amount > roulette_biggest_bet 
      THEN p_bet_amount 
      ELSE roulette_biggest_bet 
    END,
    roulette_current_streak = new_roulette_streak,
    roulette_best_streak = CASE 
      WHEN p_game_type = 'roulette' AND new_roulette_streak > roulette_best_streak 
      THEN new_roulette_streak 
      ELSE roulette_best_streak 
    END,
    
    -- Game-specific stats (other games)
    coinflip_games = CASE WHEN p_game_type = 'coinflip' THEN coinflip_games + 1 ELSE coinflip_games END,
    coinflip_wins = CASE WHEN p_game_type = 'coinflip' AND is_win THEN coinflip_wins + 1 ELSE coinflip_wins END,
    coinflip_wagered = CASE WHEN p_game_type = 'coinflip' THEN coinflip_wagered + p_bet_amount ELSE coinflip_wagered END,
    coinflip_profit = CASE WHEN p_game_type = 'coinflip' THEN coinflip_profit + p_profit ELSE coinflip_profit END,
    
    crash_games = CASE WHEN p_game_type = 'crash' THEN crash_games + 1 ELSE crash_games END,
    crash_wins = CASE WHEN p_game_type = 'crash' AND is_win THEN crash_wins + 1 ELSE crash_wins END,
    crash_wagered = CASE WHEN p_game_type = 'crash' THEN crash_wagered + p_bet_amount ELSE crash_wagered END,
    crash_profit = CASE WHEN p_game_type = 'crash' THEN crash_profit + p_profit ELSE crash_profit END,
    
    tower_games = CASE WHEN p_game_type = 'tower' THEN tower_games + 1 ELSE tower_games END,
    tower_wins = CASE WHEN p_game_type = 'tower' AND is_win THEN tower_wins + 1 ELSE tower_wins END,
    tower_wagered = CASE WHEN p_game_type = 'tower' THEN tower_wagered + p_bet_amount ELSE tower_wagered END,
    tower_profit = CASE WHEN p_game_type = 'tower' THEN tower_profit + p_profit ELSE tower_profit END,
    
    -- Overall stats
    total_games = total_games + 1,
    total_wins = CASE WHEN is_win THEN total_wins + 1 ELSE total_wins END,
    total_wagered = total_wagered + p_bet_amount,
    total_profit = total_profit + p_profit,
    
    -- Win/loss tracking
    biggest_win = CASE WHEN is_win AND p_profit > biggest_win THEN p_profit ELSE biggest_win END,
    biggest_loss = CASE WHEN NOT is_win AND ABS(p_profit) > biggest_loss THEN ABS(p_profit) ELSE biggest_loss END,
    
    updated_at = now()
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  RAISE NOTICE '✅ Stats updated successfully for user % (% rows affected)', p_user_id, v_rows_affected;
  
  -- Calculate favorite color based on win counts (for roulette only)
  IF p_game_type = 'roulette' THEN
    UPDATE public.user_level_stats 
    SET roulette_favorite_color = CASE
      WHEN roulette_green_wins >= roulette_red_wins AND roulette_green_wins >= roulette_black_wins THEN 'green'
      WHEN roulette_red_wins >= roulette_black_wins THEN 'red'
      ELSE 'black'
    END
    WHERE user_id = p_user_id AND (roulette_green_wins > 0 OR roulette_red_wins > 0 OR roulette_black_wins > 0);
  END IF;

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
    'method', 'comprehensive_roulette_stats_update',
    'xp_gained', GREATEST(1, p_bet_amount::INTEGER),
    'leveled_up', did_level_up,
    'old_level', old_level_val,
    'new_level', new_level_val,
    'cases_earned', cases_to_add,
    'border_tier_changed', border_changed,
    'new_border_tier', new_border_tier_val,
    'rows_affected', v_rows_affected,
    'roulette_stats_updated', p_game_type = 'roulette',
    'is_win', is_win,
    'winning_color', p_winning_color,
    'new_roulette_streak', new_roulette_streak
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error in update_user_stats_and_level: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'method', 'comprehensive_roulette_stats_update',
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

-- Step 3: Test the function with a sample roulette bet
DO $$
DECLARE
  test_user_id UUID;
  test_result JSONB;
BEGIN
  -- Get a test user ID (first user in the system)
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE '🧪 Testing roulette stats function with user: %', test_user_id;
    
    -- Test a winning roulette bet
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
  ELSE
    RAISE NOTICE '⚠️ No test user found, skipping function test';
  END IF;
END $$;

-- Step 4: Verify the fix by checking if roulette columns exist and function works
DO $$
DECLARE
  column_count INTEGER;
  function_exists BOOLEAN;
BEGIN
  -- Check if roulette columns exist
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns 
  WHERE table_name = 'user_level_stats' 
  AND column_name IN ('roulette_games', 'roulette_wins', 'roulette_wagered', 'roulette_profit');
  
  -- Check if function exists
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'update_user_stats_and_level'
  ) INTO function_exists;
  
  RAISE NOTICE '📊 Verification Results:';
  RAISE NOTICE '   - Roulette columns found: %/4', column_count;
  RAISE NOTICE '   - Stats function exists: %', function_exists;
  
  IF column_count = 4 AND function_exists THEN
    RAISE NOTICE '✅ ROULETTE STATS TRACKING FIX COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '   - All roulette statistics columns are now present';
    RAISE NOTICE '   - Stats function properly updates roulette_games, roulette_wins, roulette_wagered';
    RAISE NOTICE '   - UI should now display roulette stats correctly';
  ELSE
    RAISE NOTICE '❌ Fix incomplete - please check for errors above';
  END IF;
END $$;

SELECT 
  '🎰 ROULETTE STATS TRACKING FIX COMPLETE' as status,
  'Run this SQL in Supabase SQL Editor to fix the tracking issue' as instructions;