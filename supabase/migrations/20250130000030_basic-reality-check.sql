-- Basic reality check - find out what's actually in the database
-- This will tell us the truth about what exists

-- 1. Does the table exist at all?
SELECT 
  'TABLE_EXISTS' as check_type,
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_level_stats' AND table_schema = 'public') 
    THEN 'YES' 
    ELSE 'NO' 
  END as result;

-- 2. What columns actually exist? (Simple list)
SELECT 
  'ACTUAL_COLUMNS' as check_type,
  string_agg(column_name, ', ' ORDER BY ordinal_position) as result
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_level_stats';

-- 3. Try the simplest possible SELECT to see what works
SELECT 
  'SIMPLE_SELECT' as check_type,
  'Testing basic SELECT' as result;

-- Try to select just the ID column (should always work)
SELECT 
  'ID_COLUMN_TEST' as check_type,
  CASE 
    WHEN EXISTS(SELECT id FROM user_level_stats LIMIT 1) 
    THEN 'ID column works' 
    ELSE 'ID column fails' 
  END as result;

-- 4. Try to select each critical column individually
SELECT 
  'LIFETIME_XP_TEST' as check_type,
  CASE 
    WHEN EXISTS(
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_level_stats' 
        AND column_name = 'lifetime_xp'
        AND table_schema = 'public'
    ) 
    THEN 'Column exists in schema' 
    ELSE 'Column missing from schema' 
  END as result;

-- 5. Try the most basic UPDATE possible
DO $$
DECLARE
  test_result TEXT;
BEGIN
  BEGIN
    -- Try to update a simple column that definitely exists
    UPDATE user_level_stats 
    SET updated_at = NOW() 
    WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f';
    
    test_result := 'Basic UPDATE works';
  EXCEPTION
    WHEN OTHERS THEN
      test_result := 'Basic UPDATE failed: ' || SQLERRM;
  END;
  
  -- Return the result
  RAISE NOTICE 'UPDATE_TEST: %', test_result;
END;
$$;

-- 6. Show table owner and permissions
SELECT 
  'TABLE_PERMISSIONS' as check_type,
  format('Owner: %s, Schema: %s', tableowner, schemaname) as result
FROM pg_tables 
WHERE tablename = 'user_level_stats';

-- 7. Try a direct column access test
DO $$
DECLARE
  test_value INTEGER;
  test_result TEXT;
BEGIN
  BEGIN
    -- Try to access lifetime_xp directly
    SELECT lifetime_xp INTO test_value
    FROM user_level_stats 
    WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'
    LIMIT 1;
    
    test_result := 'Can read lifetime_xp: ' || COALESCE(test_value::TEXT, 'NULL');
  EXCEPTION
    WHEN OTHERS THEN
      test_result := 'Cannot read lifetime_xp: ' || SQLERRM;
  END;
  
  RAISE NOTICE 'DIRECT_ACCESS_TEST: %', test_result;
END;
$$;