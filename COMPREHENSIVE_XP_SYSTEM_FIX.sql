-- ===================================================
-- COMPREHENSIVE XP SYSTEM FIX - 10% WAGER TO XP
-- ===================================================
-- This fixes the entire XP system to ensure users get exactly 10% of their wager as XP
-- $100 bet = 10 XP, $10 bet = 1 XP, $1 bet = 0.1 XP, $0.1 bet = 0.01 XP, $0.01 bet = 0.001 XP
-- Run this in Supabase Dashboard SQL Editor

-- ===================================================
-- STEP 1: Ensure proper table structure for decimal XP
-- ===================================================

-- Update profiles table XP columns to support decimal precision
ALTER TABLE public.profiles 
  ALTER COLUMN lifetime_xp TYPE NUMERIC(15,3),
  ALTER COLUMN current_xp TYPE NUMERIC(15,3),
  ALTER COLUMN total_xp TYPE NUMERIC(15,3),
  ALTER COLUMN xp TYPE NUMERIC(15,3);

-- ===================================================
-- STEP 2: Drop and recreate all XP functions with correct logic
-- ===================================================

-- Drop existing functions
DROP TRIGGER IF EXISTS game_history_trigger ON public.game_history CASCADE;
DROP FUNCTION IF EXISTS public.calculate_xp_from_bet(numeric) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.handle_game_history_insert() CASCADE;

-- Create XP calculation function: EXACTLY 10% of wager
CREATE OR REPLACE FUNCTION public.calculate_xp_from_bet(bet_amount numeric)
RETURNS numeric(15,3)
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Return exactly 10% of the wager amount with 3 decimal precision
  -- $100 -> 10.000 XP, $10 -> 1.000 XP, $1 -> 0.100 XP, $0.1 -> 0.010 XP, $0.01 -> 0.001 XP
  RETURN ROUND(bet_amount * 0.1, 3);
END;
$$;

-- Create function to add XP and handle level ups with decimal precision
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount numeric)
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
  -- Get current XP and level from profiles (lifetime_xp is the main tracker)
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
      total_xp = new_lifetime_xp, -- Keep total_xp in sync
      xp = new_lifetime_xp, -- Keep legacy xp field in sync
      border_tier = COALESCE(new_border_tier, old_border_tier),
      available_cases = available_cases + cases_to_add,
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Sync to user_level_stats (using rounded values for integer columns)
    INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier)
    VALUES (user_uuid, new_level_data.level, FLOOR(new_lifetime_xp)::integer, new_level_data.current_level_xp, new_level_data.xp_to_next, COALESCE(new_border_tier, old_border_tier))
    ON CONFLICT (user_id) DO UPDATE SET
      current_level = new_level_data.level,
      lifetime_xp = FLOOR(new_lifetime_xp)::integer,
      current_level_xp = new_level_data.current_level_xp,
      xp_to_next_level = new_level_data.xp_to_next,
      border_tier = COALESCE(new_border_tier, old_border_tier),
      updated_at = now();
    
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
    -- No level up, just update XP with precise decimals
    UPDATE public.profiles 
    SET 
      lifetime_xp = new_lifetime_xp,
      current_xp = new_level_data.current_level_xp,
      xp_to_next_level = new_level_data.xp_to_next,
      total_xp = new_lifetime_xp, -- Keep total_xp in sync
      xp = new_lifetime_xp, -- Keep legacy xp field in sync
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

-- Create trigger function for game history
CREATE OR REPLACE FUNCTION public.handle_game_history_insert()
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
  
  -- Add to live feed
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

-- Create the trigger
CREATE TRIGGER game_history_trigger
  AFTER INSERT ON public.game_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_game_history_insert();

-- ===================================================
-- STEP 3: Fix any existing XP data inconsistencies
-- ===================================================

-- Ensure all users have consistent XP data
UPDATE public.profiles 
SET 
  total_xp = COALESCE(lifetime_xp, 0),
  xp = COALESCE(lifetime_xp, 0)
WHERE total_xp IS NULL OR xp IS NULL;

-- ===================================================
-- STEP 4: Comprehensive verification tests
-- ===================================================

-- Test XP calculation with various bet amounts
SELECT 
  'XP CALCULATION VERIFICATION' as test,
  '$100 bet' as bet_desc,
  100.00 as bet_amount,
  public.calculate_xp_from_bet(100.00) as xp_earned,
  '10.000' as expected_xp
UNION ALL
SELECT 
  'XP CALCULATION VERIFICATION',
  '$10 bet',
  10.00,
  public.calculate_xp_from_bet(10.00),
  '1.000'
UNION ALL
SELECT 
  'XP CALCULATION VERIFICATION',
  '$1 bet',
  1.00,
  public.calculate_xp_from_bet(1.00),
  '0.100'
UNION ALL
SELECT 
  'XP CALCULATION VERIFICATION',
  '$0.10 bet',
  0.10,
  public.calculate_xp_from_bet(0.10),
  '0.010'
UNION ALL
SELECT 
  'XP CALCULATION VERIFICATION',
  '$0.01 bet',
  0.01,
  public.calculate_xp_from_bet(0.01),
  '0.001';

-- Verify table structure
SELECT 
  'TABLE STRUCTURE CHECK' as test,
  column_name,
  data_type,
  numeric_precision,
  numeric_scale
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
  AND column_name IN ('lifetime_xp', 'current_xp', 'total_xp', 'xp')
ORDER BY column_name;

-- Check user XP data consistency
SELECT 
  'USER DATA CONSISTENCY CHECK' as test,
  COUNT(*) as total_users,
  COUNT(CASE WHEN lifetime_xp IS NOT NULL THEN 1 END) as users_with_lifetime_xp,
  COUNT(CASE WHEN total_xp IS NOT NULL THEN 1 END) as users_with_total_xp,
  AVG(COALESCE(lifetime_xp, 0)) as avg_lifetime_xp,
  MAX(COALESCE(lifetime_xp, 0)) as max_lifetime_xp
FROM public.profiles;

-- Test functions exist and work
SELECT 
  'FUNCTION TEST' as test,
  'calculate_xp_from_bet' as function_name,
  public.calculate_xp_from_bet(50.00) as result,
  '5.000 XP expected for $50 bet' as note;

SELECT 'COMPREHENSIVE XP SYSTEM FIX COMPLETE' as status;