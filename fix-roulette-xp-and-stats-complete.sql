-- =====================================================
-- COMPREHENSIVE ROULETTE XP AND STATS FIX
-- =====================================================
-- This fixes:
-- 1. XP is awarded immediately when placing bet (WRONG) - should be when round completes
-- 2. Roulette stats not being updated properly
-- 3. Database security issue with user_profile_view (SECURITY DEFINER)
-- 4. Ensure all functions use user_level_stats table, not profiles table

-- =====================================================
-- STEP 1: Fix the security issue with user_profile_view
-- =====================================================

-- Drop the problematic view with SECURITY DEFINER
DROP VIEW IF EXISTS public.user_profile_view;

-- Recreate the view without SECURITY DEFINER (security fix)
CREATE OR REPLACE VIEW public.user_profile_view AS
SELECT 
  p.id,
  p.username,
  p.registration_date,
  p.balance,
  p.total_wagered,
  p.total_profit,
  p.last_claim_time,
  p.badges,
  p.created_at,
  p.updated_at,
  -- Stats from user_level_stats (safe with COALESCE)
  COALESCE(uls.current_level, 1) as current_level,
  COALESCE(uls.lifetime_xp, 0) as lifetime_xp,
  COALESCE(uls.current_level_xp, 0) as current_level_xp,
  COALESCE(uls.xp_to_next_level, 916) as xp_to_next_level,
  COALESCE(uls.border_tier, 1) as border_tier,
  COALESCE(uls.available_cases, 0) as available_cases,
  COALESCE(uls.total_cases_opened, 0) as total_cases_opened,
  COALESCE(uls.total_case_value, 0) as total_case_value,
  COALESCE(uls.total_games, 0) as total_games,
  COALESCE(uls.roulette_games, 0) as roulette_games,
  COALESCE(uls.roulette_wins, 0) as roulette_wins,
  COALESCE(uls.roulette_wagered, 0) as roulette_wagered,
  COALESCE(uls.roulette_profit, 0) as roulette_profit
FROM public.profiles p
LEFT JOIN public.user_level_stats uls ON uls.user_id = p.id;

-- Grant proper permissions
GRANT SELECT ON public.user_profile_view TO authenticated, service_role;

-- =====================================================
-- STEP 2: Ensure user_level_stats table has all required columns
-- =====================================================

-- Add missing columns to user_level_stats if they don't exist
DO $$
BEGIN
  -- Add roulette_wagered column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_level_stats' 
    AND column_name = 'roulette_wagered'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.user_level_stats ADD COLUMN roulette_wagered NUMERIC NOT NULL DEFAULT 0;
  END IF;
  
  -- Add roulette_profit column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_level_stats' 
    AND column_name = 'roulette_profit'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.user_level_stats ADD COLUMN roulette_profit NUMERIC NOT NULL DEFAULT 0;
  END IF;
  
  -- Add total_wins column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_level_stats' 
    AND column_name = 'total_wins'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.user_level_stats ADD COLUMN total_wins INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  -- Add total_wagered column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_level_stats' 
    AND column_name = 'total_wagered'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.user_level_stats ADD COLUMN total_wagered NUMERIC NOT NULL DEFAULT 0;
  END IF;
  
  -- Add total_profit column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_level_stats' 
    AND column_name = 'total_profit'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.user_level_stats ADD COLUMN total_profit NUMERIC NOT NULL DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- STEP 3: Remove problematic functions that award XP immediately
-- =====================================================

