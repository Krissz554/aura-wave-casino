-- Temporary permissive RLS policies for testing

-- 1. Remove all existing policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;

DROP POLICY IF EXISTS "user_level_stats_select_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_update_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_insert_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_admin_select" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_admin_update" ON public.user_level_stats;

DROP POLICY IF EXISTS "game_stats_select_own" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_update_own" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_insert_own" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_admin_select" ON public.game_stats;

DROP POLICY IF EXISTS "game_history_select_own" ON public.game_history;
DROP POLICY IF EXISTS "game_history_insert_own" ON public.game_history;
DROP POLICY IF EXISTS "game_history_admin_select" ON public.game_history;

-- 2. Create very permissive policies for testing
-- Allow all authenticated users to access profiles
CREATE POLICY "profiles_all_authenticated" 
ON public.profiles 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to access user_level_stats
CREATE POLICY "user_level_stats_all_authenticated" 
ON public.user_level_stats 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to access game_stats
CREATE POLICY "game_stats_all_authenticated" 
ON public.game_stats 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to access game_history
CREATE POLICY "game_history_all_authenticated" 
ON public.game_history 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 3. Test the setup
DO $$
BEGIN
  RAISE NOTICE 'Temporary permissive policies created for testing';
  RAISE NOTICE 'All authenticated users can now access all data';
  RAISE NOTICE 'This is for testing only - will be replaced with proper policies';
END $$;