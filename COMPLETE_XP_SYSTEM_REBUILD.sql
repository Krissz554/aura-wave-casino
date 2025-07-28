-- ===================================================
-- COMPLETE XP SYSTEM REBUILD - SINGLE SOURCE OF TRUTH
-- ===================================================
-- This completely rebuilds the XP system with ONE single XP column
-- All XP displays will pull from this single source
-- Run this in Supabase Dashboard SQL Editor

-- ===================================================
-- STEP 1: Clean up existing XP system completely
-- ===================================================

-- Drop all existing XP-related functions and triggers
DROP TRIGGER IF EXISTS game_history_trigger ON public.game_history CASCADE;
DROP FUNCTION IF EXISTS public.calculate_xp_from_bet(numeric) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.handle_game_history_insert() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_level_from_total_xp(numeric) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_level_from_xp(integer) CASCADE;

-- ===================================================
-- STEP 2: Simplify profiles table to ONE XP column
-- ===================================================

-- Update profiles table to have precise XP tracking
ALTER TABLE public.profiles 
  ALTER COLUMN total_xp TYPE NUMERIC(15,3),
  ALTER COLUMN total_xp SET DEFAULT 0,
  ALTER COLUMN total_xp SET NOT NULL;

-- Consolidate all existing XP into single total_xp column
UPDATE public.profiles 
SET total_xp = GREATEST(
  COALESCE(total_xp, 0),
  COALESCE(lifetime_xp, 0),
  COALESCE(current_xp, 0),
  COALESCE(xp, 0)
);

