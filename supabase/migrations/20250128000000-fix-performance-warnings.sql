-- Fix Multiple Permissive Policies Performance Warnings
-- This migration consolidates duplicate RLS policies for better performance

-- Start transaction
BEGIN;

-- ===============================================
-- 1. ADMIN_USERS TABLE OPTIMIZATION
-- ===============================================

-- Drop existing duplicate policies for admin_users
DROP POLICY IF EXISTS "admin_users_authenticated_view" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_service_role_access" ON public.admin_users;

-- Create single consolidated policy for admin_users SELECT
CREATE POLICY "admin_users_unified_select" ON public.admin_users
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Allow service role (auth.role() = 'service_role') or
  -- Allow authenticated users to view admin_users
  auth.role() = 'service_role' OR
  auth.uid() IS NOT NULL
);

-- ===============================================
-- 2. AUDIT_LOGS TABLE OPTIMIZATION
-- ===============================================

-- Drop existing duplicate policies for audit_logs
DROP POLICY IF EXISTS "audit_logs_optimized" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_optimized_access" ON public.audit_logs;

-- Create consolidated policies for audit_logs
CREATE POLICY "audit_logs_unified_select" ON public.audit_logs
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Allow service role or authenticated users
  auth.role() = 'service_role' OR
  auth.uid() IS NOT NULL
);

CREATE POLICY "audit_logs_unified_insert" ON public.audit_logs
FOR INSERT
TO anon, authenticated, authenticator, dashboard_user
WITH CHECK (
  -- Allow service role or authenticated users
  auth.role() = 'service_role' OR
  auth.uid() IS NOT NULL
);

CREATE POLICY "audit_logs_unified_update" ON public.audit_logs
FOR UPDATE
TO anon, authenticated, authenticator, dashboard_user
USING (
  auth.role() = 'service_role' OR
  auth.uid() IS NOT NULL
)
WITH CHECK (
  auth.role() = 'service_role' OR
  auth.uid() IS NOT NULL
);

CREATE POLICY "audit_logs_unified_delete" ON public.audit_logs
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Only service role can delete
  auth.role() = 'service_role'
);

-- ===============================================
-- 3. CASE_REWARDS TABLE OPTIMIZATION
-- ===============================================

-- Drop existing duplicate policies for case_rewards
DROP POLICY IF EXISTS "Users can view their own case rewards" ON public.case_rewards;
DROP POLICY IF EXISTS "Users can update their own case rewards" ON public.case_rewards;
DROP POLICY IF EXISTS "consolidated_ALL_policy" ON public.case_rewards;

-- Create consolidated policies for case_rewards
CREATE POLICY "case_rewards_unified_select" ON public.case_rewards
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Allow service role, or users can view their own case rewards
  auth.role() = 'service_role' OR
  user_id = auth.uid()
);

CREATE POLICY "case_rewards_unified_update" ON public.case_rewards
FOR UPDATE
TO anon, authenticated, authenticator, dashboard_user
USING (
  auth.role() = 'service_role' OR
  user_id = auth.uid()
)
WITH CHECK (
  auth.role() = 'service_role' OR
  user_id = auth.uid()
);

-- ===============================================
-- 4. LIVE_BET_FEED TABLE OPTIMIZATION
-- ===============================================

-- Drop existing duplicate policies for live_bet_feed
DROP POLICY IF EXISTS "Allow all to read live_bet_feed" ON public.live_bet_feed;
DROP POLICY IF EXISTS "Allow service role and authenticated to insert live_bet_feed" ON public.live_bet_feed;
DROP POLICY IF EXISTS "Allow service role to update live_bet_feed" ON public.live_bet_feed;
DROP POLICY IF EXISTS "Allow service role to delete live_bet_feed" ON public.live_bet_feed;
DROP POLICY IF EXISTS "consolidated_permissive_policy" ON public.live_bet_feed;

-- Create consolidated policies for live_bet_feed
CREATE POLICY "live_bet_feed_unified_select" ON public.live_bet_feed
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING (true); -- Allow all to read

CREATE POLICY "live_bet_feed_unified_insert" ON public.live_bet_feed
FOR INSERT
TO anon, authenticated, authenticator, dashboard_user
WITH CHECK (
  -- Allow service role and authenticated users
  auth.role() = 'service_role' OR
  auth.uid() IS NOT NULL
);

