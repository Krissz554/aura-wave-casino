-- Debug and fix stats update function
-- This migration ensures the update_user_stats_and_level function works correctly

-- =============================================================================
-- 1. CHECK CURRENT STATE AND DEBUG
-- =============================================================================

DO $$
DECLARE
  test_user_id UUID;
  function_exists BOOLEAN := false;
  test_result JSONB;
BEGIN
  -- Check if function exists
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'update_user_stats_and_level'
  ) INTO function_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔍 ===============================================';
  RAISE NOTICE '🔍 DEBUGGING STATS UPDATE FUNCTION';
  RAISE NOTICE '🔍 ===============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Function exists: %', function_exists;
  
  -- Get a test user ID
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  RAISE NOTICE 'Test user ID: %', test_user_id;
  
  IF test_user_id IS NOT NULL THEN
    -- Test the function
    BEGIN
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
      
      RAISE NOTICE 'Function test result: %', test_result;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Function test failed: %', SQLERRM;
    END;
  END IF;
END;
$$;

-- =============================================================================
-- 2. RECREATE FUNCTION WITH ENHANCED DEBUGGING
-- =============================================================================

-- Drop and recreate with better error handling
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(uuid, text, numeric, text, numeric, integer, text, text) CASCADE;

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
  xp_to_award INTEGER;
  old_level INTEGER;
  new_level INTEGER;
  level_up_occurred BOOLEAN := false;
  xp_per_dollar NUMERIC := 0.1;
  user_exists BOOLEAN := false;
  profile_exists BOOLEAN := false;
  stats_before RECORD;
  stats_after RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎰 ==========================================';
  RAISE NOTICE '🎰 STATS UPDATE FUNCTION CALLED';
  RAISE NOTICE '🎰 ==========================================';
  RAISE NOTICE '🎰 User ID: %', p_user_id;
  RAISE NOTICE '🎰 Game Type: %', p_game_type;
  RAISE NOTICE '🎰 Bet Amount: %', p_bet_amount;
  RAISE NOTICE '🎰 Result: %', p_result;
  RAISE NOTICE '🎰 Profit: %', p_profit;
  RAISE NOTICE '🎰 Winning Color: %', p_winning_color;
  RAISE NOTICE '🎰 Bet Color: %', p_bet_color;
  
  -- Verify user exists in profiles
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO profile_exists;
  RAISE NOTICE '🎰 Profile exists: %', profile_exists;
  
  IF NOT profile_exists THEN
    RAISE NOTICE '❌ Profile not found for user: %', p_user_id;
    RETURN jsonb_build_object(
      'success', false,
      'error_message', 'Profile not found'
    );
  END IF;
  
  -- Check if user_level_stats record exists
  SELECT EXISTS(SELECT 1 FROM public.user_level_stats WHERE user_id = p_user_id) INTO user_exists;
  RAISE NOTICE '🎰 User level stats exists: %', user_exists;
  
  IF NOT user_exists THEN
    RAISE NOTICE '🎰 Creating user_level_stats record for user %', p_user_id;
    INSERT INTO public.user_level_stats (
      user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier
    ) VALUES (
      p_user_id, 1, 0, 0, 916, 1
    );
    RAISE NOTICE '✅ User level stats record created';
  END IF;
  
  -- Get stats before update
  SELECT current_level, lifetime_xp, current_level_xp, roulette_games, roulette_wins, total_games, total_wins
  INTO stats_before
  FROM public.user_level_stats
  WHERE user_id = p_user_id;
  
  RAISE NOTICE '🎰 Stats BEFORE update:';
  RAISE NOTICE '   Level: %, Lifetime XP: %, Current XP: %', stats_before.current_level, stats_before.lifetime_xp, stats_before.current_level_xp;
  RAISE NOTICE '   Roulette Games: %, Roulette Wins: %', stats_before.roulette_games, stats_before.roulette_wins;
  RAISE NOTICE '   Total Games: %, Total Wins: %', stats_before.total_games, stats_before.total_wins;
  
  -- Calculate XP to award (INTEGER to match schema)
  xp_to_award := FLOOR(p_bet_amount * xp_per_dollar)::INTEGER;
  RAISE NOTICE '🎰 XP to award: % (calculated from bet amount %)', xp_to_award, p_bet_amount;
  
  -- Get current level before updates
  old_level := stats_before.current_level;
  
  -- Update profiles stats
  RAISE NOTICE '🎰 Updating profiles table...';
  UPDATE public.profiles
  SET 
    total_wagered = total_wagered + p_bet_amount,
    total_profit = total_profit + p_profit,
    updated_at = NOW()
  WHERE id = p_user_id;
  RAISE NOTICE '✅ Profiles table updated';
  
  -- Update user_level_stats based on game type and result
  IF p_game_type = 'roulette' THEN
    RAISE NOTICE '🎰 Processing roulette stats update...';
    
    IF p_result = 'win' THEN
      RAISE NOTICE '🎉 Processing WIN for user %', p_user_id;
      -- Update for roulette win
      UPDATE public.user_level_stats
      SET
        -- XP progression (INTEGER columns)
        lifetime_xp = lifetime_xp + xp_to_award,
        current_level_xp = current_level_xp + xp_to_award,
        
        -- Roulette-specific stats
        roulette_games = roulette_games + 1,
        roulette_wins = roulette_wins + 1,
        roulette_wagered = roulette_wagered + p_bet_amount,
        roulette_profit = roulette_profit + p_profit,
        roulette_highest_win = GREATEST(roulette_highest_win, p_profit),
        roulette_biggest_bet = GREATEST(roulette_biggest_bet, p_bet_amount),
        
        -- General stats  
        total_games = total_games + 1,
        total_wins = total_wins + 1,
        total_wagered = total_wagered + p_bet_amount,
        total_profit = total_profit + p_profit,
        biggest_win = GREATEST(biggest_win, p_profit),
        biggest_single_bet = GREATEST(biggest_single_bet, p_bet_amount),
        current_win_streak = current_win_streak + 1,
        best_win_streak = GREATEST(best_win_streak, current_win_streak + 1),
        
        -- Color-specific wins (if provided)
        roulette_green_wins = CASE WHEN p_winning_color = 'green' THEN roulette_green_wins + 1 ELSE roulette_green_wins END,
        roulette_red_wins = CASE WHEN p_winning_color = 'red' THEN roulette_red_wins + 1 ELSE roulette_red_wins END,
        roulette_black_wins = CASE WHEN p_winning_color = 'black' THEN roulette_black_wins + 1 ELSE roulette_black_wins END,
        
        updated_at = NOW()
      WHERE user_id = p_user_id;
      
    ELSE
      RAISE NOTICE '❌ Processing LOSS for user %', p_user_id;
      -- Update for roulette loss
      UPDATE public.user_level_stats
      SET
        -- XP progression (still award XP for participation)
        lifetime_xp = lifetime_xp + xp_to_award,
        current_level_xp = current_level_xp + xp_to_award,
        
        -- Roulette-specific stats
        roulette_games = roulette_games + 1,
        roulette_wagered = roulette_wagered + p_bet_amount,
        roulette_profit = roulette_profit + p_profit,
        roulette_highest_loss = GREATEST(roulette_highest_loss, ABS(p_profit)),
        roulette_biggest_bet = GREATEST(roulette_biggest_bet, p_bet_amount),
        
        -- General stats
        total_games = total_games + 1,
        total_wagered = total_wagered + p_bet_amount,
        total_profit = total_profit + p_profit,
        biggest_loss = GREATEST(biggest_loss, ABS(p_profit)),
        biggest_single_bet = GREATEST(biggest_single_bet, p_bet_amount),
        current_win_streak = 0, -- Reset win streak on loss
        
        updated_at = NOW()
      WHERE user_id = p_user_id;
    END IF;
    
    RAISE NOTICE '✅ User level stats updated';
  END IF;
  
  -- Handle level progression with correct level system
  RAISE NOTICE '🎰 Checking for level progression...';
  UPDATE public.user_level_stats
  SET
    current_level = CASE 
      WHEN current_level_xp >= xp_to_next_level AND xp_to_next_level > 0 THEN current_level + 1
      ELSE current_level
    END,
    current_level_xp = CASE 
      WHEN current_level_xp >= xp_to_next_level AND xp_to_next_level > 0 THEN current_level_xp - xp_to_next_level
      ELSE current_level_xp
    END,
    xp_to_next_level = CASE 
      WHEN current_level_xp >= xp_to_next_level AND xp_to_next_level > 0 THEN 
        COALESCE((SELECT xp_required FROM public.level_rewards WHERE level = current_level + 2), xp_to_next_level)
      ELSE xp_to_next_level
    END
  WHERE user_id = p_user_id
    AND current_level_xp >= xp_to_next_level 
    AND xp_to_next_level > 0;
  
  -- Check for level up and award bonus
  SELECT current_level INTO new_level
  FROM public.user_level_stats
  WHERE user_id = p_user_id;
  
  IF new_level > old_level THEN
    level_up_occurred := true;
    
    -- Award level up bonus
    UPDATE public.profiles
    SET balance = balance + (SELECT COALESCE(bonus_amount, 0) FROM public.level_rewards WHERE level = new_level)
    WHERE id = p_user_id;
    
    RAISE NOTICE '🎉 LEVEL UP! User % leveled up from % to %', p_user_id, old_level, new_level;
  END IF;
  
  -- Get stats after update
  SELECT current_level, lifetime_xp, current_level_xp, roulette_games, roulette_wins, total_games, total_wins
  INTO stats_after
  FROM public.user_level_stats
  WHERE user_id = p_user_id;
  
  RAISE NOTICE '🎰 Stats AFTER update:';
  RAISE NOTICE '   Level: %, Lifetime XP: %, Current XP: %', stats_after.current_level, stats_after.lifetime_xp, stats_after.current_level_xp;
  RAISE NOTICE '   Roulette Games: %, Roulette Wins: %', stats_after.roulette_games, stats_after.roulette_wins;
  RAISE NOTICE '   Total Games: %, Total Wins: %', stats_after.total_games, stats_after.total_wins;
  
  RAISE NOTICE '✅ STATS UPDATE COMPLETED SUCCESSFULLY';
  RAISE NOTICE '   XP awarded: %, Level up: %', xp_to_award, level_up_occurred;
  RAISE NOTICE '🎰 ==========================================';
  RAISE NOTICE '';
  
  RETURN jsonb_build_object(
    'success', true,
    'xp_awarded', xp_to_award,
    'old_level', old_level,
    'new_level', new_level,
    'level_up', level_up_occurred,
    'stats_before', row_to_json(stats_before),
    'stats_after', row_to_json(stats_after)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '🚨 EXCEPTION in update_user_stats_and_level: %', SQLERRM;
    RAISE NOTICE '🚨 SQL State: %', SQLSTATE;
    RETURN jsonb_build_object(
      'success', false,
      'error_message', format('Stats update failed: %s', SQLERRM),
      'sql_state', SQLSTATE
    );
END;
$$;

-- =============================================================================
-- 3. GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- =============================================================================
-- 4. TEST THE FUNCTION
-- =============================================================================

DO $$
DECLARE
  test_user_id UUID;
  test_result JSONB;
BEGIN
  -- Get a test user ID
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TESTING ENHANCED FUNCTION';
    RAISE NOTICE '🧪 Test user: %', test_user_id;
    
    -- Test the function with a small bet
    SELECT public.update_user_stats_and_level(
      test_user_id,
      'roulette',
      1.0,  -- $1 bet
      'win',
      1.0,  -- $1 profit
      0,
      'red',
      'red'
    ) INTO test_result;
    
    RAISE NOTICE '🧪 Test result: %', test_result;
    
    IF (test_result->>'success')::boolean THEN
      RAISE NOTICE '✅ Function test PASSED';
    ELSE
      RAISE NOTICE '❌ Function test FAILED: %', test_result->>'error_message';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ No test user found - skipping function test';
  END IF;
END;
$$;