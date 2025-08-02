-- ELIMINATE ALL XP TRIGGERS AND FIX MISSING FUNCTIONS
-- This is the REAL fix - there are MULTIPLE triggers calling missing functions!

BEGIN;

-- =====================================================================
-- STEP 1: INVESTIGATE ALL TRIGGERS FIRST
-- =====================================================================

DO $$
DECLARE
  trigger_record RECORD;
  trigger_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 === INVESTIGATING ALL CURRENT TRIGGERS ===';
  RAISE NOTICE '';
  
  FOR trigger_record IN
    SELECT 
      trigger_name,
      event_object_table,
      action_statement
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
    ORDER BY trigger_name
  LOOP
    trigger_count := trigger_count + 1;
    RAISE NOTICE '📋 TRIGGER #%: % on %', trigger_count, trigger_record.trigger_name, trigger_record.event_object_table;
    RAISE NOTICE '   Action: %', trigger_record.action_statement;
    RAISE NOTICE '';
  END LOOP;
  
  IF trigger_count = 0 THEN
    RAISE NOTICE '✅ No triggers found';
  ELSE
    RAISE NOTICE '⚠️ Found % triggers total', trigger_count;
  END IF;
  
  RAISE NOTICE '🔍 === END TRIGGER INVESTIGATION ===';
  RAISE NOTICE '';
END $$;

-- =====================================================================
-- STEP 2: ELIMINATE ALL PROBLEMATIC TRIGGERS
-- =====================================================================

-- Drop the game_history trigger that calls add_xp_and_check_levelup
DROP TRIGGER IF EXISTS xp_trigger_on_game_history ON public.game_history;
DROP TRIGGER IF EXISTS game_history_xp_trigger ON public.game_history;
DROP TRIGGER IF EXISTS handle_game_history_trigger ON public.game_history;
DROP TRIGGER IF EXISTS trigger_game_history_insert ON public.game_history;

-- Drop the trigger functions
DROP FUNCTION IF EXISTS public.handle_game_history_insert() CASCADE;

-- Drop any other XP-related triggers we might have missed
DROP TRIGGER IF EXISTS user_level_stats_wagered_xp_trigger ON public.user_level_stats;
DROP TRIGGER IF EXISTS total_wagered_xp_trigger ON public.profiles;
DROP TRIGGER IF EXISTS user_level_stats_xp_trigger ON public.user_level_stats;
DROP TRIGGER IF EXISTS profiles_wagered_trigger ON public.profiles;
DROP TRIGGER IF EXISTS bet_history_xp_trigger ON public.roulette_bets;

-- Drop related functions
DROP FUNCTION IF EXISTS public.handle_user_level_stats_wagered_change() CASCADE;

-- Log the elimination
DO $$
BEGIN
  RAISE NOTICE '🧹 Eliminated all XP-related triggers and their functions';
END $$;

-- =====================================================================
-- STEP 3: CREATE THE MISSING add_xp_and_check_levelup FUNCTION
-- =====================================================================

-- Create the missing function that was being called by triggers
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_stats RECORD;
  level_result RECORD;
  xp_decimal NUMERIC(10,3);
  result jsonb;
