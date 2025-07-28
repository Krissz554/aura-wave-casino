-- FORCE FIX XP SYSTEM - Complete Rebuild
-- This script will completely remove and rebuild the XP system
-- Run this in Supabase Dashboard SQL Editor

-- ==================================================
-- STEP 1: FORCE DROP EVERYTHING
-- ==================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS game_history_trigger ON public.game_history CASCADE;

-- Drop all XP-related functions with CASCADE to remove dependencies
DROP FUNCTION IF EXISTS public.calculate_xp_from_bet(numeric) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.handle_game_history_insert() CASCADE;

-- Make sure profiles.lifetime_xp supports 3 decimals
ALTER TABLE public.profiles 
ALTER COLUMN lifetime_xp TYPE NUMERIC(15,3) 
USING lifetime_xp::NUMERIC(15,3);

-- ==================================================
-- STEP 2: CREATE CORRECT XP CALCULATION FUNCTION
-- ==================================================

CREATE OR REPLACE FUNCTION public.calculate_xp_from_bet(bet_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  -- FORCE: XP = bet_amount / 10 exactly
  -- $1.00 = 0.100 XP, $0.01 = 0.001 XP
  RETURN ROUND(bet_amount / 10.0, 3);
END;
$function$;

-- ==================================================
-- STEP 3: CREATE CORRECT ADD XP FUNCTION
-- ==================================================

CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount numeric)
RETURNS TABLE(leveled_up boolean, new_level integer, bonus_earned numeric, cases_earned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  old_level INTEGER;
  new_level_calc INTEGER;
  old_xp NUMERIC(15,3);
  new_total_xp NUMERIC(15,3);
  level_bonus NUMERIC := 0;
  did_level_up BOOLEAN := false;
  old_border_tier INTEGER;
  new_border_tier INTEGER;
  cases_to_add INTEGER := 0;
  level_diff INTEGER;
  i INTEGER;
BEGIN
  -- Get current data from profiles
  SELECT current_level, COALESCE(lifetime_xp, 0), COALESCE(border_tier, 1) 
  INTO old_level, old_xp, old_border_tier
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- If user not found, return defaults
  IF old_level IS NULL THEN
    RETURN QUERY SELECT false, 1, 0::numeric, 0;
    RETURN;
  END IF;
  
  -- Calculate new total XP with 3 decimal precision
  new_total_xp := ROUND(old_xp + xp_amount, 3);
  
  -- Calculate new level (use FLOOR for level calculation only)
  SELECT calc.level INTO new_level_calc
  FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc;
  
  -- Handle level up logic
  IF new_level_calc > old_level THEN
    did_level_up := true;
    level_diff := new_level_calc - old_level;
    
    -- Calculate case rewards (every 25 levels)
    FOR i IN (old_level + 1)..new_level_calc LOOP
      IF i % 25 = 0 THEN
        cases_to_add := cases_to_add + 1;
      END IF;
    END LOOP;
    
    -- Get new border tier
    SELECT tier INTO new_border_tier
    FROM public.border_tiers 
    WHERE new_level_calc >= min_level AND new_level_calc <= max_level
    LIMIT 1;
    
    -- Update profiles table with 3-decimal precision
    UPDATE public.profiles 
    SET 
      current_level = new_level_calc,
      lifetime_xp = new_total_xp, -- KEEP 3 DECIMALS
      current_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      border_tier = COALESCE(new_border_tier, old_border_tier),
      available_cases = available_cases + cases_to_add,
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Update user_level_stats table
    UPDATE public.user_level_stats 
    SET 
      current_level = new_level_calc,
      lifetime_xp = FLOOR(new_total_xp)::integer, -- Convert to int for this table
      current_level_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      border_tier = COALESCE(new_border_tier, old_border_tier)
    WHERE user_id = user_uuid;
    
    -- Create notifications for level up and cases
    IF cases_to_add > 0 THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        user_uuid, 'level_reward_case', 'Level ' || new_level_calc || ' Reward Case!',
        'You''ve earned ' || cases_to_add || ' reward case(s) for reaching level ' || new_level_calc || '!',
        jsonb_build_object('level', new_level_calc, 'cases_earned', cases_to_add, 'border_tier', new_border_tier)
      );
    END IF;
    
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      user_uuid, 'level_up', 'Level Up!',
      'Congratulations! You''ve reached level ' || new_level_calc || '!',
      jsonb_build_object('old_level', old_level, 'new_level', new_level_calc, 'border_tier', new_border_tier)
    );
  ELSE
    -- No level up, just update XP (PRESERVE 3 DECIMALS)
    UPDATE public.profiles 
    SET 
      lifetime_xp = new_total_xp, -- KEEP 3 DECIMALS
      current_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Update user_level_stats table
    UPDATE public.user_level_stats 
    SET 
      current_level = new_level_calc,
      lifetime_xp = FLOOR(new_total_xp)::integer, -- Convert to int for this table
      current_level_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      border_tier = COALESCE(new_border_tier, old_border_tier)
    WHERE user_id = user_uuid;
  END IF;
  
  RETURN QUERY SELECT did_level_up, new_level_calc, COALESCE(level_bonus, 0), cases_to_add;
END;
$function$;

-- ==================================================
-- STEP 4: CREATE CORRECT TRIGGER FUNCTION
-- ==================================================

CREATE OR REPLACE FUNCTION public.handle_game_history_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  user_name TEXT;
  calculated_xp NUMERIC(15,3);
BEGIN
  -- Get username for live feed
  SELECT username INTO user_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- FORCE CORRECT CALCULATION: bet_amount / 10
  calculated_xp := public.calculate_xp_from_bet(NEW.bet_amount);
  
  -- FORCE LOG THE CALCULATION (temporary debug)
  RAISE NOTICE 'XP CALCULATION: User %, Bet $%, Calculated XP: %', user_name, NEW.bet_amount, calculated_xp;
  
  -- Add XP using the calculated amount
  PERFORM public.add_xp_and_check_levelup(NEW.user_id, calculated_xp);
  
  -- Add to live feed based on game type
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
$function$;

-- ==================================================
-- STEP 5: CREATE THE TRIGGER
-- ==================================================

CREATE TRIGGER game_history_trigger
  AFTER INSERT ON public.game_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_game_history_insert();

-- ==================================================
-- STEP 6: VERIFICATION TESTS
-- ==================================================

-- Test the functions work correctly
SELECT 
  'VERIFICATION TEST' as test_name,
  '=================' as separator;

-- Test XP calculation function
SELECT 
  'XP Function Test' as test_type,
  public.calculate_xp_from_bet(0.01) as cent_result,
  public.calculate_xp_from_bet(1.00) as dollar_result,
  public.calculate_xp_from_bet(10.00) as ten_dollar_result;

-- Expected results:
-- cent_result = 0.001
-- dollar_result = 0.100  
-- ten_dollar_result = 1.000

-- Check table structure
SELECT 
  'Table Structure' as test_type,
  column_name,
  data_type,
  numeric_precision,
  numeric_scale
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name = 'lifetime_xp'
  AND table_schema = 'public';

-- Expected: data_type = numeric, numeric_precision = 15, numeric_scale = 3

SELECT 
  'DEPLOYMENT COMPLETE' as status,
  'XP system forcefully rebuilt with correct /10 formula' as message,
  'Watch for NOTICE messages in logs when betting' as debug_info;