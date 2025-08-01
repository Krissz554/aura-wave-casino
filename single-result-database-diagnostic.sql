-- SINGLE RESULT DATABASE DIAGNOSTIC
-- This returns all diagnostic information in one result set for Supabase

WITH 
-- Check if user_level_stats table exists
table_existence AS (
  SELECT 
    'TABLE_EXISTS' as check_type,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'user_level_stats'
    ) THEN 'YES' ELSE 'NO' END as result,
    '' as details
),

-- Get all columns from user_level_stats if it exists
table_columns AS (
  SELECT 
    'TABLE_COLUMNS' as check_type,
    'COLUMNS_FOUND' as result,
    string_agg(
      column_name || ':' || data_type || 
      CASE WHEN is_nullable = 'YES' THEN '(nullable)' ELSE '(not null)' END ||
      CASE WHEN column_default IS NOT NULL THEN '(default:' || column_default || ')' ELSE '' END,
      ', ' ORDER BY ordinal_position
    ) as details
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'user_level_stats'
),

-- Check for specific XP columns
xp_columns_check AS (
  SELECT 
    'XP_COLUMNS' as check_type,
    'STATUS' as result,
    'lifetime_xp:' || 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'lifetime_xp') 
         THEN 'EXISTS' ELSE 'MISSING' END ||
    ', current_level_xp:' ||
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'current_level_xp') 
         THEN 'EXISTS' ELSE 'MISSING' END ||
    ', xp_to_next_level:' ||
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'xp_to_next_level') 
         THEN 'EXISTS' ELSE 'MISSING' END as details
),

-- Check for roulette columns
roulette_columns_check AS (
  SELECT 
    'ROULETTE_COLUMNS' as check_type,
    'STATUS' as result,
    'roulette_games:' || 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_games') 
         THEN 'EXISTS' ELSE 'MISSING' END ||
    ', roulette_wins:' ||
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_wins') 
         THEN 'EXISTS' ELSE 'MISSING' END ||
    ', roulette_wagered:' ||
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_wagered') 
         THEN 'EXISTS' ELSE 'MISSING' END ||
    ', roulette_profit:' ||
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_profit') 
         THEN 'EXISTS' ELSE 'MISSING' END as details
),

-- Count records in user_level_stats
record_count AS (
  SELECT 
    'RECORD_COUNT' as check_type,
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_level_stats') 
      THEN (SELECT COUNT(*)::text FROM public.user_level_stats)
      ELSE 'TABLE_MISSING'
    END as result,
    'Total records in user_level_stats table' as details
),

-- Check auth.users count
auth_users_count AS (
  SELECT 
    'AUTH_USERS_COUNT' as check_type,
    (SELECT COUNT(*)::text FROM auth.users) as result,
    'Total users in auth.users table' as details
),

-- Check if update_user_stats_and_level function exists
function_check AS (
  SELECT 
    'FUNCTION_EXISTS' as check_type,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = 'update_user_stats_and_level'
    ) THEN 'YES' ELSE 'NO' END as result,
    COALESCE((
      SELECT pg_get_function_identity_arguments(p.oid)
      FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = 'update_user_stats_and_level'
      LIMIT 1
    ), 'Function not found') as details
),

-- Check other related tables
related_tables AS (
  SELECT 
    'RELATED_TABLES' as check_type,
    'FOUND' as result,
    string_agg(table_name, ', ') as details
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND (table_name LIKE '%user%' OR table_name LIKE '%level%' OR table_name LIKE '%stats%' OR table_name = 'profiles')
),

-- Sample data from user_level_stats (if exists and has data)
sample_data AS (
  SELECT 
    'SAMPLE_DATA' as check_type,
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_level_stats') 
      THEN 'TABLE_MISSING'
      WHEN (SELECT COUNT(*) FROM public.user_level_stats) = 0 
      THEN 'NO_DATA'
      ELSE 'HAS_DATA'
    END as result,
    CASE 
      WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_level_stats') 
      AND (SELECT COUNT(*) FROM public.user_level_stats) > 0
      THEN (
        SELECT 'user_id:' || user_id::text || 
               ', level:' || COALESCE(current_level::text, 'NULL') ||
               ', lifetime_xp:' || COALESCE(lifetime_xp::text, 'NULL') ||
               ', roulette_games:' || COALESCE(roulette_games::text, 'NULL')
        FROM public.user_level_stats 
        LIMIT 1
      )
      ELSE 'No sample data available'
    END as details
),

-- Check RLS policies
rls_policies AS (
  SELECT 
    'RLS_POLICIES' as check_type,
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_level_stats') 
      THEN 'TABLE_MISSING'
      ELSE (
        SELECT COUNT(*)::text || ' policies found'
        FROM pg_policies 
        WHERE tablename = 'user_level_stats'
      )
    END as result,
    COALESCE((
      SELECT string_agg(policyname || ':' || cmd, ', ')
      FROM pg_policies 
      WHERE tablename = 'user_level_stats'
    ), 'No policies or table missing') as details
)

-- Combine all results
SELECT 
  check_type,
  result,
  details,
  CASE 
    WHEN check_type = 'TABLE_EXISTS' AND result = 'NO' THEN '❌ CRITICAL: Table missing'
    WHEN check_type = 'XP_COLUMNS' AND details LIKE '%MISSING%' THEN '⚠️ WARNING: XP columns missing'
    WHEN check_type = 'ROULETTE_COLUMNS' AND details LIKE '%MISSING%' THEN '⚠️ WARNING: Roulette columns missing'
    WHEN check_type = 'FUNCTION_EXISTS' AND result = 'NO' THEN '❌ CRITICAL: Function missing'
    WHEN check_type = 'RECORD_COUNT' AND result = '0' THEN '⚠️ INFO: No user records'
    ELSE '✅ OK'
  END as status
FROM (
  SELECT * FROM table_existence
  UNION ALL
  SELECT * FROM table_columns
  UNION ALL
  SELECT * FROM xp_columns_check
  UNION ALL
  SELECT * FROM roulette_columns_check
  UNION ALL
  SELECT * FROM record_count
  UNION ALL
  SELECT * FROM auth_users_count
  UNION ALL
  SELECT * FROM function_check
  UNION ALL
  SELECT * FROM related_tables
  UNION ALL
  SELECT * FROM sample_data
  UNION ALL
  SELECT * FROM rls_policies
) combined_results
ORDER BY 
  CASE check_type
    WHEN 'TABLE_EXISTS' THEN 1
    WHEN 'TABLE_COLUMNS' THEN 2
    WHEN 'XP_COLUMNS' THEN 3
    WHEN 'ROULETTE_COLUMNS' THEN 4
    WHEN 'RECORD_COUNT' THEN 5
    WHEN 'AUTH_USERS_COUNT' THEN 6
    WHEN 'FUNCTION_EXISTS' THEN 7
    WHEN 'RELATED_TABLES' THEN 8
    WHEN 'SAMPLE_DATA' THEN 9
    WHEN 'RLS_POLICIES' THEN 10
    ELSE 99
  END;