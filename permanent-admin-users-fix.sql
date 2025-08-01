-- PERMANENT FIX FOR ADMIN_USERS 406 ERRORS
-- Run this directly on your production database for immediate fix

-- 1. ENABLE RLS ON ALL CRITICAL TABLES
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_level_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_rewards ENABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING POLICIES (CLEAN SLATE)
DO $$
BEGIN
  RAISE NOTICE 'Dropping all existing policies...';
  
  -- Drop all admin_users policies
  DROP POLICY IF EXISTS "Users can view their own admin status" ON public.admin_users;
  DROP POLICY IF EXISTS "Admins can view all admin users" ON public.admin_users;
  DROP POLICY IF EXISTS "Service role can insert admin users" ON public.admin_users;
  DROP POLICY IF EXISTS "Service role can update admin users" ON public.admin_users;
  DROP POLICY IF EXISTS "Service role can select admin users" ON public.admin_users;
  DROP POLICY IF EXISTS "Authenticated users can view their own admin status" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_select_policy" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_insert_policy" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_update_policy" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_delete_policy" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_all_access" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_select_all" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_insert_all" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_update_all" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_delete_all" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_authenticated_select_own" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_service_role_select_all" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_service_role_insert" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_service_role_update" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_service_role_delete" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_authenticated_select_all" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_service_role_all" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_select_all_authenticated" ON public.admin_users;
  DROP POLICY IF EXISTS "admin_users_select_authenticated" ON public.admin_users;
  
  -- Drop all user_level_stats policies
  DROP POLICY IF EXISTS "Users can view their own user level stats" ON public.user_level_stats;
  DROP POLICY IF EXISTS "Users can update their own user level stats" ON public.user_level_stats;
  DROP POLICY IF EXISTS "Users can insert their own user level stats" ON public.user_level_stats;
  DROP POLICY IF EXISTS "Service role can insert user level stats" ON public.user_level_stats;
  DROP POLICY IF EXISTS "Service role can update user level stats" ON public.user_level_stats;
  DROP POLICY IF EXISTS "Service role can select user level stats" ON public.user_level_stats;
  DROP POLICY IF EXISTS "Authenticated users can view their own user level stats" ON public.user_level_stats;
  DROP POLICY IF EXISTS "user_level_stats_authenticated_select_own" ON public.user_level_stats;
  DROP POLICY IF EXISTS "user_level_stats_authenticated_update_own" ON public.user_level_stats;
  DROP POLICY IF EXISTS "user_level_stats_authenticated_insert_own" ON public.user_level_stats;
  DROP POLICY IF EXISTS "user_level_stats_service_role_select_all" ON public.user_level_stats;
  DROP POLICY IF EXISTS "user_level_stats_service_role_insert" ON public.user_level_stats;
  DROP POLICY IF EXISTS "user_level_stats_service_role_update" ON public.user_level_stats;
  DROP POLICY IF EXISTS "user_level_stats_service_role_delete" ON public.user_level_stats;
  DROP POLICY IF EXISTS "user_level_stats_authenticated_select_all" ON public.user_level_stats;
  DROP POLICY IF EXISTS "user_level_stats_service_role_all" ON public.user_level_stats;
  DROP POLICY IF EXISTS "user_level_stats_select_all_authenticated" ON public.user_level_stats;
  DROP POLICY IF EXISTS "user_level_stats_update_own" ON public.user_level_stats;
  DROP POLICY IF EXISTS "user_level_stats_insert_own" ON public.user_level_stats;
  DROP POLICY IF EXISTS "user_level_stats_select_authenticated" ON public.user_level_stats;
  
  -- Drop all profiles policies
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Service role can select profiles" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_service_role_select" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_service_role_insert" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_service_role_update" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_authenticated_select_all" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_authenticated_update_own" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_authenticated_insert_own" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_service_role_all" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
  
  RAISE NOTICE 'All existing policies dropped successfully';
END $$;

-- 3. CREATE PERMANENT, COMPREHENSIVE POLICIES

-- ADMIN_USERS POLICIES
-- Allow ALL authenticated users to SELECT from admin_users (for admin status checks)
CREATE POLICY "admin_users_select_authenticated" 
ON public.admin_users 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow service role full access to admin_users
CREATE POLICY "admin_users_service_role_all" 
ON public.admin_users 
FOR ALL 
USING (auth.role() = 'service_role');

-- USER_LEVEL_STATS POLICIES
-- Allow ALL authenticated users to SELECT from user_level_stats (for profile viewing)
CREATE POLICY "user_level_stats_select_authenticated" 
ON public.user_level_stats 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow users to update their own stats
CREATE POLICY "user_level_stats_update_own" 
ON public.user_level_stats 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
);

