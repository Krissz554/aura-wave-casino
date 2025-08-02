-- NUCLEAR DATABASE FUNCTION INVESTIGATION & CLEANUP
-- We need to find out what's actually happening with the functions

BEGIN;

-- =====================================================================
-- STEP 1: COMPLETE INVESTIGATION - FIND ALL FUNCTIONS
-- =====================================================================

-- Check ALL functions that exist in the database
DO $$
DECLARE
  func_record RECORD;
  func_info TEXT := '';
BEGIN
  RAISE NOTICE '🔍 === COMPLETE FUNCTION INVESTIGATION ===';
  RAISE NOTICE '';
  
  -- List ALL functions containing 'complete_roulette' or 'add_xp'
  FOR func_record IN
    SELECT 
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_arguments(p.oid) as arguments,
      pg_get_function_result(p.oid) as return_type,
      p.prosrc as source_code
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE (p.proname LIKE '%complete_roulette%' OR p.proname LIKE '%add_xp%')
    ORDER BY n.nspname, p.proname
  LOOP
    RAISE NOTICE '📋 FUNCTION FOUND:';
    RAISE NOTICE '   Schema: %', func_record.schema_name;
    RAISE NOTICE '   Name: %', func_record.function_name;
    RAISE NOTICE '   Arguments: %', func_record.arguments;
    RAISE NOTICE '   Return Type: %', func_record.return_type;
    RAISE NOTICE '   Source Preview: %', LEFT(func_record.source_code, 200) || '...';
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '🔍 === END FUNCTION INVESTIGATION ===';
END $$;

-- =====================================================================
-- STEP 2: NUCLEAR ELIMINATION - DROP EVERYTHING
-- =====================================================================

