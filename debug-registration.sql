-- Debug script to test user registration and identify issues

-- 1. Check current profiles count
SELECT 'Current profiles count:' as info, COUNT(*) as count FROM public.profiles;

-- 2. Check if trigger exists and is working
SELECT 
  'Trigger status:' as info,
  CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as trigger_status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- 3. Check if function exists
SELECT 
  'Function status:' as info,
  CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as function_status
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 4. Check RLS policies on profiles
SELECT 
  'RLS policies on profiles:' as info,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'profiles';

-- 5. Show all RLS policies on profiles
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 6. Test manual profile creation function
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_username TEXT := 'TestUser123';
  test_email TEXT := 'test@example.com';
  result BOOLEAN;
BEGIN
  RAISE NOTICE 'Testing manual profile creation...';
  
  -- Test the manual function
  SELECT public.create_user_profile(test_user_id, test_username, test_email) INTO result;
  
  IF result THEN
    RAISE NOTICE 'SUCCESS: Manual profile creation worked';
  ELSE
    RAISE NOTICE 'FAILED: Manual profile creation failed';
  END IF;
  
  -- Clean up
  DELETE FROM public.profiles WHERE id = test_user_id;
  
  RAISE NOTICE 'Test completed';
END $$;

-- 7. Test direct profile insert
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_username TEXT := 'TestUser456';
  test_email TEXT := 'test2@example.com';
BEGIN
  RAISE NOTICE 'Testing direct profile insert...';
  
  BEGIN
    INSERT INTO public.profiles (
      id,
      username,
      email,
      balance,
      level,
      xp,
      total_wagered,
      total_profit,
      last_claim_time,
      badges,
      created_at,
      updated_at,
      last_seen
    ) VALUES (
      test_user_id,
      test_username,
      test_email,
      1000,
      1,
      0,
      0,
      0,
      '1970-01-01T00:00:00Z',
      ARRAY['welcome'],
      now(),
      now(),
      now()
    );
    
    RAISE NOTICE 'SUCCESS: Direct profile insert worked';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'FAILED: Direct profile insert failed - %', SQLERRM;
  END;
  
  -- Clean up
  DELETE FROM public.profiles WHERE id = test_user_id;
END $$;

-- 8. Check profiles table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 9. Final profiles count
SELECT 'Final profiles count:' as info, COUNT(*) as count FROM public.profiles;