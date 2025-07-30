-- Comprehensive script to diagnose and fix admin panel access issues

-- 1. Check if RLS is enabled on admin_users table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'admin_users';

-- 2. Check existing RLS policies on admin_users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'admin_users';

-- 3. Check if there are any admin users in the table
SELECT user_id, permissions, created_at 
FROM public.admin_users;

-- 4. Check current user's authentication
SELECT auth.uid() as current_user_id;

-- 5. Test direct admin check for current user
SELECT * FROM public.admin_users WHERE user_id = auth.uid();

-- 6. Fix RLS policies to allow authenticated users to read admin status
-- This allows everyone to see who is an admin (for badges) but only admins can modify

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Admin users can view admin list" ON public.admin_users;
DROP POLICY IF EXISTS "Only service role can manage admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can view admin list" ON public.admin_users;

-- Create policy that allows authenticated users to read admin status
CREATE POLICY "Authenticated users can view admin status" ON public.admin_users
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy that only allows existing admins to modify admin users
CREATE POLICY "Only admins can manage admin users" ON public.admin_users
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );

-- 7. Verify the new policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'admin_users';

-- 8. Test admin check again
SELECT * FROM public.admin_users WHERE user_id = auth.uid();

-- 9. If you need to add yourself as admin (replace YOUR_USER_ID_HERE with actual ID)
-- First get your user ID:
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then add yourself as admin (uncomment and replace YOUR_USER_ID_HERE):
-- INSERT INTO public.admin_users (user_id, permissions, created_at)
-- VALUES ('YOUR_USER_ID_HERE', ARRAY['crash_control', 'user_management'], now())
-- ON CONFLICT (user_id) DO NOTHING;