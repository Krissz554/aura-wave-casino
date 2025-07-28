-- ===================================================
-- FIXED TOTAL WAGERED XP TRACKING - Watch user_level_stats.total_wagered
-- ===================================================
-- This fixes the trigger to watch the correct table where games actually update total_wagered

-- ===================================================
-- STEP 1: Ensure profiles table supports decimal XP
-- ===================================================

-- Update profiles table XP columns to support 3 decimal places
ALTER TABLE public.profiles 
  ALTER COLUMN lifetime_xp TYPE NUMERIC(15,3),
  ALTER COLUMN current_xp TYPE NUMERIC(15,3),
  ALTER COLUMN total_xp TYPE NUMERIC(15,3),
  ALTER COLUMN xp TYPE NUMERIC(15,3);

-- ===================================================
-- STEP 2: Create XP calculation function
-- ===================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.calculate_xp_from_bet(numeric) CASCADE;

-- Create function to calculate XP (10% of wager amount)
CREATE FUNCTION public.calculate_xp_from_bet(bet_amount numeric)
RETURNS numeric(15,3)
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Return exactly 10% of the wager amount with 3 decimal precision
  RETURN ROUND(bet_amount * 0.1, 3);
END;
$$;

-- ===================================================
-- STEP 3: Create XP awarding function
-- ===================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.add_xp_from_wager(uuid, numeric) CASCADE;

-- Create function to add XP based on wager amount and update profiles table
CREATE FUNCTION public.add_xp_from_wager(user_uuid uuid, wager_amount numeric)
RETURNS TABLE(xp_added numeric, new_lifetime_xp numeric, leveled_up boolean, new_level integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  calculated_xp NUMERIC(15,3);
  old_lifetime_xp NUMERIC(15,3);
  new_lifetime_xp NUMERIC(15,3);
  old_level INTEGER;
  new_level_data RECORD;
  did_level_up BOOLEAN := false;
BEGIN
  -- Calculate XP from wager (10% of wager amount)
  calculated_xp := public.calculate_xp_from_bet(wager_amount);
  
  -- Get current XP and level from profiles table
  SELECT lifetime_xp, current_level 
  INTO old_lifetime_xp, old_level
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- If user not found, return defaults
  IF old_lifetime_xp IS NULL THEN
    RETURN QUERY SELECT 0::numeric(15,3), 0::numeric(15,3), false, 1;
    RETURN;
  END IF;
  
  -- Calculate new lifetime XP
  new_lifetime_xp := ROUND(COALESCE(old_lifetime_xp, 0::numeric(15,3)) + calculated_xp, 3);
  
  -- Calculate level from XP (use existing function if available)
  IF EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'calculate_level_from_xp_new') THEN
    SELECT * INTO new_level_data FROM public.calculate_level_from_xp_new(FLOOR(new_lifetime_xp)::integer);
  ELSE
    -- Simple fallback level calculation
    SELECT 
      GREATEST(1, FLOOR(new_lifetime_xp / 100) + 1) as level,
      (new_lifetime_xp - (FLOOR(new_lifetime_xp / 100) * 100))::integer as current_level_xp,
      GREATEST(0, 100 - (new_lifetime_xp - (FLOOR(new_lifetime_xp / 100) * 100)))::integer as xp_to_next
    INTO new_level_data;
  END IF;
  
  -- Check for level up
  IF new_level_data.level > old_level THEN
    did_level_up := true;
  END IF;
  
  -- Update profiles table with new XP and level info (where frontend reads from)
  UPDATE public.profiles 
  SET 
    lifetime_xp = new_lifetime_xp,
    current_level = new_level_data.level,
    level = new_level_data.level,
    current_xp = new_level_data.current_level_xp,
    xp_to_next_level = new_level_data.xp_to_next,
    total_xp = new_lifetime_xp,
    xp = new_lifetime_xp,
    total_wagered = total_wagered + wager_amount, -- Also update profiles.total_wagered for consistency
    updated_at = now()
  WHERE id = user_uuid;
  
  -- Log the XP addition
  RAISE NOTICE 'WAGER XP: User % wagered $%, earned % XP (total: %)', 
    user_uuid, wager_amount, calculated_xp, new_lifetime_xp;
  
  RETURN QUERY SELECT calculated_xp, new_lifetime_xp, did_level_up, new_level_data.level;
END;
$$;

-- ===================================================
-- STEP 4: Create trigger function for user_level_stats.total_wagered changes
-- ===================================================

-- Drop existing trigger functions
DROP FUNCTION IF EXISTS public.handle_total_wagered_change() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_level_stats_wagered_change() CASCADE;

