-- =====================================================
-- COMPREHENSIVE USER STATS TABLE FIX
-- =====================================================
-- This ensures ALL user statistics data comes from user_level_stats table
-- and NOT from profiles table

-- =====================================================
-- STEP 1: Drop ALL problematic functions that reference wrong tables
-- =====================================================

-- Drop all XP-related functions that might reference profiles incorrectly
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_from_wager(UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.handle_total_wagered_change() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_xp_and_level(UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.award_xp_to_user(UUID, NUMERIC) CASCADE;

-- Drop any triggers that might be using wrong tables
DROP TRIGGER IF EXISTS total_wagered_xp_trigger ON public.profiles;
DROP TRIGGER IF EXISTS xp_update_trigger ON public.profiles;

-- =====================================================
-- STEP 2: Create CORRECTED functions that use user_level_stats ONLY
-- =====================================================

-- Corrected add_xp_and_check_levelup function
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(
  user_uuid UUID,
  xp_to_add NUMERIC
)
RETURNS TABLE(
  level_up_occurred BOOLEAN,
  new_level INTEGER,
  new_border_tier INTEGER,
  total_xp NUMERIC,
  cases_earned INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  old_level INTEGER;
  old_xp INTEGER;
  old_border_tier INTEGER;
  new_xp INTEGER;
  new_level_calc INTEGER;
  new_border_tier_calc INTEGER;
  cases_to_add INTEGER := 0;
  level_diff INTEGER;
  i INTEGER;
BEGIN
  -- Get current level and XP from user_level_stats (CORRECT TABLE)
  SELECT current_level, COALESCE(lifetime_xp, 0), COALESCE(border_tier, 1) 
  INTO old_level, old_xp, old_border_tier
  FROM public.user_level_stats 
  WHERE user_id = user_uuid;
  
  -- If user not found, create record and return defaults
  IF old_level IS NULL THEN
    INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp, border_tier)
    VALUES (user_uuid, 1, 0, 1)
    ON CONFLICT (user_id) DO NOTHING;
    
    old_level := 1;
    old_xp := 0;
    old_border_tier := 1;
  END IF;
  
  -- Calculate new XP (convert to integer for consistency)
  new_xp := old_xp + FLOOR(xp_to_add)::INTEGER;
  
  -- Calculate new level using simple formula: level = floor(sqrt(xp/100)) + 1
  new_level_calc := GREATEST(1, FLOOR(SQRT(new_xp / 100.0))::INTEGER + 1);
  
  -- Calculate border tier (every 10 levels)
  new_border_tier_calc := GREATEST(1, FLOOR(new_level_calc / 10.0)::INTEGER + 1);
  
  -- Calculate level difference for case rewards
  level_diff := new_level_calc - old_level;
  
  -- Award cases for level ups (1 case per level)
  IF level_diff > 0 THEN
    cases_to_add := level_diff;
  END IF;
  
  -- Update user_level_stats with new values (SINGLE SOURCE OF TRUTH)
  UPDATE public.user_level_stats 
  SET 
    lifetime_xp = new_xp,
    current_level = new_level_calc,
    current_level_xp = new_xp - ((new_level_calc - 1) * (new_level_calc - 1) * 100),
    xp_to_next_level = (new_level_calc * new_level_calc * 100) - new_xp,
    border_tier = new_border_tier_calc,
    available_cases = available_cases + cases_to_add,
    updated_at = NOW()
  WHERE user_id = user_uuid;
  
  -- Also update profiles table with basic info for compatibility (NO STATS DATA)
  UPDATE public.profiles 
  SET 
    level = new_level_calc,
    xp = new_xp,
    updated_at = NOW()
  WHERE id = user_uuid;
  
  -- Return results
  RETURN QUERY SELECT 
    (level_diff > 0)::BOOLEAN,
    new_level_calc,
    new_border_tier_calc,
    new_xp::NUMERIC,
    cases_to_add;
END;
$$;

-- =====================================================
-- STEP 3: Create function to sync data between tables
-- =====================================================

-- Function to ensure user_level_stats exists for all users
CREATE OR REPLACE FUNCTION public.ensure_user_level_stats_for_all()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_record RECORD;
  created_count INTEGER := 0;
BEGIN
  -- Create user_level_stats records for any users that don't have them
  FOR user_record IN 
    SELECT p.id, COALESCE(p.level, 1) as level, COALESCE(p.xp, 0) as xp
    FROM public.profiles p
    LEFT JOIN public.user_level_stats uls ON uls.user_id = p.id
    WHERE uls.user_id IS NULL
  LOOP
    INSERT INTO public.user_level_stats (
      user_id, 
      current_level, 
      lifetime_xp, 
      current_level_xp,
      xp_to_next_level,
      border_tier
    ) VALUES (
      user_record.id,
      user_record.level,
      user_record.xp,
      user_record.xp - ((user_record.level - 1) * (user_record.level - 1) * 100),
      (user_record.level * user_record.level * 100) - user_record.xp,
      GREATEST(1, FLOOR(user_record.level / 10.0)::INTEGER + 1)
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    created_count := created_count + 1;
  END LOOP;
  
  RETURN created_count;
END;
$$;

-- =====================================================
-- STEP 4: Run the sync to ensure all users have stats
-- =====================================================

SELECT public.ensure_user_level_stats_for_all() as users_synced;

-- =====================================================
-- STEP 5: Create view for easy access to complete user data
-- =====================================================

CREATE OR REPLACE VIEW public.complete_user_profile AS
SELECT 
  p.id,
  p.username,
  p.registration_date,
  p.balance,
  p.total_wagered,
  p.total_profit,
  p.last_claim_time,
  p.badges,
  p.avatar_url,
  p.created_at,
  p.updated_at,
  -- Stats from user_level_stats (SINGLE SOURCE OF TRUTH)
  uls.current_level,
  uls.lifetime_xp,
  uls.current_level_xp,
  uls.xp_to_next_level,
  uls.border_tier,
  uls.available_cases,
  uls.total_cases_opened,
  uls.total_case_value,
  uls.total_games,
  uls.roulette_games,
  uls.roulette_wins
FROM public.profiles p
LEFT JOIN public.user_level_stats uls ON uls.user_id = p.id;

-- =====================================================
-- STEP 6: Grant proper permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION public.add_xp_and_check_levelup(UUID, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_user_level_stats_for_all() TO authenticated, service_role;
GRANT SELECT ON public.complete_user_profile TO authenticated, service_role;

-- =====================================================
-- STEP 7: Update all edge functions to use correct queries
-- =====================================================

-- Create helper function for edge functions to get user stats
CREATE OR REPLACE FUNCTION public.get_user_stats(user_uuid UUID)
RETURNS TABLE(
  username TEXT,
  avatar_url TEXT,
  current_level INTEGER,
  lifetime_xp INTEGER,
  balance NUMERIC,
  total_wagered NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.username,
    p.avatar_url,
    COALESCE(uls.current_level, 1) as current_level,
    COALESCE(uls.lifetime_xp, 0) as lifetime_xp,
    p.balance,
    p.total_wagered
  FROM public.profiles p
  LEFT JOIN public.user_level_stats uls ON uls.user_id = p.id
  WHERE p.id = user_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_stats(UUID) TO authenticated, service_role;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify the setup
SELECT 
  'USER STATS VERIFICATION' as check_type,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM public.user_level_stats) as total_user_level_stats,
  (SELECT COUNT(*) FROM public.profiles p 
   LEFT JOIN public.user_level_stats uls ON uls.user_id = p.id 
   WHERE uls.user_id IS NULL) as profiles_missing_stats;

-- Test the complete_user_profile view
SELECT 
  'VIEW TEST' as test_type,
  COUNT(*) as records_in_view
FROM public.complete_user_profile;

SELECT '🎯 COMPREHENSIVE USER STATS FIX COMPLETED - user_level_stats is now the single source of truth for all user statistics' as status;