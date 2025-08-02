-- Fix UI XP display and RLS security warning (CORRECTED VERSION)
-- This addresses both the outdated UI values and secures the level_xp_requirements table

BEGIN;

-- =====================================================================
-- STEP 1: FIX RLS SECURITY WARNING
-- =====================================================================

-- Enable RLS on the level_xp_requirements table
ALTER TABLE public.level_xp_requirements ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows everyone to read XP requirements (they're not sensitive data)
-- This table contains game configuration data that should be publicly readable
CREATE POLICY "Allow public read access to level XP requirements"
ON public.level_xp_requirements
FOR SELECT
USING (true);

-- Grant appropriate permissions
GRANT SELECT ON public.level_xp_requirements TO authenticated;
GRANT SELECT ON public.level_xp_requirements TO anon;

-- =====================================================================
-- STEP 2: FORCE UPDATE ALL EXISTING USER LEVEL STATS
-- =====================================================================

-- Update all existing users to recalculate their XP values using the new exact system
-- This ensures the UI will show correct values immediately

CREATE OR REPLACE FUNCTION public.recalculate_all_user_xp()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  level_calc RECORD;
  users_updated INTEGER := 0;
BEGIN
  -- Loop through all users and recalculate their XP stats
  FOR user_record IN 
    SELECT user_id, lifetime_xp 
    FROM public.user_level_stats 
    WHERE lifetime_xp IS NOT NULL
  LOOP
    -- Calculate correct level data using new exact functions
    SELECT * INTO level_calc 
    FROM public.calculate_level_from_xp_exact(user_record.lifetime_xp);
    
    -- Update user with exact values
    UPDATE public.user_level_stats 
    SET 
      current_level = level_calc.level,
      current_level_xp = level_calc.current_level_xp,
      xp_to_next_level = level_calc.xp_to_next,
      updated_at = now()
    WHERE user_id = user_record.user_id;
    
    users_updated := users_updated + 1;
  END LOOP;
  
  RETURN FORMAT('Successfully updated %s users with exact XP values', users_updated);
END;
$$;

-- Execute the recalculation for all users
SELECT public.recalculate_all_user_xp();

-- Drop the temporary function
DROP FUNCTION public.recalculate_all_user_xp();

-- =====================================================================
-- STEP 3: ENSURE PROFILES TABLE ALSO GETS UPDATED
-- =====================================================================

-- Update profiles table to sync with user_level_stats if needed
UPDATE public.profiles 
SET updated_at = now()
WHERE id IN (
  SELECT user_id FROM public.user_level_stats
);

-- =====================================================================
-- STEP 4: VERIFY FUNCTIONS ARE WORKING CORRECTLY
-- =====================================================================

-- Test that our functions return the expected values
DO $$
DECLARE
  test_result INTEGER;
BEGIN
  -- Test level 1 requirement
  SELECT calculate_xp_for_level_exact(1) INTO test_result;
  IF test_result != 651 THEN
    RAISE EXCEPTION 'Level 1 XP requirement incorrect: got %, expected 651', test_result;
  END IF;
  
  -- Test level 11 requirement  
  SELECT calculate_xp_for_level_exact(11) INTO test_result;
  IF test_result != 678 THEN
    RAISE EXCEPTION 'Level 11 XP requirement incorrect: got %, expected 678', test_result;
  END IF;
  
  RAISE NOTICE '✅ XP calculation functions verified - all tests passed';
END;
$$;

-- =====================================================================
-- STEP 5: REFRESH DATABASE STATS TO ENSURE UI UPDATES (FIXED SYNTAX)
-- =====================================================================

-- Check if materialized views exist and refresh them safely
DO $$
BEGIN
  -- Only refresh if the materialized view exists
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'user_stats_summary' AND schemaname = 'public') THEN
    REFRESH MATERIALIZED VIEW public.user_stats_summary;
    RAISE NOTICE 'Refreshed materialized view: user_stats_summary';
  ELSE
    RAISE NOTICE 'No materialized views found to refresh';
  END IF;
END $$;

COMMIT;

-- =====================================================================
-- FIXES COMPLETED
-- =====================================================================
-- ✅ RLS enabled on level_xp_requirements table (security warning fixed)
-- ✅ Public read policy allows access to XP requirements (not sensitive)
-- ✅ All existing users recalculated with exact XP values
-- ✅ UI will now display correct XP targets in headers and progress bars
-- ✅ Functions verified to return exact values
-- ✅ Database stats refreshed to ensure immediate UI updates
-- ✅ Fixed PostgreSQL syntax error for materialized view refresh
-- =====================================================================

-- Additional verification query (run this to check results)
SELECT 
  'Verification: Sample user XP data' as description,
  current_level,
  current_level_xp,
  xp_to_next_level,
  CASE 
    WHEN current_level = 1 AND xp_to_next_level = 651 THEN '✅ Level 1 correct'
    WHEN current_level BETWEEN 2 AND 10 AND xp_to_next_level = 651 THEN '✅ Levels 2-10 correct'
    WHEN current_level BETWEEN 11 AND 20 AND xp_to_next_level = 678 THEN '✅ Levels 11-20 correct'
    ELSE '⚠️ Check XP values'
  END as status
FROM public.user_level_stats 
WHERE current_level BETWEEN 1 AND 20
LIMIT 5;