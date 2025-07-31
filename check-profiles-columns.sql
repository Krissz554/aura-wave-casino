-- Diagnostic query to check current profiles table structure
-- Run this first to see what columns exist before running the migration

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check user_level_stats table structure
SELECT 
    'user_level_stats columns:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_level_stats' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check how many users have user_level_stats records
SELECT 
    COUNT(*) as profiles_count,
    (SELECT COUNT(*) FROM user_level_stats) as user_level_stats_count,
    COUNT(*) - (SELECT COUNT(*) FROM user_level_stats) as missing_user_level_stats
FROM profiles;