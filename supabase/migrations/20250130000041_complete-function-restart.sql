-- COMPLETE FUNCTION RESTART - NEW FUNCTION NAME TO BYPASS CACHE
-- If this still fails, there's a fundamental Supabase issue

-- Drop ALL possible function variants
DROP FUNCTION IF EXISTS public.update_user_stats_and_level CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC) CASCADE;

-- Create a COMPLETELY NEW function with different name
CREATE OR REPLACE FUNCTION public.roulette_stats_update_v3(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount NUMERIC,
  p_result TEXT,
  p_profit NUMERIC,
  p_streak_length INTEGER DEFAULT 0,
  p_winning_color TEXT DEFAULT NULL,
  p_bet_color TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp_gained INTEGER;
  v_test_query TEXT;
  v_test_result INTEGER;
BEGIN
  -- First, let's test if we can even access the table
  BEGIN
    SELECT COUNT(*) INTO v_test_result FROM public.user_level_stats WHERE user_id = p_user_id;
    
    IF v_test_result = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'User not found in user_level_stats',
        'user_id', p_user_id
      );
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Cannot access user_level_stats table',
        'sql_state', SQLSTATE,
        'error_message', SQLERRM
      );
  END;
  
  -- Try to access lifetime_xp using a different approach
  BEGIN
    -- Use dynamic SQL to build the query
    v_test_query := 'SELECT ' || quote_ident('lifetime_xp') || ' FROM public.user_level_stats WHERE user_id = $1';
    EXECUTE v_test_query INTO v_test_result USING p_user_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'method', 'dynamic_column_access',
      'current_lifetime_xp', v_test_result,
      'user_id', p_user_id,
      'query_used', v_test_query
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'method', 'dynamic_column_access',
        'error_message', SQLERRM,
        'sql_state', SQLSTATE,
        'query_attempted', v_test_query
      );
  END;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.roulette_stats_update_v3(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roulette_stats_update_v3(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- Test the new function
SELECT 
  'NEW_FUNCTION_TEST' as test_name,
  public.roulette_stats_update_v3(
    '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID,
    'roulette',
    10.0,
    'win',
    5.0,
    0,
    'red',
    'red'
  ) as result;

-- Also create an alias with the original name that calls the new function
CREATE OR REPLACE FUNCTION public.update_user_stats_and_level(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount NUMERIC,
  p_result TEXT,
  p_profit NUMERIC,
  p_streak_length INTEGER DEFAULT 0,
  p_winning_color TEXT DEFAULT NULL,
  p_bet_color TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Just call the new function
  RETURN public.roulette_stats_update_v3(
    p_user_id, p_game_type, p_bet_amount, p_result, p_profit, 
    p_streak_length, p_winning_color, p_bet_color
  );
END;
$$;

-- Grant permissions to the alias
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- Test the alias
SELECT 
  'ALIAS_FUNCTION_TEST' as test_name,
  public.update_user_stats_and_level(
    '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID,
    'roulette',
    10.0,
    'win',
    5.0,
    0,
    'red',
    'red'
  ) as result;