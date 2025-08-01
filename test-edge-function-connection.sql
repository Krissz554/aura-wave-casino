-- TEST EDGE FUNCTION CONNECTION
-- This will help us determine if the issue is with the database function or the Edge Function

-- Create a simple test function that the Edge Function can call
CREATE OR REPLACE FUNCTION public.test_edge_function_connection()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE NOTICE '🔗 Edge Function connection test called at %', NOW();
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Edge Function can connect to database',
    'timestamp', NOW(),
    'test_version', 'v1'
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.test_edge_function_connection() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_edge_function_connection() TO service_role;
GRANT EXECUTE ON FUNCTION public.test_edge_function_connection() TO anon;

-- Test it directly
SELECT public.test_edge_function_connection() as test_result;

-- Show all available functions for debugging
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as parameters,
  'AVAILABLE' as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname LIKE '%update_user%'
ORDER BY proname;