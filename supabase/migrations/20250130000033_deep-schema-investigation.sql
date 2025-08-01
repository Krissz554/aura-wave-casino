-- DEEP SCHEMA INVESTIGATION
-- Something is very wrong - let's find the ACTUAL table structure

-- Check all schemas for user_level_stats tables
SELECT 
  'ALL_SCHEMAS_WITH_USER_LEVEL_STATS' as check_type,
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename LIKE '%user_level%' OR tablename LIKE '%level_stats%'
ORDER BY schemaname, tablename;

-- Check what schema we're actually in
SELECT 
  'CURRENT_SCHEMA' as check_type,
  current_schema() as current_schema,
  current_user as current_user;

-- Check search_path
SELECT 
  'SEARCH_PATH' as check_type,
  current_setting('search_path') as search_path;

-- Try to find the ACTUAL columns in ALL schemas
SELECT 
  'ACTUAL_COLUMNS_ALL_SCHEMAS' as check_type,
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_level_stats'
ORDER BY table_schema, ordinal_position;

-- Check if there's a different table name
SELECT 
  'TABLES_WITH_LIFETIME_XP' as check_type,
  table_schema,
  table_name,
  column_name
FROM information_schema.columns 
WHERE column_name = 'lifetime_xp'
ORDER BY table_schema, table_name;

-- Try direct access with explicit schema
SELECT 
  'DIRECT_ACCESS_TEST' as check_type,
  COUNT(*) as row_count
FROM public.user_level_stats;

-- Check table permissions
SELECT 
  'TABLE_PERMISSIONS' as check_type,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'user_level_stats' AND table_schema = 'public';

-- Try to describe the table structure using pg_catalog
SELECT 
  'PG_CATALOG_COLUMNS' as check_type,
  a.attname as column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
  a.attnotnull as not_null
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'user_level_stats' 
  AND n.nspname = 'public'
  AND a.attnum > 0 
  AND NOT a.attisdropped
ORDER BY a.attnum;

-- Check if the table exists but under a different owner
SELECT 
  'TABLE_OWNERSHIP' as check_type,
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename = 'user_level_stats';

-- Final reality check - try to select from the table with explicit column names
DO $$
DECLARE
  v_result RECORD;
  v_error_msg TEXT;
BEGIN
  BEGIN
    EXECUTE 'SELECT id, user_id, lifetime_xp FROM public.user_level_stats LIMIT 1' INTO v_result;
    RAISE NOTICE 'SUCCESS: Can select lifetime_xp directly: id=%, user_id=%, lifetime_xp=%', 
      v_result.id, v_result.user_id, v_result.lifetime_xp;
  EXCEPTION
    WHEN OTHERS THEN
      v_error_msg := SQLERRM;
      RAISE NOTICE 'FAILED: Cannot select lifetime_xp: %', v_error_msg;
  END;
END $$;