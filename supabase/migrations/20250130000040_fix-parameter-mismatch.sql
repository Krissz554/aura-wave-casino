-- FIX PARAMETER MISMATCH BETWEEN ROULETTE ENGINE AND FUNCTION
-- The roulette engine calls with p_winning_color but function expects p_result_color

DROP FUNCTION IF EXISTS public.update_user_stats_and_level CASCADE;

-- Create function with CORRECT parameters matching the roulette engine call
CREATE OR REPLACE FUNCTION public.update_user_stats_and_level(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount NUMERIC,
  p_result TEXT,
  p_profit NUMERIC,
  p_streak_length INTEGER DEFAULT 0,
  p_winning_color TEXT DEFAULT NULL,  -- This matches roulette engine!
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
BEGIN
  -- Calculate XP (simple)
  v_xp_gained := FLOOR(p_bet_amount * 0.1)::INTEGER;
  
  RAISE NOTICE '🎰 STATS UPDATE: user=%, game=%, bet=%, result=%, profit=%, xp=%', 
    p_user_id, p_game_type, p_bet_amount, p_result, p_profit, v_xp_gained;
  
  -- Get XP before
  SELECT lifetime_xp INTO v_before_xp 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  RAISE NOTICE '📊 BEFORE UPDATE: lifetime_xp=%', v_before_xp;
  
  -- Simple update - just lifetime_xp and basic stats
  UPDATE public.user_level_stats 
  SET 
    lifetime_xp = lifetime_xp + v_xp_gained,
    current_level_xp = current_level_xp + v_xp_gained,
    total_games = total_games + 1,
    total_wagered = total_wagered + p_bet_amount,
    total_profit = total_profit + p_profit,
    roulette_games = CASE WHEN p_game_type = 'roulette' THEN roulette_games + 1 ELSE roulette_games END,
    roulette_wagered = CASE WHEN p_game_type = 'roulette' THEN roulette_wagered + p_bet_amount ELSE roulette_wagered END,
    roulette_profit = CASE WHEN p_game_type = 'roulette' THEN roulette_profit + p_profit ELSE roulette_profit END,
    roulette_wins = CASE WHEN p_game_type = 'roulette' AND p_result = 'win' THEN roulette_wins + 1 ELSE roulette_wins END,
    total_wins = CASE WHEN p_result = 'win' THEN total_wins + 1 ELSE total_wins END,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  RAISE NOTICE '📊 UPDATE RESULT: rows_affected=%', v_rows_affected;
  
  -- Get XP after
  SELECT lifetime_xp INTO v_after_xp 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  RAISE NOTICE '📊 AFTER UPDATE: lifetime_xp=%', v_after_xp;
  
  -- Simple game history insert
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
  
  RAISE NOTICE '✅ STATS UPDATE SUCCESS: XP %→%, difference=%', v_before_xp, v_after_xp, v_after_xp - v_before_xp;
  
  RETURN jsonb_build_object(
    'success', true,
    'method', 'parameter_mismatch_fixed',
    'xp_gained', v_xp_gained,
    'before_xp', v_before_xp,
    'after_xp', v_after_xp,
    'rows_affected', v_rows_affected,
    'xp_difference', v_after_xp - v_before_xp,
    'parameters_used', jsonb_build_object(
      'p_winning_color', p_winning_color,
      'p_bet_color', p_bet_color,
      'p_game_type', p_game_type
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '🚨 FUNCTION ERROR: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN jsonb_build_object(
      'success', false,
      'method', 'parameter_mismatch_fixed',
      'error_message', SQLERRM,
      'sql_state', SQLSTATE,
      'context', 'Fixed parameter mismatch'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- Test with the EXACT parameters that roulette engine uses
SELECT 
  'PARAMETER_MISMATCH_FIX_TEST' as test_name,
  public.update_user_stats_and_level(
    '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID,
    'roulette',
    10.0,
    'win',
    5.0,
    0,
    'red',      -- p_winning_color (matches roulette engine!)
    'red'       -- p_bet_color
  ) as result;