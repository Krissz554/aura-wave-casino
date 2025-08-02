-- COMPREHENSIVE FUNCTION DEPENDENCY SCAN
-- Find EVERY hidden function call that's causing issues

BEGIN;

-- =====================================================================
-- STEP 1: SCAN ALL FUNCTIONS FOR DEPENDENCIES
-- =====================================================================

DO $$
DECLARE
  func_record RECORD;
  func_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 === COMPREHENSIVE FUNCTION SCAN ===';
  RAISE NOTICE '';
  
  -- Get ALL functions in the public schema
  FOR func_record IN
    SELECT 
      p.proname as function_name,
      pg_get_function_arguments(p.oid) as arguments,
      pg_get_function_result(p.oid) as return_type,
      pg_get_functiondef(p.oid) as function_definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('complete_roulette_round', 'roulette_completion_handler_v1', 'execute_roulette_completion', 
                      'process_roulette_round_completion', 'roulette_round_processor_final', 'complete_roulette_round_v2')
    ORDER BY p.proname
  LOOP
    func_count := func_count + 1;
    
    RAISE NOTICE '📋 FUNCTION #%: %(%)', func_count, func_record.function_name, func_record.arguments;
    RAISE NOTICE '   Returns: %', func_record.return_type;
    RAISE NOTICE '';
    RAISE NOTICE '🔍 FUNCTION DEFINITION:';
    RAISE NOTICE '%', func_record.function_definition;
    RAISE NOTICE '';
    RAISE NOTICE '=====================================';
    RAISE NOTICE '';
  END LOOP;
  
  IF func_count = 0 THEN
    RAISE NOTICE '❌ No roulette functions found!';
  ELSE
    RAISE NOTICE '✅ Found % roulette functions', func_count;
  END IF;
  
  RAISE NOTICE '🔍 === END FUNCTION SCAN ===';
  RAISE NOTICE '';
END $$;

-- =====================================================================
-- STEP 2: SEARCH FOR SPECIFIC MISSING FUNCTION CALLS
-- =====================================================================

DO $$
DECLARE
  func_record RECORD;
  search_terms TEXT[] := ARRAY[
    'add_xp_and_check_levelup',
    'add_xp_from_wager', 
    'update_user_stats_and_level',
    'ensure_user_level_stats',
    'calculate_level_from_xp',
    'calculate_xp_for_level'
  ];
  search_term TEXT;
  found_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 === SEARCHING FOR MISSING FUNCTION CALLS ===';
  RAISE NOTICE '';
  
  FOREACH search_term IN ARRAY search_terms
  LOOP
    RAISE NOTICE '🔍 Searching for calls to: %', search_term;
    
    FOR func_record IN
      SELECT 
        p.proname as function_name,
        pg_get_functiondef(p.oid) as function_definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND pg_get_functiondef(p.oid) LIKE '%' || search_term || '%'
      ORDER BY p.proname
    LOOP
      found_count := found_count + 1;
      RAISE NOTICE '   ❌ FOUND IN: % (calls %)', func_record.function_name, search_term;
    END LOOP;
  END LOOP;
  
  IF found_count = 0 THEN
    RAISE NOTICE '✅ No problematic function calls found';
  ELSE
    RAISE NOTICE '❌ Found % problematic function calls', found_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔍 === END MISSING FUNCTION SEARCH ===';
  RAISE NOTICE '';
END $$;

-- =====================================================================
-- STEP 3: LIST ALL FUNCTIONS THAT EXIST
-- =====================================================================

DO $$
DECLARE
  func_record RECORD;
  all_funcs_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 === ALL PUBLIC FUNCTIONS ===';
  RAISE NOTICE '';
  
  FOR func_record IN
    SELECT 
      p.proname as function_name,
      pg_get_function_arguments(p.oid) as arguments
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY p.proname
  LOOP
    all_funcs_count := all_funcs_count + 1;
    RAISE NOTICE '   % %(%)', all_funcs_count, func_record.function_name, func_record.arguments;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Total functions in public schema: %', all_funcs_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔍 === END ALL FUNCTIONS LIST ===';
  RAISE NOTICE '';
END $$;

-- =====================================================================
-- STEP 4: CHECK FOR TRIGGERS AGAIN
-- =====================================================================

DO $$
DECLARE
  trigger_record RECORD;
  trigger_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 === REMAINING TRIGGERS SCAN ===';
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
    RAISE NOTICE '⚠️ Found % triggers', trigger_count;
  END IF;
  
  RAISE NOTICE '🔍 === END TRIGGERS SCAN ===';
  RAISE NOTICE '';
END $$;

COMMIT;

-- Show completion
SELECT 'COMPREHENSIVE SCAN COMPLETE - Check output for hidden dependencies!' as status;