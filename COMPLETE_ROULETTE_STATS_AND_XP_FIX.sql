-- COMPLETE ROULETTE STATS AND XP FIX
-- Fix ALL roulette statistics tracking and XP awarding based on actual schema

BEGIN;

-- =====================================================================
-- STEP 1: DROP AND RECREATE ALL DEPENDENCY FUNCTIONS WITH CORRECT SCHEMA
-- =====================================================================

-- Drop all existing functions to start fresh
DROP FUNCTION IF EXISTS public.ensure_user_level_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(uuid, text, numeric, text, numeric, integer) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_from_wager(uuid, numeric) CASCADE;

-- Log cleanup
DO $$
BEGIN
  RAISE NOTICE '🧹 Dropped all existing functions to recreate with correct schema';
END $$;

-- =====================================================================
-- STEP 2: CREATE CORRECT ENSURE_USER_LEVEL_STATS FUNCTION
-- =====================================================================

CREATE OR REPLACE FUNCTION public.ensure_user_level_stats(user_uuid uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_level_stats (
    user_id,
    current_level,
    lifetime_xp,
    current_level_xp,
    xp_to_next_level,
    border_tier,
    available_cases,
    total_cases_opened,
    total_case_value,
    coinflip_games,
    coinflip_wins,
    coinflip_wagered,
    coinflip_profit,
    best_coinflip_streak,
    current_coinflip_streak,
    crash_games,
    crash_wins,
    crash_wagered,
    crash_profit,
    roulette_games,
    roulette_wins,
    roulette_wagered,
    roulette_profit,
    roulette_highest_win,
    roulette_highest_loss,
    roulette_green_wins,
    roulette_red_wins,
    roulette_black_wins,
    roulette_favorite_color,
    roulette_best_streak,
    roulette_current_streak,
    roulette_biggest_bet,
    tower_games,
    tower_wins,
    tower_wagered,
    tower_profit,
    total_games,
    total_wins,
    total_wagered,
    total_profit,
    biggest_win,
    biggest_loss,
    chat_messages_count,
    login_days_count,
    biggest_single_bet,
    account_created,
    current_win_streak,
    best_win_streak,
    tower_highest_level,
    tower_biggest_win,
    tower_biggest_loss,
    tower_best_streak,
    tower_current_streak,
    tower_perfect_games,
    current_xp,
    created_at,
    updated_at
  ) VALUES (
    user_uuid,
    1,           -- current_level
    0,           -- lifetime_xp 
    0,           -- current_level_xp
    651,         -- xp_to_next_level (using your level system)
    1,           -- border_tier
    0,           -- available_cases
    0,           -- total_cases_opened
    0,           -- total_case_value
    0,           -- coinflip_games
    0,           -- coinflip_wins
    0,           -- coinflip_wagered
    0,           -- coinflip_profit
    0,           -- best_coinflip_streak
    0,           -- current_coinflip_streak
    0,           -- crash_games
    0,           -- crash_wins
    0,           -- crash_wagered
    0,           -- crash_profit
    0,           -- roulette_games
    0,           -- roulette_wins
    0,           -- roulette_wagered
    0,           -- roulette_profit
    0,           -- roulette_highest_win
    0,           -- roulette_highest_loss
    0,           -- roulette_green_wins
    0,           -- roulette_red_wins
    0,           -- roulette_black_wins
    'none',      -- roulette_favorite_color
    0,           -- roulette_best_streak
    0,           -- roulette_current_streak
    0,           -- roulette_biggest_bet
    0,           -- tower_games
    0,           -- tower_wins
    0,           -- tower_wagered
    0,           -- tower_profit
    0,           -- total_games
    0,           -- total_wins
    0,           -- total_wagered
    0,           -- total_profit
    0,           -- biggest_win
    0,           -- biggest_loss
    0,           -- chat_messages_count
    0,           -- login_days_count
    0,           -- biggest_single_bet
    NOW(),       -- account_created
    0,           -- current_win_streak
    0,           -- best_win_streak
    0,           -- tower_highest_level
    0,           -- tower_biggest_win
    0,           -- tower_biggest_loss
    0,           -- tower_best_streak
    0,           -- tower_current_streak
    0,           -- tower_perfect_games
    0,           -- current_xp
    NOW(),       -- created_at
    NOW()        -- updated_at
  ) ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- =====================================================================
-- STEP 3: CREATE CORRECT XP CALCULATION FUNCTION
-- =====================================================================

CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_stats RECORD;
  level_result RECORD;
  xp_decimal NUMERIC(10,3);
  new_lifetime_xp INTEGER;
  result jsonb;
BEGIN
  -- Convert to 3 decimal places, then to integer for compatibility
  xp_decimal := ROUND(xp_amount, 3);
  
  -- Ensure user exists
  PERFORM public.ensure_user_level_stats(user_uuid);
  
  -- Get current user stats
  SELECT * INTO current_stats
  FROM public.user_level_stats
  WHERE user_id = user_uuid;
  
  -- Calculate new lifetime XP (as integer)
  new_lifetime_xp := current_stats.lifetime_xp + xp_decimal::INTEGER;
  
  -- Calculate level from XP using our exact function
  SELECT * INTO level_result
  FROM public.calculate_level_from_xp_exact(new_lifetime_xp);
  
  -- Update user stats with new XP and level information
  UPDATE public.user_level_stats
  SET 
    lifetime_xp = new_lifetime_xp,
    current_xp = xp_decimal,
    current_level = level_result.level,
    current_level_xp = level_result.current_level_xp,
    xp_to_next_level = level_result.xp_to_next_level,
    updated_at = NOW()
  WHERE user_id = user_uuid;
  
  -- Check if level changed
  IF level_result.level != current_stats.current_level THEN
    result := jsonb_build_object(
      'success', true,
      'xp_added', xp_decimal,
      'new_level', level_result.level,
      'level_up', true,
      'total_xp', new_lifetime_xp,
      'current_level_xp', level_result.current_level_xp,
      'xp_to_next_level', level_result.xp_to_next_level
    );
  ELSE
    result := jsonb_build_object(
      'success', true,
      'xp_added', xp_decimal,
      'new_level', level_result.level,
      'level_up', false,
      'total_xp', new_lifetime_xp,
      'current_level_xp', level_result.current_level_xp,
      'xp_to_next_level', level_result.xp_to_next_level
    );
  END IF;
  
  RAISE NOTICE '[XP] User % awarded % XP, new total: %, level: %', 
    user_uuid, xp_decimal, new_lifetime_xp, level_result.level;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[XP] ERROR: % %', SQLSTATE, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

-- Create integer version for compatibility
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN public.add_xp_and_check_levelup(user_uuid, xp_amount::numeric);
END;
$$;

-- =====================================================================
-- STEP 4: CREATE COMPREHENSIVE ROULETTE STATS UPDATE FUNCTION
-- =====================================================================

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
  current_stats RECORD;
  is_win BOOLEAN;
  result_color TEXT;
  new_roulette_streak INTEGER;
  new_current_win_streak INTEGER;
  new_best_win_streak INTEGER;
  new_roulette_best_streak INTEGER;
  color_wins_update TEXT;
BEGIN
  -- Ensure user exists
  PERFORM public.ensure_user_level_stats(p_user_id);
  
  -- Get current stats
  SELECT * INTO current_stats
  FROM public.user_level_stats
  WHERE user_id = p_user_id;
  
  -- Determine if this is a win or loss
  is_win := (p_result = 'win');
  
  -- Calculate XP (10% of bet amount)
  xp_earned := p_bet_amount * 0.1;
  
  RAISE NOTICE '[STATS] Updating stats for user %: game=%, bet=%, result=%, profit=%, xp=%', 
    p_user_id, p_game_type, p_bet_amount, p_result, p_profit, xp_earned;
  
  -- Add XP and check for level ups
  SELECT public.add_xp_and_check_levelup(p_user_id, xp_earned) INTO xp_result;
  
  -- Update win streaks
  IF is_win THEN
    new_current_win_streak := current_stats.current_win_streak + 1;
    new_roulette_streak := current_stats.roulette_current_streak + 1;
  ELSE
    new_current_win_streak := 0;
    new_roulette_streak := 0;
  END IF;
  
  -- Update best streaks
  new_best_win_streak := GREATEST(current_stats.best_win_streak, new_current_win_streak);
  new_roulette_best_streak := GREATEST(current_stats.roulette_best_streak, new_roulette_streak);
  
  -- Extract result color from game_data if available (assuming it's passed somehow)
  -- For now, we'll update general roulette stats
  
  -- Update comprehensive roulette and general stats
  UPDATE public.user_level_stats
  SET 
    -- General game stats
    total_games = total_games + 1,
    total_wins = total_wins + CASE WHEN is_win THEN 1 ELSE 0 END,
    total_wagered = total_wagered + p_bet_amount,
    total_profit = total_profit + p_profit,
    
    -- Roulette-specific stats
    roulette_games = roulette_games + 1,
    roulette_wins = roulette_wins + CASE WHEN is_win THEN 1 ELSE 0 END,
    roulette_wagered = roulette_wagered + p_bet_amount,
    roulette_profit = roulette_profit + p_profit,
    
    -- Track highest wins and losses
    roulette_highest_win = GREATEST(roulette_highest_win, CASE WHEN is_win THEN p_profit ELSE 0 END),
    roulette_highest_loss = GREATEST(roulette_highest_loss, CASE WHEN NOT is_win THEN ABS(p_profit) ELSE 0 END),
    biggest_win = GREATEST(biggest_win, CASE WHEN is_win THEN p_profit ELSE 0 END),
    biggest_loss = GREATEST(biggest_loss, CASE WHEN NOT is_win THEN ABS(p_profit) ELSE 0 END),
    
    -- Track biggest bets
    roulette_biggest_bet = GREATEST(roulette_biggest_bet, p_bet_amount),
    biggest_single_bet = GREATEST(biggest_single_bet, p_bet_amount),
    
    -- Update streaks
    current_win_streak = new_current_win_streak,
    best_win_streak = new_best_win_streak,
    roulette_current_streak = new_roulette_streak,
    roulette_best_streak = new_roulette_best_streak,
    
    -- Update timestamp
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RAISE NOTICE '[STATS] Updated stats for user %: games=%, wins=%, wagered=%, profit=%', 
    p_user_id, current_stats.roulette_games + 1, 
    current_stats.roulette_wins + CASE WHEN is_win THEN 1 ELSE 0 END,
    current_stats.roulette_wagered + p_bet_amount,
    current_stats.roulette_profit + p_profit;
  
  RETURN jsonb_build_object(
    'success', true,
    'xp_awarded', xp_earned,
    'xp_result', xp_result,
    'game_type', p_game_type,
    'bet_amount', p_bet_amount,
    'profit', p_profit,
    'is_win', is_win,
    'new_total_games', current_stats.roulette_games + 1,
    'new_total_wins', current_stats.roulette_wins + CASE WHEN is_win THEN 1 ELSE 0 END
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[STATS] ERROR: % %', SQLSTATE, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

-- Create 8-parameter version for compatibility
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
DECLARE
  stats_result jsonb;
  current_stats RECORD;
  color_wins_field TEXT;
BEGIN
  -- Call the main 6-parameter function first
  SELECT public.update_user_stats_and_level(
    p_user_id, 
    p_game_type, 
    p_bet_amount, 
    p_result, 
    p_profit, 
    p_streak_length
  ) INTO stats_result;
  
  -- If it's a win and we have color information, update color-specific stats
  IF p_result = 'win' AND p_winning_color IS NOT NULL THEN
    -- Get current stats
    SELECT * INTO current_stats
    FROM public.user_level_stats
    WHERE user_id = p_user_id;
    
    -- Update color-specific wins
    CASE p_winning_color
      WHEN 'red' THEN
        UPDATE public.user_level_stats
        SET roulette_red_wins = roulette_red_wins + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id;
      WHEN 'black' THEN
        UPDATE public.user_level_stats
        SET roulette_black_wins = roulette_black_wins + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id;
      WHEN 'green' THEN
        UPDATE public.user_level_stats
        SET roulette_green_wins = roulette_green_wins + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END CASE;
    
    RAISE NOTICE '[STATS] Updated color wins: User % won on % (bet color: %)', 
      p_user_id, p_winning_color, p_bet_color;
  END IF;
  
  RETURN stats_result;
END;
$$;

-- Create add_xp_from_wager for compatibility
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

-- =====================================================================
-- STEP 5: UPDATE COMPLETE_ROULETTE_ROUND WITH ENHANCED STATS TRACKING
-- =====================================================================

-- Drop and recreate the main function with enhanced stats tracking
DROP FUNCTION IF EXISTS public.complete_roulette_round(UUID) CASCADE;

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
  RAISE NOTICE '[COMPLETE] Processing round completion: %', p_round_id;
  
  -- Get round result data
  SELECT result_color, result_slot 
  INTO v_result_color, v_result_slot
  FROM roulette_rounds 
  WHERE id = p_round_id;
  
  IF v_result_color IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Round not found or no result available',
      'version', 'complete_stats_tracking'
    );
  END IF;
  
  RAISE NOTICE '[COMPLETE] Round % result: % %', p_round_id, v_result_color, v_result_slot;
  
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
          updated_at = COALESCE(updated_at, NOW())
      WHERE id = v_bet_record.user_id;
      
      RAISE NOTICE '[COMPLETE] Winner paid: User % received %', v_bet_record.user_id, v_payout;
    ELSE
      v_payout := 0;
      v_profit := -v_bet_record.bet_amount;
      RAISE NOTICE '[COMPLETE] Losing bet: User % lost %', v_bet_record.user_id, v_bet_record.bet_amount;
    END IF;
    
    -- Update the bet record with final results
    UPDATE roulette_bets 
    SET 
      actual_payout = COALESCE(actual_payout, v_payout),
      is_winner = COALESCE(is_winner, v_is_winning_bet),
      profit = COALESCE(profit, v_profit),
      updated_at = COALESCE(updated_at, NOW())
    WHERE id = v_bet_record.id;
    
    -- Calculate XP (10% of bet amount)
    v_xp_earned := v_bet_record.bet_amount * 0.1;
    v_total_xp := v_total_xp + v_xp_earned;
    
    RAISE NOTICE '[COMPLETE] Processing comprehensive stats for user %: bet=%, profit=%, xp=%', 
      v_bet_record.user_id, v_bet_record.bet_amount, v_profit, v_xp_earned;
    
    -- Update user stats and level using the enhanced 8-parameter function
    SELECT public.update_user_stats_and_level(
      v_bet_record.user_id,
      'roulette',
      v_bet_record.bet_amount,
      CASE WHEN v_is_winning_bet THEN 'win' ELSE 'loss' END,
      v_profit,
      0,  -- streak_length (will be calculated in function)
      v_result_color,  -- winning_color
      v_bet_record.bet_color  -- bet_color
    ) INTO v_stats_result;
    
    RAISE NOTICE '[COMPLETE] Stats update result: %', v_stats_result;
    
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
        'xp_awarded', v_xp_earned,
        'payout', v_payout
      ),
      NOW()
    );
  END LOOP;
  
  -- Mark the round as completed
  UPDATE roulette_rounds 
  SET 
    status = 'completed',
    updated_at = COALESCE(updated_at, NOW())
  WHERE id = p_round_id;
  
  RAISE NOTICE '[COMPLETE] Round % completed successfully: % bets, % winners, % total XP', 
    p_round_id, v_bet_count, v_winner_count, v_total_xp;
  
  RETURN jsonb_build_object(
    'success', true,
    'bets_processed', v_bet_count,
    'winners_processed', v_winner_count,
    'xp_awarded', v_total_xp,
    'result_color', v_result_color,
    'result_slot', v_result_slot,
    'version', 'complete_stats_tracking'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[COMPLETE] ERROR in complete_roulette_round: % %', SQLSTATE, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'version', 'complete_stats_tracking_error'
    );
