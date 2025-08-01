-- ============================================================================
-- FIX ADMIN STATUS CHECK - Ensure RPC functions work correctly
-- ============================================================================

-- Drop and recreate the admin status check functions to ensure they work

-- 1. Drop existing functions
DROP FUNCTION IF EXISTS public.check_admin_status_simple(UUID);
DROP FUNCTION IF EXISTS public.check_multiple_admin_status(UUID[]);

-- 2. Recreate check_admin_status_simple function
CREATE OR REPLACE FUNCTION public.check_admin_status_simple(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the check for debugging
  RAISE NOTICE 'Checking admin status for user: %', user_uuid;
  
  -- Simple check without RLS restrictions
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = user_uuid
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE NOTICE 'Error in check_admin_status_simple: %', SQLERRM;
    -- If anything fails, return false (not admin)
    RETURN false;
END;
$$;

-- 3. Recreate check_multiple_admin_status function
CREATE OR REPLACE FUNCTION public.check_multiple_admin_status(user_uuids UUID[])
RETURNS TABLE(user_id UUID, is_admin BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the check for debugging
  RAISE NOTICE 'Checking admin status for % users', array_length(user_uuids, 1);
  
  RETURN QUERY
  SELECT 
    u.user_id,
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.user_id = u.user_id
    ) as is_admin
  FROM unnest(user_uuids) AS u(user_id);
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE NOTICE 'Error in check_multiple_admin_status: %', SQLERRM;
    -- If anything fails, return all as false (not admin)
    RETURN QUERY
    SELECT 
      u.user_id,
      false as is_admin
    FROM unnest(user_uuids) AS u(user_id);
END;
$$;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION public.check_admin_status_simple(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_status_simple(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.check_multiple_admin_status(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_multiple_admin_status(UUID[]) TO anon;

-- 5. Test the functions
DO $$
DECLARE
  test_result BOOLEAN;
  test_user_id UUID;
  admin_count INTEGER;
BEGIN
  -- Check if admin_users table has any data
  SELECT COUNT(*) INTO admin_count FROM public.admin_users;
  RAISE NOTICE 'Admin users count: %', admin_count;
  
  -- If we have admin users, test with the first one
  IF admin_count > 0 THEN
    SELECT user_id INTO test_user_id FROM public.admin_users LIMIT 1;
    RAISE NOTICE 'Testing with admin user: %', test_user_id;
    
    -- Test single function
    SELECT public.check_admin_status_simple(test_user_id) INTO test_result;
    RAISE NOTICE 'Single function result: %', test_result;
    
    -- Test multiple function
    RAISE NOTICE 'Testing multiple function...';
    PERFORM public.check_multiple_admin_status(ARRAY[test_user_id]);
  ELSE
    RAISE NOTICE 'No admin users found in admin_users table';
  END IF;
END;
$$;

RAISE NOTICE 'Admin status check functions have been recreated and tested';