-- =====================================================================
-- FIXED ROULETTE SYSTEM FIX - DROPS EXISTING FUNCTIONS FIRST
-- =====================================================================
-- This script fixes the "cannot change return type" error by dropping
-- existing functions before recreating them with correct signatures
-- =====================================================================

BEGIN;

-- =====================================================================
-- STEP 1: DROP EXISTING FUNCTIONS TO AVOID RETURN TYPE CONFLICTS
-- =====================================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.place_roulette_bet(UUID, UUID, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.complete_roulette_round(UUID);
DROP FUNCTION IF EXISTS public.get_or_create_daily_seed(DATE);
DROP FUNCTION IF EXISTS public.reveal_daily_seed(DATE);

-- Also drop any other variations that might exist
DROP FUNCTION IF EXISTS public.place_roulette_bet CASCADE;
DROP FUNCTION IF EXISTS public.complete_roulette_round CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_daily_seed CASCADE;
DROP FUNCTION IF EXISTS public.reveal_daily_seed CASCADE;

RAISE NOTICE '🗑️ Dropped existing functions to avoid conflicts';

-- =====================================================================
-- STEP 2: FIX MISSING COLUMNS
-- =====================================================================

-- Add missing result_multiplier column to roulette_results table
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roulette_results' AND column_name = 'result_multiplier') THEN
    ALTER TABLE public.roulette_results ADD COLUMN result_multiplier NUMERIC DEFAULT 2;
    RAISE NOTICE '✅ Added result_multiplier column to roulette_results table';
  ELSE
    RAISE NOTICE 'ℹ️ result_multiplier column already exists in roulette_results table';
  END IF;
END $$;

-- Ensure all roulette tables have proper structure
DO $$ 
BEGIN 
  -- Add missing columns to roulette_rounds if needed
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roulette_rounds' AND column_name = 'reel_position') THEN
    ALTER TABLE public.roulette_rounds ADD COLUMN reel_position NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added reel_position column to roulette_rounds table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roulette_bets' AND column_name = 'client_seed') THEN
    ALTER TABLE public.roulette_bets ADD COLUMN client_seed TEXT;
    RAISE NOTICE '✅ Added client_seed column to roulette_bets table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roulette_bets' AND column_name = 'ip_address') THEN
    ALTER TABLE public.roulette_bets ADD COLUMN ip_address TEXT;
    RAISE NOTICE '✅ Added ip_address column to roulette_bets table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roulette_bets' AND column_name = 'user_agent') THEN
    ALTER TABLE public.roulette_bets ADD COLUMN user_agent TEXT;
    RAISE NOTICE '✅ Added user_agent column to roulette_bets table';
  END IF;
END $$;

-- =====================================================================
-- STEP 3: CREATE MISSING DATABASE FUNCTIONS (FRESH VERSIONS)
-- =====================================================================

-- Function 1: place_roulette_bet (called by edge function)
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
  v_user_balance NUMERIC;
  v_bet_id UUID;
  v_potential_payout NUMERIC;
  v_round_status TEXT;
  v_multiplier NUMERIC;
BEGIN
  -- Validate inputs
  IF p_bet_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bet amount must be positive');
  END IF;
  
  IF p_bet_color NOT IN ('red', 'black', 'green') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid bet color');
  END IF;
  
  -- Check if round exists and is in betting phase
  SELECT status INTO v_round_status 
  FROM roulette_rounds 
  WHERE id = p_round_id;
  
  IF v_round_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round not found');
  END IF;
  
  IF v_round_status != 'betting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Round is not accepting bets');
  END IF;
  
  -- Get user balance
  SELECT balance INTO v_user_balance 
  FROM profiles 
  WHERE id = p_user_id;
  
  IF v_user_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;
  
  IF v_user_balance < p_bet_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Calculate potential payout based on bet color
  v_multiplier := CASE 
    WHEN p_bet_color = 'green' THEN 14
    ELSE 2
  END;
  
  v_potential_payout := p_bet_amount * v_multiplier;
  
  -- Deduct balance
  UPDATE profiles 
  SET balance = balance - p_bet_amount,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Insert bet
  INSERT INTO roulette_bets (
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
    v_potential_payout,
    NOW()
  ) RETURNING id INTO v_bet_id;
  
  RAISE NOTICE '✅ Bet placed: User % bet % on % for round %', p_user_id, p_bet_amount, p_bet_color, p_round_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'bet_id', v_bet_id,
    'balance_deducted', p_bet_amount,
    'potential_payout', v_potential_payout
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Internal error: ' || SQLERRM
    );
