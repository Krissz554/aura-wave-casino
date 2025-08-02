-- Debug Roulette XP Issue - Simplified Version (Compatible with Supabase)
-- This script will help identify why XP isn't being awarded

-- =====================================================================
-- STEP 1: CHECK IF COMPLETE_ROULETTE_ROUND FUNCTION EXISTS
-- =====================================================================

-- Check if the function exists in the database
SELECT 
  'Function Existence Check' as test_type,
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
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
-- STEP 4: TEST XP CALCULATION FUNCTIONS
-- =====================================================================

-- Test XP calculation functions
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

-- =====================================================================
-- STEP 5: CREATE AND TEST SIMPLE RPC FUNCTION
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

-- =====================================================================
-- STEP 6: MANUAL TEST OF COMPLETE_ROULETTE_ROUND (IF SAFE)
-- =====================================================================

-- Check if we have any completed rounds with bets that we could theoretically test
SELECT 
  'Testable Rounds' as test_type,
  rr.id as round_id,
  rr.status,
  COUNT(rb.id) as bet_count,
  rr.created_at
FROM public.roulette_rounds rr
LEFT JOIN public.roulette_bets rb ON rr.id = rb.round_id
WHERE rr.status = 'completed'
GROUP BY rr.id, rr.status, rr.created_at
ORDER BY rr.created_at DESC
LIMIT 3;

-- =====================================================================
-- STEP 7: CHECK SPECIFIC USER'S XP PROGRESSION
-- =====================================================================

-- If you know your user ID, replace this with your actual user ID to see your progression
-- Example: WHERE user_id = 'your-user-id-here'
SELECT 
  'Your XP Progression' as test_type,
  user_id,
  lifetime_xp,
  current_level,
  current_level_xp,
  xp_to_next_level,
  roulette_games,
  roulette_wagered,
  roulette_profit,
  updated_at
FROM public.user_level_stats 
-- Add WHERE clause with your user_id if you want to see specific user data
ORDER BY updated_at DESC 
LIMIT 10;

-- =====================================================================
-- DIAGNOSTIC SUMMARY
-- =====================================================================
-- This script checks:
-- ✅ If complete_roulette_round function exists
-- ✅ Recent rounds, bets, and XP changes
-- ✅ XP calculation functions work
-- ✅ RPC functionality works
-- ✅ Available test data for manual testing
-- =====================================================================