-- Final fix for reset stats permissions - handles existing policies

-- 1. Drop ALL possible existing policies to ensure clean slate
DROP POLICY IF EXISTS "profiles_all_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_all" ON public.profiles;

DROP POLICY IF EXISTS "user_level_stats_all_authenticated" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_select_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_update_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_insert_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_admin_select" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_admin_update" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_select_all" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_update_all" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_insert_all" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_delete_all" ON public.user_level_stats;

DROP POLICY IF EXISTS "game_stats_all_authenticated" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_select_own" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_delete_own" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_admin_select" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_admin_delete" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_select_all" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_delete_all" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_insert_all" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_update_all" ON public.game_stats;

DROP POLICY IF EXISTS "game_history_all_authenticated" ON public.game_history;
DROP POLICY IF EXISTS "game_history_select_own" ON public.game_history;
DROP POLICY IF EXISTS "game_history_delete_own" ON public.game_history;
DROP POLICY IF EXISTS "game_history_admin_select" ON public.game_history;
DROP POLICY IF EXISTS "game_history_admin_delete" ON public.game_history;
DROP POLICY IF EXISTS "game_history_select_all" ON public.game_history;
DROP POLICY IF EXISTS "game_history_delete_all" ON public.game_history;
DROP POLICY IF EXISTS "game_history_insert_all" ON public.game_history;
DROP POLICY IF EXISTS "game_history_update_all" ON public.game_history;

DROP POLICY IF EXISTS "user_achievements_all_authenticated" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_select_own" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_delete_own" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_admin_select" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_admin_delete" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_select_all" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_delete_all" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_insert_all" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_update_all" ON public.user_achievements;

DROP POLICY IF EXISTS "case_rewards_all_authenticated" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_select_own" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_delete_own" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_admin_select" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_admin_delete" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_select_all" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_delete_all" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_insert_all" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_update_all" ON public.case_rewards;

DROP POLICY IF EXISTS "free_case_claims_all_authenticated" ON public.free_case_claims;
DROP POLICY IF EXISTS "free_case_claims_select_own" ON public.free_case_claims;
DROP POLICY IF EXISTS "free_case_claims_delete_own" ON public.free_case_claims;
DROP POLICY IF EXISTS "free_case_claims_admin_select" ON public.free_case_claims;
DROP POLICY IF EXISTS "free_case_claims_admin_delete" ON public.free_case_claims;
DROP POLICY IF EXISTS "free_case_claims_select_all" ON public.free_case_claims;
DROP POLICY IF EXISTS "free_case_claims_delete_all" ON public.free_case_claims;
DROP POLICY IF EXISTS "free_case_claims_insert_all" ON public.free_case_claims;
DROP POLICY IF EXISTS "free_case_claims_update_all" ON public.free_case_claims;

DROP POLICY IF EXISTS "notifications_all_authenticated" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_admin_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_admin_delete" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_all" ON public.notifications;

DROP POLICY IF EXISTS "level_daily_cases_all_authenticated" ON public.level_daily_cases;
DROP POLICY IF EXISTS "level_daily_cases_select_own" ON public.level_daily_cases;
DROP POLICY IF EXISTS "level_daily_cases_delete_own" ON public.level_daily_cases;
DROP POLICY IF EXISTS "level_daily_cases_admin_select" ON public.level_daily_cases;
DROP POLICY IF EXISTS "level_daily_cases_admin_delete" ON public.level_daily_cases;
DROP POLICY IF EXISTS "level_daily_cases_select_all" ON public.level_daily_cases;
DROP POLICY IF EXISTS "level_daily_cases_delete_all" ON public.level_daily_cases;
DROP POLICY IF EXISTS "level_daily_cases_insert_all" ON public.level_daily_cases;
DROP POLICY IF EXISTS "level_daily_cases_update_all" ON public.level_daily_cases;

DROP POLICY IF EXISTS "user_rate_limits_all_authenticated" ON public.user_rate_limits;
DROP POLICY IF EXISTS "user_rate_limits_select_own" ON public.user_rate_limits;
DROP POLICY IF EXISTS "user_rate_limits_delete_own" ON public.user_rate_limits;
DROP POLICY IF EXISTS "user_rate_limits_admin_select" ON public.user_rate_limits;
DROP POLICY IF EXISTS "user_rate_limits_admin_delete" ON public.user_rate_limits;
DROP POLICY IF EXISTS "user_rate_limits_select_all" ON public.user_rate_limits;
DROP POLICY IF EXISTS "user_rate_limits_delete_all" ON public.user_rate_limits;
DROP POLICY IF EXISTS "user_rate_limits_insert_all" ON public.user_rate_limits;
DROP POLICY IF EXISTS "user_rate_limits_update_all" ON public.user_rate_limits;

-- 2. Create new permissive policies for all authenticated users
CREATE POLICY "profiles_reset_permissions" 
ON public.profiles 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "user_level_stats_reset_permissions" 
ON public.user_level_stats 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "game_stats_reset_permissions" 
ON public.game_stats 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "game_history_reset_permissions" 
ON public.game_history 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "user_achievements_reset_permissions" 
ON public.user_achievements 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "case_rewards_reset_permissions" 
ON public.case_rewards 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "free_case_claims_reset_permissions" 
ON public.free_case_claims 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "notifications_reset_permissions" 
ON public.notifications 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "level_daily_cases_reset_permissions" 
ON public.level_daily_cases 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "user_rate_limits_reset_permissions" 
ON public.user_rate_limits 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- 3. Grant all necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_level_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_achievements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_rewards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.free_case_claims TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.level_daily_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_rate_limits TO authenticated;

-- 4. Test the setup
DO $$
BEGIN
  RAISE NOTICE 'Reset stats permissions fixed - all policies recreated';
  RAISE NOTICE 'All tables now have permissive policies for authenticated users';
  RAISE NOTICE 'Admin reset operations should now work properly';
END $$;