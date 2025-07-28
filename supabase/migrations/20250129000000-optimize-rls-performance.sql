-- Optimize RLS Performance Warnings
-- Fix auth.* function calls to use SELECT for better performance
-- Addresses all "auth_rls_initplan" warnings

BEGIN;

-- ===============================================
-- ADMIN_USERS TABLE OPTIMIZATION
-- ===============================================

DROP POLICY IF EXISTS "admin_users_unified_select" ON public.admin_users;

CREATE POLICY "admin_users_unified_select" ON public.admin_users
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized: Wrap auth functions in SELECT for better performance
  (select auth.role()) = 'service_role' OR
  (select auth.uid()) IS NOT NULL
);

-- ===============================================
-- AUDIT_LOGS TABLE OPTIMIZATION
-- ===============================================

DROP POLICY IF EXISTS "audit_logs_unified_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_unified_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_unified_update" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_unified_delete" ON public.audit_logs;

CREATE POLICY "audit_logs_unified_select" ON public.audit_logs
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized auth function calls
  (select auth.role()) = 'service_role' OR
  (select auth.uid()) IS NOT NULL
);

CREATE POLICY "audit_logs_unified_insert" ON public.audit_logs
FOR INSERT
TO anon, authenticated, authenticator, dashboard_user
WITH CHECK (
  -- Optimized auth function calls
  (select auth.role()) = 'service_role' OR
  (select auth.uid()) IS NOT NULL
);

CREATE POLICY "audit_logs_unified_update" ON public.audit_logs
FOR UPDATE
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized auth function calls
  (select auth.role()) = 'service_role' OR
  (select auth.uid()) IS NOT NULL
)
WITH CHECK (
  -- Optimized auth function calls
  (select auth.role()) = 'service_role' OR
  (select auth.uid()) IS NOT NULL
);

CREATE POLICY "audit_logs_unified_delete" ON public.audit_logs
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized auth function calls
  (select auth.role()) = 'service_role' OR
  (select auth.uid()) IS NOT NULL
);

-- ===============================================
-- CASE_REWARDS TABLE OPTIMIZATION
-- ===============================================

DROP POLICY IF EXISTS "case_rewards_unified_select" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_unified_update" ON public.case_rewards;

CREATE POLICY "case_rewards_unified_select" ON public.case_rewards
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized: Users can view their own case rewards or service role can view all
  (select auth.role()) = 'service_role' OR
  user_id = (select auth.uid())
);

CREATE POLICY "case_rewards_unified_update" ON public.case_rewards
FOR UPDATE
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized: Users can update their own case rewards or service role can update all
  (select auth.role()) = 'service_role' OR
  user_id = (select auth.uid())
)
WITH CHECK (
  -- Optimized: Users can update their own case rewards or service role can update all
  (select auth.role()) = 'service_role' OR
  user_id = (select auth.uid())
);

-- ===============================================
-- LIVE_BET_FEED TABLE OPTIMIZATION
-- ===============================================

DROP POLICY IF EXISTS "live_bet_feed_unified_insert" ON public.live_bet_feed;
DROP POLICY IF EXISTS "live_bet_feed_unified_update" ON public.live_bet_feed;
DROP POLICY IF EXISTS "live_bet_feed_unified_delete" ON public.live_bet_feed;

CREATE POLICY "live_bet_feed_unified_insert" ON public.live_bet_feed
FOR INSERT
TO anon, authenticated, authenticator, dashboard_user
WITH CHECK (
  -- Optimized: Service role or authenticated users can insert
  (select auth.role()) = 'service_role' OR
  (select auth.uid()) IS NOT NULL
);

CREATE POLICY "live_bet_feed_unified_update" ON public.live_bet_feed
FOR UPDATE
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized: Service role or authenticated users can update
  (select auth.role()) = 'service_role' OR
  (select auth.uid()) IS NOT NULL
)
WITH CHECK (
  -- Optimized: Service role or authenticated users can update
  (select auth.role()) = 'service_role' OR
  (select auth.uid()) IS NOT NULL
);

