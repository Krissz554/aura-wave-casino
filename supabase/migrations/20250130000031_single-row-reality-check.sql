-- Single row reality check - everything in one result
-- This will show us all the truth in one place

WITH reality_check AS (
  -- Check if table exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_level_stats' AND table_schema = 'public'
  ) as table_exists,
  
  -- Get actual column list
  (SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
   FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'user_level_stats'
  ) as actual_columns,
  
  -- Check if lifetime_xp exists in schema
  EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_level_stats' 
      AND column_name = 'lifetime_xp'
      AND table_schema = 'public'
  ) as lifetime_xp_in_schema,
  
  -- Check if we can access the table at all
  (SELECT COUNT(*) FROM user_level_stats) as total_rows,
  
  -- Check if our specific user exists
  EXISTS(
    SELECT 1 FROM user_level_stats 
    WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'
  ) as user_exists
)

SELECT 
  '🔍 COMPLETE REALITY CHECK' as title,
  
  -- Table status
  CASE WHEN table_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END as table_status,
  
  -- Column list (this is the key!)
  COALESCE(actual_columns, 'NO COLUMNS FOUND') as all_columns,
  
  -- Schema check
  CASE WHEN lifetime_xp_in_schema THEN '✅ IN SCHEMA' ELSE '❌ NOT IN SCHEMA' END as lifetime_xp_status,
  
  -- Row counts
  format('Total rows: %s', total_rows) as row_info,
  
  -- User check
  CASE WHEN user_exists THEN '✅ USER EXISTS' ELSE '❌ USER MISSING' END as user_status,
  
  -- Try to read actual data
  (SELECT 
     CASE 
       WHEN current_level IS NOT NULL THEN format('Level: %s', current_level)
       ELSE 'Cannot read current_level'
     END
   FROM user_level_stats 
   WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'
   LIMIT 1
  ) as sample_data

FROM reality_check;