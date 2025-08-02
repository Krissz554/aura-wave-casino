-- ULTIMATE FUNCTION DEPENDENCY FIX
-- Create ALL missing functions in the correct order to resolve ALL dependencies

BEGIN;

-- =====================================================================
-- STEP 1: FIRST, DROP EVERYTHING TO START CLEAN
-- =====================================================================

-- Drop ALL complete_roulette_round variations
DROP FUNCTION IF EXISTS public.complete_roulette_round(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.complete_roulette_round_v2(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.roulette_completion_handler_v1(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.execute_roulette_completion(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.process_roulette_round_completion(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.roulette_round_processor_final(UUID) CASCADE;

-- Drop ALL missing functions
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(uuid, text, numeric, text, numeric, integer) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_from_wager(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.ensure_user_level_stats(uuid) CASCADE;

-- Drop all related triggers again (in case any were recreated)
DROP TRIGGER IF EXISTS xp_trigger_on_game_history ON public.game_history CASCADE;
DROP TRIGGER IF EXISTS game_history_xp_trigger ON public.game_history CASCADE;
DROP TRIGGER IF EXISTS handle_game_history_trigger ON public.game_history CASCADE;
DROP TRIGGER IF EXISTS trigger_game_history_insert ON public.game_history CASCADE;
DROP TRIGGER IF EXISTS user_level_stats_wagered_xp_trigger ON public.user_level_stats CASCADE;

-- Drop trigger functions
DROP FUNCTION IF EXISTS public.handle_game_history_insert() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_level_stats_wagered_change() CASCADE;

-- Log cleanup
DO $$
BEGIN
  RAISE NOTICE '🧹 Dropped ALL functions and triggers - starting fresh';
END $$;

-- =====================================================================
-- STEP 2: CREATE MISSING DEPENDENCY FUNCTIONS FIRST
-- =====================================================================

-- Create ensure_user_level_stats function
CREATE OR REPLACE FUNCTION public.ensure_user_level_stats(user_uuid uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_level_stats (
    user_id, 
    lifetime_xp, 
    current_xp, 
    level, 
    current_level_xp, 
    xp_to_next_level,
    roulette_games,
    roulette_wagered,
    roulette_profit,
    total_games,
    total_wagered,
    total_profit,
    created_at,
    updated_at
  ) VALUES (
    user_uuid, 
    0, 
    0, 
    1, 
    0, 
    651,
    0,
    0,
    0,
    0,
    0,
    0,
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Create add_xp_and_check_levelup function (numeric version)
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_stats RECORD;
  level_result RECORD;
  xp_decimal NUMERIC(10,3);
  result jsonb;
BEGIN
  -- Convert to 3 decimal places
  xp_decimal := ROUND(xp_amount, 3);
  
  -- Ensure user exists
  PERFORM public.ensure_user_level_stats(user_uuid);
  
  -- Get current user stats
  SELECT * INTO current_stats
  FROM public.user_level_stats
  WHERE user_id = user_uuid;
  
  -- Calculate new XP totals
  UPDATE public.user_level_stats
  SET 
    lifetime_xp = lifetime_xp + xp_decimal,
    current_xp = current_xp + xp_decimal,
    updated_at = NOW()
  WHERE user_id = user_uuid;
  
  -- Get updated stats and calculate level
  SELECT * INTO current_stats
  FROM public.user_level_stats
  WHERE user_id = user_uuid;
  
  -- Calculate level from XP using our exact function
  SELECT * INTO level_result
  FROM public.calculate_level_from_xp_exact(current_stats.lifetime_xp::integer);
  
  -- Check if level changed
  IF level_result.level != current_stats.level THEN
    -- Level up! Update the level
    UPDATE public.user_level_stats
    SET 
      level = level_result.level,
      current_xp = level_result.current_level_xp,
      current_level_xp = level_result.current_level_xp,
      xp_to_next_level = level_result.xp_to_next_level,
      updated_at = NOW()
    WHERE user_id = user_uuid;
    
    result := jsonb_build_object(
      'success', true,
      'xp_added', xp_decimal,
      'new_level', level_result.level,
      'level_up', true,
      'total_xp', current_stats.lifetime_xp,
      'xp_to_next_level', level_result.xp_to_next_level
    );
  ELSE
    -- No level up, but update current level xp and xp to next
    UPDATE public.user_level_stats
    SET 
      current_level_xp = level_result.current_level_xp,
      xp_to_next_level = level_result.xp_to_next_level,
      updated_at = NOW()
    WHERE user_id = user_uuid;
    
    result := jsonb_build_object(
      'success', true,
      'xp_added', xp_decimal,
      'new_level', current_stats.level,
      'level_up', false,
      'total_xp', current_stats.lifetime_xp,
      'xp_to_next_level', level_result.xp_to_next_level
    );
  END IF;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

-- Create add_xp_and_check_levelup function (integer version for compatibility)
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.add_xp_and_check_levelup(user_uuid, xp_amount::numeric);
END;
$$;

-- Create update_user_stats_and_level function (6 parameter version)
CREATE OR REPLACE FUNCTION public.update_user_stats_and_level(
  p_user_id uuid, 
  p_game_type text, 
  p_bet_amount numeric, 
  p_result text, 
  p_profit numeric, 
  p_streak_length integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  xp_earned NUMERIC;
  result jsonb;
BEGIN
  -- Ensure user exists
  PERFORM public.ensure_user_level_stats(p_user_id);
  
  -- Calculate XP (10% of bet amount)
  xp_earned := p_bet_amount * 0.1;
  
  -- Add XP and check for level ups
  SELECT public.add_xp_and_check_levelup(p_user_id, xp_earned) INTO result;
  
  -- Update game-specific stats
  UPDATE public.user_level_stats
  SET 
    roulette_games = roulette_games + 1,
    roulette_wagered = roulette_wagered + p_bet_amount,
    roulette_profit = roulette_profit + p_profit,
    total_games = total_games + 1,
    total_wagered = total_wagered + p_bet_amount,
    total_profit = total_profit + p_profit,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'xp_awarded', xp_earned,
    'level_data', result,
    'game_type', p_game_type,
    'bet_amount', p_bet_amount,
    'profit', p_profit
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

-- Create update_user_stats_and_level function (8 parameter version for compatibility)
CREATE OR REPLACE FUNCTION public.update_user_stats_and_level(
  p_user_id UUID, 
  p_game_type TEXT, 
  p_bet_amount NUMERIC, 
  p_result TEXT, 
  p_profit NUMERIC, 
  p_streak_length INTEGER, 
  p_winning_color TEXT, 
  p_bet_color TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the 6-parameter version (ignore extra color parameters)
  RETURN public.update_user_stats_and_level(
    p_user_id, 
    p_game_type, 
    p_bet_amount, 
    p_result, 
    p_profit, 
    p_streak_length
  );
END;
$$;

-- Create add_xp_from_wager function for compatibility
CREATE OR REPLACE FUNCTION public.add_xp_from_wager(user_uuid uuid, wager_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Calculate XP as 10% of wager
  RETURN public.add_xp_and_check_levelup(user_uuid, wager_amount * 0.1);
END;
$$;

-- Log dependency creation
DO $$
BEGIN
  RAISE NOTICE '✅ Created ALL missing dependency functions';
END $$;

-- =====================================================================
-- STEP 3: CREATE THE MAIN ROULETTE COMPLETION FUNCTION
-- =====================================================================

-- Create the ultimate complete_roulette_round function
CREATE OR REPLACE FUNCTION public.complete_roulette_round(p_round_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result_color TEXT;
  v_result_slot INTEGER;
  v_bet_count INTEGER := 0;
  v_winner_count INTEGER := 0;
  v_total_xp NUMERIC := 0;
  v_bet_record RECORD;
  v_is_winning_bet BOOLEAN;
  v_payout NUMERIC;
  v_profit NUMERIC;
  v_xp_earned NUMERIC;
  v_stats_result JSONB;
BEGIN
  RAISE NOTICE '[ULTIMATE] Processing round completion: %', p_round_id;
  
  -- Get round result data
  SELECT result_color, result_slot 
  INTO v_result_color, v_result_slot
  FROM roulette_rounds 
  WHERE id = p_round_id;
  
  IF v_result_color IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Round not found or no result available',
      'version', 'ultimate_complete_fix'
    );
  END IF;
  
  RAISE NOTICE '[ULTIMATE] Round % result: % %', p_round_id, v_result_color, v_result_slot;
  
  -- Process each bet for this round
  FOR v_bet_record IN 
    SELECT * FROM roulette_bets WHERE round_id = p_round_id
  LOOP
    v_bet_count := v_bet_count + 1;
    
    -- Determine if this bet won
    v_is_winning_bet := (v_bet_record.bet_color = v_result_color);
    
    -- Calculate payout and profit
    IF v_is_winning_bet THEN
      v_payout := v_bet_record.potential_payout;
      v_profit := v_payout - v_bet_record.bet_amount;
      v_winner_count := v_winner_count + 1;
      
      -- Credit winner's balance
      UPDATE profiles 
      SET balance = balance + v_payout,
          updated_at = NOW()
      WHERE id = v_bet_record.user_id;
      
      RAISE NOTICE '[ULTIMATE] Winner paid: User % received %', v_bet_record.user_id, v_payout;
    ELSE
      v_payout := 0;
      v_profit := -v_bet_record.bet_amount;
      RAISE NOTICE '[ULTIMATE] Losing bet: User % lost %', v_bet_record.user_id, v_bet_record.bet_amount;
    END IF;
    
    -- Update the bet record with final results
    UPDATE roulette_bets 
    SET 
      actual_payout = v_payout,
      is_winner = v_is_winning_bet,
      profit = v_profit,
      updated_at = NOW()
    WHERE id = v_bet_record.id;
    
    -- Calculate XP (10% of bet amount)
    v_xp_earned := v_bet_record.bet_amount * 0.1;
    v_total_xp := v_total_xp + v_xp_earned;
    
    RAISE NOTICE '[ULTIMATE] Processing stats for user %: bet=%, profit=%, xp=%', 
      v_bet_record.user_id, v_bet_record.bet_amount, v_profit, v_xp_earned;
    
    -- Update user stats and level using the dependency function
    SELECT public.update_user_stats_and_level(
      v_bet_record.user_id,
      'roulette',
      v_bet_record.bet_amount,
      CASE WHEN v_is_winning_bet THEN 'win' ELSE 'loss' END,
      v_profit,
      0
    ) INTO v_stats_result;
    
    RAISE NOTICE '[ULTIMATE] Stats update result: %', v_stats_result;
    
    -- Record in game history
    INSERT INTO game_history (
      user_id, 
      game_type, 
      bet_amount, 
      result, 
      profit, 
      game_data,
      created_at
    ) VALUES (
      v_bet_record.user_id, 
      'roulette', 
      v_bet_record.bet_amount,
      CASE WHEN v_is_winning_bet THEN 'win' ELSE 'loss' END,
      v_profit,
      jsonb_build_object(
        'bet_color', v_bet_record.bet_color,
        'result_color', v_result_color,
        'result_slot', v_result_slot,
        'round_id', p_round_id,
        'xp_awarded', v_xp_earned
      ),
      NOW()
    );
  END LOOP;
  
  -- Mark the round as completed
  UPDATE roulette_rounds 
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE id = p_round_id;
  
  RAISE NOTICE '[ULTIMATE] Round % completed successfully: % bets, % winners, % total XP', 
    p_round_id, v_bet_count, v_winner_count, v_total_xp;
  
  RETURN jsonb_build_object(
    'success', true,
    'bets_processed', v_bet_count,
    'winners_processed', v_winner_count,
    'xp_awarded', v_total_xp,
    'result_color', v_result_color,
    'result_slot', v_result_slot,
    'version', 'ultimate_complete_fix'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[ULTIMATE] ERROR in complete_roulette_round: % %', SQLSTATE, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'version', 'ultimate_complete_fix_error'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.complete_roulette_round(UUID) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(uuid, text, numeric, text, numeric, integer) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_xp_and_check_levelup(uuid, numeric) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_xp_and_check_levelup(uuid, integer) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_level_stats(uuid) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_xp_from_wager(uuid, numeric) TO postgres, anon, authenticated, service_role;

-- Log main function creation
DO $$
BEGIN
  RAISE NOTICE '✅ Created ultimate complete_roulette_round function with ALL dependencies';
END $$;

-- =====================================================================
-- STEP 4: TEST EVERYTHING
-- =====================================================================

-- Test all functions exist and work
DO $$
DECLARE
  test_result JSONB;
  xp_test_result JSONB;
  stats_test_result JSONB;
BEGIN
  RAISE NOTICE '🧪 === TESTING ALL FUNCTIONS ===';
  
  -- Test complete_roulette_round
  SELECT public.complete_roulette_round('00000000-0000-0000-0000-000000000000') 
  INTO test_result;
  RAISE NOTICE 'Complete roulette test: %', test_result;
  
  -- Test add_xp_and_check_levelup
  SELECT public.add_xp_and_check_levelup('00000000-0000-0000-0000-000000000000', 1.5) 
  INTO xp_test_result;
  RAISE NOTICE 'XP function test: %', xp_test_result;
  
  -- Test update_user_stats_and_level
  SELECT public.update_user_stats_and_level(
    '00000000-0000-0000-0000-000000000000', 
    'roulette', 
    10.0, 
    'win', 
    5.0, 
    0
  ) INTO stats_test_result;
  RAISE NOTICE 'Stats update test: %', stats_test_result;
  
  -- Check test results
  IF test_result->>'error' LIKE '%Round not found%' THEN
    RAISE NOTICE '✅ Complete roulette function works (expected Round not found)';
  ELSE
    RAISE NOTICE '❌ Complete roulette unexpected result: %', test_result;
  END IF;
  
  IF xp_test_result->>'success' = 'true' THEN
    RAISE NOTICE '✅ XP function works correctly';
  ELSE
    RAISE NOTICE '❌ XP function failed: %', xp_test_result;
  END IF;
  
  IF stats_test_result->>'success' = 'true' THEN
    RAISE NOTICE '✅ Stats update function works correctly';
  ELSE
    RAISE NOTICE '❌ Stats update failed: %', stats_test_result;
  END IF;
  
  RAISE NOTICE '🧪 === END TESTING ===';
END $$;

COMMIT;

-- Show final status
SELECT 'ULTIMATE FUNCTION DEPENDENCY FIX COMPLETE - ALL MISSING FUNCTIONS CREATED!' as final_status;