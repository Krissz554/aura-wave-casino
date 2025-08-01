-- IMMEDIATE FIX FOR ADMIN_USERS 406 ERRORS
-- Run this directly on your production database

-- 1. ENABLE RLS ON ADMIN_USERS (in case it's disabled)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING ADMIN_USERS POLICIES
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

-- 3. CREATE SIMPLE, PERMISSIVE POLICIES FOR ADMIN_USERS

-- Allow ALL authenticated users to SELECT from admin_users
CREATE POLICY "admin_users_select_all_authenticated" 
ON public.admin_users 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow service role full access
CREATE POLICY "admin_users_service_role_all" 
ON public.admin_users 
FOR ALL 
USING (auth.role() = 'service_role');

-- 4. ALSO FIX USER_LEVEL_STATS POLICIES

-- Enable RLS on user_level_stats
ALTER TABLE public.user_level_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing user_level_stats policies
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

-- Create simple, permissive policies for user_level_stats
CREATE POLICY "user_level_stats_select_all_authenticated" 
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

-- Allow service role full access
CREATE POLICY "user_level_stats_service_role_all" 
ON public.user_level_stats 
FOR ALL 
USING (auth.role() = 'service_role');

-- 5. ALSO FIX PROFILES POLICIES

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing profiles policies
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

-- Create simple, permissive policies for profiles
CREATE POLICY "profiles_select_all_authenticated" 
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

-- Allow service role full access
CREATE POLICY "profiles_service_role_all" 
ON public.profiles 
FOR ALL 
USING (auth.role() = 'service_role');

-- 6. TEST THE FIX
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_created_at TIMESTAMP WITH TIME ZONE := now();
BEGIN
  RAISE NOTICE 'Testing immediate RLS policy fix...';
  
  -- Test if we can query admin_users (this was failing with 406)
  BEGIN
    PERFORM 1 FROM public.admin_users LIMIT 1;
    RAISE NOTICE '✅ Can query admin_users successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query admin_users: %', SQLERRM;
  END;
  
  -- Test if we can query user_level_stats
  BEGIN
    PERFORM 1 FROM public.user_level_stats LIMIT 1;
    RAISE NOTICE '✅ Can query user_level_stats successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query user_level_stats: %', SQLERRM;
  END;
  
  -- Test if we can query profiles
  BEGIN
    PERFORM 1 FROM public.profiles LIMIT 1;
    RAISE NOTICE '✅ Can query profiles successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query profiles: %', SQLERRM;
  END;
  
  RAISE NOTICE 'Test completed';
END $$;

-- 7. SHOW FINAL POLICY STATUS
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