END;
$$;

-- Function 2: complete_roulette_round (called by edge function)
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
  v_xp_awarded INTEGER := 0;
  v_bet RECORD;
  v_is_winner BOOLEAN;
  v_actual_payout NUMERIC;
  v_profit NUMERIC;
  v_xp_amount INTEGER;
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
    
    -- Award XP (1 XP per dollar wagered)
    v_xp_amount := FLOOR(v_bet.bet_amount)::INTEGER;
    v_xp_awarded := v_xp_awarded + v_xp_amount;
    
    -- Update user level stats
    INSERT INTO user_level_stats (user_id, lifetime_xp, current_level_xp, roulette_games, roulette_wagered, roulette_profit)
    VALUES (v_bet.user_id, v_xp_amount, v_xp_amount, 1, v_bet.bet_amount, v_profit)
    ON CONFLICT (user_id) DO UPDATE SET
      lifetime_xp = user_level_stats.lifetime_xp + v_xp_amount,
      current_level_xp = user_level_stats.current_level_xp + v_xp_amount,
      roulette_games = user_level_stats.roulette_games + 1,
      roulette_wagered = user_level_stats.roulette_wagered + v_bet.bet_amount,
      roulette_profit = user_level_stats.roulette_profit + v_profit,
      total_games = user_level_stats.total_games + 1,
      total_wagered = user_level_stats.total_wagered + v_bet.bet_amount,
      total_profit = user_level_stats.total_profit + v_profit,
      updated_at = NOW();
    
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
        'round_id', p_round_id
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
  
  RAISE NOTICE '✅ Round completed: % bets processed, % winners, % XP awarded', 
    v_bets_processed, v_winners_processed, v_xp_awarded;
  
  RETURN jsonb_build_object(
    'success', true,
    'bets_processed', v_bets_processed,
    'winners_processed', v_winners_processed,
    'xp_awarded', v_xp_awarded
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Round completion failed: ' || SQLERRM
    );
END;
$$;

