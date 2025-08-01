-- All-in-one test that shows everything in a single result
-- No need to scroll up to see results

WITH 
-- Check if function exists
function_check AS (
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'update_user_stats_and_level'
  ) as function_exists
),
-- Check if lifetime_xp column exists
column_check AS (
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_level_stats' 
      AND column_name = 'lifetime_xp'
  ) as lifetime_xp_exists
),
-- Get current stats
stats_before AS (
  SELECT 
    COALESCE(lifetime_xp, 0) as xp_before,
    COALESCE(total_games, 0) as games_before,
    COALESCE(roulette_games, 0) as roulette_before
  FROM public.user_level_stats 
  WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'
),
-- Test the function (if it exists)
function_test AS (
  SELECT 
    CASE 
      WHEN (SELECT function_exists FROM function_check) THEN
        (SELECT public.update_user_stats_and_level(
          '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'::UUID,
          'roulette', 10.0, 'win', 5.0, 0, 'red', 'red'
        ))
      ELSE '{"success": false, "error": "Function does not exist"}'::jsonb
    END as result
),
-- Get stats after test
stats_after AS (
  SELECT 
    COALESCE(lifetime_xp, 0) as xp_after,
    COALESCE(total_games, 0) as games_after,
    COALESCE(roulette_games, 0) as roulette_after
  FROM public.user_level_stats 
  WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f'
),
-- Count game history
history_count AS (
  SELECT COUNT(*) as history_entries
  FROM public.game_history 
  WHERE user_id = '7ac60cfe-e3f4-4009-81f5-e190ad6de75f' 
    AND game_type = 'roulette'
)

-- Show everything in one result
SELECT 
  '🔍 COMPREHENSIVE TEST RESULTS' as test_title,
  
  -- Function status
  CASE WHEN fc.function_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END as function_status,
  
  -- Column status  
  CASE WHEN cc.lifetime_xp_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END as lifetime_xp_column,
  
  -- Stats before
  format('XP: %s, Games: %s, Roulette: %s', 
    sb.xp_before, sb.games_before, sb.roulette_before) as stats_before,
  
  -- Function test result
  CASE 
    WHEN (ft.result->>'success')::boolean THEN '✅ SUCCESS'
    ELSE format('❌ ERROR: %s', ft.result->>'error_message')
  END as function_test_result,
  
  -- Stats after  
  format('XP: %s, Games: %s, Roulette: %s', 
    sa.xp_after, sa.games_after, sa.roulette_after) as stats_after,
    
  -- Changes
  format('XP +%s, Games +%s, Roulette +%s', 
    sa.xp_after - sb.xp_before,
    sa.games_after - sb.games_before, 
    sa.roulette_after - sb.roulette_before) as changes,
    
  -- History entries
  format('%s entries', hc.history_entries) as game_history,
  
  -- Final verdict
  CASE 
    WHEN sa.xp_after > sb.xp_before THEN '🎉 WORKING!'
    ELSE '❌ NOT WORKING'
  END as final_verdict,
  
  -- Raw function result for debugging
  ft.result as raw_function_result

FROM function_check fc
CROSS JOIN column_check cc  
CROSS JOIN stats_before sb
CROSS JOIN function_test ft
CROSS JOIN stats_after sa
CROSS JOIN history_count hc;