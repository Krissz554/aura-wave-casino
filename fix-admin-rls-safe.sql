-- Safe RLS policy fix that handles existing policies

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'admin_users';

-- Drop ALL existing policies (using IF EXISTS to avoid errors)
DO $$
BEGIN
    -- Get all policy names for admin_users table
    FOR rec IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'admin_users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.admin_users', rec.policyname);
    END LOOP;
END $$;

-- Now create the correct policies
CREATE POLICY "Authenticated users can view admin status" ON public.admin_users
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can manage admin users" ON public.admin_users
    FOR INSERT, UPDATE, DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );

-- Check what policies we now have
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'admin_users';

-- Test the admin check for current user
SELECT auth.uid() as current_user_id;
SELECT * FROM public.admin_users WHERE user_id = auth.uid();

-- If you need to add yourself as admin, get your user ID first:
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Then add yourself (replace YOUR_USER_ID_HERE with your actual user ID):
-- INSERT INTO public.admin_users (user_id, permissions, created_at)
-- VALUES ('YOUR_USER_ID_HERE', ARRAY['crash_control', 'user_management'], now())
-- ON CONFLICT (user_id) DO NOTHING;