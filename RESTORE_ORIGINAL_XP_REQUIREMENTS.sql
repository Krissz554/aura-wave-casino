-- ===================================================
-- RESTORE ORIGINAL XP REQUIREMENTS SYSTEM
-- ===================================================
-- This restores the original XP requirements where level 2 = 916 XP
-- Uses the original exponential growth formula with base 915.75 and factor 1.2
-- Run this in Supabase Dashboard SQL Editor

-- ===================================================
-- STEP 1: Drop any new level requirements table
-- ===================================================

-- Drop the simplified level requirements table if it exists
DROP TABLE IF EXISTS public.level_requirements CASCADE;

-- ===================================================
-- STEP 2: Restore original XP calculation functions
-- ===================================================

-- Recreate the original XP calculation function with the proper formula
CREATE OR REPLACE FUNCTION public.calculate_xp_for_level_new(target_level integer)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  base_xp CONSTANT NUMERIC := 915.75;
  growth_factor CONSTANT NUMERIC := 1.2;
  step INTEGER;
  level_xp INTEGER;
BEGIN
  IF target_level <= 1 THEN
    RETURN 0;
  END IF;
  
  step := FLOOR((target_level - 1) / 10);
  level_xp := ROUND(base_xp * POWER(growth_factor, step));
  
  RETURN level_xp;
END;
$function$;

-- Create function to calculate level from XP with original precision
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp_new(total_xp integer)
RETURNS TABLE(level integer, current_level_xp integer, xp_to_next integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  current_level_num INTEGER := 1;
  remaining_xp INTEGER;
  xp_for_current_level INTEGER;
  xp_for_next_level INTEGER;
BEGIN
  -- Handle edge cases
  IF total_xp <= 0 THEN
    RETURN QUERY SELECT 1, 0, public.calculate_xp_for_level_new(2);
    RETURN;
  END IF;
  
  remaining_xp := total_xp;
  
  -- Find current level by subtracting XP requirements
  FOR level_check IN 2..1000 LOOP
    xp_for_current_level := public.calculate_xp_for_level_new(level_check);
    
    IF remaining_xp < xp_for_current_level THEN
      current_level_num := level_check - 1;
      EXIT;
    END IF;
    
    remaining_xp := remaining_xp - xp_for_current_level;
    
    -- If we've reached level 1000
    IF level_check = 1000 AND remaining_xp >= 0 THEN
      current_level_num := 1000;
      remaining_xp := LEAST(remaining_xp, xp_for_current_level - 1);
      EXIT;
    END IF;
  END LOOP;
  
  -- Calculate XP to next level
  IF current_level_num >= 1000 THEN
    xp_for_next_level := 0;
  ELSE
    xp_for_next_level := public.calculate_xp_for_level_new(current_level_num + 1) - remaining_xp;
  END IF;
  
  RETURN QUERY SELECT 
    current_level_num,
    remaining_xp,
    xp_for_next_level;
END;
$function$;

-- ===================================================
-- STEP 3: Update XP functions to use original system
-- ===================================================

-- Update the add_xp_and_check_levelup function to use original calculations
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount numeric)
RETURNS TABLE(leveled_up boolean, new_level integer, old_level integer, bonus_earned numeric, cases_earned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  old_total_xp integer;
  new_total_xp integer;
  old_level integer;
  new_level_data record;
  did_level_up BOOLEAN := false;
  old_border_tier INTEGER;
  new_border_tier INTEGER;
  cases_to_add INTEGER := 0;
  i INTEGER;
BEGIN
  -- Get current XP and level from profiles (use lifetime_xp as integer for original system)
  SELECT FLOOR(lifetime_xp)::integer, current_level, COALESCE(border_tier, 1) 
  INTO old_total_xp, old_level, old_border_tier
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- If user not found, return defaults
  IF old_total_xp IS NULL THEN
    RETURN QUERY SELECT false, 1, 1, 0::numeric, 0;
    RETURN;
  END IF;
  
  -- Calculate new total XP (convert to integer for original system)
  new_total_xp := old_total_xp + FLOOR(xp_amount)::integer;
  
  -- Get new level data using original calculation
  SELECT * INTO new_level_data FROM public.calculate_level_from_xp_new(new_total_xp);
  
  -- Check for level up
  IF new_level_data.level > old_level THEN
    did_level_up := true;
    
    -- Calculate case rewards (every 25 levels)
    FOR i IN (old_level + 1)..new_level_data.level LOOP
      IF i % 25 = 0 THEN
        cases_to_add := cases_to_add + 1;
      END IF;
    END LOOP;
    
    -- Get new border tier
    SELECT tier INTO new_border_tier
    FROM public.border_tiers 
    WHERE new_level_data.level >= min_level AND new_level_data.level <= max_level
    LIMIT 1;
    
    -- Update profiles table with original system values
    UPDATE public.profiles 
    SET 
      lifetime_xp = new_total_xp,
      current_level = new_level_data.level,
      level = new_level_data.level,
      current_xp = new_level_data.current_level_xp,
      xp_to_next_level = new_level_data.xp_to_next,
      total_xp = new_total_xp, -- Keep total_xp in sync
      border_tier = COALESCE(new_border_tier, old_border_tier),
      available_cases = available_cases + cases_to_add,
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Sync to user_level_stats
    INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier)
    VALUES (user_uuid, new_level_data.level, new_total_xp, new_level_data.current_level_xp, new_level_data.xp_to_next, COALESCE(new_border_tier, old_border_tier))
    ON CONFLICT (user_id) DO UPDATE SET
      current_level = new_level_data.level,
      lifetime_xp = new_total_xp,
      current_level_xp = new_level_data.current_level_xp,
      xp_to_next_level = new_level_data.xp_to_next,
      border_tier = COALESCE(new_border_tier, old_border_tier);
    
    -- Create notifications
    IF cases_to_add > 0 THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        user_uuid, 'level_reward_case', 'Level ' || new_level_data.level || ' Reward Case!',
        'You''ve earned ' || cases_to_add || ' reward case(s) for reaching level ' || new_level_data.level || '!',
        jsonb_build_object('level', new_level_data.level, 'cases_earned', cases_to_add, 'border_tier', new_border_tier)
      );
    END IF;
    
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      user_uuid, 'level_up', 'Level Up!',
      'Congratulations! You''ve reached level ' || new_level_data.level || '!',
      jsonb_build_object('old_level', old_level, 'new_level', new_level_data.level, 'border_tier', new_border_tier)
    );
  ELSE
    -- No level up, just update XP
    UPDATE public.profiles 
    SET 
      lifetime_xp = new_total_xp,
      current_xp = new_level_data.current_level_xp,
      xp_to_next_level = new_level_data.xp_to_next,
      total_xp = new_total_xp, -- Keep total_xp in sync
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Sync to user_level_stats
    INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier)
    VALUES (user_uuid, new_level_data.level, new_total_xp, new_level_data.current_level_xp, new_level_data.xp_to_next, old_border_tier)
    ON CONFLICT (user_id) DO UPDATE SET
      current_level = new_level_data.level,
      lifetime_xp = new_total_xp,
      current_level_xp = new_level_data.current_level_xp,
      xp_to_next_level = new_level_data.xp_to_next;
  END IF;
  
  RETURN QUERY SELECT did_level_up, new_level_data.level, old_level, 0::numeric, cases_to_add;
