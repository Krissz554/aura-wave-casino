-- Final Admin Access Fix
-- Run this in your Supabase SQL Editor to set up proper admin access

-- Step 1: Temporarily disable RLS to set up admin users
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Step 2: Get your user ID (replace 'your-email@example.com' with your actual email)
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Step 3: Add yourself as admin (replace 'YOUR_USER_ID_HERE' with your actual user ID from step 2)
INSERT INTO public.admin_users (user_id, permissions, created_at)
VALUES ('YOUR_USER_ID_HERE', ARRAY['crash_control', 'user_management', 'notifications'], now())
ON CONFLICT (user_id) DO NOTHING;

-- Step 4: Verify you were added
SELECT user_id, permissions, created_at FROM public.admin_users;

-- Step 5: Re-enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Step 6: Remove any conflicting policies
DROP POLICY IF EXISTS "Admin users can view admin list" ON public.admin_users;
DROP POLICY IF EXISTS "Only service role can manage admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can view admin list" ON public.admin_users;
DROP POLICY IF EXISTS "Authenticated users can view admin status" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can manage admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow all authenticated users to read admin status" ON public.admin_users;
DROP POLICY IF EXISTS "Allow read admin status" ON public.admin_users;

-- Step 7: Create the correct policies
CREATE POLICY "Everyone can read admin status" ON public.admin_users
    FOR SELECT
    USING (true);

CREATE POLICY "Only existing admins can modify admin users" ON public.admin_users
    FOR INSERT, UPDATE, DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );

-- Step 8: Test that it works
SELECT * FROM public.admin_users WHERE user_id = auth.uid();

-- You should see your admin record returned!
-- After running this, refresh your website and the admin button should appear only for you.