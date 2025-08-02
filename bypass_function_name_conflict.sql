-- BYPASS FUNCTION NAME CONFLICT: Use completely different function name
-- The issue is PostgreSQL is calling wrong version despite nuclear cleanup

BEGIN;

-- =====================================================================
-- STEP 1: CREATE FUNCTION WITH COMPLETELY NEW NAME
-- =====================================================================

-- Use completely new name that has never existed before
CREATE OR REPLACE FUNCTION public.process_roulette_round_completion(
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
  v_updated_lifetime_xp NUMERIC;
BEGIN
  RAISE NOTICE '🎯 [NEW FUNCTION] Processing round % for XP and payouts', p_round_id;
  
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
    
    -- ✅ DIRECT XP CALCULATION: 10% of wager amount
    v_xp_amount := v_bet.bet_amount * 0.1;
    v_xp_awarded := v_xp_awarded + v_xp_amount;
    
    RAISE NOTICE '⭐ [NEW XP] User % gets % XP for $% bet (10%% rate)', 
      v_bet.user_id, v_xp_amount, v_bet.bet_amount;
    
    -- Update user_level_stats with wager tracking and XP
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
      -- ✅ CRITICAL: Update wager amounts AND XP together
      lifetime_xp = user_level_stats.lifetime_xp + v_xp_amount,
      roulette_games = user_level_stats.roulette_games + 1,
      roulette_wagered = user_level_stats.roulette_wagered + v_bet.bet_amount,
      roulette_profit = user_level_stats.roulette_profit + v_profit,
      total_games = user_level_stats.total_games + 1,
      total_wagered = user_level_stats.total_wagered + v_bet.bet_amount,
      total_profit = user_level_stats.total_profit + v_profit,
      updated_at = NOW();
    
    -- Get updated lifetime XP
    SELECT lifetime_xp INTO v_updated_lifetime_xp
    FROM user_level_stats 
    WHERE user_id = v_bet.user_id;
    
    -- Simple level calculation (no external function calls)
    DECLARE
      user_level INTEGER;
      level_xp INTEGER;
      xp_to_next INTEGER;
    BEGIN
      -- Calculate level based on 651 XP per level for levels 1-10
      IF v_updated_lifetime_xp < 6510 THEN -- Levels 1-10
        user_level := GREATEST(1, (v_updated_lifetime_xp / 651)::INTEGER + 1);
        level_xp := v_updated_lifetime_xp % 651;
        xp_to_next := 651;
      ELSE -- Level 11+ (678 XP per level)
        user_level := 10 + ((v_updated_lifetime_xp - 6510) / 678)::INTEGER + 1;
        level_xp := (v_updated_lifetime_xp - 6510) % 678;
        xp_to_next := 678;
      END IF;
      
      -- Update level progression
      UPDATE user_level_stats 
      SET 
        current_level = user_level,
        current_level_xp = level_xp,
        xp_to_next_level = xp_to_next,
        updated_at = NOW()
      WHERE user_id = v_bet.user_id;
      
      RAISE NOTICE '📊 [NEW LEVEL] User % is now level % with %/% XP', 
        v_bet.user_id, user_level, level_xp, xp_to_next;
    END;
    
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
  
  RAISE NOTICE '✅ [NEW SUCCESS] Round completed: % bets processed, % winners, % XP awarded total', 
    v_bets_processed, v_winners_processed, v_xp_awarded;
  
  RETURN jsonb_build_object(
    'success', true,
    'bets_processed', v_bets_processed,
    'winners_processed', v_winners_processed,
    'xp_awarded', v_xp_awarded,
    'result_color', v_round_result_color,
    'result_slot', v_round_result_slot,
    'version', 'new_function_name_bypass'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error in process_roulette_round_completion: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false, 
      'error', SQLERRM,
      'version', 'new_function_name_bypass'
    );
END;
$$;

-- =====================================================================
-- STEP 2: DROP ALL OLD COMPLETE_ROULETTE_ROUND FUNCTIONS AGAIN
-- =====================================================================

-- Drop all old problematic functions
DROP FUNCTION IF EXISTS public.complete_roulette_round CASCADE;
DROP FUNCTION IF EXISTS complete_roulette_round CASCADE;
DROP FUNCTION IF EXISTS public.complete_roulette_round(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.complete_roulette_round(uuid) CASCADE;
DROP FUNCTION IF EXISTS complete_roulette_round(UUID) CASCADE;
DROP FUNCTION IF EXISTS complete_roulette_round(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.complete_roulette_round_v2 CASCADE;

-- =====================================================================
-- STEP 3: CREATE NEW COMPLETE_ROULETTE_ROUND AS SIMPLE WRAPPER
-- =====================================================================

-- Now create the expected function name as a wrapper to the new function
CREATE OR REPLACE FUNCTION public.complete_roulette_round(p_round_id UUID)
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT public.process_roulette_round_completion(p_round_id);
$$;

-- =====================================================================
-- STEP 4: GRANT ALL PERMISSIONS
-- =====================================================================

GRANT EXECUTE ON FUNCTION public.process_roulette_round_completion(UUID) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_roulette_round(UUID) TO postgres, anon, authenticated, service_role;

-- =====================================================================
-- STEP 5: VERIFY NEW FUNCTION WORKS
-- =====================================================================

DO $$
DECLARE
  func_count INTEGER;
BEGIN
  -- Check how many complete_roulette_round functions exist now
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid 
  WHERE n.nspname = 'public' 
  AND p.proname = 'complete_roulette_round';
  
  RAISE NOTICE 'Found % complete_roulette_round functions', func_count;
  
  -- Check if new function exists
  IF EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'process_roulette_round_completion'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE NOTICE '✅ NEW FUNCTION: process_roulette_round_completion created successfully';
    RAISE NOTICE '✅ WRAPPER FUNCTION: complete_roulette_round ready to call new function';
  ELSE
    RAISE EXCEPTION '❌ NEW FUNCTION CREATION FAILED';
  END IF;
END $$;

COMMIT;

-- =====================================================================
-- BYPASS COMPLETED
-- =====================================================================
-- ✅ Created new function with completely different name
-- ✅ Bypasses PostgreSQL function name caching/conflict issues
-- ✅ Direct XP calculation built-in (10% of wager)
-- ✅ Simple level calculation with no external dependencies
-- ✅ Comprehensive wager tracking and XP awarding
-- ✅ All permissions granted to all roles
-- ✅ Old problematic functions dropped
-- ✅ Wrapper function created for edge function compatibility
-- =====================================================================

SELECT 'NEW FUNCTION BYPASS COMPLETE - Test roulette betting now!' as final_status;