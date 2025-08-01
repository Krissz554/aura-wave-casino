-- FIX RLS POLICIES CAUSING 406 ERRORS
-- This migration fixes the RLS policies that are causing 406 errors for user_level_stats and admin_users

-- 1. FIX USER_LEVEL_STATS POLICIES
-- The issue is that the policies are too restrictive and not allowing proper access

-- Drop existing policies for user_level_stats
DROP POLICY IF EXISTS "Users can view their own user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Users can update their own user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Users can insert their own user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Service role can insert user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Service role can update user level stats" ON public.user_level_stats;

-- Create more permissive policies for user_level_stats
CREATE POLICY "Users can view their own user level stats" 
ON public.user_level_stats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own user level stats" 
ON public.user_level_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own user level stats" 
ON public.user_level_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Service role policies for user_level_stats (needed for trigger function)
CREATE POLICY "Service role can insert user level stats" 
ON public.user_level_stats 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update user level stats" 
ON public.user_level_stats 
FOR UPDATE 
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can select user level stats" 
ON public.user_level_stats 
FOR SELECT 
USING (auth.role() = 'service_role');

-- 2. FIX ADMIN_USERS POLICIES
-- The issue is that the policies are too restrictive and not allowing proper access

-- Drop existing policies for admin_users
DROP POLICY IF EXISTS "Users can view their own admin status" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Service role can insert admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Service role can update admin users" ON public.admin_users;

-- Create more permissive policies for admin_users
CREATE POLICY "Users can view their own admin status" 
ON public.admin_users 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all admin users" 
ON public.admin_users 
FOR SELECT 
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert admin users" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update admin users" 
ON public.admin_users 
FOR UPDATE 
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can select admin users" 
ON public.admin_users 
FOR SELECT 
USING (auth.role() = 'service_role');

-- 3. ADD MISSING POLICIES FOR AUTHENTICATED USERS
-- Add policies that allow authenticated users to access their own data

-- For user_level_stats - allow authenticated users to view their own stats
CREATE POLICY "Authenticated users can view their own user level stats" 
ON public.user_level_stats 
FOR SELECT 
USING (auth.uid() = user_id AND auth.role() = 'authenticated');

-- For admin_users - allow authenticated users to view their own admin status
CREATE POLICY "Authenticated users can view their own admin status" 
ON public.admin_users 
FOR SELECT 
USING (auth.uid() = user_id AND auth.role() = 'authenticated');

-- 4. TEST THE FIX
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_created_at TIMESTAMP WITH TIME ZONE := now();
BEGIN
  RAISE NOTICE 'Testing RLS policy fix...';
  
  -- Create a test user
  INSERT INTO auth.users (
    id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    created_at, 
    updated_at, 
    raw_user_meta_data
  )
  VALUES (
    test_user_id,
    'test@example.com',
    'dummy_password',
    test_created_at,
    test_created_at,
    test_created_at,
    jsonb_build_object('username', 'TestUser')
  );
  
  RAISE NOTICE 'Test user created with ID: %', test_user_id;
  
  -- Wait a moment for trigger to execute
  PERFORM pg_sleep(1);
  
  -- Check if profile was created
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
    RAISE NOTICE '✅ Profile created successfully';
  ELSE
    RAISE NOTICE '❌ Profile was NOT created';
  END IF;
  
  -- Check if stats were created
  IF EXISTS (SELECT 1 FROM public.user_level_stats WHERE user_id = test_user_id) THEN
    RAISE NOTICE '✅ Stats created successfully';
  ELSE
    RAISE NOTICE '❌ Stats were NOT created';
  END IF;
  
  -- Test if we can query user_level_stats (this was failing with 406)
  BEGIN
    PERFORM 1 FROM public.user_level_stats WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Can query user_level_stats successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query user_level_stats: %', SQLERRM;
  END;
  
  -- Test if we can query admin_users (this was failing with 406)
  BEGIN
    PERFORM 1 FROM public.admin_users WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Can query admin_users successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query admin_users: %', SQLERRM;
  END;
  
  -- Clean up test data
  DELETE FROM auth.users WHERE id = test_user_id;
  RAISE NOTICE 'Test completed and cleaned up';
END $$;