-- Create trigger function that watches user_level_stats.total_wagered changes
CREATE FUNCTION public.handle_user_level_stats_wagered_change()
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
    SELECT username INTO username_for_log FROM public.profiles WHERE id = NEW.user_id;
    
    -- Add XP based on the wager increase and update profiles table
    PERFORM public.add_xp_from_wager(NEW.user_id, wager_increase);
    
    RAISE NOTICE 'USER_LEVEL_STATS WAGER TRIGGER: User % (%) wagered additional $%, XP calculated and awarded', 
      username_for_log, NEW.user_id, wager_increase;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ===================================================
-- STEP 5: Remove old trigger and create new one on user_level_stats
-- ===================================================

-- Drop old trigger on profiles table
DROP TRIGGER IF EXISTS total_wagered_xp_trigger ON public.profiles;

-- Create trigger that fires when user_level_stats.total_wagered is updated
CREATE TRIGGER user_level_stats_wagered_xp_trigger
  AFTER UPDATE OF total_wagered ON public.user_level_stats
  FOR EACH ROW
  WHEN (NEW.total_wagered <> OLD.total_wagered)
  EXECUTE FUNCTION public.handle_user_level_stats_wagered_change();

-- ===================================================
-- STEP 6: Test the system
-- ===================================================

-- Test XP calculation
SELECT 
  'XP CALCULATION TEST' as test_name,
  public.calculate_xp_from_bet(100.00) as hundred_dollar_xp, -- Should be 10.000
  public.calculate_xp_from_bet(10.00) as ten_dollar_xp,      -- Should be 1.000
  public.calculate_xp_from_bet(1.00) as one_dollar_xp,       -- Should be 0.100
  public.calculate_xp_from_bet(0.10) as ten_cents_xp,        -- Should be 0.010
  public.calculate_xp_from_bet(0.01) as one_cent_xp;         -- Should be 0.001

-- Show new trigger exists
SELECT 
  'TRIGGER CHECK' as test_name,
  trigger_name,
  event_manipulation,
  action_timing,
  event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'user_level_stats_wagered_xp_trigger';

-- ===================================================
-- STEP 7: Manual test (optional)
-- ===================================================

-- Test by manually increasing user_level_stats.total_wagered for a user
-- This should automatically award XP and update profiles table

DO $$
DECLARE
    test_user_id uuid;
    old_total_wagered NUMERIC;
    old_lifetime_xp NUMERIC;
    new_total_wagered NUMERIC;
    new_lifetime_xp NUMERIC;
BEGIN
    -- Get a user with existing data
    SELECT user_id INTO test_user_id 
    FROM public.user_level_stats 
    WHERE total_wagered > 0 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Get current values from both tables
        SELECT total_wagered INTO old_total_wagered
        FROM public.user_level_stats 
        WHERE user_id = test_user_id;
        
        SELECT lifetime_xp INTO old_lifetime_xp
        FROM public.profiles 
        WHERE id = test_user_id;
        
        RAISE NOTICE 'TEST: User % - user_level_stats.total_wagered: $%, profiles.lifetime_xp: %', 
          test_user_id, old_total_wagered, old_lifetime_xp;
        
        -- Increase user_level_stats.total_wagered by $2.34 (should trigger +0.234 XP)
        UPDATE public.user_level_stats 
        SET total_wagered = total_wagered + 2.34
        WHERE user_id = test_user_id;
        
        RAISE NOTICE 'TEST: Added $2.34 to user_level_stats.total_wagered - trigger should award 0.234 XP to profiles';
        
        -- Check results in both tables
        SELECT total_wagered INTO new_total_wagered
        FROM public.user_level_stats 
        WHERE user_id = test_user_id;
        
        SELECT lifetime_xp INTO new_lifetime_xp
        FROM public.profiles 
        WHERE id = test_user_id;
        
        RAISE NOTICE 'TEST RESULTS: user_level_stats.total_wagered: $%, profiles.lifetime_xp: %', 
          new_total_wagered, new_lifetime_xp;
        
        IF (new_lifetime_xp - old_lifetime_xp) = 0.234 THEN
            RAISE NOTICE 'SUCCESS: XP tracking working correctly!';
        ELSE
            RAISE NOTICE 'ISSUE: Expected +0.234 XP, got +% XP', (new_lifetime_xp - old_lifetime_xp);
        END IF;
    ELSE
        RAISE NOTICE 'TEST: No users found in user_level_stats for testing';
    END IF;
END;
$$;

SELECT 'FIXED TOTAL WAGERED XP TRACKING SETUP COMPLETE' as status,
       'Trigger now watches user_level_stats.total_wagered (where games actually update)' as key_fix,
       'XP will be awarded to profiles table (where frontend reads from)' as result,
       'Frontend should detect XP changes via real-time subscriptions on profiles' as frontend_integration;