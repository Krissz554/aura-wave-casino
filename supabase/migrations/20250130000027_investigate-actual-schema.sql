-- Investigate the actual database schema
-- Find out what's really in the user_level_stats table

-- 1. Show ALL columns in user_level_stats table
SELECT '=== ACTUAL COLUMNS IN user_level_stats ===' as investigation;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_level_stats'
ORDER BY ordinal_position;

-- 2. Show the actual table structure
SELECT '=== TABLE STRUCTURE ===' as investigation;
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'user_level_stats';

-- 3. Get a sample row to see what columns actually exist
SELECT '=== SAMPLE ROW DATA ===' as investigation;
SELECT *
FROM public.user_level_stats 
WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'
LIMIT 1;

-- 4. Try to describe the table structure
SELECT '=== DESCRIBE TABLE ===' as investigation;
\d public.user_level_stats;

-- 5. Check if there are any views or aliases
SELECT '=== CHECK FOR VIEWS ===' as investigation;
SELECT 
  table_name,
  table_type,
  is_updatable
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%user_level%'
ORDER BY table_name;

-- 6. Try a simple UPDATE to see which column is missing
SELECT '=== TEST SIMPLE UPDATE ===' as investigation;
DO $$
BEGIN
  -- Try updating each column individually to find the problem
  BEGIN
    UPDATE public.user_level_stats 
    SET lifetime_xp = lifetime_xp + 1 
    WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f';
    RAISE NOTICE 'SUCCESS: lifetime_xp column exists and update worked';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'ERROR with lifetime_xp: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;
  
  BEGIN
    UPDATE public.user_level_stats 
    SET current_level_xp = current_level_xp + 1 
    WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f';
    RAISE NOTICE 'SUCCESS: current_level_xp column exists and update worked';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'ERROR with current_level_xp: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;
  
  BEGIN
    UPDATE public.user_level_stats 
    SET total_games = total_games + 1 
    WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f';
    RAISE NOTICE 'SUCCESS: total_games column exists and update worked';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'ERROR with total_games: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;
END;
$$;

-- 7. Show what we can actually SELECT from the table
SELECT '=== WHAT WE CAN SELECT ===' as investigation;
SELECT 
  user_id,
  current_level,
  -- Try each column individually
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'lifetime_xp') 
    THEN 'lifetime_xp column exists in schema'
    ELSE 'lifetime_xp column MISSING from schema'
  END as lifetime_xp_check
FROM public.user_level_stats 
WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'
LIMIT 1;