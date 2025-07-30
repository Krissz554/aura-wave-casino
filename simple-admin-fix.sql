-- Simple step-by-step admin fix
-- Run these commands ONE BY ONE in your Supabase SQL Editor

-- Step 1: Check current policies
SELECT policyname FROM pg_policies WHERE tablename = 'admin_users';

-- Step 2: Check if you can read admin_users table
SELECT * FROM public.admin_users;

-- Step 3: Get your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Step 4: Check if you're already an admin
SELECT * FROM public.admin_users WHERE user_id = 'YOUR_USER_ID_HERE';

-- Step 5: Add yourself as admin (replace YOUR_USER_ID_HERE with your actual user ID)
INSERT INTO public.admin_users (user_id, permissions, created_at)
VALUES ('YOUR_USER_ID_HERE', ARRAY['crash_control', 'user_management'], now())
ON CONFLICT (user_id) DO NOTHING;

-- Step 6: If you get permission errors, disable RLS temporarily
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Step 7: Try adding yourself again
INSERT INTO public.admin_users (user_id, permissions, created_at)
VALUES ('YOUR_USER_ID_HERE', ARRAY['crash_control', 'user_management'], now())
ON CONFLICT (user_id) DO NOTHING;

-- Step 8: Re-enable RLS with proper policies
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Step 9: Create simple read policy
CREATE POLICY "Allow all authenticated users to read admin status" ON public.admin_users
FOR SELECT TO authenticated USING (true);

-- Step 10: Verify it works
SELECT * FROM public.admin_users WHERE user_id = 'YOUR_USER_ID_HERE';