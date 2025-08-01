-- SINGLE COMPREHENSIVE INVESTIGATION
-- Everything in one query using CTEs

WITH 
-- Check schemas
schemas_check AS (
  SELECT 
    string_agg(schemaname || '.' || tablename, ', ') as tables_found
  FROM pg_tables 
  WHERE tablename LIKE '%user_level%' OR tablename LIKE '%level_stats%'
),

-- Check current context
context_check AS (
  SELECT 
    current_schema() as current_schema,
    current_user as current_user,
    current_setting('search_path') as search_path
),

-- Check actual columns
columns_check AS (
  SELECT 
    string_agg(column_name, ', ' ORDER BY ordinal_position) as all_columns,
    COUNT(*) as column_count
  FROM information_schema.columns 
  WHERE table_name = 'user_level_stats' AND table_schema = 'public'
),

-- Check lifetime_xp specifically
lifetime_xp_check AS (
  SELECT 
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_level_stats' 
        AND table_schema = 'public' 
        AND column_name = 'lifetime_xp'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as lifetime_xp_status
),

-- Check RLS status
rls_check AS (
  SELECT 
    CASE WHEN relrowsecurity THEN '🔒 RLS ENABLED' ELSE '🔓 RLS DISABLED' END as rls_status
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE c.relname = 'user_level_stats' AND n.nspname = 'public'
),

-- Check table permissions for current user
permissions_check AS (
  SELECT 
    string_agg(privilege_type, ', ') as privileges
  FROM information_schema.table_privileges 
  WHERE table_name = 'user_level_stats' 
    AND table_schema = 'public'
    AND grantee = current_user
),

-- Try to count rows (this will fail if RLS blocks it)
row_count_check AS (
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM public.user_level_stats LIMIT 1) 
      THEN (SELECT COUNT(*)::text FROM public.user_level_stats)
      ELSE 'ACCESS_DENIED'
    END as row_count
),

-- Test direct column access
direct_access_test AS (
  SELECT 
    CASE 
      WHEN EXISTS (
        SELECT lifetime_xp FROM public.user_level_stats LIMIT 1
      ) THEN '✅ CAN ACCESS'
      ELSE '❌ CANNOT ACCESS'
    END as direct_access_result
)

-- Combine everything into one row
SELECT 
  'COMPREHENSIVE_INVESTIGATION' as investigation_type,
  s.tables_found,
  c.current_schema,
  c.current_user,
  c.search_path,
  col.all_columns,
  col.column_count,
  lx.lifetime_xp_status,
  r.rls_status,
  p.privileges,
  rc.row_count,
  da.direct_access_result
FROM schemas_check s
CROSS JOIN context_check c
CROSS JOIN columns_check col
CROSS JOIN lifetime_xp_check lx
CROSS JOIN rls_check r
CROSS JOIN permissions_check p
CROSS JOIN row_count_check rc
CROSS JOIN direct_access_test da;