-- Simple schema investigation without \d command
-- Find out what columns actually exist in user_level_stats

-- Show ALL actual columns in the table
SELECT 
  'COLUMN_LIST' as info_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_level_stats'
ORDER BY ordinal_position;

-- Show a sample of actual data to see what columns exist
SELECT 
  'SAMPLE_DATA' as info_type,
  user_id,
  current_level,
  -- Let's try to select the columns we think should exist
  CASE 
    WHEN column_name = 'lifetime_xp' THEN 'HAS_lifetime_xp'
    WHEN column_name = 'current_level_xp' THEN 'HAS_current_level_xp' 
    WHEN column_name = 'total_games' THEN 'HAS_total_games'
    WHEN column_name = 'roulette_games' THEN 'HAS_roulette_games'
    ELSE column_name
  END as column_info
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_level_stats'
  AND column_name IN ('lifetime_xp', 'current_level_xp', 'total_games', 'roulette_games')
ORDER BY column_name;