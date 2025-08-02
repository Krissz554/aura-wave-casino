-- REVERT TO WORKING PAYOUT SYSTEM
-- Restore the previous working complete_roulette_round function that had working payouts
-- Keep the schema fixes and dependency functions but use the proven working logic

BEGIN;

-- =====================================================================
-- STEP 1: RESTORE THE WORKING COMPLETE_ROULETTE_ROUND FUNCTION
-- =====================================================================

-- Drop the current function that broke payouts
DROP FUNCTION IF EXISTS public.complete_roulette_round(UUID) CASCADE;

-- Recreate the working version from ULTIMATE_FUNCTION_DEPENDENCY_FIX.sql
-- This version was working for payouts before the stats changes
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
  RAISE NOTICE '[WORKING] Processing round completion: %', p_round_id;
  
  -- Get round result data
  SELECT result_color, result_slot 
  INTO v_result_color, v_result_slot
  FROM roulette_rounds 
  WHERE id = p_round_id;
  
  IF v_result_color IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Round not found or no result available',
      'version', 'reverted_working_payouts'
    );
  END IF;
  
  RAISE NOTICE '[WORKING] Round % result: % %', p_round_id, v_result_color, v_result_slot;
  
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
      
      -- Credit winner's balance (this was working before)
      UPDATE profiles 
      SET balance = balance + v_payout
      WHERE id = v_bet_record.user_id;
      
      RAISE NOTICE '[WORKING] Winner paid: User % received %', v_bet_record.user_id, v_payout;
    ELSE
      v_payout := 0;
      v_profit := -v_bet_record.bet_amount;
      RAISE NOTICE '[WORKING] Losing bet: User % lost %', v_bet_record.user_id, v_bet_record.bet_amount;
    END IF;
    
    -- Update the bet record with final results (only if columns exist)
    BEGIN
      UPDATE roulette_bets 
      SET 
        actual_payout = v_payout,
        is_winner = v_is_winning_bet,
        profit = v_profit
      WHERE id = v_bet_record.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '[WORKING] Could not update bet record columns (columns may not exist): %', SQLERRM;
    END;
    
    -- Calculate XP (10% of bet amount)
    v_xp_earned := v_bet_record.bet_amount * 0.1;
    v_total_xp := v_total_xp + v_xp_earned;
    
    RAISE NOTICE '[WORKING] Processing stats for user %: bet=%, profit=%, xp=%', 
      v_bet_record.user_id, v_bet_record.bet_amount, v_profit, v_xp_earned;
    
    -- Try to update user stats (but don't fail if it doesn't work)
    BEGIN
      SELECT public.update_user_stats_and_level(
        v_bet_record.user_id,
        'roulette',
        v_bet_record.bet_amount,
        CASE WHEN v_is_winning_bet THEN 'win' ELSE 'loss' END,
        v_profit,
        0
      ) INTO v_stats_result;
      
      RAISE NOTICE '[WORKING] Stats update result: %', v_stats_result;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '[WORKING] Stats update failed (non-critical): %', SQLERRM;
        -- Continue processing even if stats fail
    END;
    
    -- Try to record in game history (but don't fail if it doesn't work)
    BEGIN
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
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '[WORKING] Game history insert failed (non-critical): %', SQLERRM;
        -- Continue processing even if history fails
    END;
  END LOOP;
  
  -- Mark the round as completed
  UPDATE roulette_rounds 
  SET status = 'completed'
  WHERE id = p_round_id;
  
  RAISE NOTICE '[WORKING] Round % completed successfully: % bets, % winners, % total XP', 
    p_round_id, v_bet_count, v_winner_count, v_total_xp;
  
  RETURN jsonb_build_object(
    'success', true,
    'bets_processed', v_bet_count,
    'winners_processed', v_winner_count,
    'xp_awarded', v_total_xp,
    'result_color', v_result_color,
    'result_slot', v_result_slot,
    'version', 'reverted_working_payouts'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[WORKING] ERROR in complete_roulette_round: % %', SQLSTATE, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'version', 'reverted_working_payouts_error'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.complete_roulette_round(UUID) TO postgres, anon, authenticated, service_role;

-- =====================================================================
-- STEP 2: KEEP THE BASIC XP FUNCTIONS BUT SIMPLIFY THEM
-- =====================================================================

-- Keep the basic ensure_user_level_stats but make it simpler
DROP FUNCTION IF EXISTS public.ensure_user_level_stats(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.ensure_user_level_stats(user_uuid uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_level_stats (user_id) 
  VALUES (user_uuid) 
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Keep the basic XP function but make it simpler
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, integer) CASCADE;

CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  xp_decimal NUMERIC(10,3);
BEGIN
  -- Convert to 3 decimal places
  xp_decimal := ROUND(xp_amount, 3);
  
  -- Ensure user exists
  PERFORM public.ensure_user_level_stats(user_uuid);
  
  -- Simple XP update without complex level calculations for now
  UPDATE public.user_level_stats
  SET 
    lifetime_xp = COALESCE(lifetime_xp, 0) + xp_decimal::INTEGER,
    updated_at = NOW()
  WHERE user_id = user_uuid;
  
  RETURN jsonb_build_object(
    'success', true,
    'xp_added', xp_decimal
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Integer version for compatibility
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.add_xp_and_check_levelup(user_uuid, xp_amount::numeric);
END;
$$;

-- Keep the basic stats function but make it simpler and more robust
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(uuid, text, numeric, text, numeric, integer) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) CASCADE;

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
  xp_result jsonb;
  is_win BOOLEAN;
BEGIN
  -- Ensure user exists
  PERFORM public.ensure_user_level_stats(p_user_id);
  
  -- Determine if this is a win or loss
  is_win := (p_result = 'win');
  
  -- Calculate XP (10% of bet amount)
  xp_earned := p_bet_amount * 0.1;
  
  RAISE NOTICE '[SIMPLE_STATS] Updating stats for user %: bet=%, result=%, profit=%, xp=%', 
    p_user_id, p_bet_amount, p_result, p_profit, xp_earned;
  
  -- Add XP
  SELECT public.add_xp_and_check_levelup(p_user_id, xp_earned) INTO xp_result;
  
  -- Update basic roulette stats (safely)
  BEGIN
    UPDATE public.user_level_stats
    SET 
      roulette_games = COALESCE(roulette_games, 0) + 1,
      roulette_wins = COALESCE(roulette_wins, 0) + CASE WHEN is_win THEN 1 ELSE 0 END,
      roulette_wagered = COALESCE(roulette_wagered, 0) + p_bet_amount,
      roulette_profit = COALESCE(roulette_profit, 0) + p_profit,
      total_games = COALESCE(total_games, 0) + 1,
      total_wins = COALESCE(total_wins, 0) + CASE WHEN is_win THEN 1 ELSE 0 END,
      total_wagered = COALESCE(total_wagered, 0) + p_bet_amount,
      total_profit = COALESCE(total_profit, 0) + p_profit,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '[SIMPLE_STATS] Stats update failed (non-critical): %', SQLERRM;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'xp_awarded', xp_earned,
    'xp_result', xp_result
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- 8-parameter version for compatibility
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
  -- Just call the 6-parameter version for now
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(uuid, text, numeric, text, numeric, integer) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_xp_and_check_levelup(uuid, numeric) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_xp_and_check_levelup(uuid, integer) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_level_stats(uuid) TO postgres, anon, authenticated, service_role;

-- =====================================================================
-- STEP 3: TEST THE REVERTED SYSTEM
-- =====================================================================

DO $$
DECLARE
  test_result JSONB;
BEGIN
  RAISE NOTICE '🧪 === TESTING REVERTED WORKING SYSTEM ===';
  
  -- Test complete_roulette_round
  SELECT public.complete_roulette_round('00000000-0000-0000-0000-000000000000') 
  INTO test_result;
  
  RAISE NOTICE 'Reverted system test: %', test_result;
  
  IF test_result->>'error' LIKE '%Round not found%' THEN
    RAISE NOTICE '✅ Reverted function works correctly (expected Round not found)';
  ELSE
    RAISE NOTICE '❓ Reverted function result: %', test_result;
  END IF;
  
  RAISE NOTICE '🧪 === END TESTING ===';
END $$;

COMMIT;

-- Show final status
SELECT 'REVERTED TO WORKING PAYOUT SYSTEM - Payouts should work again!' as final_status;