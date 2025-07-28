-- ===================================================
-- CLEAN XP FUNCTIONS - Remove All Conflicting Versions
-- ===================================================
-- This removes ALL versions of XP functions and recreates them cleanly
-- Run this in Supabase Dashboard SQL Editor

-- ===================================================
-- STEP 1: Drop ALL existing XP functions (all overloads)
-- ===================================================

-- Drop all possible versions of add_xp_and_check_levelup
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(user_uuid uuid, xp_amount integer) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(user_uuid uuid, xp_amount numeric) CASCADE;

-- Drop all possible versions of calculate_xp_from_bet
DROP FUNCTION IF EXISTS public.calculate_xp_from_bet(numeric) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_xp_from_bet(bet_amount numeric) CASCADE;

-- Drop all possible versions of handle_game_history_insert
DROP FUNCTION IF EXISTS public.handle_game_history_insert() CASCADE;

-- Drop any existing triggers
DROP TRIGGER IF EXISTS game_history_trigger ON public.game_history CASCADE;

-- ===================================================
-- STEP 2: Ensure table structure is correct
-- ===================================================

-- Update profiles table XP columns to support decimal precision
ALTER TABLE public.profiles 
  ALTER COLUMN lifetime_xp TYPE NUMERIC(15,3),
  ALTER COLUMN current_xp TYPE NUMERIC(15,3),
  ALTER COLUMN total_xp TYPE NUMERIC(15,3),
  ALTER COLUMN xp TYPE NUMERIC(15,3);

-- ===================================================
-- STEP 3: Create clean XP functions
-- ===================================================

-- Function 1: Calculate XP from bet (exactly 10% of wager)
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

-- Function 2: Add XP and handle level ups
CREATE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount numeric)
RETURNS TABLE(leveled_up boolean, new_level integer, old_level integer, bonus_earned numeric, cases_earned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  old_lifetime_xp NUMERIC(15,3);
  new_lifetime_xp NUMERIC(15,3);
  old_level integer;
  new_level_data record;
  did_level_up BOOLEAN := false;
  old_border_tier INTEGER;
  new_border_tier INTEGER;
  cases_to_add INTEGER := 0;
  i INTEGER;
BEGIN
  -- Get current XP and level from profiles
  SELECT lifetime_xp, current_level, COALESCE(border_tier, 1) 
  INTO old_lifetime_xp, old_level, old_border_tier
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- If user not found, return defaults
  IF old_lifetime_xp IS NULL THEN
    RETURN QUERY SELECT false, 1, 1, 0::numeric, 0;
    RETURN;
  END IF;
  
  -- Calculate new lifetime XP with 3 decimal precision
  new_lifetime_xp := ROUND(COALESCE(old_lifetime_xp, 0::numeric(15,3)) + xp_amount, 3);
  
  -- Use original level calculation function if it exists, otherwise simple calculation
  IF EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'calculate_level_from_xp_new') THEN
    -- Use original exponential level system
    SELECT * INTO new_level_data FROM public.calculate_level_from_xp_new(FLOOR(new_lifetime_xp)::integer);
  ELSE
    -- Fallback to simple level calculation (every 100 XP = 1 level)
    SELECT 
      GREATEST(1, FLOOR(new_lifetime_xp / 100) + 1) as level,
      (new_lifetime_xp - (FLOOR(new_lifetime_xp / 100) * 100))::integer as current_level_xp,
      GREATEST(0, 100 - (new_lifetime_xp - (FLOOR(new_lifetime_xp / 100) * 100)))::integer as xp_to_next
    INTO new_level_data;
  END IF;
  
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
    
    -- Update profiles table with precise decimal XP
    UPDATE public.profiles 
    SET 
      lifetime_xp = new_lifetime_xp,
      current_level = new_level_data.level,
      level = new_level_data.level,
      current_xp = new_level_data.current_level_xp,
      xp_to_next_level = new_level_data.xp_to_next,
      total_xp = new_lifetime_xp,
      xp = new_lifetime_xp,
      border_tier = COALESCE(new_border_tier, old_border_tier),
      available_cases = available_cases + cases_to_add,
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Sync to user_level_stats
    INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier)
    VALUES (user_uuid, new_level_data.level, FLOOR(new_lifetime_xp)::integer, new_level_data.current_level_xp, new_level_data.xp_to_next, COALESCE(new_border_tier, old_border_tier))
    ON CONFLICT (user_id) DO UPDATE SET
      current_level = new_level_data.level,
      lifetime_xp = FLOOR(new_lifetime_xp)::integer,
      current_level_xp = new_level_data.current_level_xp,
      xp_to_next_level = new_level_data.xp_to_next,
      border_tier = COALESCE(new_border_tier, old_border_tier),
      updated_at = now();
    
    -- Create notifications for level up
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
    -- No level up, just update XP with precise decimals
    UPDATE public.profiles 
    SET 
      lifetime_xp = new_lifetime_xp,
      current_xp = new_level_data.current_level_xp,
      xp_to_next_level = new_level_data.xp_to_next,
      total_xp = new_lifetime_xp,
      xp = new_lifetime_xp,
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Sync to user_level_stats
    INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier)
    VALUES (user_uuid, new_level_data.level, FLOOR(new_lifetime_xp)::integer, new_level_data.current_level_xp, new_level_data.xp_to_next, old_border_tier)
    ON CONFLICT (user_id) DO UPDATE SET
      current_level = new_level_data.level,
      lifetime_xp = FLOOR(new_lifetime_xp)::integer,
      current_level_xp = new_level_data.current_level_xp,
      xp_to_next_level = new_level_data.xp_to_next,
      updated_at = now();
  END IF;
  
  RETURN QUERY SELECT did_level_up, new_level_data.level, old_level, 0::numeric, cases_to_add;