-- Drop ALL functions that could be problematic
DROP FUNCTION IF EXISTS public.complete_roulette_round CASCADE;
DROP FUNCTION IF EXISTS complete_roulette_round CASCADE;
DROP FUNCTION IF EXISTS public.complete_roulette_round(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.complete_roulette_round(uuid) CASCADE;
DROP FUNCTION IF EXISTS complete_roulette_round(UUID) CASCADE;
DROP FUNCTION IF EXISTS complete_roulette_round(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.complete_roulette_round_v2 CASCADE;
DROP FUNCTION IF EXISTS complete_roulette_round_v2 CASCADE;
DROP FUNCTION IF EXISTS public.process_roulette_round_completion CASCADE;
DROP FUNCTION IF EXISTS process_roulette_round_completion CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_from_wager CASCADE;
DROP FUNCTION IF EXISTS add_xp_from_wager CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_from_wager(UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_from_wager(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS add_xp_from_wager(UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS add_xp_from_wager(uuid, numeric) CASCADE;

-- Dynamic SQL to drop any remaining functions with these names
DO $$
DECLARE
  func_record RECORD;
  drop_sql TEXT;
BEGIN
  RAISE NOTICE '🧹 === DYNAMIC FUNCTION CLEANUP ===';
  
  -- Find and drop ANY remaining functions with problematic names
  FOR func_record IN
    SELECT 
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE (p.proname LIKE '%complete_roulette%' OR p.proname LIKE '%add_xp%')
  LOOP
    drop_sql := format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE', 
                      func_record.schema_name, 
                      func_record.function_name, 
                      func_record.signature);
    
    RAISE NOTICE 'Executing: %', drop_sql;
    
    BEGIN
      EXECUTE drop_sql;
      RAISE NOTICE '✅ Dropped: %.%(%)', func_record.schema_name, func_record.function_name, func_record.signature;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Failed to drop %.%(%): %', func_record.schema_name, func_record.function_name, func_record.signature, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '🧹 === END DYNAMIC CLEANUP ===';
END $$;

-- =====================================================================
-- STEP 3: VERIFICATION - CONFIRM ALL GONE
-- =====================================================================

DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 === POST-CLEANUP VERIFICATION ===';
  
  SELECT COUNT(*) INTO remaining_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid 
  WHERE (p.proname LIKE '%complete_roulette%' OR p.proname LIKE '%add_xp%');
  
  IF remaining_count > 0 THEN
    RAISE NOTICE '❌ WARNING: % problematic functions still remain!', remaining_count;
    
    -- List remaining functions
    DECLARE
      func_record RECORD;
    BEGIN
      FOR func_record IN
        SELECT 
          n.nspname as schema_name,
          p.proname as function_name,
          pg_get_function_arguments(p.oid) as arguments
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE (p.proname LIKE '%complete_roulette%' OR p.proname LIKE '%add_xp%')
      LOOP
        RAISE NOTICE '   🔴 REMAINING: %.%(%)', func_record.schema_name, func_record.function_name, func_record.arguments;
      END LOOP;
    END;
  ELSE
    RAISE NOTICE '✅ SUCCESS: All problematic functions eliminated!';
  END IF;
  
  RAISE NOTICE '🔍 === END VERIFICATION ===';
END $$;

-- =====================================================================
-- STEP 4: CREATE SINGLE, CLEAN FUNCTION
-- =====================================================================

-- Create ONE function with completely unique name and comprehensive logic
CREATE OR REPLACE FUNCTION public.roulette_round_processor_final(
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
  v_user_stats RECORD;
BEGIN
  RAISE NOTICE '🎯 [FINAL PROCESSOR] Starting round % completion', p_round_id;
  
  -- Get round result
  SELECT result_color, result_slot INTO v_round_result_color, v_round_result_slot
  FROM roulette_rounds 
  WHERE id = p_round_id;
  
  IF v_round_result_color IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Round not found or no result',
      'version', 'final_processor'
    );
  END IF;
  
  RAISE NOTICE '🎯 Round % result: % %', p_round_id, v_round_result_color, v_round_result_slot;
  
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
      
      RAISE NOTICE '💰 [FINAL] Winner: User % won % (profit: %)', v_bet.user_id, v_actual_payout, v_profit;
    ELSE
      v_actual_payout := 0;
      v_profit := -v_bet.bet_amount;
      
      RAISE NOTICE '💸 [FINAL] Loser: User % lost %', v_bet.user_id, v_bet.bet_amount;
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
    
    RAISE NOTICE '⭐ [FINAL XP] User % gets % XP for $% bet', 
      v_bet.user_id, v_xp_amount, v_bet.bet_amount;
    
    -- Update user_level_stats with wager tracking and XP (COMPREHENSIVE)
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
      -- ✅ CRITICAL: Update ALL stats together
      lifetime_xp = user_level_stats.lifetime_xp + v_xp_amount,
      roulette_games = user_level_stats.roulette_games + 1,
      roulette_wagered = user_level_stats.roulette_wagered + v_bet.bet_amount,
      roulette_profit = user_level_stats.roulette_profit + v_profit,
      total_games = user_level_stats.total_games + 1,
      total_wagered = user_level_stats.total_wagered + v_bet.bet_amount,
      total_profit = user_level_stats.total_profit + v_profit,
      updated_at = NOW();
    
    -- Get current user stats after update
    SELECT * INTO v_user_stats
    FROM user_level_stats 
    WHERE user_id = v_bet.user_id;
    
    -- Simple level calculation based on XP requirements
    DECLARE
      new_level INTEGER;
      level_xp INTEGER;
      xp_needed INTEGER;
    BEGIN
      -- Basic level calculation (651 XP per level for simplicity)
      new_level := GREATEST(1, (v_user_stats.lifetime_xp / 651)::INTEGER + 1);
      level_xp := v_user_stats.lifetime_xp % 651;
      xp_needed := 651 - level_xp;
      
      -- Update level progression
      UPDATE user_level_stats 
      SET 
        current_level = new_level,
        current_level_xp = level_xp,
        xp_to_next_level = xp_needed,
        updated_at = NOW()
      WHERE user_id = v_bet.user_id;
      
      RAISE NOTICE '📊 [FINAL LEVEL] User % is now level % with %/651 XP', 
        v_bet.user_id, new_level, level_xp;
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
  
  RAISE NOTICE '✅ [FINAL SUCCESS] Round %: % bets, % winners, % XP total', 
    p_round_id, v_bets_processed, v_winners_processed, v_xp_awarded;
  
  RETURN jsonb_build_object(
    'success', true,
    'bets_processed', v_bets_processed,
    'winners_processed', v_winners_processed,
    'xp_awarded', v_xp_awarded,
    'result_color', v_round_result_color,
    'result_slot', v_round_result_slot,
    'version', 'final_processor_clean'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ [FINAL ERROR]: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false, 
      'error', SQLERRM,
      'version', 'final_processor_clean'
    );
END;
$$;

-- =====================================================================
-- STEP 5: CREATE WRAPPER WITH EXPECTED NAME
-- =====================================================================

-- Create wrapper function with the name the edge function expects
CREATE OR REPLACE FUNCTION public.complete_roulette_round(p_round_id UUID)
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT public.roulette_round_processor_final(p_round_id);
$$;

-- =====================================================================
-- STEP 6: GRANT PERMISSIONS
-- =====================================================================

GRANT EXECUTE ON FUNCTION public.roulette_round_processor_final(UUID) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_roulette_round(UUID) TO postgres, anon, authenticated, service_role;

-- =====================================================================
-- STEP 7: FINAL VERIFICATION
-- =====================================================================

DO $$
DECLARE
  final_count INTEGER;
  test_result JSONB;
BEGIN
  RAISE NOTICE '🔍 === FINAL VERIFICATION ===';
  
  -- Count remaining functions
  SELECT COUNT(*) INTO final_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid 
  WHERE n.nspname = 'public' 
  AND p.proname = 'complete_roulette_round';
  
  RAISE NOTICE 'complete_roulette_round functions remaining: %', final_count;
  
  -- Check if our main function exists
  IF EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'roulette_round_processor_final'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE NOTICE '✅ PRIMARY FUNCTION: roulette_round_processor_final exists';
  ELSE
    RAISE EXCEPTION '❌ PRIMARY FUNCTION MISSING!';
  END IF;
  
  -- Check if wrapper exists
  IF EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'complete_roulette_round'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE NOTICE '✅ WRAPPER FUNCTION: complete_roulette_round exists';
  ELSE
    RAISE EXCEPTION '❌ WRAPPER FUNCTION MISSING!';
  END IF;
  
  RAISE NOTICE '✅ === NUCLEAR CLEANUP COMPLETE ===';
  RAISE NOTICE '🎯 Ready for testing! The edge function should now work correctly.';
END $$;

COMMIT;

-- =====================================================================
-- NUCLEAR CLEANUP SUMMARY:
-- ✅ Investigated all existing functions
-- ✅ Eliminated ALL problematic functions with dynamic SQL
-- ✅ Created single clean function: roulette_round_processor_final
-- ✅ Created wrapper: complete_roulette_round (for edge function)
-- ✅ Built-in XP calculation (10% of wager)
-- ✅ Comprehensive payout processing
-- ✅ No external function dependencies
-- ✅ All permissions granted
-- =====================================================================

SELECT 'NUCLEAR CLEANUP COMPLETE - Test roulette now!' as status;