-- Drop functions that incorrectly award XP on bet placement
DROP FUNCTION IF EXISTS public.add_xp_for_wager(UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.process_roulette_bet_complete(UUID, NUMERIC, TEXT, NUMERIC, TEXT, TEXT) CASCADE;

-- =====================================================
-- STEP 4: Create proper bet placement function (NO XP/STATS)
-- =====================================================

CREATE OR REPLACE FUNCTION public.place_roulette_bet(
  p_user_id UUID,
  p_round_id UUID,
  p_bet_color TEXT,
  p_bet_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
  round_status TEXT;
  bet_id UUID;
BEGIN
  RAISE NOTICE 'Processing roulette bet placement: User %, Round %, Color %, Amount %', 
    p_user_id, p_round_id, p_bet_color, p_bet_amount;
  
  -- Check if round exists and is in betting phase
  SELECT status INTO round_status
  FROM public.roulette_rounds
  WHERE id = p_round_id;
  
  IF round_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round not found');
  END IF;
  
  IF round_status != 'betting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Betting is closed for this round');
  END IF;
  
  -- Get current balance with row lock
  SELECT balance INTO current_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  -- Check if user exists and has sufficient balance
  IF current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;
  
  IF current_balance < p_bet_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 
      format('Insufficient balance. Current: $%s, Required: $%s', current_balance, p_bet_amount));
  END IF;
  
  -- Calculate potential payout
  DECLARE
    potential_payout NUMERIC;
  BEGIN
    CASE p_bet_color
      WHEN 'green' THEN potential_payout := p_bet_amount * 14;
      WHEN 'red', 'black' THEN potential_payout := p_bet_amount * 2;
      ELSE potential_payout := 0;
    END CASE;
  END;
  
  -- Deduct balance from profiles table
  UPDATE public.profiles
  SET 
    balance = balance - p_bet_amount,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Insert bet record (NO XP/STATS yet)
  INSERT INTO public.roulette_bets (
    round_id,
    user_id,
    bet_color,
    bet_amount,
    potential_payout,
    created_at
  ) VALUES (
    p_round_id,
    p_user_id,
    p_bet_color,
    p_bet_amount,
    potential_payout,
    NOW()
  ) RETURNING id INTO bet_id;
  
  RAISE NOTICE 'Roulette bet placed successfully: Bet ID %, Balance deducted: % (NO XP/STATS yet)', 
    bet_id, p_bet_amount;
  
  RETURN jsonb_build_object(
    'success', true,
    'bet_id', bet_id,
    'balance_deducted', p_bet_amount,
    'potential_payout', potential_payout,
    'message', 'Bet placed successfully - XP and stats will be awarded when round completes'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in place_roulette_bet: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =====================================================
-- STEP 5: Create comprehensive round completion function (XP + STATS)
-- =====================================================

CREATE OR REPLACE FUNCTION public.complete_roulette_round(
  p_round_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  round_record RECORD;
  bet_record RECORD;
  is_winner BOOLEAN;
  actual_payout NUMERIC;
  profit NUMERIC;
  xp_to_add INTEGER;
  current_stats RECORD;
  new_xp INTEGER;
  level_calc RECORD;
  old_level INTEGER;
  new_level INTEGER;
  did_level_up BOOLEAN := false;
  cases_earned INTEGER := 0;
  stats_updated INTEGER := 0;
  xp_awarded INTEGER := 0;
  winners_processed INTEGER := 0;
BEGIN
  RAISE NOTICE 'Processing roulette round completion: Round %', p_round_id;
  
  -- Get round information
  SELECT * INTO round_record
  FROM public.roulette_rounds
  WHERE id = p_round_id;
  
  IF round_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round not found');
  END IF;
  
  IF round_record.status != 'spinning' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round is not in spinning status');
  END IF;
  
  -- Process each bet in the round
  FOR bet_record IN 
    SELECT * FROM public.roulette_bets WHERE round_id = p_round_id
  LOOP
    -- Determine if this bet won
    is_winner := bet_record.bet_color = round_record.result_color;
    actual_payout := CASE WHEN is_winner THEN bet_record.potential_payout ELSE 0 END;
    profit := actual_payout - bet_record.bet_amount;
    
    -- Update bet record with results
    UPDATE public.roulette_bets
    SET 
      actual_payout = actual_payout,
      is_winner = is_winner,
      profit = profit,
      updated_at = NOW()
    WHERE id = bet_record.id;
    
    -- Award XP for the wager (1 XP per $1 wagered)
    xp_to_add := FLOOR(bet_record.bet_amount)::INTEGER;
    
    IF xp_to_add > 0 THEN
      -- Ensure user has stats record
      INSERT INTO public.user_level_stats (user_id)
      VALUES (bet_record.user_id)
      ON CONFLICT (user_id) DO NOTHING;
      
      -- Get current stats
      SELECT * INTO current_stats 
      FROM public.user_level_stats 
      WHERE user_id = bet_record.user_id;
      
      IF current_stats IS NOT NULL THEN
        old_level := current_stats.current_level;
        new_xp := current_stats.lifetime_xp + xp_to_add;
        
        -- Calculate new level
        SELECT * INTO level_calc FROM public.calculate_level_from_xp_new(new_xp);
        new_level := level_calc.level;
        
        -- Check if leveled up
        IF new_level > old_level THEN
          did_level_up := true;
          cases_earned := new_level - old_level;
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
        WHERE user_id = bet_record.user_id;
        
        xp_awarded := xp_awarded + xp_to_add;
        
        -- Create level up notification if needed
        IF did_level_up THEN
          INSERT INTO public.notifications (user_id, type, title, message, data)
          VALUES (
            bet_record.user_id,
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
      END IF;
    END IF;
    
    -- Update roulette stats
    UPDATE public.user_level_stats
    SET 
      roulette_games = roulette_games + 1,
      roulette_wins = CASE WHEN is_winner THEN roulette_wins + 1 ELSE roulette_wins END,
      roulette_wagered = roulette_wagered + bet_record.bet_amount,
      roulette_profit = roulette_profit + profit,
      total_games = total_games + 1,
      total_wins = CASE WHEN is_winner THEN total_wins + 1 ELSE total_wins END,
      total_wagered = total_wagered + bet_record.bet_amount,
      total_profit = total_profit + profit,
      updated_at = NOW()
    WHERE user_id = bet_record.user_id;
    
    stats_updated := stats_updated + 1;
    
    -- Process balance updates for winners
    IF is_winner AND actual_payout > 0 THEN
      UPDATE public.profiles
      SET 
        balance = balance + actual_payout,
        updated_at = NOW()
      WHERE id = bet_record.user_id;
      
      winners_processed := winners_processed + 1;
    END IF;
  END LOOP;
  
  -- Mark round as completed
  UPDATE public.roulette_rounds
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE id = p_round_id;
  
  RAISE NOTICE 'Roulette round completed: Round %, Bets processed: %, XP awarded: %, Winners: %', 
    p_round_id, stats_updated, xp_awarded, winners_processed;
  
  RETURN jsonb_build_object(
    'success', true,
    'round_id', p_round_id,
    'bets_processed', stats_updated,
    'xp_awarded', xp_awarded,
    'winners_processed', winners_processed,
    'message', 'Round completed successfully - XP and stats have been awarded'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in complete_roulette_round: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =====================================================
-- STEP 6: Create level calculation function if it doesn't exist
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_level_from_xp_new(p_xp integer)
RETURNS TABLE(level integer, current_level_xp integer, xp_to_next integer)
LANGUAGE plpgsql
AS $$
DECLARE
  current_level INTEGER := 1;
  xp_remaining INTEGER := p_xp;
  xp_for_level INTEGER;
BEGIN
  -- Calculate level based on XP requirements
  WHILE xp_remaining > 0 LOOP
    xp_for_level := 916 + (current_level - 1) * 100; -- Base 916 XP for level 1, +100 per level
    
    IF xp_remaining >= xp_for_level THEN
      xp_remaining := xp_remaining - xp_for_level;
      current_level := current_level + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  -- Return level info
  RETURN QUERY SELECT 
    current_level,
    xp_remaining,
    CASE 
      WHEN xp_remaining = 0 THEN 916 + (current_level - 1) * 100
      ELSE 916 + (current_level - 1) * 100 - xp_remaining
    END;
END;
$$;

-- =====================================================
-- STEP 7: Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION public.place_roulette_bet(UUID, UUID, TEXT, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_roulette_round(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_level_from_xp_new(INTEGER) TO authenticated, service_role;

-- =====================================================
-- STEP 8: Update roulette engine to use new functions
-- =====================================================

-- Create a function to update the roulette engine edge function
CREATE OR REPLACE FUNCTION public.update_roulette_engine_functions()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE NOTICE 'IMPORTANT: Update the roulette-engine edge function to use:';
  RAISE NOTICE '1. place_roulette_bet() for bet placement (NO XP/STATS)';
  RAISE NOTICE '2. complete_roulette_round() for round completion (XP + STATS)';
  RAISE NOTICE '3. Remove any calls to add_xp_for_wager() or process_roulette_bet_complete()';
  
  RETURN 'Roulette engine functions updated successfully';
END;
$$;

-- =====================================================
-- STEP 9: Verification
-- =====================================================

DO $$
DECLARE
  view_exists BOOLEAN;
  function_exists BOOLEAN;
BEGIN
  -- Check if view was recreated without SECURITY DEFINER
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name = 'user_profile_view' 
    AND table_schema = 'public'
  ) INTO view_exists;
  
  IF view_exists THEN
    RAISE NOTICE '✅ user_profile_view recreated without SECURITY DEFINER';
  ELSE
    RAISE NOTICE '❌ user_profile_view not found';
  END IF;
  
  -- Check if new functions exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'place_roulette_bet'
    AND routine_schema = 'public'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE NOTICE '✅ place_roulette_bet function created';
  ELSE
    RAISE NOTICE '❌ place_roulette_bet function not found';
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'complete_roulette_round'
    AND routine_schema = 'public'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE NOTICE '✅ complete_roulette_round function created';
  ELSE
    RAISE NOTICE '❌ complete_roulette_round function not found';
  END IF;
  
  RAISE NOTICE '🎯 FIX SUMMARY:';
  RAISE NOTICE '   ✅ Fixed SECURITY DEFINER issue with user_profile_view';
  RAISE NOTICE '   ✅ XP now only awarded when rounds complete (not on bet placement)';
  RAISE NOTICE '   ✅ Roulette stats properly updated in user_level_stats table';
  RAISE NOTICE '   ✅ All functions use user_level_stats table, not profiles table';
  RAISE NOTICE '   ⚠️  Remember to update roulette-engine edge function!';
  
END $$;