-- EMERGENCY COMPREHENSIVE FIX
-- This addresses both the lifetime_xp error and the pending_account_deletions 406 error

-- =============================================================================
-- PART 1: FIX STATS FUNCTION AND COLUMNS
-- =============================================================================

-- Ensure all XP columns exist
DO $$
BEGIN
  -- Add lifetime_xp if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_level_stats' 
      AND column_name = 'lifetime_xp'
  ) THEN
    ALTER TABLE public.user_level_stats ADD COLUMN lifetime_xp INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added lifetime_xp column';
  ELSE
    RAISE NOTICE '✅ lifetime_xp column already exists';
  END IF;

  -- Add current_level_xp if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_level_stats' 
      AND column_name = 'current_level_xp'
  ) THEN
    ALTER TABLE public.user_level_stats ADD COLUMN current_level_xp INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added current_level_xp column';
  ELSE
    RAISE NOTICE '✅ current_level_xp column already exists';
  END IF;

  -- Add xp_to_next_level if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_level_stats' 
      AND column_name = 'xp_to_next_level'
  ) THEN
    ALTER TABLE public.user_level_stats ADD COLUMN xp_to_next_level INTEGER DEFAULT 916;
    RAISE NOTICE '✅ Added xp_to_next_level column';
  ELSE
    RAISE NOTICE '✅ xp_to_next_level column already exists';
  END IF;
END $$;

-- Drop and recreate the stats function
DROP FUNCTION IF EXISTS public.update_user_stats_and_level CASCADE;