-- Allow users to insert their own stats
CREATE POLICY "user_level_stats_insert_own" 
ON public.user_level_stats 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
);

-- Allow service role full access to user_level_stats
CREATE POLICY "user_level_stats_service_role_all" 
ON public.user_level_stats 
FOR ALL 
USING (auth.role() = 'service_role');

-- PROFILES POLICIES
-- Allow ALL authenticated users to SELECT from profiles (for user profile viewing)
CREATE POLICY "profiles_select_authenticated" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = id 
  AND auth.role() = 'authenticated'
);

-- Allow users to insert their own profile
CREATE POLICY "profiles_insert_own" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = id 
  AND auth.role() = 'authenticated'
);

-- Allow service role full access to profiles
CREATE POLICY "profiles_service_role_all" 
ON public.profiles 
FOR ALL 
USING (auth.role() = 'service_role');

-- NOTIFICATIONS POLICIES
-- Allow users to view their own notifications
CREATE POLICY "notifications_select_own" 
ON public.notifications 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
);

-- Allow service role full access to notifications
CREATE POLICY "notifications_service_role_all" 
ON public.notifications 
FOR ALL 
USING (auth.role() = 'service_role');

-- CASE_REWARDS POLICIES
-- Allow users to view their own case rewards
CREATE POLICY "case_rewards_select_own" 
ON public.case_rewards 
FOR SELECT 
USING (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
);

-- Allow service role full access to case_rewards
CREATE POLICY "case_rewards_service_role_all" 
ON public.case_rewards 
FOR ALL 
USING (auth.role() = 'service_role');

-- 4. TEST THE PERMANENT FIX
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE '=== TESTING PERMANENT FIX ===';
  
  -- Test 1: Can query admin_users
  BEGIN
    PERFORM 1 FROM public.admin_users LIMIT 1;
    RAISE NOTICE '✅ Test 1 PASSED: Can query admin_users';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Test 1 FAILED: Cannot query admin_users - %', SQLERRM;
  END;
  
  -- Test 2: Can query user_level_stats
  BEGIN
    PERFORM 1 FROM public.user_level_stats LIMIT 1;
    RAISE NOTICE '✅ Test 2 PASSED: Can query user_level_stats';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Test 2 FAILED: Cannot query user_level_stats - %', SQLERRM;
  END;
  
  -- Test 3: Can query profiles
  BEGIN
    PERFORM 1 FROM public.profiles LIMIT 1;
    RAISE NOTICE '✅ Test 3 PASSED: Can query profiles';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Test 3 FAILED: Cannot query profiles - %', SQLERRM;
  END;
  
  -- Test 4: Can query admin_users with specific user_id (like the hook does)
  BEGIN
    PERFORM 1 FROM public.admin_users WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Test 4 PASSED: Can query admin_users with user_id filter';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Test 4 FAILED: Cannot query admin_users with user_id filter - %', SQLERRM;
  END;
  
  -- Test 5: Can query user_level_stats with specific user_id
  BEGIN
    PERFORM 1 FROM public.user_level_stats WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Test 5 PASSED: Can query user_level_stats with user_id filter';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Test 5 FAILED: Cannot query user_level_stats with user_id filter - %', SQLERRM;
  END;
  
  -- Test 6: Can query profiles with specific id
  BEGIN
    PERFORM 1 FROM public.profiles WHERE id = test_user_id;
    RAISE NOTICE '✅ Test 6 PASSED: Can query profiles with id filter';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Test 6 FAILED: Cannot query profiles with id filter - %', SQLERRM;
  END;
  
  RAISE NOTICE '=== ALL TESTS COMPLETED ===';
END $$;

-- 5. SHOW FINAL POLICY STATUS
DO $$
DECLARE
  policy_rec RECORD;
BEGIN
  RAISE NOTICE '=== FINAL POLICY STATUS ===';
  
  RAISE NOTICE 'Admin_users policies:';
  FOR policy_rec IN 
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'admin_users' AND schemaname = 'public'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  Policy: %, Cmd: %, Roles: %', 
      policy_rec.policyname, policy_rec.cmd, policy_rec.roles;
  END LOOP;
  
  RAISE NOTICE 'User_level_stats policies:';
  FOR policy_rec IN 
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'user_level_stats' AND schemaname = 'public'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  Policy: %, Cmd: %, Roles: %', 
      policy_rec.policyname, policy_rec.cmd, policy_rec.roles;
  END LOOP;
  
  RAISE NOTICE 'Profiles policies:';
  FOR policy_rec IN 
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  Policy: %, Cmd: %, Roles: %', 
      policy_rec.policyname, policy_rec.cmd, policy_rec.roles;
  END LOOP;
  
  RAISE NOTICE '=== PERMANENT FIX COMPLETED ===';
END $$;