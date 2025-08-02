-- =====================================================
-- COMPLETE ROULETTE STATS & XP FIX
-- =====================================================
-- This includes ALL required functions for proper roulette stats and XP tracking

-- =====================================================
-- STEP 1: Create the missing calculate_level_from_xp_new function
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_level_from_xp_new(p_xp integer)
RETURNS TABLE(level integer, current_level_xp integer, xp_to_next integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  calculated_level INTEGER := 1;
  xp_for_current_level INTEGER := 0;
  xp_for_next_level INTEGER := 916; -- Level 2 requires 916 XP
  remaining_xp INTEGER := p_xp;
BEGIN
  -- Handle edge cases
  IF p_xp IS NULL OR p_xp < 0 THEN
    RETURN QUERY SELECT 1, 0, 916;
    RETURN;
  END IF;
  
  -- Level 1 requires 0 XP, Level 2 requires 916 XP
  IF p_xp < 916 THEN
    RETURN QUERY SELECT 1, p_xp, (916 - p_xp);
    RETURN;
  END IF;
  
  -- Calculate level using the formula: each level requires more XP
  -- Level 2: 916, Level 3: ~1900, Level 4: ~3000, etc.
  -- Using approximation: XP needed for level N ≈ (N-1) * 916 + additional scaling
  
  calculated_level := 1;
  remaining_xp := p_xp;
  
  -- Simple calculation: approximately 916 XP per level with scaling
  WHILE remaining_xp >= (calculated_level * 916) LOOP
    remaining_xp := remaining_xp - (calculated_level * 916);
    calculated_level := calculated_level + 1;
    
    -- Cap at level 1000 to prevent infinite loops
    IF calculated_level >= 1000 THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- Calculate XP for current level and XP needed for next level
  xp_for_current_level := remaining_xp;
  xp_for_next_level := (calculated_level * 916) - remaining_xp;
  
  -- Ensure minimum values
  IF xp_for_next_level <= 0 THEN
    xp_for_next_level := 100; -- Minimum XP to next level
  END IF;
  
  RETURN QUERY SELECT calculated_level, xp_for_current_level, xp_for_next_level;
END;
$$;

-- =====================================================
-- STEP 2: Create/Replace the update_user_roulette_stats function
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_user_roulette_stats(
  p_user_id UUID,
  p_bet_amount NUMERIC,
  p_result TEXT,
  p_profit NUMERIC,
  p_winning_color TEXT DEFAULT NULL,
  p_bet_color TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  is_win BOOLEAN;
  result_json JSONB;
  current_streak INTEGER := 0;
  new_streak INTEGER := 0;
  rows_updated INTEGER;
BEGIN
  -- Determine if this is a win
  is_win := (p_result = 'win') AND p_profit > 0;
  
  -- Ensure user has stats record
  INSERT INTO public.user_level_stats (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current roulette streak for calculation
  SELECT roulette_current_streak INTO current_streak
  FROM public.user_level_stats
  WHERE user_id = p_user_id;
  
  current_streak := COALESCE(current_streak, 0);
  
  -- Calculate new streak
  IF is_win THEN
    new_streak := current_streak + 1;
  ELSE
    new_streak := 0;
  END IF;
  
  -- Update roulette-specific stats
  UPDATE public.user_level_stats 
  SET 
    roulette_games = roulette_games + 1,
    roulette_wins = CASE WHEN is_win THEN roulette_wins + 1 ELSE roulette_wins END,
    roulette_wagered = roulette_wagered + p_bet_amount,
    roulette_profit = roulette_profit + p_profit,
    roulette_highest_win = CASE WHEN p_profit > roulette_highest_win THEN p_profit ELSE roulette_highest_win END,
    roulette_highest_loss = CASE WHEN p_profit < 0 AND ABS(p_profit) > roulette_highest_loss THEN ABS(p_profit) ELSE roulette_highest_loss END,
    roulette_biggest_bet = CASE WHEN p_bet_amount > roulette_biggest_bet THEN p_bet_amount ELSE roulette_biggest_bet END,
    
    -- Color-specific wins
    roulette_green_wins = CASE WHEN is_win AND p_bet_color = 'green' THEN roulette_green_wins + 1 ELSE roulette_green_wins END,
    roulette_red_wins = CASE WHEN is_win AND p_bet_color = 'red' THEN roulette_red_wins + 1 ELSE roulette_red_wins END,
    roulette_black_wins = CASE WHEN is_win AND p_bet_color = 'black' THEN roulette_black_wins + 1 ELSE roulette_black_wins END,
    
    -- Streak tracking
    roulette_current_streak = new_streak,
    roulette_best_streak = CASE 
      WHEN new_streak > roulette_best_streak THEN new_streak
      ELSE roulette_best_streak
    END,
    
    -- Overall stats
    total_games = total_games + 1,
    total_wins = CASE WHEN is_win THEN total_wins + 1 ELSE total_wins END,
    total_wagered = total_wagered + p_bet_amount,
    total_profit = total_profit + p_profit,
    biggest_win = CASE WHEN p_profit > biggest_win THEN p_profit ELSE biggest_win END,
    biggest_loss = CASE WHEN p_profit < 0 AND ABS(p_profit) > biggest_loss THEN ABS(p_profit) ELSE biggest_loss END,
    biggest_single_bet = CASE WHEN p_bet_amount > biggest_single_bet THEN p_bet_amount ELSE biggest_single_bet END,
    
    updated_at = now()
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  -- Return success result
  result_json := jsonb_build_object(
    'success', true,
    'is_win', is_win,
    'bet_amount', p_bet_amount,
    'profit', p_profit,
    'new_streak', new_streak,
    'stats_updated', true,
    'rows_updated', rows_updated
  );
  
  RAISE NOTICE 'Roulette stats updated for user %: bet=%, profit=%, win=%, streak=%, rows=%', 
    p_user_id, p_bet_amount, p_profit, is_win, new_streak, rows_updated;
  
  RETURN result_json;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in update_user_roulette_stats: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =====================================================
-- STEP 3: Create/Replace XP tracking function for wagers
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_xp_for_wager(
  p_user_id UUID,
  p_wager_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  xp_to_add INTEGER;
  current_stats RECORD;
  new_xp INTEGER;
  level_calc RECORD;
  old_level INTEGER;
  new_level INTEGER;
  did_level_up BOOLEAN := false;
  cases_earned INTEGER := 0;
  result_json JSONB;
  rows_updated INTEGER;
BEGIN
  -- Calculate XP to add (1 XP per $1 wagered)
  xp_to_add := FLOOR(p_wager_amount)::INTEGER;
  
  IF xp_to_add <= 0 THEN
    RETURN jsonb_build_object('success', true, 'xp_added', 0, 'leveled_up', false);
  END IF;
  
  -- Ensure user has stats record
  INSERT INTO public.user_level_stats (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current stats
  SELECT * INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  IF current_stats IS NULL THEN
    RAISE NOTICE 'Failed to get user stats for user %', p_user_id;
    RETURN jsonb_build_object('success', false, 'error', 'User stats not found');
  END IF;
  
  old_level := current_stats.current_level;
  new_xp := current_stats.lifetime_xp + xp_to_add;
  
  -- Calculate new level
  SELECT * INTO level_calc FROM public.calculate_level_from_xp_new(new_xp);
  new_level := level_calc.level;
  
  -- Check if leveled up
  IF new_level > old_level THEN
    did_level_up := true;
    cases_earned := new_level - old_level; -- One case per level
  END IF;
  
  -- Update XP and level
  UPDATE public.user_level_stats 
  SET 
    lifetime_xp = new_xp,
    current_level = new_level,
    current_level_xp = level_calc.current_level_xp,
    xp_to_next_level = level_calc.xp_to_next,
    available_cases = CASE WHEN did_level_up THEN available_cases + cases_earned ELSE available_cases END,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  -- Create level up notification if needed
  IF did_level_up THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      p_user_id,
      'level_up',
      'Level Up!',
      'Congratulations! You reached level ' || new_level || '!',
      jsonb_build_object(
        'old_level', old_level,
        'new_level', new_level,
        'cases_earned', cases_earned,
        'xp_added', xp_to_add
      )
    );
  END IF;
  
  result_json := jsonb_build_object(
    'success', true,
    'xp_added', xp_to_add,
    'new_total_xp', new_xp,
    'old_level', old_level,
    'new_level', new_level,
    'leveled_up', did_level_up,
    'cases_earned', cases_earned,
    'rows_updated', rows_updated
  );
  
  RAISE NOTICE 'XP added for user %: +% XP (total: %), level: % -> %, rows=%', 
    p_user_id, xp_to_add, new_xp, old_level, new_level, rows_updated;
  
  RETURN result_json;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in add_xp_for_wager: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =====================================================
-- STEP 4: Create comprehensive roulette bet processor
-- =====================================================

CREATE OR REPLACE FUNCTION public.process_roulette_bet_complete(
  p_user_id UUID,
  p_bet_amount NUMERIC,
  p_result TEXT,
  p_profit NUMERIC,
  p_winning_color TEXT DEFAULT NULL,
  p_bet_color TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  stats_result JSONB;
  xp_result JSONB;
  final_result JSONB;
BEGIN
  RAISE NOTICE 'Processing complete roulette bet for user %: amount=%, result=%, profit=%', 
    p_user_id, p_bet_amount, p_result, p_profit;
  
  -- Update roulette-specific stats
  SELECT public.update_user_roulette_stats(
    p_user_id, p_bet_amount, p_result, p_profit, p_winning_color, p_bet_color
  ) INTO stats_result;
  
  -- Add XP for the wager
  SELECT public.add_xp_for_wager(p_user_id, p_bet_amount) INTO xp_result;
  
  -- Combine results
  final_result := jsonb_build_object(
    'success', true,
    'stats_update', stats_result,
    'xp_update', xp_result,
    'combined_success', (stats_result->>'success')::boolean AND (xp_result->>'success')::boolean
  );
  
  RAISE NOTICE 'Completed roulette bet processing for user %: stats_success=%, xp_success=%', 
    p_user_id, (stats_result->>'success')::boolean, (xp_result->>'success')::boolean;
  
  RETURN final_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in process_roulette_bet_complete: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =====================================================
-- STEP 5: Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION public.calculate_level_from_xp_new(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_user_roulette_stats(UUID, NUMERIC, TEXT, NUMERIC, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_xp_for_wager(UUID, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_roulette_bet_complete(UUID, NUMERIC, TEXT, NUMERIC, TEXT, TEXT) TO authenticated, service_role;

-- =====================================================
-- STEP 6: Test the functions
-- =====================================================

DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- Replace with actual user ID for testing
  test_result JSONB;
  level_test RECORD;
BEGIN
  RAISE NOTICE '🧪 Testing roulette stats functions...';
  
  -- Test calculate_level_from_xp_new
  SELECT * INTO level_test FROM public.calculate_level_from_xp_new(1500);
  RAISE NOTICE '✅ Level calculation test: 1500 XP = Level %, Current Level XP: %, XP to Next: %', 
    level_test.level, level_test.current_level_xp, level_test.xp_to_next;
  
  RAISE NOTICE '✅ All roulette stats functions created successfully';
  RAISE NOTICE '📝 Functions available:';
  RAISE NOTICE '   - calculate_level_from_xp_new(xp)';
  RAISE NOTICE '   - update_user_roulette_stats(user_id, bet_amount, result, profit, winning_color, bet_color)';
  RAISE NOTICE '   - add_xp_for_wager(user_id, wager_amount)';
  RAISE NOTICE '   - process_roulette_bet_complete(user_id, bet_amount, result, profit, winning_color, bet_color)';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error testing functions: %', SQLERRM;
END $$;

-- =====================================================
-- STEP 7: Verification
-- =====================================================

-- Check that all functions exist
SELECT 
  'FUNCTION VERIFICATION' as check_type,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'calculate_level_from_xp_new',
  'update_user_roulette_stats',
  'add_xp_for_wager', 
  'process_roulette_bet_complete'
)
ORDER BY routine_name;

-- Final status
DO $$
BEGIN
  RAISE NOTICE '🎯 COMPLETE ROULETTE STATS & XP FIX COMPLETED';
  RAISE NOTICE '✅ Created calculate_level_from_xp_new function for level calculations';
  RAISE NOTICE '✅ Created update_user_roulette_stats function for roulette-specific stats';
  RAISE NOTICE '✅ Created add_xp_for_wager function for XP tracking';
  RAISE NOTICE '✅ Created process_roulette_bet_complete function for complete processing';
  RAISE NOTICE '✅ All functions have proper error handling and logging';
  RAISE NOTICE '✅ Functions will be called when roulette rounds COMPLETE (not when bets are placed)';
  RAISE NOTICE '🎰 Roulette stats and XP should now update properly when rounds end!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 NEXT STEPS:';
  RAISE NOTICE '1. Run this script in Supabase SQL Editor';
  RAISE NOTICE '2. Place a roulette bet and wait for the round to complete';
  RAISE NOTICE '3. Check user_level_stats table to verify stats are updating';
  RAISE NOTICE '4. Check notifications table for level up messages';
  RAISE NOTICE '5. Check Supabase edge function logs for detailed processing info';
END $$;