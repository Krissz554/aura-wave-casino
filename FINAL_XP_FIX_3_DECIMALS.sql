-- FINAL XP CALCULATION FIX - 3 DECIMAL PRECISION
-- $0.01 bet = 0.001 XP, $1.00 bet = 0.100 XP
-- Run this entire script in Supabase Dashboard SQL Editor

-- ==================================================
-- STEP 1: Ensure lifetime_xp supports 3 decimal places
-- ==================================================

-- Update profiles table to support 3 decimal places
DO $$ 
BEGIN 
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'lifetime_xp' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles 
    ALTER COLUMN lifetime_xp TYPE NUMERIC(15,3) 
    USING lifetime_xp::NUMERIC(15,3);
  END IF;
END $$;

-- ==================================================
-- STEP 2: Drop ALL existing XP functions completely
-- ==================================================

-- Drop any existing versions of the functions
DROP FUNCTION IF EXISTS public.calculate_xp_from_bet(numeric) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.handle_game_history_insert() CASCADE;

-- Drop the trigger too
DROP TRIGGER IF EXISTS game_history_trigger ON public.game_history;

-- ==================================================
-- STEP 3: Create NEW XP calculation function (3 decimals)
-- ==================================================

CREATE FUNCTION public.calculate_xp_from_bet(bet_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  -- EXACT FORMULA: XP = bet_amount / 10
  -- $0.01 bet = 0.001 XP
  -- $0.10 bet = 0.010 XP  
  -- $1.00 bet = 0.100 XP
  -- $10.00 bet = 1.000 XP
  RETURN ROUND(bet_amount / 10.0, 3);
END;
$function$;

-- ==================================================
-- STEP 4: Create NEW add_xp function (3 decimals)
-- ==================================================

CREATE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount numeric)
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
  -- Get current level and XP from profiles
  SELECT current_level, COALESCE(lifetime_xp, 0), COALESCE(border_tier, 1) 
  INTO old_level, old_xp, old_border_tier
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- If user not found, return default
  IF old_level IS NULL THEN
    RETURN QUERY SELECT false, 1, 0::numeric, 0;
    RETURN;
  END IF;
  
  -- Calculate new total XP with 3 decimal precision
  new_total_xp := ROUND(old_xp + xp_amount, 3);
  
  -- Calculate new level using the INTEGER part of total XP
  SELECT calc.level INTO new_level_calc
  FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc;
  
  -- Check if leveled up
  IF new_level_calc > old_level THEN
    did_level_up := true;
    level_diff := new_level_calc - old_level;
    
    -- Calculate cases to award (every 25 levels)
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
    
    -- Update profiles with precise 3-decimal XP
    UPDATE public.profiles 
    SET 
      current_level = new_level_calc,
      lifetime_xp = new_total_xp,
      current_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      border_tier = COALESCE(new_border_tier, old_border_tier),
      available_cases = available_cases + cases_to_add,
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Update user_level_stats 
    UPDATE public.user_level_stats 
    SET 
      current_level = new_level_calc,
      lifetime_xp = FLOOR(new_total_xp)::integer,
      current_level_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      border_tier = COALESCE(new_border_tier, old_border_tier)
    WHERE user_id = user_uuid;
    
    -- Create notifications for cases and level up
    IF cases_to_add > 0 THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        user_uuid,
        'level_reward_case',
        'Level ' || new_level_calc || ' Reward Case!',
        'You''ve earned ' || cases_to_add || ' reward case(s) for reaching level ' || new_level_calc || '!',
        jsonb_build_object('level', new_level_calc, 'cases_earned', cases_to_add, 'border_tier', new_border_tier)
      );
    END IF;
    
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      user_uuid,
      'level_up',
      'Level Up!',
      'Congratulations! You''ve reached level ' || new_level_calc || '!',
      jsonb_build_object('old_level', old_level, 'new_level', new_level_calc, 'border_tier', new_border_tier)
    );
  ELSE
    -- Just update XP without level change (preserve 3 decimals)
    UPDATE public.profiles 
    SET 
      lifetime_xp = new_total_xp,
      current_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Update user_level_stats
    UPDATE public.user_level_stats 
    SET 
      current_level = new_level_calc,
      lifetime_xp = FLOOR(new_total_xp)::integer,
      current_level_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      border_tier = COALESCE(new_border_tier, old_border_tier)
    WHERE user_id = user_uuid;
  END IF;
  
  RETURN QUERY SELECT did_level_up, new_level_calc, COALESCE(level_bonus, 0), cases_to_add;
END;
$function$;

-- ==================================================
-- STEP 5: Create NEW trigger function
-- ==================================================

CREATE FUNCTION public.handle_game_history_insert()
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
  
  -- Calculate XP: ALWAYS divide bet by 10
  calculated_xp := public.calculate_xp_from_bet(NEW.bet_amount);
  
  -- Debug: Log the actual calculation
  RAISE LOG 'XP DEBUG: Bet $%, Calculated XP: %', NEW.bet_amount, calculated_xp;
  
  -- Add XP (this MUST give bet_amount/10 as XP)
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
$function$;

-- ==================================================
-- STEP 6: Create the trigger
-- ==================================================

CREATE TRIGGER game_history_trigger
  AFTER INSERT ON public.game_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_game_history_insert();

-- ==================================================
-- STEP 7: TEST the new functions
-- ==================================================

SELECT 
  'XP CALCULATION TEST - 3 DECIMALS' as test_name,
  '=================================' as separator;

SELECT 
  'Bet Amount' as bet,
  'Expected XP' as expected,
  'Actual XP' as actual,
  'Formula: bet/10' as formula;

SELECT 
  '$0.01' as bet,
  '0.001' as expected,
  public.calculate_xp_from_bet(0.01) as actual,
  'PASS/FAIL' as status;

SELECT 
  '$0.10' as bet,
  '0.010' as expected,
  public.calculate_xp_from_bet(0.10) as actual,
  CASE WHEN public.calculate_xp_from_bet(0.10) = 0.010 THEN 'PASS' ELSE 'FAIL' END as status;

SELECT 
  '$1.00' as bet,
  '0.100' as expected,
  public.calculate_xp_from_bet(1.00) as actual,
  CASE WHEN public.calculate_xp_from_bet(1.00) = 0.100 THEN 'PASS' ELSE 'FAIL' END as status;

SELECT 
  '$10.00' as bet,
  '1.000' as expected,
  public.calculate_xp_from_bet(10.00) as actual,
  CASE WHEN public.calculate_xp_from_bet(10.00) = 1.000 THEN 'PASS' ELSE 'FAIL' END as status;

-- Final verification
SELECT 
  'DEPLOYMENT COMPLETE' as status,
  'All functions recreated with 3-decimal precision' as message,
  'Check logs for XP DEBUG messages when betting' as note;