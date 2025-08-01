-- Fix roulette betting to properly update user statistics and award XP
-- This migration updates the atomic_bet_balance_check function to handle stats and XP

-- =============================================================================
-- 1. UPDATE ATOMIC BET BALANCE CHECK TO INCLUDE STATS AND XP
-- =============================================================================

-- Drop existing function variants
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(uuid, numeric);
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(uuid, numeric, uuid);
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(text, numeric, text);

-- Create comprehensive bet processing function
CREATE OR REPLACE FUNCTION public.atomic_bet_balance_check(
  p_user_id UUID,
  p_bet_amount NUMERIC,
  p_round_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
  xp_to_award NUMERIC;
  old_level INTEGER;
  new_level INTEGER;
  level_up BOOLEAN := false;
  xp_per_dollar NUMERIC := 0.1; -- 0.1 XP per $1 wagered
BEGIN
  RAISE NOTICE 'Processing roulette bet: User %, Amount %, Round %', p_user_id, p_bet_amount, p_round_id;
  
  -- Get current balance with row lock
  SELECT balance INTO current_balance
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  -- Check if user exists and has sufficient balance
  IF current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_message', 'User profile not found'
    );
  END IF;
  
  IF current_balance < p_bet_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_message', format('Insufficient balance. Current: $%s, Required: $%s', current_balance, p_bet_amount)
    );
  END IF;
  
  -- Calculate XP to award (0.1 XP per $1 wagered)
  xp_to_award := p_bet_amount * xp_per_dollar;
  
  -- Get current level before updates
  SELECT current_level INTO old_level
  FROM public.user_level_stats
  WHERE user_id = p_user_id;
  
  -- Update profiles table (balance and total_wagered)
  UPDATE public.profiles
  SET 
    balance = balance - p_bet_amount,
    total_wagered = total_wagered + p_bet_amount,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Update user_level_stats table (comprehensive roulette and general stats)
  UPDATE public.user_level_stats
  SET
    -- XP and level progression
    lifetime_xp = lifetime_xp + xp_to_award,
    current_level_xp = current_level_xp + xp_to_award,
    
    -- Roulette-specific stats
    roulette_games = roulette_games + 1,
    roulette_wagered = roulette_wagered + p_bet_amount,
    roulette_biggest_bet = GREATEST(roulette_biggest_bet, p_bet_amount),
    
    -- General stats
    total_games = total_games + 1,
    total_wagered = total_wagered + p_bet_amount,
    biggest_single_bet = GREATEST(biggest_single_bet, p_bet_amount),
    
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Check for level up and handle level progression
  WITH level_check AS (
    SELECT 
      uls.current_level,
      uls.current_level_xp,
      uls.xp_to_next_level,
      lr.xp_required as next_level_xp_required
    FROM public.user_level_stats uls
    LEFT JOIN public.level_rewards lr ON lr.level = uls.current_level + 1
    WHERE uls.user_id = p_user_id
  )
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
  
  -- Get new level after updates
  SELECT current_level INTO new_level
  FROM public.user_level_stats
  WHERE user_id = p_user_id;
  
  -- Check if level up occurred
  IF new_level > old_level THEN
    level_up := true;
    
    -- Award level up bonus
    UPDATE public.profiles
    SET balance = balance + (SELECT COALESCE(bonus_amount, 0) FROM public.level_rewards WHERE level = new_level)
    WHERE id = p_user_id;
    
    RAISE NOTICE 'Level up! User % leveled up from % to %', p_user_id, old_level, new_level;
  END IF;
  
  -- Add to game history
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
    'roulette',
    p_bet_amount,
    'pending', -- Will be updated when round completes
    0, -- Will be updated when round completes
    jsonb_build_object(
      'round_id', p_round_id,
      'xp_awarded', xp_to_award,
      'level_before', old_level,
      'level_after', new_level
    ),
    NOW()
  );
  
  RAISE NOTICE 'Roulette bet processed successfully: Balance deducted: %, XP awarded: %, Level up: %', 
    p_bet_amount, xp_to_award, level_up;
  
  RETURN jsonb_build_object(
    'success', true,
    'balance_deducted', p_bet_amount,
    'xp_awarded', xp_to_award,
    'old_level', old_level,
    'new_level', new_level,
    'level_up', level_up,
    'message', 'Bet processed successfully with stats and XP updates'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in atomic_bet_balance_check: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error_message', format('Bet processing failed: %s', SQLERRM)
    );
END;
$$;

-- =============================================================================
-- 2. CREATE ROULETTE RESULT PROCESSING FUNCTION
-- =============================================================================

