-- XP Data Verification Script
-- Run this in Supabase Dashboard SQL Editor to check data consistency

-- Check if user_level_stats table has data
SELECT 
  'user_level_stats' as table_name,
  COUNT(*) as total_users,
  AVG(current_level_xp) as avg_current_xp,
  AVG(lifetime_xp) as avg_lifetime_xp,
  MIN(current_level_xp) as min_current_xp,
  MAX(current_level_xp) as max_current_xp
FROM public.user_level_stats;

-- Check if profiles table has data  
SELECT 
  'profiles' as table_name,
  COUNT(*) as total_users,
  AVG(current_xp) as avg_current_xp,
  AVG(lifetime_xp) as avg_lifetime_xp,
  MIN(current_xp) as min_current_xp,
  MAX(current_xp) as max_current_xp
FROM public.profiles;

-- Compare data between tables for any discrepancies
SELECT 
  p.id,
  p.username,
  p.current_xp as profiles_current_xp,
  uls.current_level_xp as user_level_stats_current_xp,
  p.lifetime_xp as profiles_lifetime_xp,
  uls.lifetime_xp as user_level_stats_lifetime_xp,
  p.current_level as profiles_level,
  uls.current_level as user_level_stats_level
FROM public.profiles p
LEFT JOIN public.user_level_stats uls ON p.id = uls.user_id
WHERE 
  p.current_xp != uls.current_level_xp 
  OR p.lifetime_xp != uls.lifetime_xp 
  OR p.current_level != uls.current_level
LIMIT 10;

-- Show sample data from user_level_stats
SELECT 
  user_id,
  current_level,
  current_level_xp,
  xp_to_next_level,
  lifetime_xp,
  border_tier
FROM public.user_level_stats 
ORDER BY lifetime_xp DESC 
LIMIT 5;