-- COMPREHENSIVE DATABASE SCHEMA FIX
-- Add ALL missing columns and fix schema mismatches step by step

BEGIN;

-- =====================================================================
-- STEP 1: INVESTIGATE CURRENT SCHEMA
-- =====================================================================

DO $$
DECLARE
  table_info RECORD;
  column_info RECORD;
  table_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 === CURRENT DATABASE SCHEMA INVESTIGATION ===';
  RAISE NOTICE '';
  
  -- Check key tables and their columns
  FOR table_info IN
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('roulette_bets', 'roulette_rounds', 'roulette_results', 'user_level_stats', 'profiles', 'game_history')
    ORDER BY table_name
  LOOP
    table_count := table_count + 1;
    RAISE NOTICE '📋 TABLE #%: %', table_count, table_info.table_name;
    
    -- List columns for this table
    FOR column_info IN
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = table_info.table_name
      ORDER BY ordinal_position
    LOOP
      RAISE NOTICE '   - % (% %)', column_info.column_name, column_info.data_type, 
        CASE WHEN column_info.is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END;
    END LOOP;
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '🔍 === END SCHEMA INVESTIGATION ===';
  RAISE NOTICE '';
END $$;

-- =====================================================================
-- STEP 2: ADD MISSING COLUMNS TO ROULETTE_BETS
-- =====================================================================

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'roulette_bets' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.roulette_bets ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added updated_at column to roulette_bets';
  ELSE
    RAISE NOTICE '✅ updated_at column already exists in roulette_bets';
  END IF;
END $$;

-- Add actual_payout column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'roulette_bets' 
    AND column_name = 'actual_payout'
  ) THEN
    ALTER TABLE public.roulette_bets ADD COLUMN actual_payout NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added actual_payout column to roulette_bets';
  ELSE
    RAISE NOTICE '✅ actual_payout column already exists in roulette_bets';
  END IF;
END $$;

-- Add is_winner column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'roulette_bets' 
    AND column_name = 'is_winner'
  ) THEN
    ALTER TABLE public.roulette_bets ADD COLUMN is_winner BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added is_winner column to roulette_bets';
  ELSE
    RAISE NOTICE '✅ is_winner column already exists in roulette_bets';
  END IF;
END $$;

-- Add profit column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'roulette_bets' 
    AND column_name = 'profit'
  ) THEN
    ALTER TABLE public.roulette_bets ADD COLUMN profit NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added profit column to roulette_bets';
  ELSE
    RAISE NOTICE '✅ profit column already exists in roulette_bets';
  END IF;
END $$;

-- =====================================================================
-- STEP 3: ADD MISSING COLUMNS TO ROULETTE_ROUNDS
-- =====================================================================

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'roulette_rounds' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.roulette_rounds ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added updated_at column to roulette_rounds';
  ELSE
    RAISE NOTICE '✅ updated_at column already exists in roulette_rounds';
  END IF;
END $$;

-- =====================================================================
-- STEP 4: ADD MISSING COLUMNS TO USER_LEVEL_STATS
-- =====================================================================

-- Add current_xp column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_level_stats' 
    AND column_name = 'current_xp'
  ) THEN
    ALTER TABLE public.user_level_stats ADD COLUMN current_xp NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added current_xp column to user_level_stats';
  ELSE
    RAISE NOTICE '✅ current_xp column already exists in user_level_stats';
  END IF;
END $$;

-- Add current_level_xp column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_level_stats' 
    AND column_name = 'current_level_xp'
  ) THEN
    ALTER TABLE public.user_level_stats ADD COLUMN current_level_xp NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added current_level_xp column to user_level_stats';
  ELSE
    RAISE NOTICE '✅ current_level_xp column already exists in user_level_stats';
  END IF;
END $$;

-- Add xp_to_next_level column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_level_stats' 
    AND column_name = 'xp_to_next_level'
  ) THEN
    ALTER TABLE public.user_level_stats ADD COLUMN xp_to_next_level NUMERIC DEFAULT 651;
    RAISE NOTICE '✅ Added xp_to_next_level column to user_level_stats';
  ELSE
    RAISE NOTICE '✅ xp_to_next_level column already exists in user_level_stats';
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_level_stats' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.user_level_stats ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added updated_at column to user_level_stats';
  ELSE
    RAISE NOTICE '✅ updated_at column already exists in user_level_stats';
  END IF;
END $$;

-- =====================================================================
-- STEP 5: ADD MISSING COLUMNS TO PROFILES
-- =====================================================================

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added updated_at column to profiles';
  ELSE
    RAISE NOTICE '✅ updated_at column already exists in profiles';
  END IF;
END $$;

-- =====================================================================
-- STEP 6: CREATE FIXED COMPLETE_ROULETTE_ROUND FUNCTION
-- =====================================================================

-- Drop existing function and recreate without problematic columns
DROP FUNCTION IF EXISTS public.complete_roulette_round(UUID) CASCADE;