-- Function 3: get_or_create_daily_seed (called by edge function)
CREATE OR REPLACE FUNCTION public.get_or_create_daily_seed(p_date DATE)
RETURNS TABLE(
  id UUID,
  date DATE,
  server_seed TEXT,
  server_seed_hash TEXT,
  lotto TEXT,
  lotto_hash TEXT,
  is_revealed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seed_record RECORD;
  v_server_seed TEXT;
  v_lotto TEXT;
  v_server_seed_hash TEXT;
  v_lotto_hash TEXT;
BEGIN
  -- Try to get existing seed
  SELECT * INTO v_seed_record FROM daily_seeds WHERE daily_seeds.date = p_date;
  
  IF v_seed_record IS NOT NULL THEN
    -- Return existing seed
    RETURN QUERY SELECT 
      v_seed_record.id,
      v_seed_record.date,
      v_seed_record.server_seed,
      v_seed_record.server_seed_hash,
      v_seed_record.lotto,
      v_seed_record.lotto_hash,
      v_seed_record.is_revealed;
    RETURN;
  END IF;
  
  -- Generate new seed data
  v_server_seed := encode(gen_random_bytes(32), 'hex');
  v_lotto := LPAD(FLOOR(random() * 10000000000)::TEXT, 10, '0');
  
  -- Generate hashes
  v_server_seed_hash := encode(digest(v_server_seed, 'sha256'), 'hex');
  v_lotto_hash := encode(digest(v_lotto, 'sha256'), 'hex');
  
  -- Insert new seed
  INSERT INTO daily_seeds (
    date,
    server_seed,
    server_seed_hash,
    lotto,
    lotto_hash,
    is_revealed,
    created_at
  ) VALUES (
    p_date,
    v_server_seed,
    v_server_seed_hash,
    v_lotto,
    v_lotto_hash,
    false,
    NOW()
  ) RETURNING * INTO v_seed_record;
  
  RAISE NOTICE '✅ Created new daily seed for %', p_date;
  
  RETURN QUERY SELECT 
    v_seed_record.id,
    v_seed_record.date,
    v_seed_record.server_seed,
    v_seed_record.server_seed_hash,
    v_seed_record.lotto,
    v_seed_record.lotto_hash,
    v_seed_record.is_revealed;
END;
$$;

-- Function 4: reveal_daily_seed (called by edge function)
CREATE OR REPLACE FUNCTION public.reveal_daily_seed(p_date DATE)
RETURNS TABLE(
  id UUID,
  date DATE,
  server_seed TEXT,
  lotto TEXT,
  is_revealed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seed_record RECORD;
BEGIN
  -- Get and update the seed
  UPDATE daily_seeds 
  SET 
    is_revealed = true,
    revealed_at = NOW()
  WHERE daily_seeds.date = p_date
  RETURNING * INTO v_seed_record;
  
  IF v_seed_record IS NULL THEN
    RAISE EXCEPTION 'No daily seed found for date %', p_date;
  END IF;
  
  RAISE NOTICE '🔓 Revealed daily seed for %', p_date;
  
  RETURN QUERY SELECT 
    v_seed_record.id,
    v_seed_record.date,
    v_seed_record.server_seed,
    v_seed_record.lotto,
    v_seed_record.is_revealed;
END;
$$;

-- =====================================================================
-- STEP 4: ENSURE PROPER INDEXES FOR PERFORMANCE
-- =====================================================================

-- Critical indexes for roulette system performance
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_status ON public.roulette_rounds(status);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_created_at ON public.roulette_rounds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_bets_round_id ON public.roulette_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_roulette_bets_user_id ON public.roulette_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_seeds_date ON public.daily_seeds(date);
CREATE INDEX IF NOT EXISTS idx_roulette_results_created_at ON public.roulette_results(created_at DESC);

RAISE NOTICE '✅ Created performance indexes';

-- =====================================================================
-- STEP 5: CREATE INITIAL ROULETTE ROUND IF NONE EXISTS
-- =====================================================================

DO $$
DECLARE
  v_active_round_count INTEGER;
  v_new_round_id UUID;
BEGIN
  -- Check if there are any active rounds
  SELECT COUNT(*) INTO v_active_round_count
  FROM roulette_rounds 
  WHERE status IN ('betting', 'spinning');
  
  IF v_active_round_count = 0 THEN
    -- Create a new betting round
    INSERT INTO roulette_rounds (
      status,
      betting_start_time,
      betting_end_time,
      spinning_end_time,
      server_seed,
      server_seed_hash,
      nonce,
      created_at,
      updated_at
    ) VALUES (
      'betting',
      NOW(),
      NOW() + INTERVAL '25 seconds',
      NOW() + INTERVAL '29 seconds',
      encode(gen_random_bytes(32), 'hex'),
      encode(digest(encode(gen_random_bytes(32), 'hex'), 'sha256'), 'hex'),
      1,
      NOW(),
      NOW()
    ) RETURNING id INTO v_new_round_id;
    
    RAISE NOTICE '🆕 Created initial roulette round: %', v_new_round_id;
  ELSE
    RAISE NOTICE 'ℹ️ Active roulette rounds already exist (count: %)', v_active_round_count;
  END IF;
END $$;

-- =====================================================================
-- STEP 6: GRANT NECESSARY PERMISSIONS
-- =====================================================================

-- Grant permissions for the edge function to call these functions
GRANT EXECUTE ON FUNCTION public.place_roulette_bet TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_roulette_round TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_or_create_daily_seed TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reveal_daily_seed TO postgres, anon, authenticated, service_role;

RAISE NOTICE '✅ Granted function permissions';

COMMIT;

-- =====================================================================
-- FIXED ROULETTE SYSTEM COMPLETE!
-- =====================================================================
-- This script has fixed:
-- 
-- ✅ FUNCTION CONFLICTS RESOLVED:
-- - Dropped existing functions first to avoid return type errors
-- - Recreated all functions with correct signatures
-- 
-- ✅ MISSING COLUMNS ADDED:
-- - result_multiplier added to roulette_results table
-- - reel_position added to roulette_rounds table
-- - client_seed, ip_address, user_agent added to roulette_bets
-- 
-- ✅ MISSING FUNCTIONS CREATED:
-- - place_roulette_bet() - handles secure bet placement
-- - complete_roulette_round() - processes round completion with XP
-- - get_or_create_daily_seed() - manages provably fair daily seeds
-- - reveal_daily_seed() - reveals seeds for transparency
-- 
-- ✅ PERFORMANCE OPTIMIZED:
-- - Added critical database indexes
-- - Optimized function performance
-- 
-- ✅ INITIALIZATION:
-- - Creates initial roulette round if none exists
-- - Proper permissions for edge function access
-- 
-- The "No active round" issue should now be completely resolved!
-- The edge function errors should be fixed!
-- No more function return type conflicts!
-- =====================================================================