CREATE POLICY "live_bet_feed_unified_update" ON public.live_bet_feed
FOR UPDATE
TO anon, authenticated, authenticator, dashboard_user
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "live_bet_feed_unified_delete" ON public.live_bet_feed
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING (auth.role() = 'service_role');

-- ===============================================
-- 5. MAINTENANCE_SETTINGS TABLE OPTIMIZATION
-- ===============================================

-- Drop existing duplicate policies for maintenance_settings
DROP POLICY IF EXISTS "Anyone can view maintenance settings" ON public.maintenance_settings;
DROP POLICY IF EXISTS "consolidated_ALL_policy" ON public.maintenance_settings;
DROP POLICY IF EXISTS "maintenance_settings_optimized" ON public.maintenance_settings;

-- Create consolidated policies for maintenance_settings
CREATE POLICY "maintenance_settings_unified_select" ON public.maintenance_settings
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING (true); -- Anyone can view maintenance settings

CREATE POLICY "maintenance_settings_unified_insert" ON public.maintenance_settings
FOR INSERT
TO anon, authenticated, authenticator, dashboard_user
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "maintenance_settings_unified_update" ON public.maintenance_settings
FOR UPDATE
TO anon, authenticated, authenticator, dashboard_user
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "maintenance_settings_unified_delete" ON public.maintenance_settings
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING (auth.role() = 'service_role');

-- ===============================================
-- 6. NOTIFICATIONS TABLE OPTIMIZATION
-- ===============================================

-- Drop existing duplicate policies for notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_admin_access" ON public.notifications;
DROP POLICY IF EXISTS "notifications_service_role_access" ON public.notifications;
DROP POLICY IF EXISTS "consolidated_SELECT_policy" ON public.notifications;

-- Create consolidated policies for notifications
CREATE POLICY "notifications_unified_select" ON public.notifications
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Users can view their own notifications, service role can view all
  auth.role() = 'service_role' OR
  user_id = auth.uid()
);

CREATE POLICY "notifications_unified_insert" ON public.notifications
FOR INSERT
TO anon, authenticated, authenticator, dashboard_user
WITH CHECK (
  -- Service role and authenticated users can insert
  auth.role() = 'service_role' OR
  auth.uid() IS NOT NULL
);

CREATE POLICY "notifications_unified_update" ON public.notifications
FOR UPDATE
TO anon, authenticated, authenticator, dashboard_user
USING (
  auth.role() = 'service_role' OR
  user_id = auth.uid()
)
WITH CHECK (
  auth.role() = 'service_role' OR
  user_id = auth.uid()
);

CREATE POLICY "notifications_unified_delete" ON public.notifications
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING (
  auth.role() = 'service_role' OR
  user_id = auth.uid()
);

-- ===============================================
-- 7. PROFILES TABLE OPTIMIZATION
-- ===============================================

-- Drop existing duplicate policies for profiles
DROP POLICY IF EXISTS "consolidated_ALL_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

-- Create consolidated policies for profiles
CREATE POLICY "profiles_unified_select" ON public.profiles
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Service role can view all, users can view all profiles (public info)
  auth.role() = 'service_role' OR
  true
);

CREATE POLICY "profiles_unified_delete" ON public.profiles
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Service role can delete any, users can delete their own
  auth.role() = 'service_role' OR
  id = auth.uid()
);

-- ===============================================
-- 8. USER_LEVEL_STATS TABLE OPTIMIZATION
-- ===============================================

-- Drop existing duplicate policies for user_level_stats
DROP POLICY IF EXISTS "consolidated_ALL_policy" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_delete_all" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_select_all" ON public.user_level_stats;

-- Create consolidated policies for user_level_stats
CREATE POLICY "user_level_stats_unified_select" ON public.user_level_stats
FOR SELECT
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Service role can view all, users can view all level stats (public info)
  auth.role() = 'service_role' OR
  true
);

CREATE POLICY "user_level_stats_unified_delete" ON public.user_level_stats
FOR DELETE
TO anon, authenticated, authenticator, dashboard_user
USING (
  -- Service role can delete any, users can delete their own
  auth.role() = 'service_role' OR
  user_id = auth.uid()
);

-- Commit transaction
COMMIT;