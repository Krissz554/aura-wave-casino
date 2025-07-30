-- Check and add admin user if needed

-- 1. Check existing admin users
SELECT 
  au.user_id,
  au.permissions,
  au.created_at,
  p.username,
  p.email
FROM public.admin_users au
LEFT JOIN public.profiles p ON au.user_id = p.id
ORDER BY au.created_at DESC;

-- 2. Check if there are any users in the profiles table
SELECT 
  id,
  username,
  email,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;

-- 3. Add admin role to the first user (if you want to make someone an admin)
-- Replace 'USER_ID_HERE' with the actual user ID you want to make admin
-- INSERT INTO public.admin_users (user_id, permissions, created_at)
-- VALUES ('USER_ID_HERE', ARRAY['admin'], now())
-- ON CONFLICT (user_id) DO NOTHING;

-- 4. Alternative: Add admin role to the most recent user
-- INSERT INTO public.admin_users (user_id, permissions, created_at)
-- SELECT 
--   p.id,
--   ARRAY['admin'],
--   now()
-- FROM public.profiles p
-- ORDER BY p.created_at DESC
-- LIMIT 1
-- ON CONFLICT (user_id) DO NOTHING;