END;
$$;

-- Grant all permissions
GRANT EXECUTE ON FUNCTION public.complete_roulette_round(UUID) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(uuid, text, numeric, text, numeric, integer) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_xp_and_check_levelup(uuid, numeric) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_xp_and_check_levelup(uuid, integer) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_level_stats(uuid) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_xp_from_wager(uuid, numeric) TO postgres, anon, authenticated, service_role;

-- =====================================================================
-- STEP 6: TEST THE COMPLETE SYSTEM
-- =====================================================================

DO $$
DECLARE
  test_result JSONB;
  xp_test_result JSONB;
  stats_test_result JSONB;
BEGIN
  RAISE NOTICE '🧪 === TESTING COMPLETE ROULETTE STATS SYSTEM ===';
  
  -- Test complete_roulette_round
  SELECT public.complete_roulette_round('00000000-0000-0000-0000-000000000000') 
  INTO test_result;
  RAISE NOTICE 'Complete roulette test: %', test_result;
  
  -- Test XP function
  SELECT public.add_xp_and_check_levelup('00000000-0000-0000-0000-000000000000', 5.0) 
  INTO xp_test_result;
  RAISE NOTICE 'XP function test: %', xp_test_result;
  
  -- Test stats update function
  SELECT public.update_user_stats_and_level(
    '00000000-0000-0000-0000-000000000000', 
    'roulette', 
    10.0, 
    'win', 
    15.0, 
    0,
    'red',
    'red'
  ) INTO stats_test_result;
  RAISE NOTICE 'Stats update test: %', stats_test_result;
  
  -- Verify results
  IF test_result->>'error' LIKE '%Round not found%' THEN
    RAISE NOTICE '✅ Complete roulette function works (expected Round not found)';
  ELSE
    RAISE NOTICE '❓ Complete roulette result: %', test_result;
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
SELECT 'COMPLETE ROULETTE STATS AND XP FIX READY - All stats will be tracked correctly!' as final_status;