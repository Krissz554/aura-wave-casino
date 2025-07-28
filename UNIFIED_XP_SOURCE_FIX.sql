-- UNIFIED XP SOURCE FIX - Single Source of Truth
-- This ensures ALL components get the same XP data from the same source
-- Run this in Supabase Dashboard SQL Editor

-- ==================================================
-- STEP 1: Make sure profiles table has proper data types
-- ==================================================

-- Fix profiles table to have 3-decimal precision for ALL XP fields
ALTER TABLE public.profiles 
ALTER COLUMN lifetime_xp TYPE NUMERIC(15,3) 
USING lifetime_xp::NUMERIC(15,3);

ALTER TABLE public.profiles 
ALTER COLUMN current_xp TYPE NUMERIC(15,3) 
USING current_xp::NUMERIC(15,3);

-- Also fix the old 'xp' column if it exists (legacy support)
DO $$ 
BEGIN 
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'xp' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles 
    ALTER COLUMN xp TYPE NUMERIC(15,3) 
    USING xp::NUMERIC(15,3);
  END IF;
END $$;

-- ==================================================
-- STEP 2: Synchronize ALL XP data to profiles table
-- ==================================================

-- Make profiles table the SINGLE SOURCE OF TRUTH
-- Copy any missing data from user_level_stats to profiles
UPDATE public.profiles p
SET 
  current_level = COALESCE(p.current_level, uls.current_level, 1),
  current_xp = COALESCE(p.current_xp, uls.current_level_xp::numeric, 0),
  xp_to_next_level = COALESCE(p.xp_to_next_level, uls.xp_to_next_level, 100),
  lifetime_xp = GREATEST(COALESCE(p.lifetime_xp, 0), COALESCE(uls.lifetime_xp::numeric, 0)),
  border_tier = COALESCE(p.border_tier, uls.border_tier, 1)
FROM public.user_level_stats uls
WHERE p.id = uls.user_id;

-- Sync user_level_stats FROM profiles (profiles is now the master)
UPDATE public.user_level_stats uls
SET 
  current_level = p.current_level,
  current_level_xp = FLOOR(p.current_xp)::integer,
  xp_to_next_level = p.xp_to_next_level,
  lifetime_xp = FLOOR(p.lifetime_xp)::integer,
  border_tier = p.border_tier
FROM public.profiles p
WHERE uls.user_id = p.id;

-- ==================================================
-- STEP 3: Create unified XP functions
-- ==================================================

-- Drop all existing XP functions
DROP TRIGGER IF EXISTS game_history_trigger ON public.game_history;
DROP FUNCTION IF EXISTS public.calculate_xp_from_bet(numeric) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.handle_game_history_insert() CASCADE;

-- Create XP calculation function
CREATE OR REPLACE FUNCTION public.calculate_xp_from_bet(bet_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  -- Exactly 1/10 of wager amount
  RETURN ROUND(bet_amount / 10.0, 3);
END;
$function$;

-- Create unified XP update function (updates profiles as primary, syncs to user_level_stats)
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
  -- Get current data from profiles (SINGLE SOURCE OF TRUTH)
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
  
  -- Calculate new level
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
    
    -- Update profiles table (PRIMARY SOURCE)
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
    
    -- Sync to user_level_stats (SECONDARY - for compatibility)
    UPDATE public.user_level_stats 
    SET 
      current_level = new_level_calc,
      lifetime_xp = FLOOR(new_total_xp)::integer,
      current_level_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      border_tier = COALESCE(new_border_tier, old_border_tier)
    WHERE user_id = user_uuid;
    
    -- Create notifications
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
    -- No level up, just update XP in profiles (PRIMARY) and sync to user_level_stats
    UPDATE public.profiles 
    SET 
      lifetime_xp = new_total_xp,
      current_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Sync to user_level_stats
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

-- Create trigger function
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
  
  -- Calculate XP: bet_amount / 10
  calculated_xp := public.calculate_xp_from_bet(NEW.bet_amount);
  
  -- Add XP (updates profiles and syncs to user_level_stats)
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

-- Create the trigger
CREATE TRIGGER game_history_trigger
  AFTER INSERT ON public.game_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_game_history_insert();

-- ==================================================
-- STEP 4: Verification
-- ==================================================

-- Test XP calculation
SELECT 
  'XP CALCULATION TEST' as test_name,
  public.calculate_xp_from_bet(0.01) as cent_result,
  public.calculate_xp_from_bet(1.00) as dollar_result,
  public.calculate_xp_from_bet(10.00) as ten_dollar_result;

-- Check data types
SELECT 
  'DATA TYPES CHECK' as test_name,
  column_name,
  data_type,
  numeric_precision,
  numeric_scale
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('lifetime_xp', 'current_xp', 'xp')
  AND table_schema = 'public';

-- Check data consistency
SELECT 
  'DATA CONSISTENCY CHECK' as test_name,
  p.username,
  p.current_xp as profiles_current_xp,
  p.lifetime_xp as profiles_lifetime_xp,
  uls.current_level_xp as user_level_stats_current_xp,
  uls.lifetime_xp as user_level_stats_lifetime_xp
FROM public.profiles p
LEFT JOIN public.user_level_stats uls ON p.id = uls.user_id
ORDER BY p.lifetime_xp DESC
LIMIT 3;

SELECT 
  'UNIFIED XP SOURCE COMPLETE' as status,
  'profiles table is now the single source of truth with 3-decimal precision' as message,
  'All components should now show identical XP values' as result;