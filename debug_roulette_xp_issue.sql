-- Debug Roulette XP Issue - Check if complete_roulette_round function exists and works
-- This script will help identify why XP isn't being awarded

BEGIN;

-- =====================================================================
-- STEP 1: CHECK IF COMPLETE_ROULETTE_ROUND FUNCTION EXISTS
-- =====================================================================

-- Check if the function exists in the database
SELECT 
  'Function Existence Check' as test_type,
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type,
  prosrc IS NOT NULL as has_source_code
FROM pg_proc 
WHERE proname = 'complete_roulette_round'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- =====================================================================
-- STEP 2: CHECK RECENT ROULETTE ROUNDS AND BETS
-- =====================================================================

-- Check recent roulette rounds
SELECT 
  'Recent Rounds' as test_type,
  id,
  status,
  result_color,
  result_slot,
  created_at,
  updated_at
FROM public.roulette_rounds 
ORDER BY created_at DESC 
LIMIT 5;

-- Check recent roulette bets
SELECT 
  'Recent Bets' as test_type,
  rb.id,
  rb.user_id,
  rb.round_id,
  rb.bet_amount,
  rb.bet_color,
  rb.is_winner,
  rb.actual_payout,
  rb.profit,
  rb.created_at,
  rr.status as round_status,
  rr.result_color
FROM public.roulette_bets rb
LEFT JOIN public.roulette_rounds rr ON rb.round_id = rr.id
ORDER BY rb.created_at DESC 
LIMIT 5;

-- =====================================================================
-- STEP 3: CHECK USER LEVEL STATS CHANGES
-- =====================================================================

-- Check recent changes to user_level_stats
SELECT 
  'Recent XP Changes' as test_type,
  user_id,
  lifetime_xp,
  current_level,
  current_level_xp,
  xp_to_next_level,
  roulette_games,
  roulette_wagered,
  total_games,
  total_wagered,
  updated_at
FROM public.user_level_stats 
ORDER BY updated_at DESC 
LIMIT 5;

-- =====================================================================
-- STEP 4: TEST THE COMPLETE_ROULETTE_ROUND FUNCTION MANUALLY
-- =====================================================================

-- First, let's see if there are any completed rounds we can test with
DO $$
DECLARE
  test_round_id UUID;
  test_result JSONB;
BEGIN
  -- Find a recent completed round to test with
  SELECT id INTO test_round_id 
  FROM public.roulette_rounds 
  WHERE status = 'completed' 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF test_round_id IS NOT NULL THEN
    RAISE NOTICE 'Testing complete_roulette_round with round: %', test_round_id;
    
    -- Test the function (this should be safe since round is already completed)
    -- SELECT complete_roulette_round(test_round_id) INTO test_result;
    -- RAISE NOTICE 'Function test result: %', test_result;
    
    RAISE NOTICE 'Found test round: %. Skipping actual function call to avoid duplicate processing.', test_round_id;
  ELSE
    RAISE NOTICE 'No completed rounds found for testing';
  END IF;
END $$;

-- =====================================================================
-- STEP 5: CHECK FUNCTION PERMISSIONS
-- =====================================================================

-- Check function permissions
SELECT 
  'Function Permissions' as test_type,
  p.proname as function_name,
  r.rolname as granted_to,
  'EXECUTE' as permission_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_default_acl_object dao ON dao.defaclobjtype = 'f' AND dao.defaclnamespace = n.oid
LEFT JOIN pg_roles r ON r.oid = ANY(dao.defaclacl::oid[])
WHERE p.proname = 'complete_roulette_round' 
AND n.nspname = 'public';

-- Also check table-level permissions that the function needs
SELECT 
  'Table Permissions Check' as test_type,
  schemaname,
  tablename,
  'Expected: authenticated should have access' as note
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('roulette_rounds', 'roulette_bets', 'user_level_stats', 'profiles', 'game_history')
ORDER BY tablename;

-- =====================================================================
-- STEP 6: CREATE A SIMPLE TEST FUNCTION TO VERIFY DATABASE ACCESS
-- =====================================================================

-- Create a simple test function to see if RPC calls work at all
CREATE OR REPLACE FUNCTION public.test_rpc_call()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'message', 'RPC call working',
    'timestamp', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_rpc_call() TO authenticated, anon, service_role;

-- Test the simple function
SELECT 
  'Simple RPC Test' as test_type,
  public.test_rpc_call() as result;

COMMIT;

-- =====================================================================
-- DEBUGGING SUMMARY
-- =====================================================================
-- ✅ Check if complete_roulette_round function exists
-- ✅ Review recent rounds and bets to see if any are being processed
-- ✅ Check user_level_stats for recent XP changes
-- ✅ Verify function permissions
-- ✅ Test basic RPC functionality
-- =====================================================================

-- Manual test query you can run to see current XP calculation functions:
SELECT 
  'XP Function Test' as test_type,
  calculate_xp_for_level_exact(6) as xp_needed_for_level_6,
  calculate_level_from_xp_exact(4000) as level_for_4000_xp;

-- Check if level_xp_requirements table has data
SELECT 
  'XP Requirements Check' as test_type,
  COUNT(*) as total_levels,
  MIN(level) as min_level,
  MAX(level) as max_level,
  AVG(xp_required) as avg_xp_required
FROM public.level_xp_requirements;