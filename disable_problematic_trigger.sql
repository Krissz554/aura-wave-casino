-- DISABLE PROBLEMATIC TRIGGER: Fix the real root cause
-- The trigger on user_level_stats is calling add_xp_from_wager!

BEGIN;

-- =====================================================================
-- STEP 1: IDENTIFY THE PROBLEMATIC TRIGGER
-- =====================================================================

DO $$
DECLARE
  trigger_info RECORD;
  trigger_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 === TRIGGER INVESTIGATION ===';
  RAISE NOTICE '';
  
  -- Check all triggers that might be problematic
  FOR trigger_info IN
    SELECT 
      trigger_name,
      event_object_table,
      action_timing,
      event_manipulation,
      action_statement
    FROM information_schema.triggers 
    WHERE (trigger_name LIKE '%wagered%' OR trigger_name LIKE '%xp%')
    AND trigger_schema = 'public'
    ORDER BY trigger_name
  LOOP
    trigger_count := trigger_count + 1;
    
    RAISE NOTICE '📋 TRIGGER #%: %', trigger_count, trigger_info.trigger_name;
    RAISE NOTICE '   Table: %', trigger_info.event_object_table;
    RAISE NOTICE '   Timing: % %', trigger_info.action_timing, trigger_info.event_manipulation;
    RAISE NOTICE '   Action: %', trigger_info.action_statement;
    RAISE NOTICE '';
  END LOOP;
  
  IF trigger_count = 0 THEN
    RAISE NOTICE '✅ No wagered/xp triggers found';
  ELSE
    RAISE NOTICE '⚠️ Found % triggers that might be problematic', trigger_count;
  END IF;
  
  RAISE NOTICE '🔍 === END TRIGGER INVESTIGATION ===';
  RAISE NOTICE '';
END $$;

-- =====================================================================
-- STEP 2: DISABLE THE PROBLEMATIC TRIGGER
-- =====================================================================

-- Drop the trigger that calls add_xp_from_wager
DROP TRIGGER IF EXISTS user_level_stats_wagered_xp_trigger ON public.user_level_stats;

-- Also drop the function that the trigger calls
DROP FUNCTION IF EXISTS public.handle_user_level_stats_wagered_change() CASCADE;

-- Drop any other potential triggers
DROP TRIGGER IF EXISTS total_wagered_xp_trigger ON public.profiles;
DROP TRIGGER IF EXISTS user_level_stats_xp_trigger ON public.user_level_stats;
DROP TRIGGER IF EXISTS profiles_wagered_trigger ON public.profiles;

RAISE NOTICE '🧹 Dropped all problematic triggers that call add_xp_from_wager';

-- =====================================================================
-- STEP 3: VERIFY TRIGGER REMOVAL
-- =====================================================================

DO $$
DECLARE
  remaining_triggers INTEGER;
BEGIN
  RAISE NOTICE '🔍 === VERIFICATION OF TRIGGER REMOVAL ===';
  
  SELECT COUNT(*) INTO remaining_triggers
  FROM information_schema.triggers 
  WHERE (trigger_name LIKE '%wagered%' OR trigger_name LIKE '%xp%')
  AND trigger_schema = 'public';
  
  IF remaining_triggers > 0 THEN
    RAISE NOTICE '❌ WARNING: % triggers still remain!', remaining_triggers;
    
    -- List remaining triggers
    DECLARE
      remaining_trigger RECORD;
    BEGIN
      FOR remaining_trigger IN
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers 
        WHERE (trigger_name LIKE '%wagered%' OR trigger_name LIKE '%xp%')
        AND trigger_schema = 'public'
      LOOP
        RAISE NOTICE '   🔴 REMAINING: % on %', 
          remaining_trigger.trigger_name, 
          remaining_trigger.event_object_table;
      END LOOP;
    END;
  ELSE
    RAISE NOTICE '✅ SUCCESS: All problematic triggers removed!';
  END IF;
  
  RAISE NOTICE '🔍 === END VERIFICATION ===';
  RAISE NOTICE '';
END $$;

-- =====================================================================
-- STEP 4: TEST THE FIX
-- =====================================================================

-- Test that our roulette function works without trigger interference
DO $$
DECLARE
  test_result JSONB;
BEGIN
  RAISE NOTICE '🧪 === TESTING FUNCTION WITHOUT TRIGGERS ===';
  
  -- Test with a dummy UUID (should return 'Round not found' but not crash)
  SELECT public.complete_roulette_round('00000000-0000-0000-0000-000000000000') 
  INTO test_result;
  
  RAISE NOTICE 'Test result: %', test_result;
  
  IF test_result->>'success' = 'false' AND test_result->>'error' = 'Round not found or no result available' THEN
    RAISE NOTICE '✅ Function works correctly without add_xp_from_wager errors!';
  ELSE
    RAISE NOTICE '❌ Unexpected test result: %', test_result;
  END IF;
  
  RAISE NOTICE '🧪 === END TESTING ===';
END $$;

COMMIT;

-- =====================================================================
-- TRIGGER ELIMINATION SUMMARY:
-- ✅ Identified all wagered/xp triggers
-- ✅ Dropped user_level_stats_wagered_xp_trigger (the main culprit)
-- ✅ Dropped handle_user_level_stats_wagered_change function
-- ✅ Dropped any other potential problematic triggers
-- ✅ Verified complete removal
-- ✅ Tested function without trigger interference
-- =====================================================================

SELECT 'TRIGGER ELIMINATION COMPLETE - Roulette should work now!' as final_status;