CREATE POLICY "live_bet_feed_unified_delete" ON public.live_bet_feed
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized: Service role or authenticated users can delete
  (select auth.role()) = 'service_role' OR
  (select auth.uid()) IS NOT NULL
);

-- ===============================================
-- MAINTENANCE_SETTINGS TABLE OPTIMIZATION
-- ===============================================

DROP POLICY IF EXISTS "maintenance_settings_unified_insert" ON public.maintenance_settings;
DROP POLICY IF EXISTS "maintenance_settings_unified_update" ON public.maintenance_settings;
DROP POLICY IF EXISTS "maintenance_settings_unified_delete" ON public.maintenance_settings;

CREATE POLICY "maintenance_settings_unified_insert" ON public.maintenance_settings
FOR INSERT
TO anon, authenticated, authenticator, dashboard_user
WITH CHECK (
  -- Optimized: Only service role can manage maintenance settings
  (select auth.role()) = 'service_role'
);

CREATE POLICY "maintenance_settings_unified_update" ON public.maintenance_settings
FOR UPDATE
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized: Only service role can manage maintenance settings
  (select auth.role()) = 'service_role'
)
WITH CHECK (
  -- Optimized: Only service role can manage maintenance settings
  (select auth.role()) = 'service_role'
);

CREATE POLICY "maintenance_settings_unified_delete" ON public.maintenance_settings
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized: Only service role can manage maintenance settings
  (select auth.role()) = 'service_role'
);

-- ===============================================
-- NOTIFICATIONS TABLE OPTIMIZATION
-- ===============================================

DROP POLICY IF EXISTS "notifications_unified_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_unified_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_unified_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_unified_delete" ON public.notifications;

CREATE POLICY "notifications_unified_select" ON public.notifications
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized: Users can view their own notifications or service role can view all
  (select auth.role()) = 'service_role' OR
  user_id = (select auth.uid())
);

CREATE POLICY "notifications_unified_insert" ON public.notifications
FOR INSERT
TO anon, authenticated, authenticator, dashboard_user
WITH CHECK (
  -- Optimized: Service role can insert any notification, users can insert for themselves
  (select auth.role()) = 'service_role' OR
  user_id = (select auth.uid())
);

CREATE POLICY "notifications_unified_update" ON public.notifications
FOR UPDATE
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized: Users can update their own notifications or service role can update all
  (select auth.role()) = 'service_role' OR
  user_id = (select auth.uid())
)
WITH CHECK (
  -- Optimized: Users can update their own notifications or service role can update all
  (select auth.role()) = 'service_role' OR
  user_id = (select auth.uid())
);

CREATE POLICY "notifications_unified_delete" ON public.notifications
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized: Users can delete their own notifications or service role can delete all
  (select auth.role()) = 'service_role' OR
  user_id = (select auth.uid())
);

-- ===============================================
-- PROFILES TABLE OPTIMIZATION
-- ===============================================

DROP POLICY IF EXISTS "profiles_unified_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_unified_delete" ON public.profiles;

CREATE POLICY "profiles_unified_select" ON public.profiles
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized: Users can view their own profile, service role can view all
  (select auth.role()) = 'service_role' OR
  id = (select auth.uid()) OR
  true -- Allow public viewing of profiles for leaderboards, etc.
);

CREATE POLICY "profiles_unified_delete" ON public.profiles
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized: Users can delete their own profile or service role can delete any
  (select auth.role()) = 'service_role' OR
  id = (select auth.uid())
);

-- ===============================================
-- USER_LEVEL_STATS TABLE OPTIMIZATION
-- ===============================================

DROP POLICY IF EXISTS "user_level_stats_unified_select" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_unified_delete" ON public.user_level_stats;

CREATE POLICY "user_level_stats_unified_select" ON public.user_level_stats
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized: Users can view their own stats, service role can view all, public can view for leaderboards
  (select auth.role()) = 'service_role' OR
  user_id = (select auth.uid()) OR
  true -- Allow public viewing for leaderboards
);

CREATE POLICY "user_level_stats_unified_delete" ON public.user_level_stats
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Optimized: Users can delete their own stats or service role can delete any
  (select auth.role()) = 'service_role' OR
  user_id = (select auth.uid())
);

-- Commit all changes
COMMIT;