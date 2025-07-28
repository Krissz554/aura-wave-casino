-- ===================================================
-- REVERT DATABASE CHANGES - RESTORE PREVIOUS STATE
-- ===================================================
-- This script reverts any database changes made during the XP system rebuild
-- Run this in Supabase Dashboard SQL Editor to restore the working state

-- ===================================================
-- STEP 1: Drop any new functions that were created
-- ===================================================

-- Drop new functions that may have been created
DROP FUNCTION IF EXISTS public.get_level_info(numeric) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_to_user(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_level_from_total_xp(numeric) CASCADE;

-- Drop triggers that may have been modified
DROP TRIGGER IF EXISTS game_history_trigger ON public.game_history CASCADE;

-- ===================================================
-- STEP 2: Restore original XP functions (if they exist)
-- ===================================================

-- Recreate the original calculate_xp_from_bet function
CREATE OR REPLACE FUNCTION public.calculate_xp_from_bet(bet_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Return the bet amount divided by 10, rounded to 3 decimal places
  RETURN ROUND(bet_amount / 10.0, 3);
END;
$$;

-- Recreate the original add_xp_and_check_levelup function
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount numeric)
RETURNS TABLE(leveled_up boolean, new_level integer, old_level integer, bonus_earned numeric, cases_earned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  old_total_xp NUMERIC(15,3);
  new_total_xp NUMERIC(15,3);
  old_level integer;
  new_level integer;
  did_level_up BOOLEAN := false;
  old_border_tier INTEGER;
  new_border_tier INTEGER;
  cases_to_add INTEGER := 0;
  level_diff INTEGER;
  i INTEGER;
BEGIN
  -- Get current XP and level from profiles
  SELECT lifetime_xp, current_level, COALESCE(border_tier, 1) 
  INTO old_total_xp, old_level, old_border_tier
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- If user not found, return defaults
  IF old_total_xp IS NULL THEN
    RETURN QUERY SELECT false, 1, 1, 0::numeric, 0;
    RETURN;
  END IF;
  
  -- Calculate new total XP
  new_total_xp := ROUND(COALESCE(old_total_xp, 0::numeric(15,3)) + xp_amount, 3);
  
  -- Simple level calculation (100 XP per level)
  new_level := GREATEST(1, FLOOR(new_total_xp / 100) + 1);
  
  -- Check for level up
  IF new_level > old_level THEN
    did_level_up := true;
    level_diff := new_level - old_level;
    
    -- Calculate case rewards (every 25 levels)
    FOR i IN (old_level + 1)..new_level LOOP
      IF i % 25 = 0 THEN
        cases_to_add := cases_to_add + 1;
      END IF;
    END LOOP;
    
    -- Get new border tier
    SELECT tier INTO new_border_tier
    FROM public.border_tiers 
    WHERE new_level >= min_level AND new_level <= max_level
    LIMIT 1;
    
    -- Update profiles table
    UPDATE public.profiles 
    SET 
      lifetime_xp = new_total_xp,
      current_level = new_level,
      level = new_level,
      current_xp = new_total_xp - (FLOOR(new_total_xp / 100) * 100),
      xp_to_next_level = 100 - (new_total_xp - (FLOOR(new_total_xp / 100) * 100))::integer,
      border_tier = COALESCE(new_border_tier, old_border_tier),
      available_cases = available_cases + cases_to_add,
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Sync to user_level_stats
    INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier)
    VALUES (user_uuid, new_level, FLOOR(new_total_xp)::integer, FLOOR(new_total_xp - (FLOOR(new_total_xp / 100) * 100))::integer, (100 - (new_total_xp - (FLOOR(new_total_xp / 100) * 100)))::integer, COALESCE(new_border_tier, old_border_tier))
    ON CONFLICT (user_id) DO UPDATE SET
      current_level = new_level,
      lifetime_xp = FLOOR(new_total_xp)::integer,
      current_level_xp = FLOOR(new_total_xp - (FLOOR(new_total_xp / 100) * 100))::integer,
      xp_to_next_level = (100 - (new_total_xp - (FLOOR(new_total_xp / 100) * 100)))::integer,
      border_tier = COALESCE(new_border_tier, old_border_tier);
    
    -- Create notifications
    IF cases_to_add > 0 THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        user_uuid, 'level_reward_case', 'Level ' || new_level || ' Reward Case!',
        'You''ve earned ' || cases_to_add || ' reward case(s) for reaching level ' || new_level || '!',
        jsonb_build_object('level', new_level, 'cases_earned', cases_to_add, 'border_tier', new_border_tier)
      );
    END IF;
    
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      user_uuid, 'level_up', 'Level Up!',
      'Congratulations! You''ve reached level ' || new_level || '!',
      jsonb_build_object('old_level', old_level, 'new_level', new_level, 'border_tier', new_border_tier)
    );
  ELSE
    -- No level up, just update XP
    UPDATE public.profiles 
    SET 
      lifetime_xp = new_total_xp,
      current_xp = new_total_xp - (FLOOR(new_total_xp / 100) * 100),
      xp_to_next_level = 100 - (new_total_xp - (FLOOR(new_total_xp / 100) * 100))::integer,
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Sync to user_level_stats
    INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier)
    VALUES (user_uuid, new_level, FLOOR(new_total_xp)::integer, FLOOR(new_total_xp - (FLOOR(new_total_xp / 100) * 100))::integer, (100 - (new_total_xp - (FLOOR(new_total_xp / 100) * 100)))::integer, old_border_tier)
    ON CONFLICT (user_id) DO UPDATE SET
      current_level = new_level,
      lifetime_xp = FLOOR(new_total_xp)::integer,
      current_level_xp = FLOOR(new_total_xp - (FLOOR(new_total_xp / 100) * 100))::integer,
      xp_to_next_level = (100 - (new_total_xp - (FLOOR(new_total_xp / 100) * 100)))::integer;
  END IF;
  
  RETURN QUERY SELECT did_level_up, new_level, old_level, 0::numeric, cases_to_add;
