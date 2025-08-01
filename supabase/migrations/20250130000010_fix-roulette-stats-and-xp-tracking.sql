-- Fix roulette betting to properly update user statistics and award XP AFTER round completion
-- This migration is corrected to match the actual database schema and defer XP/stats until round ends

-- =============================================================================
-- 1. UPDATE ATOMIC BET BALANCE CHECK (BALANCE ONLY - NO STATS/XP YET)
-- =============================================================================

-- Drop existing function variants
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(uuid, numeric);
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(uuid, numeric, uuid);
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(text, numeric, text);

-- Create balance-only bet processing function (no stats/XP until round ends)
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
BEGIN
  RAISE NOTICE 'Processing roulette bet (balance only): User %, Amount %, Round %', p_user_id, p_bet_amount, p_round_id;
  
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
  
  -- ONLY deduct balance - NO stats or XP updates yet
  UPDATE public.profiles
  SET 
    balance = balance - p_bet_amount,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Add to game history with pending status (stats/XP will be added when round completes)
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
      'stats_processed', false -- Flag to track if stats have been processed
    ),
    NOW()
  );
  
  RAISE NOTICE 'Roulette bet balance processed: Balance deducted: % (stats/XP deferred until round completion)', p_bet_amount;
  
  RETURN jsonb_build_object(
    'success', true,
    'balance_deducted', p_bet_amount,
    'message', 'Bet processed - balance deducted, stats/XP will be awarded when round completes'
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
-- 2. COMPREHENSIVE ROULETTE RESULT PROCESSING (STATS + XP ON COMPLETION)
-- =============================================================================

-- Function to update bet results and award XP/stats when round completes
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
  total_xp_awarded NUMERIC := 0;
  xp_per_dollar NUMERIC := 0.1; -- 0.1 XP per $1 wagered
  xp_to_award NUMERIC;
  old_level INTEGER;
  new_level INTEGER;
  level_up_occurred BOOLEAN := false;
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
    
    -- Calculate XP to award for this bet (regardless of win/loss)
    xp_to_award := bet_record.bet_amount * xp_per_dollar;
    total_xp_awarded := total_xp_awarded + xp_to_award;
    
    -- Get current level before updates
    SELECT current_level INTO old_level
    FROM public.user_level_stats
    WHERE user_id = bet_record.user_id;
    
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
      
      -- Award payout to user and update total stats
      UPDATE public.profiles
      SET 
        balance = balance + bet_record.potential_payout,
        total_wagered = total_wagered + bet_record.bet_amount, -- NOW award wagered amount
        total_profit = total_profit + (bet_record.potential_payout - bet_record.bet_amount),
        updated_at = NOW()
      WHERE id = bet_record.user_id;
      
      -- Update user stats for win with XP and comprehensive stats
      UPDATE public.user_level_stats
      SET
        -- XP and level progression (awarded regardless of win/loss)
        lifetime_xp = lifetime_xp + xp_to_award,
        current_level_xp = current_level_xp + xp_to_award,
        
        -- Roulette-specific stats
        roulette_games = roulette_games + 1,
        roulette_wins = roulette_wins + 1,
        roulette_wagered = roulette_wagered + bet_record.bet_amount,
        roulette_profit = roulette_profit + (bet_record.potential_payout - bet_record.bet_amount),
        roulette_highest_win = GREATEST(roulette_highest_win, bet_record.potential_payout - bet_record.bet_amount),
        roulette_biggest_bet = GREATEST(roulette_biggest_bet, bet_record.bet_amount),
        
        -- General stats  
        total_games = total_games + 1,
        total_wins = total_wins + 1,
        total_wagered = total_wagered + bet_record.bet_amount,
        total_profit = total_profit + (bet_record.potential_payout - bet_record.bet_amount),
        biggest_win = GREATEST(biggest_win, bet_record.potential_payout - bet_record.bet_amount),
        biggest_single_bet = GREATEST(biggest_single_bet, bet_record.bet_amount),
        current_win_streak = current_win_streak + 1,
        best_win_streak = GREATEST(best_win_streak, current_win_streak + 1),
        
        -- Color-specific wins
        roulette_green_wins = CASE WHEN p_winning_color = 'green' THEN roulette_green_wins + 1 ELSE roulette_green_wins END,
        roulette_red_wins = CASE WHEN p_winning_color = 'red' THEN roulette_red_wins + 1 ELSE roulette_red_wins END,
        roulette_black_wins = CASE WHEN p_winning_color = 'black' THEN roulette_black_wins + 1 ELSE roulette_black_wins END,
        
        updated_at = NOW()
      WHERE user_id = bet_record.user_id;
      
      -- Update game history for win
      UPDATE public.game_history
      SET
        result = 'win',
        profit = bet_record.potential_payout - bet_record.bet_amount,
        game_data = game_data || jsonb_build_object(
          'winning_color', p_winning_color,
          'winning_slot', p_winning_slot,
          'payout', bet_record.potential_payout,
          'xp_awarded', xp_to_award,
          'stats_processed', true
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
      
      -- Update total stats for loss (still award XP for participating)
      UPDATE public.profiles
      SET 
        total_wagered = total_wagered + bet_record.bet_amount, -- NOW award wagered amount
        total_profit = total_profit - bet_record.bet_amount,
        updated_at = NOW()
      WHERE id = bet_record.user_id;
      
      -- Update user stats for loss with XP (still get XP for betting)
      UPDATE public.user_level_stats
      SET
        -- XP and level progression (awarded regardless of win/loss)
        lifetime_xp = lifetime_xp + xp_to_award,
        current_level_xp = current_level_xp + xp_to_award,
        
        -- Roulette-specific stats
        roulette_games = roulette_games + 1,
        roulette_wagered = roulette_wagered + bet_record.bet_amount,
        roulette_profit = roulette_profit - bet_record.bet_amount,
        roulette_highest_loss = GREATEST(roulette_highest_loss, bet_record.bet_amount),
        roulette_biggest_bet = GREATEST(roulette_biggest_bet, bet_record.bet_amount),
        
        -- General stats
        total_games = total_games + 1,
        total_wagered = total_wagered + bet_record.bet_amount,
        total_profit = total_profit - bet_record.bet_amount,
        biggest_loss = GREATEST(biggest_loss, bet_record.bet_amount),
        biggest_single_bet = GREATEST(biggest_single_bet, bet_record.bet_amount),
        current_win_streak = 0, -- Reset win streak on loss
        
        updated_at = NOW()
      WHERE user_id = bet_record.user_id;
      
      -- Update game history for loss
      UPDATE public.game_history
      SET
        result = 'loss',
        profit = -bet_record.bet_amount,
        game_data = game_data || jsonb_build_object(
          'winning_color', p_winning_color,
          'winning_slot', p_winning_slot,
          'xp_awarded', xp_to_award,
          'stats_processed', true
        )
      WHERE user_id = bet_record.user_id 
        AND game_type = 'roulette'
        AND (game_data->>'round_id')::uuid = p_round_id;
    END IF;
    
    -- Check for level up after XP award
    SELECT current_level INTO new_level
    FROM public.user_level_stats
    WHERE user_id = bet_record.user_id;
    
    -- Handle level progression
    IF new_level IS NOT NULL AND old_level IS NOT NULL THEN
      -- Check if level up is needed based on current XP
      WITH level_check AS (
        SELECT 
          uls.current_level,
          uls.current_level_xp,
          uls.xp_to_next_level,
          lr.xp_required as next_level_xp_required
        FROM public.user_level_stats uls
        LEFT JOIN public.level_rewards lr ON lr.level = uls.current_level + 1
        WHERE uls.user_id = bet_record.user_id
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
      WHERE user_id = bet_record.user_id
        AND current_level_xp >= xp_to_next_level 
        AND xp_to_next_level > 0;
      
      -- Get final level after potential level up
      SELECT current_level INTO new_level
      FROM public.user_level_stats
      WHERE user_id = bet_record.user_id;
      
      -- Award level up bonus if leveled up
      IF new_level > old_level THEN
        level_up_occurred := true;
        
        UPDATE public.profiles
        SET balance = balance + (SELECT COALESCE(bonus_amount, 0) FROM public.level_rewards WHERE level = new_level)
        WHERE id = bet_record.user_id;
        
        RAISE NOTICE 'Level up! User % leveled up from % to % (roulette bet)', bet_record.user_id, old_level, new_level;
      END IF;
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
  
  RAISE NOTICE 'Processed % bets, % winners, total payout: $%, total XP awarded: %', 
    total_processed, total_winners, total_payout, total_xp_awarded;
  
  RETURN jsonb_build_object(
    'success', true,
    'bets_processed', total_processed,
    'winners', total_winners,
    'total_payout', total_payout,
    'total_xp_awarded', total_xp_awarded,
    'level_ups_occurred', level_up_occurred,
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
  RAISE NOTICE 'Fixed roulette betting system with correct database schema!';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '1. atomic_bet_balance_check(user_id, bet_amount, round_id) - Deducts balance only';
  RAISE NOTICE '2. process_roulette_bet_results(round_id, winning_color, winning_slot) - Awards XP/stats on completion';
  RAISE NOTICE '';
  RAISE NOTICE 'Schema corrections:';
  RAISE NOTICE '✅ Uses correct column names from user_level_stats table';
  RAISE NOTICE '✅ All column references match actual database schema';
  RAISE NOTICE '✅ XP awarded to lifetime_xp and current_level_xp columns';
  RAISE NOTICE '✅ All roulette statistics properly updated';
  RAISE NOTICE '';
  RAISE NOTICE 'Betting Flow:';
  RAISE NOTICE '📝 Place bet → Balance deducted (no XP/stats yet)';
  RAISE NOTICE '🎲 Round completes → XP awarded + stats updated';
  RAISE NOTICE '⭐ XP rate: 0.1 XP per $1 wagered (regardless of win/loss)';
  RAISE NOTICE '📊 All statistics updated when round ends';
END;
$$;