-- ============================================================================
-- FIX RPC ADMIN CHECK - The check_multiple_admin_status function is broken
-- ============================================================================

-- The issue: RPC returns 0 admin users but direct query shows 2 admin users
-- This means the RPC function logic is wrong

-- Drop and recreate with corrected logic
DROP FUNCTION IF EXISTS public.check_multiple_admin_status(UUID[]);

-- Recreate with fixed logic
CREATE OR REPLACE FUNCTION public.check_multiple_admin_status(user_uuids UUID[])
RETURNS TABLE(user_id UUID, is_admin BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log for debugging
  RAISE NOTICE 'check_multiple_admin_status called with % users', array_length(user_uuids, 1);
  
  -- Fixed logic: Check each user ID against admin_users table
  RETURN QUERY
  SELECT 
    input_user_id,
    CASE 
      WHEN admin_users.user_id IS NOT NULL THEN true
      ELSE false
    END as is_admin
  FROM unnest(user_uuids) AS input_user_id
  LEFT JOIN public.admin_users ON admin_users.user_id = input_user_id;
  
  -- Log the results
  RAISE NOTICE 'check_multiple_admin_status completed';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in check_multiple_admin_status: %', SQLERRM;
    -- Return all as false if error
    RETURN QUERY
    SELECT 
      input_user_id,
      false as is_admin
    FROM unnest(user_uuids) AS input_user_id;
END;
$$;

-- Also fix the single admin check function for consistency
DROP FUNCTION IF EXISTS public.check_admin_status_simple(UUID);

CREATE OR REPLACE FUNCTION public.check_admin_status_simple(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_result BOOLEAN;
BEGIN
  -- Log for debugging
  RAISE NOTICE 'check_admin_status_simple called for user: %', user_uuid;
  
  -- Check if user exists in admin_users table
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = user_uuid
  ) INTO is_admin_result;
  
  RAISE NOTICE 'check_admin_status_simple result for %: %', user_uuid, is_admin_result;
  
  RETURN is_admin_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in check_admin_status_simple: %', SQLERRM;
    RETURN false;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_admin_status_simple(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_status_simple(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.check_multiple_admin_status(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_multiple_admin_status(UUID[]) TO anon;

-- Test the fixed function
DO $$
DECLARE
  test_user_ids UUID[];
  test_result RECORD;
  admin_count INTEGER;
BEGIN
  -- Get count of admin users
  SELECT COUNT(*) INTO admin_count FROM public.admin_users;
  RAISE NOTICE 'Total admin users in table: %', admin_count;
  
  -- Get all admin user IDs for testing
  SELECT ARRAY(SELECT user_id FROM public.admin_users) INTO test_user_ids;
  RAISE NOTICE 'Admin user IDs: %', test_user_ids;
  
  -- Test the function with admin user IDs
  IF array_length(test_user_ids, 1) > 0 THEN
    RAISE NOTICE 'Testing RPC function with admin user IDs...';
    FOR test_result IN 
      SELECT * FROM public.check_multiple_admin_status(test_user_ids)
    LOOP
      RAISE NOTICE 'RPC Result: user_id=%, is_admin=%', test_result.user_id, test_result.is_admin;
    END LOOP;
  END IF;
  
  -- Test with a mix of admin and non-admin users
  RAISE NOTICE 'Testing with mixed user IDs...';
  -- Add a fake non-admin user ID to test
  test_user_ids := test_user_ids || ARRAY['00000000-0000-0000-0000-000000000000'::UUID];
  
  FOR test_result IN 
    SELECT * FROM public.check_multiple_admin_status(test_user_ids)
  LOOP
    RAISE NOTICE 'Mixed test result: user_id=%, is_admin=%', test_result.user_id, test_result.is_admin;
  END LOOP;
END;
$$;

RAISE NOTICE 'RPC admin check function has been fixed and tested';