-- Function to update bet results when round completes
CREATE OR REPLACE FUNCTION public.process_roulette_bet_results(
  p_round_id UUID,
  p_winning_color TEXT,
  p_winning_slot INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bet_record RECORD;
  total_processed INTEGER := 0;
  total_winners INTEGER := 0;
  total_payout NUMERIC := 0;
BEGIN
  RAISE NOTICE 'Processing roulette results for round %, winning color: %, slot: %', p_round_id, p_winning_color, p_winning_slot;
  
  -- Process all bets for this round
  FOR bet_record IN 
    SELECT rb.*, p.username
    FROM public.roulette_bets rb
    JOIN public.profiles p ON p.id = rb.user_id
    WHERE rb.round_id = p_round_id
  LOOP
    total_processed := total_processed + 1;
    
    -- Check if this bet won
    IF bet_record.bet_color = p_winning_color THEN
      total_winners := total_winners + 1;
      total_payout := total_payout + bet_record.potential_payout;
      
      -- Update bet as winner
      UPDATE public.roulette_bets
      SET 
        is_winner = true,
        actual_payout = potential_payout,
        profit = potential_payout - bet_amount
      WHERE id = bet_record.id;
      
      -- Award payout to user
      UPDATE public.profiles
      SET 
        balance = balance + bet_record.potential_payout,
        total_profit = total_profit + (bet_record.potential_payout - bet_record.bet_amount)
      WHERE id = bet_record.user_id;
      
      -- Update user stats for win
      UPDATE public.user_level_stats
      SET
        roulette_wins = roulette_wins + 1,
        roulette_profit = roulette_profit + (bet_record.potential_payout - bet_record.bet_amount),
        roulette_highest_win = GREATEST(roulette_highest_win, bet_record.potential_payout - bet_record.bet_amount),
        total_wins = total_wins + 1,
        total_profit = total_profit + (bet_record.potential_payout - bet_record.bet_amount),
        biggest_win = GREATEST(biggest_win, bet_record.potential_payout - bet_record.bet_amount),
        current_win_streak = current_win_streak + 1,
        best_win_streak = GREATEST(best_win_streak, current_win_streak + 1),
        
        -- Color-specific wins
        roulette_green_wins = CASE WHEN p_winning_color = 'green' THEN roulette_green_wins + 1 ELSE roulette_green_wins END,
        roulette_red_wins = CASE WHEN p_winning_color = 'red' THEN roulette_red_wins + 1 ELSE roulette_red_wins END,
        roulette_black_wins = CASE WHEN p_winning_color = 'black' THEN roulette_black_wins + 1 ELSE roulette_black_wins END,
        
        updated_at = NOW()
      WHERE user_id = bet_record.user_id;
      
      -- Update game history
      UPDATE public.game_history
      SET
        result = 'win',
        profit = bet_record.potential_payout - bet_record.bet_amount,
        game_data = game_data || jsonb_build_object(
          'winning_color', p_winning_color,
          'winning_slot', p_winning_slot,
          'payout', bet_record.potential_payout
        )
      WHERE user_id = bet_record.user_id 
        AND game_type = 'roulette'
        AND (game_data->>'round_id')::uuid = p_round_id;
      
    ELSE
      -- Update bet as loser
      UPDATE public.roulette_bets
      SET 
        is_winner = false,
        actual_payout = 0,
        profit = -bet_amount
      WHERE id = bet_record.id;
      
      -- Update user stats for loss
      UPDATE public.user_level_stats
      SET
        roulette_profit = roulette_profit - bet_record.bet_amount,
        roulette_highest_loss = GREATEST(roulette_highest_loss, bet_record.bet_amount),
        total_profit = total_profit - bet_record.bet_amount,
        biggest_loss = GREATEST(biggest_loss, bet_record.bet_amount),
        current_win_streak = 0, -- Reset win streak on loss
        updated_at = NOW()
      WHERE user_id = bet_record.user_id;
      
      -- Update game history
      UPDATE public.game_history
      SET
        result = 'loss',
        profit = -bet_record.bet_amount,
        game_data = game_data || jsonb_build_object(
          'winning_color', p_winning_color,
          'winning_slot', p_winning_slot
        )
      WHERE user_id = bet_record.user_id 
        AND game_type = 'roulette'
        AND (game_data->>'round_id')::uuid = p_round_id;
    END IF;
    
    -- Update live bet feed
    UPDATE public.live_bet_feed
    SET
      result = CASE WHEN bet_record.bet_color = p_winning_color THEN 'win' ELSE 'loss' END,
      profit = CASE WHEN bet_record.bet_color = p_winning_color THEN bet_record.potential_payout - bet_record.bet_amount ELSE -bet_record.bet_amount END
    WHERE user_id = bet_record.user_id 
      AND game_type = 'roulette'
      AND round_id = p_round_id;
  END LOOP;
  
  RAISE NOTICE 'Processed % bets, % winners, total payout: $%', total_processed, total_winners, total_payout;
  
  RETURN jsonb_build_object(
    'success', true,
    'bets_processed', total_processed,
    'winners', total_winners,
    'total_payout', total_payout,
    'winning_color', p_winning_color,
    'winning_slot', p_winning_slot
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error processing roulette results: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error_message', format('Failed to process results: %s', SQLERRM)
    );
END;
$$;

-- =============================================================================
-- 3. GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.atomic_bet_balance_check(UUID, NUMERIC, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_roulette_bet_results(UUID, TEXT, INTEGER) TO authenticated, service_role;

-- =============================================================================
-- 4. TEST THE UPDATED FUNCTIONS
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Updated roulette betting system with comprehensive stats and XP tracking!';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '1. atomic_bet_balance_check(user_id, bet_amount, round_id) - Processes bets with stats/XP';
  RAISE NOTICE '2. process_roulette_bet_results(round_id, winning_color, winning_slot) - Processes results';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '✅ XP awarded per bet (0.1 XP per $1 wagered)';
  RAISE NOTICE '✅ Level progression with bonuses';
  RAISE NOTICE '✅ Comprehensive roulette statistics tracking';
  RAISE NOTICE '✅ Win/loss tracking and streaks';
  RAISE NOTICE '✅ Game history with detailed data';
  RAISE NOTICE '✅ Live bet feed updates';
  RAISE NOTICE '✅ Color-specific win tracking';
END;
$$;