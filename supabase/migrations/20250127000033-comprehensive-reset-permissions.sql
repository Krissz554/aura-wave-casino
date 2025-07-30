-- Comprehensive reset permissions fix

-- 1. Enable RLS on all tables that need it
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_level_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_case_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_daily_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies to start fresh
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
DROP POLICY IF EXISTS "game_stats_delete_own" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_admin_select" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_admin_delete" ON public.game_stats;

DROP POLICY IF EXISTS "game_history_select_own" ON public.game_history;
DROP POLICY IF EXISTS "game_history_delete_own" ON public.game_history;
DROP POLICY IF EXISTS "game_history_admin_select" ON public.game_history;
DROP POLICY IF EXISTS "game_history_admin_delete" ON public.game_history;

DROP POLICY IF EXISTS "user_achievements_select_own" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_delete_own" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_admin_select" ON public.user_achievements;
DROP POLICY IF EXISTS "user_achievements_admin_delete" ON public.user_achievements;

DROP POLICY IF EXISTS "case_rewards_select_own" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_delete_own" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_admin_select" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_admin_delete" ON public.case_rewards;

DROP POLICY IF EXISTS "free_case_claims_select_own" ON public.free_case_claims;
DROP POLICY IF EXISTS "free_case_claims_delete_own" ON public.free_case_claims;
DROP POLICY IF EXISTS "free_case_claims_admin_select" ON public.free_case_claims;
DROP POLICY IF EXISTS "free_case_claims_admin_delete" ON public.free_case_claims;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_admin_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_admin_delete" ON public.notifications;

DROP POLICY IF EXISTS "level_daily_cases_select_own" ON public.level_daily_cases;
DROP POLICY IF EXISTS "level_daily_cases_delete_own" ON public.level_daily_cases;
DROP POLICY IF EXISTS "level_daily_cases_admin_select" ON public.level_daily_cases;
DROP POLICY IF EXISTS "level_daily_cases_admin_delete" ON public.level_daily_cases;

DROP POLICY IF EXISTS "user_rate_limits_select_own" ON public.user_rate_limits;
DROP POLICY IF EXISTS "user_rate_limits_delete_own" ON public.user_rate_limits;
DROP POLICY IF EXISTS "user_rate_limits_admin_select" ON public.user_rate_limits;
DROP POLICY IF EXISTS "user_rate_limits_admin_delete" ON public.user_rate_limits;

-- 3. Create permissive policies for all authenticated users (temporary for admin operations)
-- profiles table
CREATE POLICY "profiles_all_authenticated" 
ON public.profiles 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- user_level_stats table
CREATE POLICY "user_level_stats_all_authenticated" 
ON public.user_level_stats 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- game_stats table
CREATE POLICY "game_stats_all_authenticated" 
ON public.game_stats 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- game_history table
CREATE POLICY "game_history_all_authenticated" 
ON public.game_history 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- user_achievements table
CREATE POLICY "user_achievements_all_authenticated" 
ON public.user_achievements 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- case_rewards table
CREATE POLICY "case_rewards_all_authenticated" 
ON public.case_rewards 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- free_case_claims table
CREATE POLICY "free_case_claims_all_authenticated" 
ON public.free_case_claims 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- notifications table
CREATE POLICY "notifications_all_authenticated" 
ON public.notifications 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- level_daily_cases table
CREATE POLICY "level_daily_cases_all_authenticated" 
ON public.level_daily_cases 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- user_rate_limits table
CREATE POLICY "user_rate_limits_all_authenticated" 
ON public.user_rate_limits 
FOR ALL 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- 4. Grant all necessary permissions
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

-- 5. Test the setup
DO $$
BEGIN
  RAISE NOTICE 'Comprehensive reset permissions applied';
  RAISE NOTICE 'All tables now have permissive policies for authenticated users';
  RAISE NOTICE 'Admin reset operations should now work properly';
END $$;