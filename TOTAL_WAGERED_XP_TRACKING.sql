-- ===================================================
-- TOTAL WAGERED XP TRACKING - Track XP from Wager Changes
-- ===================================================
-- This creates a trigger that watches total_wagered changes and gives XP automatically

-- ===================================================
-- STEP 1: Ensure table supports decimal XP
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

-- Create function to add XP based on wager amount
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
  
  -- Get current XP and level
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
  
  -- Update profiles with new XP and level info
  UPDATE public.profiles 
  SET 
    lifetime_xp = new_lifetime_xp,
    current_level = new_level_data.level,
    level = new_level_data.level,
    current_xp = new_level_data.current_level_xp,
    xp_to_next_level = new_level_data.xp_to_next,
    total_xp = new_lifetime_xp,
    xp = new_lifetime_xp,
    updated_at = now()
  WHERE id = user_uuid;
  
  -- Log the XP addition
  RAISE NOTICE 'WAGER XP: User % wagered $%, earned % XP (total: %)', 
    user_uuid, wager_amount, calculated_xp, new_lifetime_xp;
  
  RETURN QUERY SELECT calculated_xp, new_lifetime_xp, did_level_up, new_level_data.level;
END;
$$;

-- ===================================================
-- STEP 4: Create trigger function for total_wagered changes
-- ===================================================

-- Drop existing trigger function if it exists
DROP FUNCTION IF EXISTS public.handle_total_wagered_change() CASCADE;

-- Create trigger function that watches total_wagered changes
CREATE FUNCTION public.handle_total_wagered_change()
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
    
    -- Add XP based on the wager increase
    PERFORM public.add_xp_from_wager(NEW.id, wager_increase);
    
    RAISE NOTICE 'WAGER TRIGGER: User % (%) wagered additional $%, XP calculated and awarded', 
      username_for_log, NEW.id, wager_increase;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ===================================================
-- STEP 5: Create the trigger on profiles table
-- ===================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS total_wagered_xp_trigger ON public.profiles;

-- Create trigger that fires when total_wagered is updated
CREATE TRIGGER total_wagered_xp_trigger
  AFTER UPDATE OF total_wagered ON public.profiles
  FOR EACH ROW
  WHEN (NEW.total_wagered <> OLD.total_wagered)
  EXECUTE FUNCTION public.handle_total_wagered_change();

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

-- Show trigger exists
SELECT 
  'TRIGGER CHECK' as test_name,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'total_wagered_xp_trigger';

-- ===================================================
-- STEP 7: Manual test (optional)
-- ===================================================

-- Test by manually increasing total_wagered for a user
-- This should automatically award XP via the trigger

DO $$
DECLARE
    test_user_id uuid;
    old_total_wagered NUMERIC;
    old_lifetime_xp NUMERIC;
BEGIN
    -- Get a user with existing data
    SELECT id INTO test_user_id 
    FROM public.profiles 
    WHERE total_wagered > 0 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Get current values
        SELECT total_wagered, lifetime_xp 
        INTO old_total_wagered, old_lifetime_xp
        FROM public.profiles 
        WHERE id = test_user_id;
        
        RAISE NOTICE 'TEST: User % - Current wagered: $%, Current XP: %', 
          test_user_id, old_total_wagered, old_lifetime_xp;
        
        -- Increase total_wagered by $1.23 (should trigger +0.123 XP)
        UPDATE public.profiles 
        SET total_wagered = total_wagered + 1.23
        WHERE id = test_user_id;
        
        RAISE NOTICE 'TEST: Added $1.23 to total_wagered - trigger should award 0.123 XP';
        
        -- Check results
        SELECT total_wagered, lifetime_xp 
        INTO old_total_wagered, old_lifetime_xp
        FROM public.profiles 
        WHERE id = test_user_id;
        
        RAISE NOTICE 'TEST: New wagered: $%, New XP: %', old_total_wagered, old_lifetime_xp;
    ELSE
        RAISE NOTICE 'TEST: No users found for testing';
    END IF;
END;
$$;

SELECT 'TOTAL WAGERED XP TRACKING SETUP COMPLETE' as status,
       'XP will now be automatically awarded when total_wagered increases' as result,
       'Frontend should detect XP changes via real-time subscriptions' as frontend_integration;