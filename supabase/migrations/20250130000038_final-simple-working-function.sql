-- FINAL SIMPLE WORKING FUNCTION
-- We KNOW lifetime_xp exists as INTEGER, so let's make the simplest possible function

DROP FUNCTION IF EXISTS public.update_user_stats_and_level CASCADE;

-- Create the SIMPLEST possible function that just updates lifetime_xp
CREATE OR REPLACE FUNCTION public.update_user_stats_and_level(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount NUMERIC,
  p_result TEXT,
  p_profit NUMERIC,
  p_streak_length INTEGER DEFAULT 0,
  p_bet_color TEXT DEFAULT NULL,
  p_result_color TEXT DEFAULT NULL
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
  
  -- Get XP before
  SELECT lifetime_xp INTO v_before_xp 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  -- Simple update - just lifetime_xp
  UPDATE public.user_level_stats 
  SET lifetime_xp = lifetime_xp + v_xp_gained
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  -- Get XP after
  SELECT lifetime_xp INTO v_after_xp 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  -- Simple game history insert
  INSERT INTO public.game_history (user_id, game_type, bet_amount, result, profit, created_at)
  VALUES (p_user_id, p_game_type, p_bet_amount, p_result, p_profit, NOW());
  
  RETURN jsonb_build_object(
    'success', true,
    'method', 'simple_direct_update',
    'xp_gained', v_xp_gained,
    'before_xp', v_before_xp,
    'after_xp', v_after_xp,
    'rows_affected', v_rows_affected,
    'xp_difference', v_after_xp - v_before_xp
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'method', 'simple_direct_update',
      'error_message', SQLERRM,
      'sql_state', SQLSTATE
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- Test with a real user ID from your system
SELECT 
  'SIMPLE_FUNCTION_TEST' as test_name,
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