-- Remove redundant level and XP columns from profiles table
-- All level and XP tracking should be handled by user_level_stats table

-- Step 1: Migrate any existing data from profiles to user_level_stats (safety check)
INSERT INTO public.user_level_stats (
  user_id, 
  current_level, 
  lifetime_xp, 
  current_level_xp, 
  xp_to_next_level,
  total_xp
)
SELECT 
  p.id,
  COALESCE(p.level, p.current_level, 1),
  COALESCE(p.total_xp, p.lifetime_xp, p.xp, 0),
  COALESCE(p.current_xp, 0),
  COALESCE(p.xp_to_next_level, 100),
  COALESCE(p.total_xp, p.lifetime_xp, p.xp, 0)
FROM public.profiles p
WHERE p.id NOT IN (SELECT user_id FROM public.user_level_stats WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO UPDATE SET
  current_level = GREATEST(user_level_stats.current_level, EXCLUDED.current_level),
  lifetime_xp = GREATEST(user_level_stats.lifetime_xp, EXCLUDED.lifetime_xp),
  current_level_xp = GREATEST(user_level_stats.current_level_xp, EXCLUDED.current_level_xp);

-- Step 2: Remove redundant columns from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS level,
DROP COLUMN IF EXISTS xp,
DROP COLUMN IF EXISTS current_level,
DROP COLUMN IF EXISTS current_xp,
DROP COLUMN IF EXISTS xp_to_next_level,
DROP COLUMN IF EXISTS lifetime_xp,
DROP COLUMN IF EXISTS total_xp,
DROP COLUMN IF EXISTS border_tier;

-- Step 3: Update any views or functions that reference the old columns
-- (These will be handled in the frontend code updates)

-- Verify the migration
SELECT 
  'profiles_columns_removed' as status,
  COUNT(*) as profiles_count
FROM public.profiles;

SELECT 
  'user_level_stats_populated' as status,
  COUNT(*) as stats_count,
  AVG(current_level) as avg_level,
  AVG(lifetime_xp) as avg_lifetime_xp
FROM public.user_level_stats;