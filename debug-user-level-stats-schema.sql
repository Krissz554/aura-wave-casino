-- DEBUG: Check user_level_stats table schema
-- Run this to see what columns actually exist

-- Check all columns in user_level_stats table
SELECT 
  'COLUMN_INFO' as debug_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_level_stats'
ORDER BY ordinal_position;

-- Check if specific XP-related columns exist
SELECT 
  'XP_COLUMNS_CHECK' as debug_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'lifetime_xp') THEN 'EXISTS' ELSE 'MISSING' END as lifetime_xp_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'current_level_xp') THEN 'EXISTS' ELSE 'MISSING' END as current_level_xp_status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'xp_to_next_level') THEN 'EXISTS' ELSE 'MISSING' END as xp_to_next_level_status;

-- Check if the table exists and has any data
SELECT 
  'TABLE_INFO' as debug_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as records_with_user_id
FROM public.user_level_stats;

-- Show sample data structure (first record)
SELECT 
  'SAMPLE_DATA' as debug_type,
  *
FROM public.user_level_stats
LIMIT 1;

-- Check if the function exists and what it expects
SELECT 
  'FUNCTION_INFO' as debug_type,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public' 
AND p.proname = 'update_user_stats_and_level';

SELECT '🔍 USER_LEVEL_STATS DEBUG COMPLETE' as status;