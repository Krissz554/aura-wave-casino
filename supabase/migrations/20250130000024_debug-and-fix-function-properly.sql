-- Debug and fix the function properly
-- The function is still broken, let's find out why and fix it completely

-- First, let's see what functions exist and their signatures
SELECT '=== EXISTING FUNCTIONS ===' as debug_section;
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosrc as source_code_preview
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public' 
  AND p.proname LIKE '%stats%'
ORDER BY p.proname;

-- Let's check what columns actually exist in user_level_stats
SELECT '=== USER_LEVEL_STATS COLUMNS ===' as debug_section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_level_stats'
ORDER BY ordinal_position;

-- Drop ALL possible versions of the function
DROP FUNCTION IF EXISTS public.update_user_stats_and_level CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC) CASCADE;

-- Create a completely new, simple function that we know will work
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
  stats_record RECORD;
  new_xp INTEGER;
  xp_per_dollar NUMERIC := 0.1; -- 1 XP per $10 bet
BEGIN
  -- Calculate XP
  new_xp := FLOOR(p_bet_amount * xp_per_dollar)::INTEGER;
  
  -- Check if user exists in user_level_stats
  SELECT * INTO stats_record 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_message', 'User not found in user_level_stats table'
    );
  END IF;
  
  -- Update the user_level_stats table with explicit column names
  UPDATE public.user_level_stats
  SET 
    lifetime_xp = public.user_level_stats.lifetime_xp + new_xp,
    current_level_xp = public.user_level_stats.current_level_xp + new_xp,
    total_games = public.user_level_stats.total_games + 1,
    total_wagered = public.user_level_stats.total_wagered + p_bet_amount,
    total_profit = public.user_level_stats.total_profit + p_profit,
    roulette_games = CASE 
      WHEN p_game_type = 'roulette' THEN public.user_level_stats.roulette_games + 1 
      ELSE public.user_level_stats.roulette_games 
    END,
    roulette_wagered = CASE 
      WHEN p_game_type = 'roulette' THEN public.user_level_stats.roulette_wagered + p_bet_amount 
      ELSE public.user_level_stats.roulette_wagered 
    END,
    roulette_profit = CASE 
      WHEN p_game_type = 'roulette' THEN public.user_level_stats.roulette_profit + p_profit 
      ELSE public.user_level_stats.roulette_profit 
    END,
    roulette_wins = CASE 
      WHEN p_game_type = 'roulette' AND p_result = 'win' THEN public.user_level_stats.roulette_wins + 1 
      ELSE public.user_level_stats.roulette_wins 
    END,
    total_wins = CASE 
      WHEN p_result = 'win' THEN public.user_level_stats.total_wins + 1 
      ELSE public.user_level_stats.total_wins 
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Insert into game_history
  INSERT INTO public.game_history (
    user_id,
    game_type,
    bet_amount,
    result,
    profit,
    game_data,
    created_at
  ) VALUES (
    p_user_id,
    p_game_type,
    p_bet_amount,
    p_result,
    p_profit,
    jsonb_build_object(
      'bet_color', p_bet_color,
      'result_color', p_result_color,
      'xp_gained', new_xp
    ),
    NOW()
  );
  
  -- Get updated stats
  SELECT lifetime_xp, total_games, roulette_games INTO stats_record
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'xp_gained', new_xp,
    'new_lifetime_xp', stats_record.lifetime_xp,
    'new_total_games', stats_record.total_games,
    'new_roulette_games', stats_record.roulette_games
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_message', SQLERRM,
      'sql_state', SQLSTATE
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- Test the new function immediately
SELECT '=== TESTING NEW FUNCTION ===' as debug_section;
SELECT public.update_user_stats_and_level(
  '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID,
  'roulette',
  10.0,
  'win',
  5.0,
  0,
  'red',
  'red'
) as test_result;

-- Check if it worked
SELECT '=== STATS AFTER TEST ===' as debug_section;
SELECT 
  user_id,
  lifetime_xp,
  total_games,
  roulette_games,
  updated_at
FROM public.user_level_stats 
WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f';

-- Check game history
SELECT '=== GAME HISTORY COUNT ===' as debug_section;
SELECT COUNT(*) as roulette_history_count
FROM public.game_history 
WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f' 
  AND game_type = 'roulette';