-- Complete Admin Access Fix
-- This script will fix all admin access issues

-- 1. First, let's check current admin users
SELECT * FROM public.admin_users;

-- 2. Enable RLS on admin_users table if not already enabled
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own admin status" ON public.admin_users;
DROP POLICY IF EXISTS "Service role can manage admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Anyone can view admin users" ON public.admin_users;

-- 4. Create proper RLS policies for admin_users
CREATE POLICY "Anyone can view admin users" 
ON public.admin_users 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage admin users" 
ON public.admin_users 
FOR ALL 
USING (auth.role() = 'service_role');

-- 5. Grant necessary permissions
GRANT ALL ON public.admin_users TO authenticated, service_role;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- 6. Add yourself as admin (replace YOUR_USER_ID with your actual user ID)
-- First, find your user ID:
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Then add yourself (uncomment and replace YOUR_USER_ID):
-- INSERT INTO public.admin_users (user_id, permissions) 
-- VALUES ('YOUR_USER_ID', ARRAY['maintenance_control', 'user_management', 'analytics', 'crash_control'])
-- ON CONFLICT (user_id) DO UPDATE SET 
--   permissions = EXCLUDED.permissions,
--   created_at = EXCLUDED.created_at;

-- 7. Test admin access
-- This should return your admin status if you're added:
SELECT 
  au.user_id,
  au.permissions,
  au.created_at,
  p.username,
  p.email
FROM public.admin_users au
JOIN public.profiles p ON au.user_id = p.id
WHERE au.user_id = auth.uid();

-- 8. Fix maintenance settings permissions
GRANT ALL ON public.maintenance_settings TO authenticated, service_role;

-- 9. Ensure maintenance functions work for authenticated users
-- The functions should already be SECURITY DEFINER, but let's verify
SELECT 
  proname,
  prosecdef,
  proacl
FROM pg_proc 
WHERE proname IN ('toggle_maintenance_mode', 'get_maintenance_status');

-- 10. Test maintenance status function
SELECT public.get_maintenance_status();

-- 11. If you're still having issues, try this alternative approach:
-- Create a function to check admin status that works with RLS
CREATE OR REPLACE FUNCTION public.check_admin_status(user_uuid uuid DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE user_id = user_uuid
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- 12. Test the new function
SELECT public.check_admin_status();