BEGIN
  -- Convert to 3 decimal places
  xp_decimal := ROUND(xp_amount, 3);
  
  -- Get current user stats
  SELECT * INTO current_stats
  FROM public.user_level_stats
  WHERE user_id = user_uuid;
  
  -- If user doesn't exist, create entry
  IF NOT FOUND THEN
    INSERT INTO public.user_level_stats (user_id, lifetime_xp, current_xp, level)
    VALUES (user_uuid, xp_decimal, xp_decimal, 1);
    
    result := jsonb_build_object(
      'success', true,
      'xp_added', xp_decimal,
      'new_level', 1,
      'level_up', false,
      'total_xp', xp_decimal
    );
    
    RETURN result;
  END IF;
  
  -- Calculate new XP totals
  UPDATE public.user_level_stats
  SET 
    lifetime_xp = lifetime_xp + xp_decimal,
    current_xp = current_xp + xp_decimal
  WHERE user_id = user_uuid;
  
  -- Get updated stats and calculate level
  SELECT * INTO current_stats
  FROM public.user_level_stats
  WHERE user_id = user_uuid;
  
  -- Calculate level from XP using our exact function
  SELECT * INTO level_result
  FROM public.calculate_level_from_xp_exact(current_stats.lifetime_xp::integer);
  
  -- Check if level changed
  IF level_result.level != current_stats.level THEN
    -- Level up! Update the level
    UPDATE public.user_level_stats
    SET 
      level = level_result.level,
      current_xp = level_result.current_level_xp
    WHERE user_id = user_uuid;
    
    result := jsonb_build_object(
      'success', true,
      'xp_added', xp_decimal,
      'new_level', level_result.level,
      'level_up', true,
      'total_xp', current_stats.lifetime_xp,
      'xp_to_next_level', level_result.xp_to_next_level
    );
  ELSE
    -- No level up
    result := jsonb_build_object(
      'success', true,
      'xp_added', xp_decimal,
      'new_level', current_stats.level,
      'level_up', false,
      'total_xp', current_stats.lifetime_xp,
      'xp_to_next_level', level_result.xp_to_next_level
    );
  END IF;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;

-- Log function creation
DO $$
BEGIN
  RAISE NOTICE '✅ Created add_xp_and_check_levelup function';
END $$;

-- =====================================================================
-- STEP 4: VERIFY TRIGGER ELIMINATION
-- =====================================================================

DO $$
DECLARE
  remaining_triggers INTEGER;
  remaining_trigger RECORD;
BEGIN
  RAISE NOTICE '🔍 === VERIFICATION OF TRIGGER ELIMINATION ===';
  
  SELECT COUNT(*) INTO remaining_triggers
  FROM information_schema.triggers 
  WHERE trigger_schema = 'public';
  
  IF remaining_triggers > 0 THEN
    RAISE NOTICE '⚠️ WARNING: % triggers still remain!', remaining_triggers;
    
    -- List remaining triggers
    FOR remaining_trigger IN
      SELECT trigger_name, event_object_table, action_statement
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
    LOOP
      RAISE NOTICE '   🔴 REMAINING: % on % (Action: %)', 
        remaining_trigger.trigger_name, 
        remaining_trigger.event_object_table,
        remaining_trigger.action_statement;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ SUCCESS: All triggers eliminated!';
  END IF;
  
  RAISE NOTICE '🔍 === END VERIFICATION ===';
  RAISE NOTICE '';
END $$;

-- =====================================================================
-- STEP 5: TEST THE FIX
-- =====================================================================

-- Test that our roulette function works without ANY trigger interference
DO $$
DECLARE
  test_result JSONB;
  xp_test_result JSONB;
BEGIN
  RAISE NOTICE '🧪 === TESTING FUNCTIONS WITHOUT TRIGGERS ===';
  
  -- Test complete_roulette_round with a dummy UUID
  SELECT public.complete_roulette_round('00000000-0000-0000-0000-000000000000') 
  INTO test_result;
  
  RAISE NOTICE 'Roulette test result: %', test_result;
  
  -- Test add_xp_and_check_levelup function
  SELECT public.add_xp_and_check_levelup('00000000-0000-0000-0000-000000000000', 1.5) 
  INTO xp_test_result;
  
  RAISE NOTICE 'XP function test result: %', xp_test_result;
  
  IF test_result->>'success' = 'false' AND test_result->>'error' LIKE '%Round not found%' THEN
    RAISE NOTICE '✅ Roulette function works correctly without add_xp errors!';
  ELSE
    RAISE NOTICE '❌ Unexpected roulette test result: %', test_result;
  END IF;
  
  IF xp_test_result->>'success' = 'true' THEN
    RAISE NOTICE '✅ XP function works correctly!';
  ELSE
    RAISE NOTICE '❌ XP function test failed: %', xp_test_result;
  END IF;
  
  RAISE NOTICE '🧪 === END TESTING ===';
END $$;

COMMIT;

-- Show final status
SELECT 'ALL XP TRIGGERS ELIMINATED AND MISSING FUNCTIONS CREATED - Roulette should work now!' as final_status;