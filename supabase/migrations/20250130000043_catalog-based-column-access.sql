-- CATALOG-BASED COLUMN ACCESS
-- Use PostgreSQL catalog to discover columns at runtime

CREATE OR REPLACE FUNCTION public.roulette_stats_update_v4(
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
  v_before_xp INTEGER;
  v_after_xp INTEGER;
  v_table_oid OID;
  v_column_names TEXT[];
  v_query TEXT;
  v_result RECORD;
BEGIN
  -- Calculate XP
  v_xp_gained := FLOOR(p_bet_amount * 0.1)::INTEGER;
  
  -- Get the table OID
  SELECT c.oid INTO v_table_oid
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE c.relname = 'user_level_stats' AND n.nspname = 'public';
  
  IF v_table_oid IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Table user_level_stats not found'
    );
  END IF;
  
  -- Get all column names from the catalog
  SELECT array_agg(a.attname ORDER BY a.attnum) INTO v_column_names
  FROM pg_attribute a
  WHERE a.attrelid = v_table_oid
    AND a.attnum > 0
    AND NOT a.attisdropped;
  
  -- Check if lifetime_xp is in the columns
  IF NOT ('lifetime_xp' = ANY(v_column_names)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'lifetime_xp not found in catalog',
      'available_columns', v_column_names
    );
  END IF;
  
  -- Try to get current XP using table OID
  BEGIN
    EXECUTE format('SELECT lifetime_xp FROM %s WHERE user_id = $1', v_table_oid::regclass)
    INTO v_before_xp USING p_user_id;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to read lifetime_xp',
        'sql_state', SQLSTATE,
        'error_message', SQLERRM,
        'table_oid', v_table_oid,
        'columns_found', v_column_names
      );
  END;
  
  IF v_before_xp IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found',
      'user_id', p_user_id
    );
  END IF;
  
  -- Try to update using table OID
  BEGIN
    EXECUTE format(
      'UPDATE %s SET lifetime_xp = lifetime_xp + $1, current_level_xp = current_level_xp + $1, total_games = total_games + 1, updated_at = NOW() WHERE user_id = $2',
      v_table_oid::regclass
    ) USING v_xp_gained, p_user_id;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Failed to update stats',
        'sql_state', SQLSTATE,
        'error_message', SQLERRM,
        'table_oid', v_table_oid
      );
  END;
  
  -- Get XP after
  EXECUTE format('SELECT lifetime_xp FROM %s WHERE user_id = $1', v_table_oid::regclass)
  INTO v_after_xp USING p_user_id;
  
  -- Insert game history
  INSERT INTO public.game_history (user_id, game_type, bet_amount, result, profit, game_data, created_at)
  VALUES (
    p_user_id, 
    p_game_type, 
    p_bet_amount, 
    p_result, 
    p_profit,
    jsonb_build_object(
      'bet_color', p_bet_color,
      'winning_color', p_winning_color,
      'xp_gained', v_xp_gained
    ),
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'method', 'catalog_based_access',
    'table_oid', v_table_oid,
    'columns_found', v_column_names,
    'xp_gained', v_xp_gained,
    'before_xp', v_before_xp,
    'after_xp', v_after_xp,
    'xp_difference', v_after_xp - v_before_xp
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'method', 'catalog_based_access',
      'error_message', SQLERRM,
      'sql_state', SQLSTATE,
      'table_oid', v_table_oid,
      'columns_found', v_column_names
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.roulette_stats_update_v4(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.roulette_stats_update_v4(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- Update the alias to use v4
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
  -- Call the catalog-based function
  RETURN public.roulette_stats_update_v4(
    p_user_id, p_game_type, p_bet_amount, p_result, p_profit, 
    p_streak_length, p_winning_color, p_bet_color
  );
END;
$$;

-- Test the catalog-based function
SELECT 
  'CATALOG_BASED_TEST' as test_name,
  public.roulette_stats_update_v4(
    '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID,
    'roulette',
    10.0,
    'win',
    5.0,
    0,
    'red',
    'red'
  ) as result;

-- Test the alias
SELECT 
  'ALIAS_CATALOG_TEST' as test_name,
  public.update_user_stats_and_level(
    '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID,
    'roulette',
    20.0,
    'win',
    10.0,
    0,
    'green',
    'green'
  ) as result;