END;
$$;

-- ===================================================
-- STEP 4: Recalculate all user levels with original system
-- ===================================================

-- Update all existing users to use the original level calculation
DO $$
DECLARE
    user_record record;
    level_data record;
    total_xp_int integer;
BEGIN
    FOR user_record IN 
        SELECT id, FLOOR(COALESCE(lifetime_xp, 0))::integer as lifetime_xp_int 
        FROM public.profiles 
    LOOP
        -- Get level data using original calculation
        SELECT * INTO level_data 
        FROM public.calculate_level_from_xp_new(user_record.lifetime_xp_int);
        
        -- Update user's profile with original system
        UPDATE public.profiles 
        SET 
            current_level = level_data.level,
            level = level_data.level,
            current_xp = level_data.current_level_xp,
            xp_to_next_level = level_data.xp_to_next,
            total_xp = user_record.lifetime_xp_int -- Keep in sync
        WHERE id = user_record.id;
    END LOOP;
END $$;

-- Sync user_level_stats with recalculated data
INSERT INTO public.user_level_stats (
  user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier
)
SELECT 
  p.id,
  p.current_level,
  FLOOR(p.lifetime_xp)::integer,
  p.current_xp,
  p.xp_to_next_level,
  p.border_tier
FROM public.profiles p
ON CONFLICT (user_id) DO UPDATE SET
  current_level = EXCLUDED.current_level,
  lifetime_xp = EXCLUDED.lifetime_xp,
  current_level_xp = EXCLUDED.current_level_xp,
  xp_to_next_level = EXCLUDED.xp_to_next_level,
  border_tier = EXCLUDED.border_tier;

-- ===================================================
-- STEP 5: Verification Tests
-- ===================================================

-- Test the original XP requirements
SELECT 
  'ORIGINAL XP REQUIREMENTS TEST' as test,
  public.calculate_xp_for_level_new(2) as level_2_requirement, -- Should be 916
  public.calculate_xp_for_level_new(3) as level_3_requirement,
  public.calculate_xp_for_level_new(10) as level_10_requirement,
  public.calculate_xp_for_level_new(11) as level_11_requirement; -- Should jump due to step function

-- Test level calculation with sample XP amounts
SELECT 
  'LEVEL CALCULATION TEST' as test,
  916 as input_xp,
  level,
  current_level_xp,
  xp_to_next
FROM public.calculate_level_from_xp_new(916); -- Should be level 2

-- Show some example level requirements
SELECT 
  'LEVEL REQUIREMENTS EXAMPLES' as test,
  level_num,
  public.calculate_xp_for_level_new(level_num) as xp_required
FROM generate_series(1, 20) as level_num;

-- Check user data consistency
SELECT 
  'USER DATA CHECK' as test,
  COUNT(*) as total_users,
  AVG(current_level) as avg_level,
  MAX(lifetime_xp) as max_xp
FROM public.profiles;

SELECT 'ORIGINAL XP REQUIREMENTS RESTORED' as status;