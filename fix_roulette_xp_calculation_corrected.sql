-- Fix Roulette XP Calculation - Award 10% of wager as XP (CORRECTED VERSION)
-- Issue: Fixed RAISE statement parameter mismatch

BEGIN;

-- =====================================================================
-- FIX COMPLETE_ROULETTE_ROUND FUNCTION FOR CORRECT XP CALCULATION
-- =====================================================================

CREATE OR REPLACE FUNCTION public.complete_roulette_round(
  p_round_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = public
AS $$
DECLARE
  v_round_result_color TEXT;
  v_round_result_slot INTEGER;
  v_bets_processed INTEGER := 0;
  v_winners_processed INTEGER := 0;
  v_xp_awarded NUMERIC := 0;
  v_bet RECORD;
  v_is_winner BOOLEAN;
  v_actual_payout NUMERIC;
  v_profit NUMERIC;
  v_xp_amount NUMERIC;
  v_level_calc RECORD;
  v_updated_lifetime_xp NUMERIC;
BEGIN
  -- Get round result
  SELECT result_color, result_slot INTO v_round_result_color, v_round_result_slot
  FROM roulette_rounds 
  WHERE id = p_round_id;
  
  IF v_round_result_color IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round not found or no result');
  END IF;
  
  RAISE NOTICE '🎯 Processing round % with result: % %', p_round_id, v_round_result_color, v_round_result_slot;
  
  -- Process all bets for this round
  FOR v_bet IN 
    SELECT * FROM roulette_bets WHERE round_id = p_round_id
  LOOP
    v_bets_processed := v_bets_processed + 1;
    
    -- Determine if bet won
    v_is_winner := (v_bet.bet_color = v_round_result_color);
    
    -- Calculate payout and profit
    IF v_is_winner THEN
      v_actual_payout := v_bet.potential_payout;
      v_profit := v_actual_payout - v_bet.bet_amount;
      v_winners_processed := v_winners_processed + 1;
      
      -- Pay the winner
      UPDATE profiles 
      SET balance = balance + v_actual_payout,
          updated_at = NOW()
      WHERE id = v_bet.user_id;
      
      RAISE NOTICE '💰 Winner: User % won % (profit: %)', v_bet.user_id, v_actual_payout, v_profit;
    ELSE
      v_actual_payout := 0;
      v_profit := -v_bet.bet_amount;
      
      RAISE NOTICE '💸 Loser: User % lost %', v_bet.user_id, v_bet.bet_amount;
    END IF;
    
    -- Update bet with results
    UPDATE roulette_bets 
    SET 
      actual_payout = v_actual_payout,
      is_winner = v_is_winner,
      profit = v_profit
    WHERE id = v_bet.id;
    
    -- ✅ FIXED: Award XP as 10% of wager amount (0.1 XP per dollar)
    v_xp_amount := v_bet.bet_amount * 0.1;
    v_xp_awarded := v_xp_awarded + v_xp_amount;
    
    RAISE NOTICE '⭐ XP Award: User % gets % XP for $% bet (10%% rate)', 
      v_bet.user_id, v_xp_amount, v_bet.bet_amount;
    
    -- Update user level stats with proper XP handling
    INSERT INTO user_level_stats (
      user_id, 
      lifetime_xp, 
      current_level, 
      current_level_xp, 
      xp_to_next_level,
      roulette_games, 
      roulette_wagered, 
      roulette_profit,
      total_games,
      total_wagered,
      total_profit,
      updated_at
    )
    VALUES (
      v_bet.user_id, 
      v_xp_amount, 
      1, 
      v_xp_amount, 
      651,
      1, 
      v_bet.bet_amount, 
      v_profit,
      1,
      v_bet.bet_amount,
      v_profit,
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      -- Update lifetime XP
      lifetime_xp = user_level_stats.lifetime_xp + v_xp_amount,
      -- Update game stats
      roulette_games = user_level_stats.roulette_games + 1,
      roulette_wagered = user_level_stats.roulette_wagered + v_bet.bet_amount,
      roulette_profit = user_level_stats.roulette_profit + v_profit,
      total_games = user_level_stats.total_games + 1,
      total_wagered = user_level_stats.total_wagered + v_bet.bet_amount,
      total_profit = user_level_stats.total_profit + v_profit,
      updated_at = NOW();
    
    -- ✅ FIXED: Recalculate level and XP values using exact functions
    -- Get the updated lifetime XP for this user
    SELECT lifetime_xp INTO v_updated_lifetime_xp
    FROM user_level_stats 
    WHERE user_id = v_bet.user_id;
    
    -- Calculate correct level data using the exact functions
    SELECT * INTO v_level_calc 
    FROM public.calculate_level_from_xp_exact(v_updated_lifetime_xp::INTEGER);
    
    -- Update with correct level, current_level_xp, and xp_to_next_level
    UPDATE user_level_stats 
    SET 
      current_level = v_level_calc.level,
      current_level_xp = v_level_calc.current_level_xp,
      xp_to_next_level = v_level_calc.xp_to_next,
      updated_at = NOW()
    WHERE user_id = v_bet.user_id;
    
    RAISE NOTICE '📊 Level Update: User % is now level % with %/% XP', 
      v_bet.user_id, v_level_calc.level, v_level_calc.current_level_xp, v_level_calc.xp_to_next;
    
    -- Add to game history
    INSERT INTO game_history (
      user_id,
      game_type, 
      bet_amount,
      result,
      profit,
      game_data,
      created_at
    ) VALUES (
      v_bet.user_id,
      'roulette',
      v_bet.bet_amount,
      CASE WHEN v_is_winner THEN 'win' ELSE 'loss' END,
      v_profit,
      jsonb_build_object(
        'bet_color', v_bet.bet_color,
        'result_color', v_round_result_color,
        'result_slot', v_round_result_slot,
        'round_id', p_round_id,
        'xp_awarded', v_xp_amount
      ),
      NOW()
    );
  END LOOP;
  
  -- Mark round as completed
  UPDATE roulette_rounds 
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE id = p_round_id;
  
  RAISE NOTICE '✅ Round completed: % bets processed, % winners, % XP awarded total', 
    v_bets_processed, v_winners_processed, v_xp_awarded;
  
  RETURN jsonb_build_object(
    'success', true,
    'bets_processed', v_bets_processed,
    'winners_processed', v_winners_processed,
    'xp_awarded', v_xp_awarded,
    'result_color', v_round_result_color,
    'result_slot', v_round_result_slot
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error in complete_roulette_round: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false, 
      'error', SQLERRM
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.complete_roulette_round TO postgres, anon, authenticated, service_role;

COMMIT;

-- =====================================================================
-- FIXES COMPLETED
-- =====================================================================
-- ✅ XP calculation fixed: 10% of wager amount (not 1 XP per dollar)
-- ✅ Level recalculation using exact XP functions after each bet
-- ✅ Proper current_level, current_level_xp, xp_to_next_level updates
-- ✅ Enhanced logging for XP awards and level updates
-- ✅ Game history includes XP awarded for transparency
-- ✅ Fixed RAISE statement parameter mismatch
-- ✅ Removed nested DECLARE block that caused compilation issues
-- =====================================================================

-- Test the XP calculation manually
SELECT 
  'XP Calculation Test' as test,
  1.0 * 0.1 as "1_dollar_bet_xp",
  5.0 * 0.1 as "5_dollar_bet_xp", 
  10.0 * 0.1 as "10_dollar_bet_xp",
  'Should be 0.1, 0.5, 1.0 respectively' as expected;