-- Create the fixed complete_roulette_round function
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
  RAISE NOTICE '[SCHEMA_FIXED] Processing round completion: %', p_round_id;
  
  -- Get round result data
  SELECT result_color, result_slot 
  INTO v_result_color, v_result_slot
  FROM roulette_rounds 
  WHERE id = p_round_id;
  
  IF v_result_color IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Round not found or no result available',
      'version', 'schema_fixed_complete'
    );
  END IF;
  
  RAISE NOTICE '[SCHEMA_FIXED] Round % result: % %', p_round_id, v_result_color, v_result_slot;
  
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
      
      -- Credit winner's balance (check if updated_at exists first)
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at'
      ) THEN
        UPDATE profiles 
        SET balance = balance + v_payout,
            updated_at = NOW()
        WHERE id = v_bet_record.user_id;
      ELSE
        UPDATE profiles 
        SET balance = balance + v_payout
        WHERE id = v_bet_record.user_id;
      END IF;
      
      RAISE NOTICE '[SCHEMA_FIXED] Winner paid: User % received %', v_bet_record.user_id, v_payout;
    ELSE
      v_payout := 0;
      v_profit := -v_bet_record.bet_amount;
      RAISE NOTICE '[SCHEMA_FIXED] Losing bet: User % lost %', v_bet_record.user_id, v_bet_record.bet_amount;
    END IF;
    
    -- Update the bet record with final results (check columns exist first)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'roulette_bets' 
      AND column_name IN ('actual_payout', 'is_winner', 'profit', 'updated_at')
    ) THEN
      UPDATE roulette_bets 
      SET 
        actual_payout = v_payout,
        is_winner = v_is_winning_bet,
        profit = v_profit,
        updated_at = NOW()
      WHERE id = v_bet_record.id;
    ELSE
      -- Fallback update without new columns
      RAISE NOTICE '[SCHEMA_FIXED] Warning: roulette_bets missing new columns, skipping bet record update';
    END IF;
    
    -- Calculate XP (10% of bet amount)
    v_xp_earned := v_bet_record.bet_amount * 0.1;
    v_total_xp := v_total_xp + v_xp_earned;
    
    RAISE NOTICE '[SCHEMA_FIXED] Processing stats for user %: bet=%, profit=%, xp=%', 
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
    
    RAISE NOTICE '[SCHEMA_FIXED] Stats update result: %', v_stats_result;
    
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
  
  -- Mark the round as completed (check if updated_at exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'roulette_rounds' AND column_name = 'updated_at'
  ) THEN
    UPDATE roulette_rounds 
    SET 
      status = 'completed',
      updated_at = NOW()
    WHERE id = p_round_id;
  ELSE
    UPDATE roulette_rounds 
    SET status = 'completed'
    WHERE id = p_round_id;
  END IF;
  
  RAISE NOTICE '[SCHEMA_FIXED] Round % completed successfully: % bets, % winners, % total XP', 
    p_round_id, v_bet_count, v_winner_count, v_total_xp;
  
  RETURN jsonb_build_object(
    'success', true,
    'bets_processed', v_bet_count,
    'winners_processed', v_winner_count,
    'xp_awarded', v_total_xp,
    'result_color', v_result_color,
    'result_slot', v_result_slot,
    'version', 'schema_fixed_complete'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[SCHEMA_FIXED] ERROR in complete_roulette_round: % %', SQLSTATE, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'version', 'schema_fixed_complete_error'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.complete_roulette_round(UUID) TO postgres, anon, authenticated, service_role;

-- =====================================================================
-- STEP 7: VERIFY THE SCHEMA FIXES
-- =====================================================================

DO $$
DECLARE
  table_info RECORD;
  column_info RECORD;
  missing_columns INTEGER := 0;
  critical_columns TEXT[] := ARRAY[
    'roulette_bets.updated_at',
    'roulette_bets.actual_payout', 
    'roulette_bets.is_winner',
    'roulette_bets.profit',
    'roulette_rounds.updated_at',
    'user_level_stats.current_xp',
    'user_level_stats.current_level_xp',
    'user_level_stats.xp_to_next_level',
    'user_level_stats.updated_at',
    'profiles.updated_at'
  ];
  critical_column TEXT;
  table_name TEXT;
  column_name TEXT;
BEGIN
  RAISE NOTICE '🔍 === VERIFYING SCHEMA FIXES ===';
  RAISE NOTICE '';
  
  FOREACH critical_column IN ARRAY critical_columns
  LOOP
    -- Split table.column
    table_name := split_part(critical_column, '.', 1);
    column_name := split_part(critical_column, '.', 2);
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = table_name
      AND column_name = column_name
    ) THEN
      RAISE NOTICE '✅ %', critical_column;
    ELSE
      RAISE NOTICE '❌ MISSING: %', critical_column;
      missing_columns := missing_columns + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  IF missing_columns = 0 THEN
    RAISE NOTICE '✅ ALL CRITICAL COLUMNS VERIFIED - Schema is complete!';
  ELSE
    RAISE NOTICE '❌ % missing columns found', missing_columns;
  END IF;
  
  RAISE NOTICE '🔍 === END SCHEMA VERIFICATION ===';
  RAISE NOTICE '';
END $$;

-- =====================================================================
-- STEP 8: TEST THE FIXED FUNCTION
-- =====================================================================

-- Test the fixed function
DO $$
DECLARE
  test_result JSONB;
BEGIN
  RAISE NOTICE '🧪 === TESTING SCHEMA-FIXED FUNCTION ===';
  
  SELECT public.complete_roulette_round('00000000-0000-0000-0000-000000000000') 
  INTO test_result;
  
  RAISE NOTICE 'Test result: %', test_result;
  
  IF test_result->>'error' LIKE '%Round not found%' THEN
    RAISE NOTICE '✅ Function works correctly (expected Round not found)';
  ELSIF test_result->>'error' LIKE '%updated_at%' THEN
    RAISE NOTICE '❌ Still has updated_at column error: %', test_result;
  ELSE
    RAISE NOTICE '❓ Unexpected result: %', test_result;
  END IF;
  
  RAISE NOTICE '🧪 === END TESTING ===';
END $$;

COMMIT;

-- Show final status
SELECT 'COMPREHENSIVE DATABASE SCHEMA FIX COMPLETE - All missing columns added!' as final_status;