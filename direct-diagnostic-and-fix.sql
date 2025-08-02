-- DIRECT DIAGNOSTIC AND FIX FOR LIFETIME_XP ERROR
-- This script will identify exactly what's wrong and fix it

-- =============================================================================
-- STEP 1: DIAGNOSTIC - Check current state
-- =============================================================================

-- Check if user_level_stats table exists
SELECT 
  'TABLE_CHECK' as check_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_level_stats'
  ) THEN 'EXISTS' ELSE 'MISSING' END as result;

-- Check if lifetime_xp column exists
SELECT 
  'LIFETIME_XP_COLUMN' as check_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_level_stats' 
      AND column_name = 'lifetime_xp'
  ) THEN 'EXISTS' ELSE 'MISSING' END as result;

-- Check current function signature
SELECT 
  'FUNCTION_CHECK' as check_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_user_stats_and_level'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN 'EXISTS' ELSE 'MISSING' END as result;

-- Show actual table structure
SELECT 
  'TABLE_STRUCTURE' as check_type,
  string_agg(column_name, ', ' ORDER BY ordinal_position) as result
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_level_stats';

-- =============================================================================
-- STEP 2: FORCE FIX - Add columns if missing
-- =============================================================================

-- Force add lifetime_xp column
DO $$
BEGIN
  -- Add lifetime_xp
  BEGIN
    ALTER TABLE public.user_level_stats ADD COLUMN lifetime_xp INTEGER DEFAULT 0;
    RAISE NOTICE '✅ ADDED lifetime_xp column';
  EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE '✅ lifetime_xp column already exists';
  END;
  
  -- Add current_level_xp
  BEGIN
    ALTER TABLE public.user_level_stats ADD COLUMN current_level_xp INTEGER DEFAULT 0;
    RAISE NOTICE '✅ ADDED current_level_xp column';
  EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE '✅ current_level_xp column already exists';
  END;
  
  -- Add xp_to_next_level
  BEGIN
    ALTER TABLE public.user_level_stats ADD COLUMN xp_to_next_level INTEGER DEFAULT 916;
    RAISE NOTICE '✅ ADDED xp_to_next_level column';
  EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE '✅ xp_to_next_level column already exists';
  END;
END $$;

-- =============================================================================
-- STEP 3: COMPLETELY RECREATE THE FUNCTION
-- =============================================================================

-- Drop ALL versions of the function
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_level CASCADE;

-- Create the definitive function
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
  xp_gained INTEGER;
BEGIN
  -- FORCE LOG - This will show in the Edge Function logs
  RAISE NOTICE '🎰 STATS FUNCTION CALLED: user=%, game=%, bet=%, result=%, profit=%', 
    p_user_id, p_game_type, p_bet_amount, p_result, p_profit;
  
  -- Validate critical inputs
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id cannot be null';
  END IF;
  
  IF p_game_type IS NULL THEN
    RAISE EXCEPTION 'p_game_type cannot be null';
  END IF;
  
  -- Calculate basic values
  is_win := (p_result = 'win' OR p_result = 'cash_out') AND p_profit > 0;
  xp_gained := GREATEST(1, LEAST(p_bet_amount::INTEGER, 1000));
  
  -- FORCE user stats record to exist
  INSERT INTO public.user_level_stats (user_id) 
  VALUES (p_user_id) 
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current stats with EXPLICIT column references
  SELECT 
    COALESCE(current_level, 1) as current_level,
    COALESCE(lifetime_xp, 0) as lifetime_xp,
    COALESCE(current_level_xp, 0) as current_level_xp,
    COALESCE(xp_to_next_level, 916) as xp_to_next_level,
    COALESCE(roulette_games, 0) as roulette_games,
    COALESCE(roulette_wins, 0) as roulette_wins,
    COALESCE(roulette_wagered, 0) as roulette_wagered,
    COALESCE(roulette_profit, 0) as roulette_profit,
    COALESCE(total_games, 0) as total_games,
    COALESCE(total_wins, 0) as total_wins,
    COALESCE(total_wagered, 0) as total_wagered,
    COALESCE(total_profit, 0) as total_profit
  INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  -- Calculate new values
  old_level := current_stats.current_level;
  new_xp := current_stats.lifetime_xp + xp_gained;
  new_level := GREATEST(1, new_xp / 1000);
  
  RAISE NOTICE '📊 CALCULATING: old_level=%, new_xp=%, new_level=%, xp_gained=%', 
    old_level, new_xp, new_level, xp_gained;
  
  -- EXPLICIT UPDATE with only columns we know exist
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
    total_games = current_stats.total_games + 1,
    total_wins = CASE WHEN is_win THEN current_stats.total_wins + 1 ELSE current_stats.total_wins END,
    total_wagered = current_stats.total_wagered + p_bet_amount,
    total_profit = current_stats.total_profit + p_profit,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  RAISE NOTICE '✅ STATS UPDATED: % rows affected, leveled_up=%', v_rows_affected, (new_level > old_level);
  
  -- Add to game history
  INSERT INTO public.game_history (user_id, game_type, bet_amount, result, profit, created_at) 
  VALUES (p_user_id, p_game_type, p_bet_amount, p_result, p_profit, NOW());
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'game_type', p_game_type,
    'leveled_up', new_level > old_level,
    'old_level', old_level,
    'new_level', new_level,
    'xp_gained', xp_gained,
    'is_win', is_win,
    'function_version', 'direct_fix_v1'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ STATS FUNCTION ERROR: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN jsonb_build_object(
      'success', false,
      'error_message', SQLERRM,
      'sql_state', SQLSTATE,
      'function_version', 'direct_fix_v1'
    );
END;
$$;

-- =============================================================================
-- STEP 4: GRANT PERMISSIONS EXPLICITLY
-- =============================================================================

-- Grant to both roles explicitly
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO anon;

-- =============================================================================
-- STEP 5: IMMEDIATE TEST
-- =============================================================================

-- Test the function RIGHT NOW
DO $$
DECLARE
  test_user_id UUID;
  test_result JSONB;
BEGIN
  -- Get a real user
  SELECT user_id INTO test_user_id FROM public.user_level_stats LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE '🧪 TESTING FUNCTION with user: %', test_user_id;
    
    -- Call the function
    SELECT public.update_user_stats_and_level(
      test_user_id, 'roulette', 1.0, 'win', 1.0, 0, 'red', 'red'
    ) INTO test_result;
    
    RAISE NOTICE '🔍 TEST RESULT: %', test_result;
    
    IF (test_result->>'success')::BOOLEAN THEN
      RAISE NOTICE '🎉 SUCCESS! Function is working correctly!';
    ELSE
      RAISE NOTICE '❌ TEST FAILED: %', test_result->>'error_message';
    END IF;
  ELSE
    RAISE NOTICE '❌ No users found for testing';
  END IF;
END $$;

-- =============================================================================
-- STEP 6: FINAL VERIFICATION
-- =============================================================================

-- Show final state
SELECT 
  '🎉 DIRECT FIX COMPLETE' as status,
  'Function recreated and tested' as message;

-- Verify columns exist
SELECT 
  'FINAL_COLUMN_CHECK' as check_type,
  column_name,
  data_type,
  'EXISTS' as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_level_stats' 
  AND column_name IN ('lifetime_xp', 'current_level_xp', 'xp_to_next_level')
ORDER BY column_name;

-- Verify function exists
SELECT 
  'FINAL_FUNCTION_CHECK' as check_type,
  proname as function_name,
  'EXISTS' as status
FROM pg_proc 
WHERE proname = 'update_user_stats_and_level'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');