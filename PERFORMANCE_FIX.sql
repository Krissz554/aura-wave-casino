-- =====================================================
-- RLS PERFORMANCE OPTIMIZATION SCRIPT
-- Fix all "auth_rls_initplan" warnings
-- 
-- Instructions: 
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run this script
-- 4. All performance warnings will be resolved!
-- =====================================================

-- Start transaction for safety
BEGIN;

-- 1. ADMIN_USERS - Fix performance warning
DROP POLICY IF EXISTS "admin_users_unified_select" ON public.admin_users;
CREATE POLICY "admin_users_unified_select" ON public.admin_users
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role' OR (select auth.uid()) IS NOT NULL);

-- 2. AUDIT_LOGS - Fix all 4 performance warnings
DROP POLICY IF EXISTS "audit_logs_unified_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_unified_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_unified_update" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_unified_delete" ON public.audit_logs;

CREATE POLICY "audit_logs_unified_select" ON public.audit_logs
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role' OR (select auth.uid()) IS NOT NULL);

CREATE POLICY "audit_logs_unified_insert" ON public.audit_logs
FOR INSERT
TO anon, authenticated, authenticator, dashboard_user
WITH CHECK ((select auth.role()) = 'service_role' OR (select auth.uid()) IS NOT NULL);

CREATE POLICY "audit_logs_unified_update" ON public.audit_logs
FOR UPDATE
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role' OR (select auth.uid()) IS NOT NULL)
WITH CHECK ((select auth.role()) = 'service_role' OR (select auth.uid()) IS NOT NULL);

CREATE POLICY "audit_logs_unified_delete" ON public.audit_logs
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role' OR (select auth.uid()) IS NOT NULL);

-- 3. CASE_REWARDS - Fix 2 performance warnings
DROP POLICY IF EXISTS "case_rewards_unified_select" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_unified_update" ON public.case_rewards;

CREATE POLICY "case_rewards_unified_select" ON public.case_rewards
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role' OR user_id = (select auth.uid()));

CREATE POLICY "case_rewards_unified_update" ON public.case_rewards
FOR UPDATE
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role' OR user_id = (select auth.uid()))
WITH CHECK ((select auth.role()) = 'service_role' OR user_id = (select auth.uid()));

-- 4. LIVE_BET_FEED - Fix 3 performance warnings
DROP POLICY IF EXISTS "live_bet_feed_unified_insert" ON public.live_bet_feed;
DROP POLICY IF EXISTS "live_bet_feed_unified_update" ON public.live_bet_feed;
DROP POLICY IF EXISTS "live_bet_feed_unified_delete" ON public.live_bet_feed;

CREATE POLICY "live_bet_feed_unified_insert" ON public.live_bet_feed
FOR INSERT
TO anon, authenticated, authenticator, dashboard_user
WITH CHECK ((select auth.role()) = 'service_role' OR (select auth.uid()) IS NOT NULL);

CREATE POLICY "live_bet_feed_unified_update" ON public.live_bet_feed
FOR UPDATE
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role' OR (select auth.uid()) IS NOT NULL)
WITH CHECK ((select auth.role()) = 'service_role' OR (select auth.uid()) IS NOT NULL);

CREATE POLICY "live_bet_feed_unified_delete" ON public.live_bet_feed
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role' OR (select auth.uid()) IS NOT NULL);

-- 5. MAINTENANCE_SETTINGS - Fix 3 performance warnings
DROP POLICY IF EXISTS "maintenance_settings_unified_insert" ON public.maintenance_settings;
DROP POLICY IF EXISTS "maintenance_settings_unified_update" ON public.maintenance_settings;
DROP POLICY IF EXISTS "maintenance_settings_unified_delete" ON public.maintenance_settings;

CREATE POLICY "maintenance_settings_unified_insert" ON public.maintenance_settings
FOR INSERT
TO anon, authenticated, authenticator, dashboard_user
WITH CHECK ((select auth.role()) = 'service_role');

CREATE POLICY "maintenance_settings_unified_update" ON public.maintenance_settings
FOR UPDATE
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role')
WITH CHECK ((select auth.role()) = 'service_role');

CREATE POLICY "maintenance_settings_unified_delete" ON public.maintenance_settings
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role');

-- 6. NOTIFICATIONS - Fix 4 performance warnings
DROP POLICY IF EXISTS "notifications_unified_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_unified_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_unified_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_unified_delete" ON public.notifications;

CREATE POLICY "notifications_unified_select" ON public.notifications
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role' OR user_id = (select auth.uid()));

CREATE POLICY "notifications_unified_insert" ON public.notifications
FOR INSERT
TO anon, authenticated, authenticator, dashboard_user
WITH CHECK ((select auth.role()) = 'service_role' OR user_id = (select auth.uid()));

CREATE POLICY "notifications_unified_update" ON public.notifications
FOR UPDATE
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role' OR user_id = (select auth.uid()))
WITH CHECK ((select auth.role()) = 'service_role' OR user_id = (select auth.uid()));

CREATE POLICY "notifications_unified_delete" ON public.notifications
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role' OR user_id = (select auth.uid()));

-- 7. PROFILES - Fix 2 performance warnings
DROP POLICY IF EXISTS "profiles_unified_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_unified_delete" ON public.profiles;

CREATE POLICY "profiles_unified_select" ON public.profiles
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role' OR id = (select auth.uid()) OR true);

CREATE POLICY "profiles_unified_delete" ON public.profiles
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role' OR id = (select auth.uid()));

-- 8. USER_LEVEL_STATS - Fix 2 performance warnings
DROP POLICY IF EXISTS "user_level_stats_unified_select" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_unified_delete" ON public.user_level_stats;

CREATE POLICY "user_level_stats_unified_select" ON public.user_level_stats
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role' OR user_id = (select auth.uid()) OR true);

CREATE POLICY "user_level_stats_unified_delete" ON public.user_level_stats
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING ((select auth.role()) = 'service_role' OR user_id = (select auth.uid()));

-- Commit all changes
COMMIT;

-- =====================================================
-- PERFORMANCE OPTIMIZATION COMPLETE! ✅
-- 
-- Summary of fixes applied:
-- • admin_users: 1 policy optimized
-- • audit_logs: 4 policies optimized  
-- • case_rewards: 2 policies optimized
-- • live_bet_feed: 3 policies optimized
-- • maintenance_settings: 3 policies optimized
-- • notifications: 4 policies optimized
-- • profiles: 2 policies optimized
-- • user_level_stats: 2 policies optimized
-- 
-- Total: 21 RLS performance warnings resolved!
-- All auth.* functions now use (select auth.*()) for optimal performance
-- =====================================================