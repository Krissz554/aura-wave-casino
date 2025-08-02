-- =====================================================
-- CORRECTED ADD_XP_FROM_WAGER FUNCTION
-- =====================================================
-- This function properly uses user_level_stats table for lifetime_xp
-- instead of incorrectly trying to update profiles table

-- Drop any existing problematic versions
DROP FUNCTION IF EXISTS public.add_xp_from_wager(uuid, numeric) CASCADE;

-- Create corrected function that uses user_level_stats
CREATE FUNCTION public.add_xp_from_wager(user_uuid uuid, wager_amount numeric)
RETURNS TABLE(xp_gained numeric, total_xp integer, level_up boolean, new_level integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  calculated_xp NUMERIC;
  current_lifetime_xp INTEGER;
  new_lifetime_xp INTEGER;
  old_level INTEGER;
  new_level_data RECORD;
  did_level_up BOOLEAN := false;
BEGIN
  -- Calculate XP from wager (0.1 XP per dollar wagered)
  calculated_xp := wager_amount * 0.1;
  
  -- Get current XP and level from user_level_stats (correct table)
  SELECT lifetime_xp, current_level INTO current_lifetime_xp, old_level
  FROM public.user_level_stats 
  WHERE user_id = user_uuid;
  
  -- If user doesn't have stats record, create one
  IF current_lifetime_xp IS NULL THEN
    INSERT INTO public.user_level_stats (user_id, lifetime_xp, current_level)
    VALUES (user_uuid, 0, 1)
    ON CONFLICT (user_id) DO NOTHING;
    current_lifetime_xp := 0;
    old_level := 1;
  END IF;
  
  -- Calculate new total XP
  new_lifetime_xp := current_lifetime_xp + FLOOR(calculated_xp)::INTEGER;
  
  -- Calculate new level information
  SELECT * INTO new_level_data FROM public.calculate_level_from_xp_new(new_lifetime_xp);
  
  -- Check for level up
  IF new_level_data.level > old_level THEN
    did_level_up := true;
  END IF;
  
  -- Update user_level_stats with new XP and level info (CORRECT TABLE)
  UPDATE public.user_level_stats 
  SET 
    lifetime_xp = new_lifetime_xp,
    current_level = new_level_data.level,
    current_level_xp = new_level_data.current_level_xp,
    xp_to_next_level = new_level_data.xp_to_next,
    updated_at = now()
  WHERE user_id = user_uuid;
  
  -- Also update profiles table with basic level info (no lifetime_xp)
  UPDATE public.profiles 
  SET 
    level = new_level_data.level,
    xp = new_lifetime_xp,
    updated_at = now()
  WHERE id = user_uuid;
  
  -- Log the XP addition
  RAISE NOTICE 'WAGER XP: User % wagered $%, earned % XP (total: %)', 
    user_uuid, wager_amount, FLOOR(calculated_xp), new_lifetime_xp;
  
  RETURN QUERY SELECT calculated_xp, new_lifetime_xp, did_level_up, new_level_data.level;
END;
$$;

-- Create corrected trigger function that uses the fixed add_xp_from_wager
CREATE OR REPLACE FUNCTION public.handle_total_wagered_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  wager_increase NUMERIC;
  username_for_log TEXT;
BEGIN
  -- Only process if total_wagered actually increased
  IF NEW.total_wagered > OLD.total_wagered THEN
    -- Calculate the wager increase
    wager_increase := NEW.total_wagered - OLD.total_wagered;
    
    -- Get username for logging
    SELECT username INTO username_for_log FROM public.profiles WHERE id = NEW.id;
    
    -- Add XP based on the wager increase (using corrected function)
    PERFORM public.add_xp_from_wager(NEW.id, wager_increase);
    
    RAISE NOTICE 'WAGER TRIGGER: User % (%) wagered additional $%, XP calculated and awarded', 
      username_for_log, NEW.id, wager_increase;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION public.add_xp_from_wager(UUID, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_total_wagered_change() TO authenticated, service_role;