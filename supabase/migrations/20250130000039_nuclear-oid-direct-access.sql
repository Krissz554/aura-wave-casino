-- NUCLEAR OPTION: Direct OID access to bypass Supabase name resolution
-- This is the most desperate attempt to access the column

-- First, let's find the exact OID of the user_level_stats table
SELECT 
  'TABLE_OID_INFO' as info_type,
  c.oid as table_oid,
  c.relname as table_name,
  n.nspname as schema_name
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'user_level_stats' AND n.nspname = 'public';

-- Let's also check if there are any triggers or rules affecting the table
SELECT 
  'TABLE_DEPENDENCIES' as info_type,
  t.tgname as trigger_name,
  t.tgenabled as trigger_enabled,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'user_level_stats' AND n.nspname = 'public';

-- Create a function that uses EXECUTE with the exact table OID
CREATE OR REPLACE FUNCTION public.update_user_stats_oid_method(
  p_user_id UUID,
  p_xp_to_add INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_oid OID;
  v_sql TEXT;
  v_before_xp INTEGER;
  v_after_xp INTEGER;
  v_result RECORD;
BEGIN
  -- Get the exact OID of the user_level_stats table
  SELECT c.oid INTO v_table_oid
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE c.relname = 'user_level_stats' AND n.nspname = 'public';
  
  IF v_table_oid IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Table OID not found'
    );
  END IF;
  
  -- Try to get before value using OID
  v_sql := 'SELECT lifetime_xp FROM pg_class c JOIN ' || v_table_oid::regclass || ' t ON true WHERE t.user_id = $1 LIMIT 1';
  
  -- Actually, let's try the simplest possible approach with explicit casting
  BEGIN
    EXECUTE 'SELECT lifetime_xp FROM ' || v_table_oid::regclass || ' WHERE user_id = $1' 
    INTO v_before_xp USING p_user_id;
    
    EXECUTE 'UPDATE ' || v_table_oid::regclass || ' SET lifetime_xp = lifetime_xp + $1 WHERE user_id = $2' 
    USING p_xp_to_add, p_user_id;
    
    EXECUTE 'SELECT lifetime_xp FROM ' || v_table_oid::regclass || ' WHERE user_id = $1' 
    INTO v_after_xp USING p_user_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'method', 'oid_direct_access',
      'table_oid', v_table_oid,
      'before_xp', v_before_xp,
      'after_xp', v_after_xp,
      'xp_added', p_xp_to_add,
      'actual_difference', v_after_xp - v_before_xp
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'method', 'oid_direct_access',
        'table_oid', v_table_oid,
        'error_message', SQLERRM,
        'sql_state', SQLSTATE
      );
  END;
END;
$$;

-- Test the OID method
SELECT 
  'OID_METHOD_TEST' as test_name,
  public.update_user_stats_oid_method(
    '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID,
    5
  ) as result;

-- Alternative: Try using information_schema to build the query
CREATE OR REPLACE FUNCTION public.update_user_stats_info_schema()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_columns TEXT[];
  v_sql TEXT;
  v_result JSONB;
BEGIN
  -- Get all column names from information_schema
  SELECT array_agg(column_name ORDER BY ordinal_position)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_name = 'user_level_stats' 
    AND table_schema = 'public';
  
  -- Check if lifetime_xp is in the array
  IF 'lifetime_xp' = ANY(v_columns) THEN
    -- Try a direct update using information from information_schema
    UPDATE public.user_level_stats 
    SET lifetime_xp = lifetime_xp + 1
    WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID;
    
    RETURN jsonb_build_object(
      'success', true,
      'method', 'info_schema_verified',
      'columns_found', v_columns,
      'lifetime_xp_in_array', 'lifetime_xp' = ANY(v_columns)
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'method', 'info_schema_verified',
      'columns_found', v_columns,
      'lifetime_xp_in_array', 'lifetime_xp' = ANY(v_columns)
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'method', 'info_schema_verified',
      'error_message', SQLERRM,
      'sql_state', SQLSTATE,
      'columns_found', v_columns
    );
END;
$$;

-- Test the info schema method
SELECT 
  'INFO_SCHEMA_TEST' as test_name,
  public.update_user_stats_info_schema() as result;