-- Test script to check user registration trigger setup

-- 1. Check if trigger exists
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- 2. Check if function exists and its definition
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 3. Check RLS policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 4. Check if service role policies exist
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
AND policyname LIKE '%service%';

-- 5. Test the trigger function manually (simulate a new user)
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test@example.com';
  test_username TEXT := 'TestUser123';
BEGIN
  RAISE NOTICE 'Testing trigger function with user ID: %', test_user_id;
  
  -- Simulate the trigger function call
  PERFORM public.handle_new_user();
  
  RAISE NOTICE 'Trigger function test completed';
END $$;

-- 6. Check current profiles count
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- 7. Check recent profiles
SELECT 
  id,
  username,
  email,
  created_at
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;