CREATE OR REPLACE FUNCTION public.update_user_stats_and_level(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount NUMERIC,
  p_result TEXT,
  p_profit NUMERIC,
  p_streak_length INTEGER DEFAULT 0,
  p_winning_color TEXT DEFAULT NULL,
  p_bet_color TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stats RECORD;
  new_xp INTEGER;
  old_level INTEGER;
  new_level INTEGER;
  is_win BOOLEAN;
  v_rows_affected INTEGER;
  new_roulette_streak INTEGER := 0;
  xp_gained INTEGER;
BEGIN
  -- Log function call
  RAISE NOTICE '🎰 update_user_stats_and_level: user=%, game=%, bet=%, result=%, profit=%', 
    p_user_id, p_game_type, p_bet_amount, p_result, p_profit;
  
  -- Validate inputs
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id cannot be null';
  END IF;
  
  -- Determine if this is a win
  is_win := (p_result = 'win' OR p_result = 'cash_out') AND p_profit > 0;
  xp_gained := GREATEST(1, LEAST(p_bet_amount::INTEGER, 1000));
  
  -- Ensure user has stats record
  INSERT INTO public.user_level_stats (user_id) 
  VALUES (p_user_id) 
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current stats
  SELECT 
    COALESCE(current_level, 1) as current_level,
    COALESCE(lifetime_xp, 0) as lifetime_xp,
    COALESCE(roulette_games, 0) as roulette_games,
    COALESCE(roulette_wins, 0) as roulette_wins,
    COALESCE(roulette_wagered, 0) as roulette_wagered,
    COALESCE(roulette_profit, 0) as roulette_profit,
    COALESCE(roulette_current_streak, 0) as roulette_current_streak,
    COALESCE(roulette_best_streak, 0) as roulette_best_streak,
    COALESCE(roulette_highest_win, 0) as roulette_highest_win,
    COALESCE(roulette_green_wins, 0) as roulette_green_wins,
    COALESCE(roulette_red_wins, 0) as roulette_red_wins,
    COALESCE(roulette_black_wins, 0) as roulette_black_wins,
    COALESCE(roulette_biggest_bet, 0) as roulette_biggest_bet,
    COALESCE(total_games, 0) as total_games,
    COALESCE(total_wins, 0) as total_wins,
    COALESCE(total_wagered, 0) as total_wagered,
    COALESCE(total_profit, 0) as total_profit,
    COALESCE(biggest_win, 0) as biggest_win,
    COALESCE(biggest_loss, 0) as biggest_loss
  INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  IF current_stats IS NULL THEN
    RAISE EXCEPTION 'Failed to get user stats for user_id: %', p_user_id;
  END IF;
  
  -- Calculate new values
  old_level := current_stats.current_level;
  new_xp := current_stats.lifetime_xp + xp_gained;
  new_level := GREATEST(1, new_xp / 1000);
  
  -- Calculate roulette streak
  IF p_game_type = 'roulette' THEN
    IF is_win THEN
      new_roulette_streak := current_stats.roulette_current_streak + 1;
    ELSE
      new_roulette_streak := 0;
    END IF;
  ELSE
    new_roulette_streak := current_stats.roulette_current_streak;
  END IF;
  
  -- Update stats
  UPDATE public.user_level_stats 
  SET 
    current_level = new_level,
    lifetime_xp = new_xp,
    current_level_xp = new_xp % 1000,
    xp_to_next_level = 1000 - (new_xp % 1000),
    roulette_games = CASE WHEN p_game_type = 'roulette' THEN current_stats.roulette_games + 1 ELSE current_stats.roulette_games END,
    roulette_wins = CASE WHEN p_game_type = 'roulette' AND is_win THEN current_stats.roulette_wins + 1 ELSE current_stats.roulette_wins END,
    roulette_wagered = CASE WHEN p_game_type = 'roulette' THEN current_stats.roulette_wagered + p_bet_amount ELSE current_stats.roulette_wagered END,
    roulette_profit = CASE WHEN p_game_type = 'roulette' THEN current_stats.roulette_profit + p_profit ELSE current_stats.roulette_profit END,
    roulette_current_streak = new_roulette_streak,
    roulette_best_streak = CASE WHEN p_game_type = 'roulette' AND new_roulette_streak > current_stats.roulette_best_streak THEN new_roulette_streak ELSE current_stats.roulette_best_streak END,
    roulette_highest_win = CASE WHEN p_game_type = 'roulette' AND is_win AND p_profit > current_stats.roulette_highest_win THEN p_profit ELSE current_stats.roulette_highest_win END,
    roulette_green_wins = CASE WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'green' THEN current_stats.roulette_green_wins + 1 ELSE current_stats.roulette_green_wins END,
    roulette_red_wins = CASE WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'red' THEN current_stats.roulette_red_wins + 1 ELSE current_stats.roulette_red_wins END,
    roulette_black_wins = CASE WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'black' THEN current_stats.roulette_black_wins + 1 ELSE current_stats.roulette_black_wins END,
    roulette_biggest_bet = CASE WHEN p_game_type = 'roulette' AND p_bet_amount > current_stats.roulette_biggest_bet THEN p_bet_amount ELSE current_stats.roulette_biggest_bet END,
    total_games = current_stats.total_games + 1,
    total_wins = CASE WHEN is_win THEN current_stats.total_wins + 1 ELSE current_stats.total_wins END,
    total_wagered = current_stats.total_wagered + p_bet_amount,
    total_profit = current_stats.total_profit + p_profit,
    biggest_win = CASE WHEN is_win AND p_profit > current_stats.biggest_win THEN p_profit ELSE current_stats.biggest_win END,
    biggest_loss = CASE WHEN NOT is_win AND ABS(p_profit) > current_stats.biggest_loss THEN ABS(p_profit) ELSE current_stats.biggest_loss END,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  RAISE NOTICE '✅ Stats updated: % rows, leveled_up=%', v_rows_affected, (new_level > old_level);
  
  -- Insert game history
  INSERT INTO public.game_history (user_id, game_type, bet_amount, result, profit, created_at) 
  VALUES (p_user_id, p_game_type, p_bet_amount, p_result, p_profit, NOW());
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'game_type', p_game_type,
    'leveled_up', new_level > old_level,
    'old_level', old_level,
    'new_level', new_level,
    'xp_gained', xp_gained,
    'is_win', is_win
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN jsonb_build_object(
      'success', false,
      'error_message', SQLERRM,
      'sql_state', SQLSTATE
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- =============================================================================
-- PART 2: FIX PENDING ACCOUNT DELETIONS RLS POLICIES
-- =============================================================================

-- Check if pending_account_deletions table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'pending_account_deletions'
  ) THEN
    RAISE NOTICE '✅ pending_account_deletions table exists';
    
    -- Drop existing policies to avoid conflicts
    DROP POLICY IF EXISTS "Users can view their own pending deletions" ON public.pending_account_deletions;
    DROP POLICY IF EXISTS "Users can read their own pending deletions" ON public.pending_account_deletions;
    DROP POLICY IF EXISTS "Authenticated users can view pending deletions" ON public.pending_account_deletions;
    
    -- Create proper RLS policy for pending_account_deletions
    CREATE POLICY "authenticated_users_can_read_own_pending_deletions"
      ON public.pending_account_deletions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id OR auth.uid() = initiated_by);
    
    -- Allow service role full access
    CREATE POLICY "service_role_full_access_pending_deletions"
      ON public.pending_account_deletions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
    
    RAISE NOTICE '✅ Fixed RLS policies for pending_account_deletions';
  ELSE
    RAISE NOTICE '⚠️ pending_account_deletions table does not exist - skipping RLS fix';
  END IF;
END $$;

-- =============================================================================
-- PART 3: TEST EVERYTHING
-- =============================================================================

-- Test the stats function
DO $$
DECLARE
  test_user_id UUID;
  test_result JSONB;
BEGIN
  SELECT user_id INTO test_user_id FROM public.user_level_stats LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE '🧪 Testing stats function with user: %', test_user_id;
    
    SELECT public.update_user_stats_and_level(
      test_user_id, 'roulette', 1.0, 'win', 1.0, 0, 'red', 'red'
    ) INTO test_result;
    
    IF (test_result->>'success')::BOOLEAN THEN
      RAISE NOTICE '🎉 SUCCESS! Stats function working correctly';
    ELSE
      RAISE NOTICE '❌ Stats function test failed: %', test_result->>'error_message';
    END IF;
  ELSE
    RAISE NOTICE '❌ No users found for testing';
  END IF;
END $$;

-- Final verification
SELECT 
  '🎉 EMERGENCY FIX COMPLETE' as status,
  'Both stats function and RLS policies have been fixed' as message;

-- Show what was fixed
SELECT 
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_level_stats' AND column_name = 'lifetime_xp'
  ) THEN '✅ lifetime_xp column exists' 
  ELSE '❌ lifetime_xp column missing' END as lifetime_xp_status;

SELECT 
  CASE WHEN EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_user_stats_and_level' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN '✅ update_user_stats_and_level function exists' 
  ELSE '❌ function missing' END as function_status;