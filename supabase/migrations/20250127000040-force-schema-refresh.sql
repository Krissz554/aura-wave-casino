-- Force schema refresh and verify database state

-- 1. Force refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 2. Wait a moment for the cache to refresh
SELECT pg_sleep(1);

-- 3. Verify the profiles table structure
DO $$
DECLARE
  column_count INTEGER;
  column_info RECORD;
BEGIN
  -- Count columns in profiles table
  SELECT COUNT(*) INTO column_count 
  FROM information_schema.columns 
  WHERE table_name = 'profiles' 
  AND table_schema = 'public';
  
  RAISE NOTICE 'Profiles table has % columns', column_count;
  
  -- List all columns to verify structure
  RAISE NOTICE 'Profiles table columns:';
  FOR column_info IN 
    SELECT column_name, data_type
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND table_schema = 'public'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '  % (%)', column_info.column_name, column_info.data_type;
  END LOOP;
END $$;

-- 4. Test a simple update to verify the table is accessible
DO $$
DECLARE
  test_user_id UUID;
  update_result INTEGER;
BEGIN
  -- Get a test user ID
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test updating only existing columns
    UPDATE public.profiles 
    SET level = level 
    WHERE id = test_user_id;
    
    GET DIAGNOSTICS update_result = ROW_COUNT;
    RAISE NOTICE 'Test update successful: % rows affected', update_result;
  ELSE
    RAISE NOTICE 'No users found for testing';
  END IF;
END $$;

-- 5. Verify RLS policies are correct
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'profiles' 
  AND schemaname = 'public';
  
  RAISE NOTICE 'Profiles table has % RLS policies', policy_count;
  
  -- List all policies
  RAISE NOTICE 'Profiles table policies:';
  FOR policy_info IN 
    SELECT policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND schemaname = 'public'
  LOOP
    RAISE NOTICE '  Policy: % (Permissive: %, CMD: %)', 
      policy_info.policyname, 
      policy_info.permissive, 
      policy_info.cmd;
  END LOOP;
END $$;