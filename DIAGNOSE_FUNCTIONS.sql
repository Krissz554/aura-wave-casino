-- =====================================================
-- FUNCTION DIAGNOSTIC SCRIPT
-- Run this to see all functions and their search_path settings
-- 
-- Instructions: 
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run this script
-- 4. Review the output to see function details
-- =====================================================

-- Check all functions that might have mutable search_path
SELECT 
    p.proname as function_name,
    n.nspname as schema_name,
    pg_get_function_identity_arguments(p.oid) as function_signature,
    p.prosrc as function_body_snippet,
    CASE 
        WHEN p.proconfig IS NULL THEN 'MUTABLE (No search_path set)'
        WHEN array_to_string(p.proconfig, '; ') LIKE '%search_path%' THEN 'SECURE (' || array_to_string(p.proconfig, '; ') || ')'
        ELSE 'MUTABLE (search_path not configured)'
    END as search_path_status,
    p.prosecdef as is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_user_bet_stats',
    'validate_bet_limits', 
    'track_game_result',
    'atomic_bet_balance_check',
    'insert_roulette_bet_to_live_feed',
    'ensure_user_level_stats',
    'ensure_user_profile',
    'check_admin_status_simple',
    'check_rate_limit',
    'initialize_user_level_stats',
    'create_user_profile',
    'create_user_level_stats'
  )
ORDER BY p.proname, function_signature;

-- Also check for any functions with similar names
SELECT 
    p.proname as function_name,
    n.nspname as schema_name,
    pg_get_function_identity_arguments(p.oid) as function_signature
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    p.proname LIKE '%user_bet%' OR
    p.proname LIKE '%bet_limits%' OR
    p.proname LIKE '%game_result%' OR
    p.proname LIKE '%balance_check%' OR
    p.proname LIKE '%live_feed%' OR
    p.proname LIKE '%user_level%' OR
    p.proname LIKE '%user_profile%' OR
    p.proname LIKE '%admin_status%' OR
    p.proname LIKE '%rate_limit%'
  )
ORDER BY p.proname;