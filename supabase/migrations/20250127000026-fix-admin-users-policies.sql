-- Fix admin_users table RLS policies to allow admins to manage admin roles

-- 1. Check existing policies on admin_users table
DO $$
DECLARE
  policy RECORD;
BEGIN
  RAISE NOTICE 'Checking existing RLS policies on admin_users...';
  
  FOR policy IN 
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'admin_users'
    ORDER BY policyname
  LOOP
    RAISE NOTICE 'Table: %, Policy: %, Command: %, Qual: %, With Check: %', 
      policy.tablename, policy.policyname, policy.cmd, policy.qual, policy.with_check;
  END LOOP;
END $$;

-- 2. Remove existing policies on admin_users table
DROP POLICY IF EXISTS "Only admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_unified_select" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_authenticated_view" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_service_role_access" ON public.admin_users;

-- 3. Create proper policies for admin_users table
-- Allow admins to view all admin_users records
CREATE POLICY "admin_users_select" 
ON public.admin_users 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to insert new admin_users records
CREATE POLICY "admin_users_insert" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to delete admin_users records
CREATE POLICY "admin_users_delete" 
ON public.admin_users 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to update admin_users records
CREATE POLICY "admin_users_update" 
ON public.admin_users 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- 4. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO authenticated;

-- 5. Test the setup
DO $$
BEGIN
  RAISE NOTICE 'Admin users table policies setup completed';
  RAISE NOTICE 'Admins can now manage admin roles (add/remove users)';
  RAISE NOTICE 'Policies: SELECT, INSERT, UPDATE, DELETE for admins only';
END $$;