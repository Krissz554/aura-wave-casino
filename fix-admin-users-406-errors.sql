-- COMPREHENSIVE FIX FOR ADMIN_USERS 406 ERRORS AND USER PROFILE VIEWING
-- This script fixes both admin_users queries and allows users to view other profiles

-- 1. FIRST, LET'S CHECK WHAT POLICIES EXIST
DO $$
DECLARE
  policy_rec RECORD;
BEGIN
  RAISE NOTICE 'Current admin_users policies:';
  FOR policy_rec IN 
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'admin_users' AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Policy: %, Permissive: %, Roles: %, Cmd: %, Qual: %, WithCheck: %', 
      policy_rec.policyname, policy_rec.permissive, policy_rec.roles, 
      policy_rec.cmd, policy_rec.qual, policy_rec.with_check;
  END LOOP;
END $$;

-- 2. DROP ALL EXISTING POLICIES FOR BOTH TABLES
-- Admin users policies
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

-- User level stats policies
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

-- Profiles policies (for viewing other users)
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

-- 3. CREATE COMPREHENSIVE POLICIES

-- ADMIN_USERS POLICIES - Allow all authenticated users to view admin status
CREATE POLICY "admin_users_authenticated_select_all" 
ON public.admin_users 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow service role full access
CREATE POLICY "admin_users_service_role_all" 
ON public.admin_users 
FOR ALL 
USING (auth.role() = 'service_role');

-- USER_LEVEL_STATS POLICIES - Allow all authenticated users to view stats
CREATE POLICY "user_level_stats_authenticated_select_all" 
ON public.user_level_stats 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow users to update their own stats
CREATE POLICY "user_level_stats_authenticated_update_own" 
ON public.user_level_stats 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
);

-- Allow users to insert their own stats
CREATE POLICY "user_level_stats_authenticated_insert_own" 
ON public.user_level_stats 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
);

-- Allow service role full access
CREATE POLICY "user_level_stats_service_role_all" 
ON public.user_level_stats 
FOR ALL 
USING (auth.role() = 'service_role');

-- PROFILES POLICIES - Allow all authenticated users to view profiles (for user profiles)
CREATE POLICY "profiles_authenticated_select_all" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow users to update their own profile
CREATE POLICY "profiles_authenticated_update_own" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = id 
  AND auth.role() = 'authenticated'
);

-- Allow users to insert their own profile
CREATE POLICY "profiles_authenticated_insert_own" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = id 
  AND auth.role() = 'authenticated'
);

-- Allow service role full access
CREATE POLICY "profiles_service_role_all" 
ON public.profiles 
FOR ALL 
USING (auth.role() = 'service_role');

-- 4. TEST THE COMPREHENSIVE FIX
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_created_at TIMESTAMP WITH TIME ZONE := now();
BEGIN
  RAISE NOTICE 'Testing comprehensive RLS policy fix...';
  
  -- Create a test user
  INSERT INTO auth.users (
    id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    created_at, 
    updated_at, 
    raw_user_meta_data
  )
  VALUES (
    test_user_id,
    'test@example.com',
    'dummy_password',
    test_created_at,
    test_created_at,
    test_created_at,
    jsonb_build_object('username', 'TestUser')
  );
  
  RAISE NOTICE 'Test user created with ID: %', test_user_id;
  
  -- Wait a moment for trigger to execute
  PERFORM pg_sleep(1);
  
  -- Check if profile was created
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
    RAISE NOTICE '✅ Profile created successfully';
  ELSE
    RAISE NOTICE '❌ Profile was NOT created';
  END IF;
  
  -- Check if stats were created
  IF EXISTS (SELECT 1 FROM public.user_level_stats WHERE user_id = test_user_id) THEN
    RAISE NOTICE '✅ Stats created successfully';
  ELSE
    RAISE NOTICE '❌ Stats were NOT created';
  END IF;
  
  -- Test if we can query user_level_stats (this was failing with 406)
  BEGIN
    PERFORM 1 FROM public.user_level_stats WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Can query user_level_stats successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query user_level_stats: %', SQLERRM;
  END;
  
  -- Test if we can query admin_users (this was failing with 406)
  BEGIN
    PERFORM 1 FROM public.admin_users WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Can query admin_users successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query admin_users: %', SQLERRM;
  END;
  
  -- Test if we can query profiles (for user profile viewing)
  BEGIN
    PERFORM 1 FROM public.profiles WHERE id = test_user_id;
    RAISE NOTICE '✅ Can query profiles successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query profiles: %', SQLERRM;
  END;
  
  -- Test if we can query admin_users with specific user_id (like the hook does)
  BEGIN
    PERFORM 1 FROM public.admin_users WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Can query admin_users with user_id filter successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query admin_users with user_id filter: %', SQLERRM;
  END;
  
  -- Clean up test data
  DELETE FROM auth.users WHERE id = test_user_id;
  RAISE NOTICE 'Test completed and cleaned up';
END $$;

-- 5. SHOW FINAL POLICY STATUS
DO $$
DECLARE
  policy_rec RECORD;
BEGIN
  RAISE NOTICE 'Final admin_users policies:';
  FOR policy_rec IN 
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'admin_users' AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Policy: %, Permissive: %, Roles: %, Cmd: %, Qual: %, WithCheck: %', 
      policy_rec.policyname, policy_rec.permissive, policy_rec.roles, 
      policy_rec.cmd, policy_rec.qual, policy_rec.with_check;
  END LOOP;
  
  RAISE NOTICE 'Final user_level_stats policies:';
  FOR policy_rec IN 
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'user_level_stats' AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Policy: %, Permissive: %, Roles: %, Cmd: %, Qual: %, WithCheck: %', 
      policy_rec.policyname, policy_rec.permissive, policy_rec.roles, 
      policy_rec.cmd, policy_rec.qual, policy_rec.with_check;
  END LOOP;
  
  RAISE NOTICE 'Final profiles policies:';
  FOR policy_rec IN 
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Policy: %, Permissive: %, Roles: %, Cmd: %, Qual: %, WithCheck: %', 
      policy_rec.policyname, policy_rec.permissive, policy_rec.roles, 
      policy_rec.cmd, policy_rec.qual, policy_rec.with_check;
  END LOOP;
END $$;