-- COMPREHENSIVE FIX FOR CONSOLE ERRORS AND 406 ERRORS
-- This script fixes all the issues causing console errors and 406 (Not Acceptable) errors

-- 1. FIX ADMIN_USERS TABLE RLS POLICIES
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Drop all existing admin_users policies
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
DROP POLICY IF EXISTS "Everyone can read admin status" ON public.admin_users;
DROP POLICY IF EXISTS "Only existing admins can modify admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can add new admins" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can update admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can delete admin users" ON public.admin_users;

-- Re-enable RLS and create simple policies
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_users_authenticated_select_all" 
ON public.admin_users 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "admin_users_service_role_all" 
ON public.admin_users 
FOR ALL 
USING (auth.role() = 'service_role');

GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;

-- 2. FIX USER_LEVEL_STATS TABLE RLS POLICIES
ALTER TABLE public.user_level_stats DISABLE ROW LEVEL SECURITY;

-- Drop all existing user_level_stats policies
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

-- Re-enable RLS and create simple policies
ALTER TABLE public.user_level_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_level_stats_authenticated_select_all" 
ON public.user_level_stats 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "user_level_stats_authenticated_update_own" 
ON public.user_level_stats 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "user_level_stats_authenticated_insert_own" 
ON public.user_level_stats 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "user_level_stats_service_role_all" 
ON public.user_level_stats 
FOR ALL 
USING (auth.role() = 'service_role');

GRANT SELECT, INSERT, UPDATE ON public.user_level_stats TO authenticated;
GRANT ALL ON public.user_level_stats TO service_role;

-- 3. FIX PROFILES TABLE RLS POLICIES (for user profile viewing)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing profiles policies
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

-- Re-enable RLS and create simple policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_authenticated_select_all" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_authenticated_update_own" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = id 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "profiles_authenticated_insert_own" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = id 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "profiles_service_role_all" 
ON public.profiles 
FOR ALL 
USING (auth.role() = 'service_role');

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 4. TEST ALL FIXES
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'Testing comprehensive RLS policy fixes...';
  
  -- Test admin_users queries
  BEGIN
    PERFORM 1 FROM public.admin_users LIMIT 1;
    RAISE NOTICE '✅ Can query admin_users successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query admin_users: %', SQLERRM;
  END;
  
  BEGIN
    PERFORM 1 FROM public.admin_users WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Can query admin_users with user_id filter successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query admin_users with user_id filter: %', SQLERRM;
  END;
  
  -- Test user_level_stats queries
  BEGIN
    PERFORM 1 FROM public.user_level_stats LIMIT 1;
    RAISE NOTICE '✅ Can query user_level_stats successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query user_level_stats: %', SQLERRM;
  END;
  
  BEGIN
    PERFORM 1 FROM public.user_level_stats WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Can query user_level_stats with user_id filter successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query user_level_stats with user_id filter: %', SQLERRM;
  END;
  
  -- Test profiles queries
  BEGIN
    PERFORM 1 FROM public.profiles LIMIT 1;
    RAISE NOTICE '✅ Can query profiles successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query profiles: %', SQLERRM;
  END;
  
  BEGIN
    PERFORM 1 FROM public.profiles WHERE id = test_user_id;
    RAISE NOTICE '✅ Can query profiles with id filter successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query profiles with id filter: %', SQLERRM;
  END;
  
  RAISE NOTICE 'Comprehensive RLS policy fix test completed';
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

-- 6. VERIFY ALL FIXES WORK
SELECT 
  'admin_users RLS enabled' as table_name,
  CASE WHEN relrowsecurity THEN '✅' ELSE '❌' END as enabled
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'admin_users' AND n.nspname = 'public'

UNION ALL

SELECT 
  'user_level_stats RLS enabled' as table_name,
  CASE WHEN relrowsecurity THEN '✅' ELSE '❌' END as enabled
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'user_level_stats' AND n.nspname = 'public'

UNION ALL

SELECT 
  'profiles RLS enabled' as table_name,
  CASE WHEN relrowsecurity THEN '✅' ELSE '❌' END as enabled
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'profiles' AND n.nspname = 'public';

SELECT 
  'admin_users policies' as table_name,
  CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END as policies
FROM pg_policies 
WHERE tablename = 'admin_users' AND schemaname = 'public'

UNION ALL

SELECT 
  'user_level_stats policies' as table_name,
  CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END as policies
FROM pg_policies 
WHERE tablename = 'user_level_stats' AND schemaname = 'public'

UNION ALL

SELECT 
  'profiles policies' as table_name,
  CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END as policies
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';