-- Remove redundant XP columns (keep for compatibility but don't use)
-- We'll keep them to avoid breaking existing queries but total_xp is the only source

-- ===================================================
-- STEP 3: Create level requirements table
-- ===================================================

-- Ensure level_requirements table exists with proper structure
DROP TABLE IF EXISTS public.level_requirements CASCADE;
CREATE TABLE public.level_requirements (
  level integer PRIMARY KEY,
  total_xp_required numeric(15,3) NOT NULL,
  xp_for_this_level numeric(15,3) NOT NULL DEFAULT 100
);

-- Insert level 1-30 requirements (exponential growth)
INSERT INTO public.level_requirements (level, total_xp_required, xp_for_this_level) VALUES
(1, 0, 0),                    -- Level 1: 0 XP total
(2, 100, 100),                -- Level 2: 100 XP total (100 XP needed)
(3, 250, 150),                -- Level 3: 250 XP total (150 XP needed)
(4, 450, 200),                -- Level 4: 450 XP total (200 XP needed)
(5, 700, 250),                -- Level 5: 700 XP total (250 XP needed)
(6, 1000, 300),               -- Level 6: 1000 XP total (300 XP needed)
(7, 1350, 350),               -- Level 7: 1350 XP total (350 XP needed)
(8, 1750, 400),               -- Level 8: 1750 XP total (400 XP needed)
(9, 2200, 450),               -- Level 9: 2200 XP total (450 XP needed)
(10, 2700, 500),              -- Level 10: 2700 XP total (500 XP needed)
(11, 3250, 550),              -- Level 11: 3250 XP total (550 XP needed)
(12, 3850, 600),              -- Level 12: 3850 XP total (600 XP needed)
(13, 4500, 650),              -- Level 13: 4500 XP total (650 XP needed)
(14, 5200, 700),              -- Level 14: 5200 XP total (700 XP needed)
(15, 5950, 750),              -- Level 15: 5950 XP total (750 XP needed)
(16, 6750, 800),              -- Level 16: 6750 XP total (800 XP needed)
(17, 7600, 850),              -- Level 17: 7600 XP total (850 XP needed)
(18, 8500, 900),              -- Level 18: 8500 XP total (900 XP needed)
(19, 9450, 950),              -- Level 19: 9450 XP total (950 XP needed)
(20, 10450, 1000),            -- Level 20: 10450 XP total (1000 XP needed)
(21, 11500, 1050),            -- Level 21: 11500 XP total (1050 XP needed)
(22, 12600, 1100),            -- Level 22: 12600 XP total (1100 XP needed)
(23, 13750, 1150),            -- Level 23: 13750 XP total (1150 XP needed)
(24, 14950, 1200),            -- Level 24: 14950 XP total (1200 XP needed)
(25, 16200, 1250),            -- Level 25: 16200 XP total (1250 XP needed) + CASE REWARD
(26, 17500, 1300),            -- Level 26: 17500 XP total (1300 XP needed)
(27, 18850, 1350),            -- Level 27: 18850 XP total (1350 XP needed)
(28, 20250, 1400),            -- Level 28: 20250 XP total (1400 XP needed)
(29, 21700, 1450),            -- Level 29: 21700 XP total (1450 XP needed)
(30, 23200, 1500);            -- Level 30: 23200 XP total (1500 XP needed)

-- Generate levels 31-100 with increasing XP requirements
DO $$
DECLARE
    current_level integer := 31;
    current_total_xp numeric(15,3) := 23200;
    current_level_xp numeric(15,3) := 1500;
BEGIN
    WHILE current_level <= 100 LOOP
        current_level_xp := current_level_xp + 50; -- Increase by 50 each level
        current_total_xp := current_total_xp + current_level_xp;
        
        INSERT INTO public.level_requirements (level, total_xp_required, xp_for_this_level)
        VALUES (current_level, current_total_xp, current_level_xp);
        
        current_level := current_level + 1;
    END LOOP;
END $$;

-- ===================================================
-- STEP 4: Create simplified XP functions
-- ===================================================

-- Function to calculate XP from bet amount (EXACTLY 1/10 of wager)
CREATE OR REPLACE FUNCTION public.calculate_xp_from_bet(bet_amount numeric)
RETURNS numeric(15,3)
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Exactly 1/10 of the wager amount, rounded to 3 decimal places
  RETURN ROUND(bet_amount / 10.0, 3);
END;
$$;

-- Function to get user's current level info from total XP
CREATE OR REPLACE FUNCTION public.get_level_info(user_total_xp numeric)
RETURNS TABLE(
  current_level integer,
  current_level_xp numeric(15,3),
  xp_to_next_level numeric(15,3),
  next_level_total_xp numeric(15,3),
  progress_percentage numeric(5,2)
)
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_level integer := 1;
  level_start_xp numeric(15,3) := 0;
  level_end_xp numeric(15,3) := 100;
  xp_in_level numeric(15,3);
  xp_needed numeric(15,3);
  progress numeric(5,2);
BEGIN
  -- Find current level
  SELECT lr.level, lr.total_xp_required, 
         COALESCE(next_lr.total_xp_required, lr.total_xp_required + 5000) -- Default for max level
  INTO user_level, level_start_xp, level_end_xp
  FROM public.level_requirements lr
  LEFT JOIN public.level_requirements next_lr ON next_lr.level = lr.level + 1
  WHERE lr.total_xp_required <= user_total_xp
  ORDER BY lr.level DESC
  LIMIT 1;
  
  -- Default to level 1 if no level found
  IF user_level IS NULL THEN
    user_level := 1;
    level_start_xp := 0;
    level_end_xp := 100;
  END IF;
  
  -- Calculate progress within current level
  xp_in_level := user_total_xp - level_start_xp;
  xp_needed := level_end_xp - user_total_xp;
  
  -- Calculate progress percentage
  IF level_end_xp > level_start_xp THEN
    progress := ROUND((xp_in_level / (level_end_xp - level_start_xp)) * 100, 2);
  ELSE
    progress := 100.00; -- Max level reached
  END IF;
  
  -- Ensure non-negative values
  xp_in_level := GREATEST(xp_in_level, 0);
  xp_needed := GREATEST(xp_needed, 0);
  progress := GREATEST(LEAST(progress, 100.00), 0.00);
  
  RETURN QUERY SELECT 
    user_level,
    xp_in_level,
    xp_needed,
    level_end_xp,
    progress;
END;
$$;

-- Function to add XP and handle level ups
CREATE OR REPLACE FUNCTION public.add_xp_to_user(user_uuid uuid, xp_amount numeric)
RETURNS TABLE(
  leveled_up boolean,
  new_level integer,
  old_level integer,
  new_total_xp numeric(15,3)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  old_total_xp numeric(15,3);
  new_total_xp numeric(15,3);
  old_level_info record;
  new_level_info record;
  did_level_up boolean := false;
  cases_to_add integer := 0;
  i integer;
BEGIN
  -- Get current total XP
  SELECT total_xp INTO old_total_xp
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- If user not found, return defaults
  IF old_total_xp IS NULL THEN
    RETURN QUERY SELECT false, 1, 1, 0::numeric(15,3);
    RETURN;
  END IF;
  
  -- Calculate new total XP
  new_total_xp := ROUND(old_total_xp + xp_amount, 3);
  
  -- Get old and new level info
  SELECT * INTO old_level_info FROM public.get_level_info(old_total_xp);
  SELECT * INTO new_level_info FROM public.get_level_info(new_total_xp);
  
  -- Check for level up
  IF new_level_info.current_level > old_level_info.current_level THEN
    did_level_up := true;
    
    -- Calculate case rewards (every 25 levels)
    FOR i IN (old_level_info.current_level + 1)..new_level_info.current_level LOOP
      IF i % 25 = 0 THEN
        cases_to_add := cases_to_add + 1;
      END IF;
    END LOOP;
    
    -- Update user with new XP and level info
    UPDATE public.profiles 
    SET 
      total_xp = new_total_xp,
      level = new_level_info.current_level,
      current_level = new_level_info.current_level,
      -- Update legacy fields for compatibility
      lifetime_xp = new_total_xp,
      current_xp = new_level_info.current_level_xp,
      xp = new_total_xp,
      xp_to_next_level = FLOOR(new_level_info.xp_to_next_level),
      available_cases = available_cases + cases_to_add,
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Create level up notification
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      user_uuid, 
      'level_up', 
      'Level Up!',
      'Congratulations! You reached level ' || new_level_info.current_level || '!',
      jsonb_build_object(
        'old_level', old_level_info.current_level,
        'new_level', new_level_info.current_level,
        'cases_earned', cases_to_add
      )
    );
    
    -- Create case reward notification if applicable
    IF cases_to_add > 0 THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        user_uuid, 
        'level_reward_case', 
        'Case Reward!',
        'You earned ' || cases_to_add || ' reward case(s) for reaching level ' || new_level_info.current_level || '!',
        jsonb_build_object('level', new_level_info.current_level, 'cases_earned', cases_to_add)
      );
    END IF;
  ELSE
    -- No level up, just update XP
    UPDATE public.profiles 
    SET 
      total_xp = new_total_xp,
      -- Update legacy fields for compatibility
      lifetime_xp = new_total_xp,
      current_xp = new_level_info.current_level_xp,
      xp = new_total_xp,
      xp_to_next_level = FLOOR(new_level_info.xp_to_next_level),
      updated_at = now()
    WHERE id = user_uuid;
  END IF;
  
  -- Sync to user_level_stats for compatibility
  INSERT INTO public.user_level_stats (
    user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level
  )
  VALUES (
    user_uuid, 
    new_level_info.current_level, 
    FLOOR(new_total_xp), 
    FLOOR(new_level_info.current_level_xp), 
    FLOOR(new_level_info.xp_to_next_level)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_level = EXCLUDED.current_level,
    lifetime_xp = EXCLUDED.lifetime_xp,
    current_level_xp = EXCLUDED.current_level_xp,
    xp_to_next_level = EXCLUDED.xp_to_next_level,
    updated_at = now();
  
  RETURN QUERY SELECT 
    did_level_up,
    new_level_info.current_level,
    old_level_info.current_level,
    new_total_xp;
END;
$$;

-- Game history trigger function
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
  
  -- Calculate XP: exactly 1/10 of bet amount
  calculated_xp := public.calculate_xp_from_bet(NEW.bet_amount);
  
  -- Add XP to user
  PERFORM public.add_xp_to_user(NEW.user_id, calculated_xp);
  
  -- Add to live feed (unchanged)
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
-- STEP 5: Update all existing user data
-- ===================================================

-- Ensure all users have proper total_xp values
UPDATE public.profiles 
SET total_xp = GREATEST(
  COALESCE(total_xp, 0),
  COALESCE(lifetime_xp, 0),
  COALESCE(current_xp, 0),
  COALESCE(xp, 0)
)
WHERE total_xp IS NULL OR total_xp = 0;

-- Update all users' level information based on their total_xp
DO $$
DECLARE
    user_record record;
    level_info record;
BEGIN
    FOR user_record IN 
        SELECT id, total_xp 
        FROM public.profiles 
        WHERE total_xp IS NOT NULL
    LOOP
        -- Get level info for this user
        SELECT * INTO level_info 
        FROM public.get_level_info(user_record.total_xp);
        
        -- Update user's profile
        UPDATE public.profiles 
        SET 
            level = level_info.current_level,
            current_level = level_info.current_level,
            current_xp = level_info.current_level_xp,
            xp_to_next_level = FLOOR(level_info.xp_to_next_level),
            lifetime_xp = user_record.total_xp,
            xp = user_record.total_xp
        WHERE id = user_record.id;
    END LOOP;
END $$;

-- Sync user_level_stats
INSERT INTO public.user_level_stats (
  user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level
)
SELECT 
  p.id,
  p.current_level,
  FLOOR(p.total_xp),
  FLOOR(p.current_xp),
  p.xp_to_next_level
FROM public.profiles p
WHERE p.total_xp IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  current_level = EXCLUDED.current_level,
  lifetime_xp = EXCLUDED.lifetime_xp,
  current_level_xp = EXCLUDED.current_level_xp,
  xp_to_next_level = EXCLUDED.xp_to_next_level;

-- ===================================================
-- STEP 6: Verification Tests
-- ===================================================

-- Test XP calculation
SELECT 
  'XP CALCULATION TEST' as test,
  public.calculate_xp_from_bet(0.01) as bet_1_cent,
  public.calculate_xp_from_bet(1.00) as bet_1_dollar,
  public.calculate_xp_from_bet(10.00) as bet_10_dollars;

-- Test level calculation
SELECT 
  'LEVEL CALCULATION TEST' as test,
  150::numeric as total_xp,
  current_level,
  current_level_xp,
  xp_to_next_level,
  progress_percentage
FROM public.get_level_info(150::numeric);

-- Check user data
SELECT 
  'USER DATA CHECK' as test,
  username,
  total_xp,
  level,
  current_level
FROM public.profiles
WHERE total_xp > 0
ORDER BY total_xp DESC
LIMIT 5;

SELECT 'XP SYSTEM REBUILD COMPLETE' as status;