-- COMPLETE WORKING STATS FUNCTION
-- Now that we confirmed dynamic SQL works, let's make the full version

-- Replace the test function with the complete version
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
  v_before_xp INTEGER;
  v_after_xp INTEGER;
  v_rows_affected INTEGER;
  v_query TEXT;
BEGIN
  -- Calculate XP
  v_xp_gained := FLOOR(p_bet_amount * 0.1)::INTEGER;
  
  -- Get XP before using dynamic SQL
  v_query := 'SELECT ' || quote_ident('lifetime_xp') || ' FROM public.user_level_stats WHERE user_id = $1';
  EXECUTE v_query INTO v_before_xp USING p_user_id;
  
  IF v_before_xp IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found in user_level_stats',
      'user_id', p_user_id
    );
  END IF;
  
  -- Update stats using dynamic SQL
  v_query := 'UPDATE public.user_level_stats SET ' ||
    quote_ident('lifetime_xp') || ' = ' || quote_ident('lifetime_xp') || ' + $1, ' ||
    quote_ident('current_level_xp') || ' = ' || quote_ident('current_level_xp') || ' + $1, ' ||
    quote_ident('total_games') || ' = ' || quote_ident('total_games') || ' + 1, ' ||
    quote_ident('total_wagered') || ' = ' || quote_ident('total_wagered') || ' + $2, ' ||
    quote_ident('total_profit') || ' = ' || quote_ident('total_profit') || ' + $3, ' ||
    quote_ident('roulette_games') || ' = CASE WHEN $4 = ''roulette'' THEN ' || quote_ident('roulette_games') || ' + 1 ELSE ' || quote_ident('roulette_games') || ' END, ' ||
    quote_ident('roulette_wagered') || ' = CASE WHEN $4 = ''roulette'' THEN ' || quote_ident('roulette_wagered') || ' + $2 ELSE ' || quote_ident('roulette_wagered') || ' END, ' ||
    quote_ident('roulette_profit') || ' = CASE WHEN $4 = ''roulette'' THEN ' || quote_ident('roulette_profit') || ' + $3 ELSE ' || quote_ident('roulette_profit') || ' END, ' ||
    quote_ident('roulette_wins') || ' = CASE WHEN $4 = ''roulette'' AND $5 = ''win'' THEN ' || quote_ident('roulette_wins') || ' + 1 ELSE ' || quote_ident('roulette_wins') || ' END, ' ||
    quote_ident('total_wins') || ' = CASE WHEN $5 = ''win'' THEN ' || quote_ident('total_wins') || ' + 1 ELSE ' || quote_ident('total_wins') || ' END, ' ||
    quote_ident('updated_at') || ' = NOW() ' ||
    'WHERE user_id = $6';
  
  EXECUTE v_query USING v_xp_gained, p_bet_amount, p_profit, p_game_type, p_result, p_user_id;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  -- Get XP after using dynamic SQL
  v_query := 'SELECT ' || quote_ident('lifetime_xp') || ' FROM public.user_level_stats WHERE user_id = $1';
  EXECUTE v_query INTO v_after_xp USING p_user_id;
  
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
    'method', 'dynamic_sql_complete',
    'xp_gained', v_xp_gained,
    'before_xp', v_before_xp,
    'after_xp', v_after_xp,
    'rows_affected', v_rows_affected,
    'xp_difference', v_after_xp - v_before_xp,
    'game_type', p_game_type,
    'bet_amount', p_bet_amount,
    'result', p_result,
    'profit', p_profit
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'method', 'dynamic_sql_complete',
      'error_message', SQLERRM,
      'sql_state', SQLSTATE,
      'context', 'Complete stats update with dynamic SQL'
    );
END;
$$;

-- Test the complete function
SELECT 
  'COMPLETE_FUNCTION_TEST' as test_name,
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

-- Test the alias (which calls the complete function)
SELECT 
  'ALIAS_COMPLETE_TEST' as test_name,
  public.update_user_stats_and_level(
    '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID,
    'roulette',
    15.0,
    'win',
    7.5,
    0,
    'black',
    'black'
  ) as result;