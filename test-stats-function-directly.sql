-- Test the stats function directly to see if it works
-- This will help us determine if the issue is in the function or the Edge Function call

-- First, let's see what functions exist
SELECT 
  proname as function_name,
  proargnames as parameter_names,
  pg_get_function_arguments(oid) as full_signature
FROM pg_proc 
WHERE proname LIKE '%update_user%'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Test with a real user
DO $$
DECLARE
  test_user_id UUID;
  test_result JSONB;
BEGIN
  -- Get a real user ID
  SELECT user_id INTO test_user_id FROM public.user_level_stats LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE '🧪 Testing stats function with user: %', test_user_id;
    
    -- Call the function directly
    BEGIN
      SELECT public.update_user_stats_and_level(
        test_user_id,
        'roulette',
        1.0,
        'win',
        1.0,
        0,
        'red',
        'red'
      ) INTO test_result;
      
      RAISE NOTICE '✅ Function call successful: %', test_result;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Function call failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    END;
  ELSE
    RAISE NOTICE '❌ No users found for testing';
  END IF;
END $$;

-- Check if lifetime_xp column actually exists
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_level_stats' 
  AND column_name = 'lifetime_xp';

-- Show the actual table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_level_stats'
ORDER BY ordinal_position;