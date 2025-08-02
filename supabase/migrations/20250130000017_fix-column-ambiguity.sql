-- Fix column ambiguity error in roulette rounds check
-- The issue is that 'status' conflicts with the RETURNS TABLE parameter

-- Drop and recreate the function with proper column qualification
DROP FUNCTION IF EXISTS public.check_roulette_rounds();

CREATE OR REPLACE FUNCTION public.check_roulette_rounds()
RETURNS TABLE(
  check_type TEXT,
  check_status TEXT,  -- Renamed from 'status' to avoid conflict
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_round RECORD;
  round_bets_count INTEGER;
  completed_rounds_count INTEGER;
  history_count INTEGER;
BEGIN
  -- Count completed rounds in last hour (qualify column names)
  SELECT COUNT(*) INTO completed_rounds_count
  FROM public.roulette_rounds rr
  WHERE rr.status = 'completed' 
    AND rr.created_at > NOW() - INTERVAL '1 hour';
  
  RETURN QUERY SELECT 
    'COMPLETED_ROUNDS'::TEXT,
    'INFO'::TEXT,
    jsonb_build_object(
      'completed_rounds_last_hour', completed_rounds_count,
      'timestamp_checked', NOW()
    );
  
  -- Get most recent round
  SELECT * INTO recent_round
  FROM public.roulette_rounds rr
  ORDER BY rr.created_at DESC
  LIMIT 1;
  
  IF recent_round IS NOT NULL THEN
    -- Count bets for this round
    SELECT COUNT(*) INTO round_bets_count
    FROM public.roulette_bets rb
    WHERE rb.round_id = recent_round.id;
    
    -- Count game history entries
    SELECT COUNT(*) INTO history_count
    FROM public.game_history gh
    WHERE gh.game_type = 'roulette'
      AND (gh.game_data->>'round_id')::uuid = recent_round.id;
    
    RETURN QUERY SELECT 
      'RECENT_ROUND'::TEXT,
      recent_round.status::TEXT,
      jsonb_build_object(
        'round_id', recent_round.id,
        'status', recent_round.status,
        'result_color', recent_round.result_color,
        'result_slot', recent_round.result_slot,
        'created_at', recent_round.created_at,
        'bets_placed', round_bets_count,
        'game_history_entries', history_count,
        'should_have_updated_stats', (recent_round.status = 'completed' AND round_bets_count > 0)
      );
  ELSE
    RETURN QUERY SELECT 
      'RECENT_ROUND'::TEXT,
      'NO_ROUNDS'::TEXT,
      jsonb_build_object('message', 'No roulette rounds found');
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_roulette_rounds() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_roulette_rounds() TO service_role;

-- Now run the fixed tests
SELECT '=== DIRECT STATS FUNCTION TEST ===' as test_section;
SELECT * FROM public.test_stats_function_direct();

SELECT '=== ROULETTE ROUNDS CHECK (FIXED) ===' as test_section;
SELECT * FROM public.check_roulette_rounds();

SELECT '=== FUNCTION STATUS CHECK ===' as test_section;
SELECT * FROM public.check_function_status();

SELECT '=== CURRENT USER STATS ===' as test_section;
SELECT 
  user_id,
  current_level,
  lifetime_xp,
  current_level_xp,
  xp_to_next_level,
  total_games,
  roulette_games,
  updated_at
FROM public.user_level_stats 
WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f';

SELECT '=== RECENT GAME HISTORY ===' as test_section;
SELECT 
  id,
  user_id,
  game_type,
  bet_amount,
  result,
  profit_loss,
  created_at,
  game_data
FROM public.game_history 
WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'
  AND game_type = 'roulette'
ORDER BY created_at DESC 
LIMIT 5;

SELECT '🎯 DIAGNOSTIC COMPLETE - Check results above!' as summary;