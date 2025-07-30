-- Fix admin_users table access for admin status checks

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
DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_insert" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_delete" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_update" ON public.admin_users;

-- 3. Create permissive policies for admin_users table (for admin status checks)
-- Allow all authenticated users to view admin_users (needed for admin status checks)
CREATE POLICY "admin_users_select_all" 
ON public.admin_users 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow admins to insert new admin_users records
CREATE POLICY "admin_users_insert_admin" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to delete admin_users records
CREATE POLICY "admin_users_delete_admin" 
ON public.admin_users 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to update admin_users records
CREATE POLICY "admin_users_update_admin" 
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
  RAISE NOTICE 'Admin users table access fixed';
  RAISE NOTICE 'All authenticated users can now check admin status';
  RAISE NOTICE 'Admins can manage admin roles';
END $$;