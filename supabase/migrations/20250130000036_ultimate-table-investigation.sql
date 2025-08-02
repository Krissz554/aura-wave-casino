-- ULTIMATE TABLE INVESTIGATION
-- Check for multiple user_level_stats tables or schema conflicts

-- Find ALL tables with similar names across ALL schemas
SELECT 
  'ALL_SIMILAR_TABLES' as check_type,
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename ILIKE '%user%level%' 
   OR tablename ILIKE '%level%stat%'
   OR tablename ILIKE '%stat%'
ORDER BY schemaname, tablename;

-- Check ALL columns in ALL user_level_stats tables
SELECT 
  'ALL_USER_LEVEL_STATS_COLUMNS' as check_type,
  table_schema,
  table_name,
  string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns 
WHERE table_name = 'user_level_stats'
GROUP BY table_schema, table_name
ORDER BY table_schema;

-- Check what table the function is actually trying to access
-- by creating a simple test function
CREATE OR REPLACE FUNCTION public.test_table_access()
RETURNS TABLE(
  test_name TEXT,
  schema_name TEXT,
  table_name TEXT,
  column_exists BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Test 1: Try public.user_level_stats
  RETURN QUERY
  SELECT 
    'public.user_level_stats'::TEXT,
    'public'::TEXT,
    'user_level_stats'::TEXT,
    EXISTS(
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'user_level_stats' 
        AND column_name = 'lifetime_xp'
    ),
    ''::TEXT;
    
  -- Test 2: Try to select from the table
  BEGIN
    PERFORM lifetime_xp FROM public.user_level_stats LIMIT 1;
    RETURN QUERY
    SELECT 
      'SELECT_TEST'::TEXT,
      'public'::TEXT,
      'user_level_stats'::TEXT,
      true,
      'SUCCESS'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY
      SELECT 
        'SELECT_TEST'::TEXT,
        'public'::TEXT,
        'user_level_stats'::TEXT,
        false,
        SQLERRM::TEXT;
  END;
  
  -- Test 3: Check what search_path resolves to
  RETURN QUERY
  SELECT 
    'SEARCH_PATH_RESOLUTION'::TEXT,
    current_schema()::TEXT,
    'user_level_stats'::TEXT,
    true,
    current_setting('search_path')::TEXT;
    
END;
$$;

-- Run the test function
SELECT * FROM public.test_table_access();

-- Check if there's a view or alias masking the real table
SELECT 
  'VIEWS_AND_ALIASES' as check_type,
  schemaname,
  viewname,
  viewowner
FROM pg_views 
WHERE viewname ILIKE '%user_level%' OR viewname ILIKE '%stat%';

-- Check materialized views
SELECT 
  'MATERIALIZED_VIEWS' as check_type,
  schemaname,
  matviewname,
  matviewowner
FROM pg_matviews 
WHERE matviewname ILIKE '%user_level%' OR matviewname ILIKE '%stat%';

-- Final desperate attempt - show the ACTUAL table structure as seen by PostgreSQL
SELECT 
  'ACTUAL_TABLE_STRUCTURE' as check_type,
  a.attname as column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'user_level_stats' 
  AND n.nspname = 'public'
  AND a.attnum > 0 
  AND NOT a.attisdropped
ORDER BY a.attnum;