END;
$$;

-- Function 3: Handle game history trigger
CREATE FUNCTION public.handle_game_history_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_name text;
  calculated_xp numeric(15,3);
BEGIN
  -- Get username for live feed
  SELECT username INTO user_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- Calculate XP: exactly 10% of bet amount
  calculated_xp := public.calculate_xp_from_bet(NEW.bet_amount);
  
  -- Add XP to user
  PERFORM public.add_xp_and_check_levelup(NEW.user_id, calculated_xp);
  
  -- Add to live feed (existing logic)
  IF NEW.game_type = 'coinflip' THEN
    INSERT INTO public.live_coinflip_feed (
      user_id, username, game_type, bet_amount, result, profit, multiplier, game_data, streak_length, action
    ) VALUES (
      NEW.user_id, user_name, NEW.game_type, NEW.bet_amount, NEW.result, NEW.profit,
      NEW.multiplier, NEW.game_data, COALESCE(NEW.streak_length, 0), 'bet'
    );
  ELSE
    INSERT INTO public.live_bet_feed (
      user_id, username, game_type, bet_amount, result, profit, multiplier, game_data, streak_length, action
    ) VALUES (
      NEW.user_id, user_name, NEW.game_type, NEW.bet_amount, NEW.result, NEW.profit,
      NEW.multiplier, NEW.game_data, COALESCE(NEW.streak_length, 0), 'bet'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- ===================================================
-- STEP 4: Create the trigger
-- ===================================================

CREATE TRIGGER game_history_trigger
  AFTER INSERT ON public.game_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_game_history_insert();

-- ===================================================
-- STEP 5: Test the functions
-- ===================================================

-- Test XP calculation
SELECT 
  'XP CALCULATION TEST' as test_name,
  public.calculate_xp_from_bet(100.00) as hundred_dollar_xp, -- Should be 10.000
  public.calculate_xp_from_bet(10.00) as ten_dollar_xp,      -- Should be 1.000
  public.calculate_xp_from_bet(1.00) as one_dollar_xp,       -- Should be 0.100
  public.calculate_xp_from_bet(0.10) as ten_cents_xp,        -- Should be 0.010
  public.calculate_xp_from_bet(0.01) as one_cent_xp;         -- Should be 0.001

-- Verify functions exist
SELECT 
  'FUNCTION CHECK' as test_name,
  COUNT(*) as function_count
FROM pg_proc 
WHERE proname IN ('calculate_xp_from_bet', 'add_xp_and_check_levelup', 'handle_game_history_insert');

-- Verify trigger exists
SELECT 
  'TRIGGER CHECK' as test_name,
  COUNT(*) as trigger_count
FROM information_schema.triggers 
WHERE trigger_name = 'game_history_trigger';

SELECT 'XP FUNCTIONS CLEANED AND REDEPLOYED SUCCESSFULLY' as status;