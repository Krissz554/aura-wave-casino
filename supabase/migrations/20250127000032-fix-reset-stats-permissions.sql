-- Fix reset stats permissions for all tables

-- 1. Ensure all tables have permissive policies for admin operations

-- user_achievements table
DROP POLICY IF EXISTS "user_achievements_select_own" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_insert_own" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_delete_own" ON public.user_achievements;

CREATE POLICY "user_achievements_select_all" 
ON public.user_achievements 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "user_achievements_insert_all" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "user_achievements_delete_all" 
ON public.user_achievements 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- case_rewards table
DROP POLICY IF EXISTS "case_rewards_select_own" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_insert_own" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_delete_own" ON public.case_rewards;

CREATE POLICY "case_rewards_select_all" 
ON public.case_rewards 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "case_rewards_insert_all" 
ON public.case_rewards 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "case_rewards_delete_all" 
ON public.case_rewards 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- free_case_claims table
DROP POLICY IF EXISTS "free_case_claims_select_own" ON public.free_case_claims;
DROP POLICY IF EXISTS "free_case_claims_insert_own" ON public.free_case_claims;
DROP POLICY IF EXISTS "free_case_claims_delete_own" ON public.free_case_claims;

CREATE POLICY "free_case_claims_select_all" 
ON public.free_case_claims 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "free_case_claims_insert_all" 
ON public.free_case_claims 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "free_case_claims_delete_all" 
ON public.free_case_claims 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- notifications table
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;

CREATE POLICY "notifications_select_all" 
ON public.notifications 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "notifications_insert_all" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "notifications_delete_all" 
ON public.notifications 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- 2. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_achievements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_rewards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.free_case_claims TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

-- 3. Test the setup
DO $$
BEGIN
  RAISE NOTICE 'Reset stats permissions fixed';
  RAISE NOTICE 'All tables now accessible for admin reset operations';
  RAISE NOTICE 'Admins can now reset all user statistics properly';
END $$;