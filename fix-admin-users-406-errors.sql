-- COMPREHENSIVE FIX FOR ADMIN_USERS 406 ERRORS
-- This script fixes the RLS policies that are causing 406 (Not Acceptable) errors

-- 1. DISABLE RLS TEMPORARILY TO CLEAN UP POLICIES
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING POLICIES ON ADMIN_USERS
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

-- 3. ENABLE RLS AND CREATE SIMPLE, PERMISSIVE POLICIES
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view admin status (needed for admin status checks)
CREATE POLICY "admin_users_authenticated_select_all" 
ON public.admin_users 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow service role full access
CREATE POLICY "admin_users_service_role_all" 
ON public.admin_users 
FOR ALL 
USING (auth.role() = 'service_role');

-- 4. GRANT NECESSARY PERMISSIONS
GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;

-- 5. TEST THE FIX
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'Testing admin_users RLS policy fix...';
  
  -- Test if we can query admin_users (this was failing with 406)
  BEGIN
    PERFORM 1 FROM public.admin_users LIMIT 1;
    RAISE NOTICE '✅ Can query admin_users successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query admin_users: %', SQLERRM;
  END;
  
  -- Test if we can query admin_users with specific user_id (like the hook does)
  BEGIN
    PERFORM 1 FROM public.admin_users WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Can query admin_users with user_id filter successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query admin_users with user_id filter: %', SQLERRM;
  END;
  
  RAISE NOTICE 'Admin users RLS policy fix test completed';
END $$;

-- 6. SHOW FINAL POLICY STATUS
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
END $$;

-- 7. VERIFY THE FIX WORKS
SELECT 
  'RLS is enabled' as status,
  CASE WHEN rls_enabled THEN '✅' ELSE '❌' END as enabled
FROM pg_tables 
WHERE tablename = 'admin_users' AND schemaname = 'public';

SELECT 
  'Policies exist' as status,
  CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END as policies
FROM pg_policies 
WHERE tablename = 'admin_users' AND schemaname = 'public';