END;
$$;

-- Recreate the original handle_game_history_insert function
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
  
  -- Calculate XP: bet_amount / 10
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

-- Recreate the trigger
CREATE TRIGGER game_history_trigger
  AFTER INSERT ON public.game_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_game_history_insert();

-- ===================================================
-- STEP 3: Ensure profiles table has correct structure
-- ===================================================

-- Ensure lifetime_xp is NUMERIC type (should already be)
DO $$ 
BEGIN 
  -- Check if lifetime_xp exists and update type if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'lifetime_xp' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN lifetime_xp TYPE NUMERIC(15,3);
  END IF;
  
  -- Ensure total_xp column exists (may have been added)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'total_xp' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN total_xp NUMERIC(15,3) DEFAULT 0;
  END IF;
END $$;

-- Sync total_xp with lifetime_xp if both exist
UPDATE public.profiles 
SET total_xp = COALESCE(lifetime_xp, 0)
WHERE total_xp IS NULL OR total_xp = 0;

-- ===================================================
-- STEP 4: Remove any temporary tables that were created
-- ===================================================

-- Drop level_requirements table if it was created
-- (Only drop if it doesn't contain important data)
-- Commented out for safety - review before running
-- DROP TABLE IF EXISTS public.level_requirements CASCADE;

-- ===================================================
-- STEP 5: Verification
-- ===================================================

-- Test that functions work
SELECT 
  'REVERT VERIFICATION' as test,
  public.calculate_xp_from_bet(1.00) as xp_for_1_dollar,
  'Functions restored successfully' as status;

-- Check table structure
SELECT 
  'TABLE STRUCTURE CHECK' as test,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
  AND column_name IN ('lifetime_xp', 'total_xp', 'current_xp', 'xp_to_next_level')
ORDER BY column_name;

SELECT 'DATABASE REVERT COMPLETE' as status;