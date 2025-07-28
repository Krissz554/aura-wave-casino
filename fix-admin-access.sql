-- Fix Admin Access Script
-- This script will set up proper admin access for your user

-- First, let's check if you're in the admin_users table
SELECT * FROM public.admin_users;

-- If you're not in the table, add yourself (replace YOUR_USER_ID with your actual user ID)
-- To find your user ID, run this first:
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Then add yourself as admin (replace YOUR_USER_ID):
-- INSERT INTO public.admin_users (user_id, permissions) 
-- VALUES ('YOUR_USER_ID', ARRAY['maintenance_control', 'user_management', 'analytics', 'crash_control']);

-- Enable RLS on admin_users table
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_users table
CREATE POLICY "Users can view their own admin status" 
ON public.admin_users 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage admin users" 
ON public.admin_users 
FOR ALL 
USING (auth.role() = 'service_role');

-- Test the admin check function
-- This should return your admin status
SELECT 
  au.user_id,
  au.permissions,
  au.created_at,
  p.username
FROM public.admin_users au
JOIN public.profiles p ON au.user_id = p.id
WHERE au.user_id = auth.uid();