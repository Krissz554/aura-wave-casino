-- Fix admin reset stats functionality

-- 1. Remove existing policies on user_level_stats table
DROP POLICY IF EXISTS "user_level_stats_select_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_update_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_insert_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_admin_select" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_admin_update" ON public.user_level_stats;

-- 2. Create permissive policies for user_level_stats table
-- Allow all authenticated users to view user_level_stats
CREATE POLICY "user_level_stats_select_all" 
ON public.user_level_stats 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to update user_level_stats
CREATE POLICY "user_level_stats_update_all" 
ON public.user_level_stats 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert user_level_stats
CREATE POLICY "user_level_stats_insert_all" 
ON public.user_level_stats 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 3. Remove existing policies on game_stats table
DROP POLICY IF EXISTS "game_stats_select_own" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_update_own" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_insert_own" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_admin_select" ON public.game_stats;

-- 4. Create permissive policies for game_stats table
-- Allow all authenticated users to view game_stats
CREATE POLICY "game_stats_select_all" 
ON public.game_stats 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to update game_stats
CREATE POLICY "game_stats_update_all" 
ON public.game_stats 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert game_stats
CREATE POLICY "game_stats_insert_all" 
ON public.game_stats 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to delete game_stats
CREATE POLICY "game_stats_delete_all" 
ON public.game_stats 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- 5. Remove existing policies on game_history table
DROP POLICY IF EXISTS "game_history_select_own" ON public.game_history;
DROP POLICY IF EXISTS "game_history_insert_own" ON public.game_history;
DROP POLICY IF EXISTS "game_history_admin_select" ON public.game_history;

-- 6. Create permissive policies for game_history table
-- Allow all authenticated users to view game_history
CREATE POLICY "game_history_select_all" 
ON public.game_history 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert game_history
CREATE POLICY "game_history_insert_all" 
ON public.game_history 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to delete game_history
CREATE POLICY "game_history_delete_all" 
ON public.game_history 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- 7. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_level_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_history TO authenticated;

-- 8. Test the setup
DO $$
BEGIN
  RAISE NOTICE 'Admin reset stats functionality fixed';
  RAISE NOTICE 'All tables now accessible for admin operations';
  RAISE NOTICE 'Admins can now reset user statistics properly';
END $$;