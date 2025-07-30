-- Test script to verify user registration trigger is working

-- 1. Check current state
SELECT 'Current profiles count:' as info, COUNT(*) as count FROM public.profiles;

-- 2. Check trigger exists
SELECT 
  'Trigger exists:' as info,
  CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- 3. Check function exists
SELECT 
  'Function exists:' as info,
  CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as result
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 4. Check RLS policies
SELECT 
  'RLS policies:' as info,
  COUNT(*) as count
FROM pg_policies 
WHERE tablename = 'profiles';

-- 5. Test manual trigger function call
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test@example.com';
  test_username TEXT := 'TestUser123';
BEGIN
  RAISE NOTICE 'Testing trigger function...';
  
  -- Create a test user in auth.users (this should trigger the function)
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data
  ) VALUES (
    test_user_id,
    test_email,
    crypt('testpassword', gen_salt('bf')),
    now(),
    now(),
    now(),
    jsonb_build_object('username', test_username)
  );
  
  RAISE NOTICE 'Test user created with ID: %', test_user_id;
  
  -- Check if profile was created
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
    RAISE NOTICE 'SUCCESS: Profile was created for test user';
  ELSE
    RAISE NOTICE 'FAILED: Profile was NOT created for test user';
  END IF;
  
  -- Clean up test user
  DELETE FROM auth.users WHERE id = test_user_id;
  DELETE FROM public.profiles WHERE id = test_user_id;
  
  RAISE NOTICE 'Test completed and cleaned up';
END $$;

-- 6. Show final profiles count
SELECT 'Final profiles count:' as info, COUNT(*) as count FROM public.profiles;