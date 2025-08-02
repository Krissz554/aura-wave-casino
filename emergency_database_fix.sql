
-- FINAL EMERGENCY FIX: Create working function with different approach
BEGIN;

-- Drop ALL possible problematic functions again
DO $$
DECLARE
  func_record RECORD;
  drop_sql TEXT;
BEGIN
  -- Dynamic drop of any function containing these names
  FOR func_record IN
    SELECT DISTINCT
      n.nspname as schema_name,
      p.proname as function_name,
      p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE (p.proname LIKE '%complete_roulette%' OR p.proname LIKE '%add_xp%')
  LOOP
    BEGIN
      drop_sql := format('DROP FUNCTION %I.%I CASCADE', 
                        func_record.schema_name, 
                        func_record.function_name);
      EXECUTE drop_sql;
      RAISE NOTICE 'Dropped function: %', drop_sql;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop %: %', func_record.function_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Create the FINAL working function with a completely different name
CREATE OR REPLACE FUNCTION public.execute_roulette_completion(
  round_uuid UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  round_color TEXT;
  round_slot INTEGER;
  bet_count INTEGER := 0;
  winner_count INTEGER := 0;
  total_xp NUMERIC := 0;
  bet_row RECORD;
  winner_flag BOOLEAN;
  payout_amount NUMERIC;
  profit_amount NUMERIC;
  xp_to_award NUMERIC;
BEGIN
  RAISE NOTICE '[EMERGENCY FIX] Processing round completion: %', round_uuid;
  
  -- Get round result
  SELECT result_color, result_slot 
  INTO round_color, round_slot
  FROM roulette_rounds 
  WHERE id = round_uuid;
  
  IF round_color IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Round not found',
      'version', 'emergency_fix_final'
    );
  END IF;
  
  RAISE NOTICE '[EMERGENCY FIX] Round result: % %', round_color, round_slot;
  
  -- Process each bet
  FOR bet_row IN 
    SELECT * FROM roulette_bets WHERE round_id = round_uuid
  LOOP
    bet_count := bet_count + 1;
    
    -- Check if bet won
    winner_flag := (bet_row.bet_color = round_color);
    
    IF winner_flag THEN
      payout_amount := bet_row.potential_payout;
      profit_amount := payout_amount - bet_row.bet_amount;
      winner_count := winner_count + 1;
      
      -- Pay winner
      UPDATE profiles 
      SET balance = balance + payout_amount
      WHERE id = bet_row.user_id;
      
      RAISE NOTICE '[EMERGENCY FIX] Paid winner % amount %', bet_row.user_id, payout_amount;
    ELSE
      payout_amount := 0;
      profit_amount := -bet_row.bet_amount;
      RAISE NOTICE '[EMERGENCY FIX] Bet lost: %', bet_row.bet_amount;
    END IF;
    
    -- Update bet record
    UPDATE roulette_bets 
    SET 
      actual_payout = payout_amount,
      is_winner = winner_flag,
      profit = profit_amount
    WHERE id = bet_row.id;
    
    -- Award XP (10% of bet)
    xp_to_award := bet_row.bet_amount * 0.1;
    total_xp := total_xp + xp_to_award;
    
    RAISE NOTICE '[EMERGENCY FIX] Awarding % XP to user %', xp_to_award, bet_row.user_id;
    
    -- Update user stats (comprehensive)
    INSERT INTO user_level_stats (
      user_id, 
      lifetime_xp,
      roulette_games,
      roulette_wagered,
      roulette_profit,
      total_games,
      total_wagered,
      total_profit,
      current_level,
      current_level_xp,
      xp_to_next_level,
      updated_at
    ) VALUES (
      bet_row.user_id,
      xp_to_award,
      1,
      bet_row.bet_amount,
      profit_amount,
      1,
      bet_row.bet_amount,
      profit_amount,
      1,
      xp_to_award,
      651,
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      lifetime_xp = user_level_stats.lifetime_xp + xp_to_award,
      roulette_games = user_level_stats.roulette_games + 1,
      roulette_wagered = user_level_stats.roulette_wagered + bet_row.bet_amount,
      roulette_profit = user_level_stats.roulette_profit + profit_amount,
      total_games = user_level_stats.total_games + 1,
      total_wagered = user_level_stats.total_wagered + bet_row.bet_amount,
      total_profit = user_level_stats.total_profit + profit_amount,
      updated_at = NOW();
    
    -- Update level (simple calculation)
    UPDATE user_level_stats 
    SET 
      current_level = GREATEST(1, (lifetime_xp / 651)::INTEGER + 1),
      current_level_xp = lifetime_xp % 651,
      xp_to_next_level = 651 - (lifetime_xp % 651)
    WHERE user_id = bet_row.user_id;
    
    -- Add to game history
    INSERT INTO game_history (
      user_id, game_type, bet_amount, result, profit, created_at
    ) VALUES (
      bet_row.user_id, 'roulette', bet_row.bet_amount,
      CASE WHEN winner_flag THEN 'win' ELSE 'loss' END,
      profit_amount, NOW()
    );
  END LOOP;
  
  -- Mark round complete
  UPDATE roulette_rounds SET status = 'completed' WHERE id = round_uuid;
  
  RAISE NOTICE '[EMERGENCY FIX] Completed: % bets, % winners, % XP total', 
    bet_count, winner_count, total_xp;
  
  RETURN jsonb_build_object(
    'success', true,
    'bets_processed', bet_count,
    'winners_processed', winner_count,
    'xp_awarded', total_xp,
    'result_color', round_color,
    'result_slot', round_slot,
    'version', 'emergency_fix_working'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[EMERGENCY FIX] Error: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'version', 'emergency_fix_working'
    );
END;
$$;

-- Create wrapper with expected name
CREATE OR REPLACE FUNCTION public.complete_roulette_round(p_round_id UUID)
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT public.execute_roulette_completion(p_round_id);
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.execute_roulette_completion(UUID) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_roulette_round(UUID) TO postgres, anon, authenticated, service_role;

COMMIT;

SELECT 'EMERGENCY FIX DEPLOYED' as status;
  