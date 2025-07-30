-- Fix reset cache issue - ensure database is in correct state

-- 1. Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- 2. Verify the profiles table structure
DO $$
DECLARE
  column_count INTEGER;
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
    RAISE NOTICE '  % (%%)', column_info.column_name, column_info.data_type;
  END LOOP;
  
  -- Verify no achievements_unlocked column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND table_schema = 'public' 
    AND column_name = 'achievements_unlocked'
  ) THEN
    RAISE NOTICE 'WARNING: achievements_unlocked column exists - this should not happen!';
  ELSE
    RAISE NOTICE 'OK: achievements_unlocked column does not exist (correct)';
  END IF;
END $$;

-- 3. Test a simple update to profiles table
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