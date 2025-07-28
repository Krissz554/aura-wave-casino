-- COMPLETE XP CALCULATION FIX
-- Ensures $1 wager = 0.1 XP correctly
-- Run this entire script in Supabase Dashboard SQL Editor

-- ==================================================
-- STEP 1: Fix the XP calculation function
-- ==================================================
DROP FUNCTION IF EXISTS public.calculate_xp_from_bet(numeric);

CREATE OR REPLACE FUNCTION public.calculate_xp_from_bet(bet_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  -- $1 wager = 0.1 XP
  -- $0.50 wager = 0.05 XP  
  -- $0.10 wager = 0.01 XP
  -- $10 wager = 1.0 XP
  RETURN ROUND(bet_amount * 0.1, 2);
END;
$function$;

-- ==================================================
-- STEP 2: Fix the add_xp_and_check_levelup function
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
  old_xp NUMERIC;
  new_total_xp NUMERIC;
  level_bonus NUMERIC := 0;
  did_level_up BOOLEAN := false;
  old_border_tier INTEGER;
  new_border_tier INTEGER;
  cases_to_add INTEGER := 0;
  level_diff INTEGER;
  i INTEGER;
BEGIN
  -- Get current level and XP (use lifetime_xp from profiles)
  SELECT current_level, COALESCE(lifetime_xp, 0), COALESCE(border_tier, 1) 
  INTO old_level, old_xp, old_border_tier
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- If user not found, return default
  IF old_level IS NULL THEN
    RETURN QUERY SELECT false, 1, 0::numeric, 0;
    RETURN;
  END IF;
  
  -- Calculate new total XP (preserve decimal precision)
  new_total_xp := old_xp + xp_amount;
  
  -- Calculate new level using FLOOR to convert decimal XP to integer for level calculation
  SELECT calc.level INTO new_level_calc
  FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc;
  
  -- Check if leveled up
  IF new_level_calc > old_level THEN
    did_level_up := true;
    level_diff := new_level_calc - old_level;
    
    -- Calculate how many cases to award (every 25 levels)
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
    
    -- Update profiles with new level and XP (PRESERVE decimal precision)
    UPDATE public.profiles 
    SET 
      current_level = new_level_calc,
      lifetime_xp = new_total_xp, -- Keep as NUMERIC with decimals
      current_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      border_tier = COALESCE(new_border_tier, old_border_tier),
      available_cases = available_cases + cases_to_add,
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Update user_level_stats if it exists
    UPDATE public.user_level_stats 
    SET 
      current_level = new_level_calc,
      lifetime_xp = FLOOR(new_total_xp)::integer, -- Convert to int for backward compatibility
      current_level_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      border_tier = COALESCE(new_border_tier, old_border_tier)
    WHERE user_id = user_uuid;
    
    -- Create case reward notifications
    IF cases_to_add > 0 THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        user_uuid,
        'level_reward_case',
        'Level ' || new_level_calc || ' Reward Case!',
        'You''ve earned ' || cases_to_add || ' reward case(s) for reaching level ' || new_level_calc || '!',
        jsonb_build_object(
          'level', new_level_calc,
          'cases_earned', cases_to_add,
          'border_tier', new_border_tier
        )
      );
    END IF;
    
    -- Create level up notification
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      user_uuid,
      'level_up',
      'Level Up!',
      'Congratulations! You''ve reached level ' || new_level_calc || '!',
      jsonb_build_object(
        'old_level', old_level,
        'new_level', new_level_calc,
        'border_tier', new_border_tier
      )
    );
  ELSE
    -- Just update XP without level change (PRESERVE decimal precision)
    UPDATE public.profiles 
    SET 
      lifetime_xp = new_total_xp, -- Keep as NUMERIC with decimals
      current_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Also update user_level_stats table if it exists
    UPDATE public.user_level_stats 
    SET 
      current_level = new_level_calc,
      lifetime_xp = FLOOR(new_total_xp)::integer, -- Convert to int for backward compatibility
      current_level_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      border_tier = COALESCE(new_border_tier, old_border_tier)
    WHERE user_id = user_uuid;
  END IF;
  
  RETURN QUERY SELECT did_level_up, new_level_calc, COALESCE(level_bonus, 0), cases_to_add;
END;
$function$;

-- ==================================================
-- STEP 3: Fix the trigger function
-- ==================================================
CREATE OR REPLACE FUNCTION public.handle_game_history_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  user_name TEXT;
  calculated_xp NUMERIC;
BEGIN
  -- Get username for live feed
  SELECT username INTO user_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- Calculate XP using the correct formula: $1 wager = 0.1 XP
  calculated_xp := public.calculate_xp_from_bet(NEW.bet_amount);
  
  -- Add XP for wagering (this should now give 0.1 XP for $1 bet)
  PERFORM public.add_xp_and_check_levelup(NEW.user_id, calculated_xp);
  
  -- Add to live feed based on game type and result
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
-- STEP 4: Ensure trigger is active
-- ==================================================
DROP TRIGGER IF EXISTS game_history_trigger ON public.game_history;
CREATE TRIGGER game_history_trigger
  AFTER INSERT ON public.game_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_game_history_insert();

-- ==================================================
-- STEP 5: TEST the fix
-- ==================================================
SELECT 
  'XP CALCULATION TEST' as test_name,
  '====================' as separator,
  public.calculate_xp_from_bet(1.00) as one_dollar_equals,
  public.calculate_xp_from_bet(0.50) as fifty_cents_equals,
  public.calculate_xp_from_bet(0.10) as ten_cents_equals,
  public.calculate_xp_from_bet(10.00) as ten_dollars_equals;

-- Verify results should be:
-- one_dollar_equals = 0.10
-- fifty_cents_equals = 0.05
-- ten_cents_equals = 0.01
-- ten_dollars_equals = 1.00

SELECT 
  'DEPLOYMENT STATUS' as status,
  'XP functions updated - $1 wager now gives 0.1 XP correctly' as message;