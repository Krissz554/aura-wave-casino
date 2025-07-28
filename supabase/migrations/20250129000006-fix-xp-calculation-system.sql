-- Fix XP Calculation System
-- $1 wager = 0.1 XP (so $10 wager = 1 XP, $0.10 wager = 0.01 XP)

-- Step 1: Update the add_xp_and_check_levelup function to handle decimal XP
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount numeric)
 RETURNS TABLE(leveled_up boolean, new_level integer, bonus_earned numeric, cases_earned integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
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
  
  -- Calculate new total XP (keep as numeric for precision)
  new_total_xp := old_xp + xp_amount;
  
  -- Calculate new level (convert to integer for level calculation)
  SELECT calc.level INTO new_level_calc
  FROM public.calculate_level_from_xp(new_total_xp::integer) calc;
  
  -- Check if leveled up
  IF new_level_calc > old_level THEN
    did_level_up := true;
    level_diff := new_level_calc - old_level;
    
    -- Calculate how many cases to award (every 25 levels)
    FOR i IN (old_level + 1)..new_level_calc LOOP
      IF i % 25 = 0 THEN
        cases_to_add := cases_to_add + 1;
        
        -- Create case reward entry
        INSERT INTO public.case_rewards (user_id, level_unlocked, rarity, reward_amount)
        VALUES (user_uuid, i, 'pending', 0);
      END IF;
    END LOOP;
    
    -- Calculate new border tier
    SELECT tier INTO new_border_tier
    FROM public.border_tiers
    WHERE new_level_calc >= min_level AND new_level_calc <= max_level;
    
    -- Update profile with new level, XP, border tier, and cases
    UPDATE public.profiles 
    SET 
      current_level = new_level_calc,
      lifetime_xp = new_total_xp,
      current_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(new_total_xp::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(new_total_xp::integer) calc),
      border_tier = COALESCE(new_border_tier, old_border_tier),
      available_cases = available_cases + cases_to_add,
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Create notifications for level-up and cases
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
    -- Just update XP without level change
    UPDATE public.profiles 
    SET 
      lifetime_xp = new_total_xp,
      current_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(new_total_xp::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(new_total_xp::integer) calc),
      updated_at = now()
    WHERE id = user_uuid;
  END IF;
  
  -- Also update user_level_stats table if it exists
  UPDATE public.user_level_stats 
  SET 
    current_level = new_level_calc,
    lifetime_xp = new_total_xp::integer,
    current_level_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(new_total_xp::integer) calc),
    xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(new_total_xp::integer) calc),
    border_tier = COALESCE(new_border_tier, old_border_tier)
  WHERE user_id = user_uuid;
  
  RETURN QUERY SELECT did_level_up, new_level_calc, COALESCE(level_bonus, 0), cases_to_add;
END;
$function$;

-- Step 2: Create a helper function to calculate XP from bet amount
CREATE OR REPLACE FUNCTION public.calculate_xp_from_bet(bet_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  -- $1 wager = 0.1 XP
  -- So bet_amount * 0.1 = XP earned
  -- Round to 2 decimal places for precision
  RETURN ROUND(bet_amount * 0.1, 2);
END;
$function$;

-- Step 3: Update the trigger function to use the correct XP calculation
CREATE OR REPLACE FUNCTION public.handle_game_history_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  user_name TEXT;
  calculated_xp NUMERIC;
BEGIN
  -- Get username for live feed
  SELECT username INTO user_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- Calculate XP using the correct formula: $1 wager = 0.1 XP
  calculated_xp := public.calculate_xp_from_bet(NEW.bet_amount);
  
  -- Always add XP for wagering regardless of game type
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

-- Step 4: Ensure lifetime_xp column is NUMERIC for decimal precision
DO $$ 
BEGIN
  -- Check if lifetime_xp is not already numeric
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'lifetime_xp' 
    AND data_type = 'integer'
  ) THEN
    -- Convert integer to numeric for better precision
    ALTER TABLE public.profiles 
    ALTER COLUMN lifetime_xp TYPE NUMERIC(12,2) USING lifetime_xp::NUMERIC(12,2);
  END IF;
END $$;

-- Step 5: Update any existing triggers to use the new system
DROP TRIGGER IF EXISTS game_history_trigger ON public.game_history;
CREATE TRIGGER game_history_trigger
  AFTER INSERT ON public.game_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_game_history_insert();

-- Step 6: Create a migration function to fix existing user XP if needed
-- (This would recalculate all XP based on total wagered amounts)
CREATE OR REPLACE FUNCTION public.migrate_existing_user_xp()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  user_record RECORD;
  correct_lifetime_xp NUMERIC;
  correct_level_data RECORD;
BEGIN
  -- For each user, recalculate XP based on total_wagered
  FOR user_record IN 
    SELECT id, total_wagered, current_level, lifetime_xp
    FROM public.profiles 
    WHERE total_wagered > 0
  LOOP
    -- Calculate correct lifetime XP: total_wagered * 0.1
    correct_lifetime_xp := ROUND(user_record.total_wagered * 0.1, 2);
    
    -- Get correct level data
    SELECT level, current_level_xp, xp_to_next 
    INTO correct_level_data
    FROM public.calculate_level_from_xp(correct_lifetime_xp::integer);
    
    -- Update the user's profile
    UPDATE public.profiles
    SET 
      lifetime_xp = correct_lifetime_xp,
      current_level = correct_level_data.level,
      current_xp = correct_level_data.current_level_xp,
      xp_to_next_level = correct_level_data.xp_to_next,
      updated_at = now()
    WHERE id = user_record.id;
    
    -- Also update user_level_stats if it exists
    UPDATE public.user_level_stats
    SET 
      lifetime_xp = correct_lifetime_xp::integer,
      current_level = correct_level_data.level,
      current_level_xp = correct_level_data.current_level_xp,
      xp_to_next_level = correct_level_data.xp_to_next
    WHERE user_id = user_record.id;
    
    RAISE NOTICE 'Updated user % - Total wagered: %, New XP: %, New Level: %', 
      user_record.id, user_record.total_wagered, correct_lifetime_xp, correct_level_data.level;
  END LOOP;
  
  RAISE NOTICE 'XP migration completed for all users';
END;
$function$;

-- Step 7: Run the migration to fix existing data
SELECT public.migrate_existing_user_xp();

-- Step 8: Add comments for documentation
COMMENT ON FUNCTION public.calculate_xp_from_bet(numeric) IS 'Calculates XP from bet amount: $1 wager = 0.1 XP';
COMMENT ON FUNCTION public.add_xp_and_check_levelup(uuid, numeric) IS 'Adds XP to user and checks for level ups, handles decimal XP amounts';
COMMENT ON FUNCTION public.migrate_existing_user_xp() IS 'One-time migration function to recalculate all user XP based on total wagered';