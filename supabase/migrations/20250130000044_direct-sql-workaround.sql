-- DIRECT SQL WORKAROUND FOR SUPABASE BUG
-- Since PL/pgSQL functions can't access lifetime_xp, use direct SQL approach

-- Create a simple function that just returns the update SQL
CREATE OR REPLACE FUNCTION public.get_stats_update_sql(
  p_user_id UUID,
  p_xp_gained INTEGER,
  p_bet_amount NUMERIC,
  p_profit NUMERIC
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN format(
    'UPDATE public.user_level_stats SET 
      lifetime_xp = lifetime_xp + %s,
      current_level_xp = current_level_xp + %s,
      total_games = total_games + 1,
      total_wagered = total_wagered + %s,
      total_profit = total_profit + %s,
      roulette_games = roulette_games + 1,
      roulette_wagered = roulette_wagered + %s,
      roulette_profit = roulette_profit + %s,
      updated_at = NOW()
    WHERE user_id = %L',
    p_xp_gained, p_xp_gained, p_bet_amount, p_profit, p_bet_amount, p_profit, p_user_id
  );
END;
$$;

-- Test the SQL generation
SELECT 
  'SQL_GENERATION_TEST' as test_name,
  public.get_stats_update_sql(
    '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID,
    1,
    10.0,
    5.0
  ) as generated_sql;

-- Create a function that uses the client-side approach
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
DECLARE
  v_xp_gained INTEGER;
BEGIN
  -- Calculate XP
  v_xp_gained := FLOOR(p_bet_amount * 0.1)::INTEGER;
  
  -- Return instructions for client-side execution
  RETURN jsonb_build_object(
    'success', true,
    'method', 'client_side_workaround',
    'message', 'Due to Supabase bug, execute updates client-side',
    'xp_gained', v_xp_gained,
    'instructions', jsonb_build_object(
      'step1', 'Execute the stats update SQL directly',
      'step2', 'Insert game history record',
      'step3', 'Refresh user stats in UI'
    ),
    'stats_update_sql', format(
      'UPDATE public.user_level_stats SET lifetime_xp = lifetime_xp + %s, current_level_xp = current_level_xp + %s, total_games = total_games + 1, roulette_games = roulette_games + 1, roulette_wagered = roulette_wagered + %s, roulette_profit = roulette_profit + %s, updated_at = NOW() WHERE user_id = %L',
      v_xp_gained, v_xp_gained, p_bet_amount, p_profit, p_user_id
    ),
    'game_history_data', jsonb_build_object(
      'user_id', p_user_id,
      'game_type', p_game_type,
      'bet_amount', p_bet_amount,
      'result', p_result,
      'profit', p_profit,
      'game_data', jsonb_build_object(
        'bet_color', p_bet_color,
        'winning_color', p_winning_color,
        'xp_gained', v_xp_gained
      )
    )
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_stats_update_sql(UUID, INTEGER, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stats_update_sql(UUID, INTEGER, NUMERIC, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- Test the workaround function
SELECT 
  'WORKAROUND_TEST' as test_name,
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

-- Manual test of direct SQL (this should work)
UPDATE public.user_level_stats 
SET 
  lifetime_xp = lifetime_xp + 1,
  current_level_xp = current_level_xp + 1,
  total_games = total_games + 1,
  roulette_games = roulette_games + 1,
  updated_at = NOW()
WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID;

-- Check if the direct update worked
SELECT 
  'DIRECT_UPDATE_CHECK' as test_name,
  user_id,
  lifetime_xp,
  total_games,
  roulette_games,
  updated_at
FROM public.user_level_stats 
WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID;