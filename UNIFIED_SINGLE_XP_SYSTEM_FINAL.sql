-- UNIFIED SINGLE XP SYSTEM - FINAL CORRECTED VERSION
-- This creates a clean, unified XP system with one total XP value per user
-- Fixes all SQL syntax errors including FROM clause references
-- Run this in Supabase Dashboard SQL Editor

-- ==================================================
-- STEP 1: Create Level Requirements Table (if not exists)
-- ==================================================

-- Create or update level requirements table with proper XP thresholds
CREATE TABLE IF NOT EXISTS public.level_requirements (
  level integer PRIMARY KEY,
  total_xp_required numeric(15,3) NOT NULL,
  xp_for_this_level numeric(15,3) NOT NULL DEFAULT 100
);

-- Insert level requirements (exponential growth) - using explicit casts
INSERT INTO public.level_requirements (level, total_xp_required, xp_for_this_level) VALUES
(1, 0::numeric(15,3), 0::numeric(15,3)),                    -- Level 1: 0 XP total
(2, 100::numeric(15,3), 100::numeric(15,3)),                -- Level 2: 100 XP total (100 XP for level)
(3, 250::numeric(15,3), 150::numeric(15,3)),                -- Level 3: 250 XP total (150 XP for level)
(4, 450::numeric(15,3), 200::numeric(15,3)),                -- Level 4: 450 XP total (200 XP for level)
(5, 700::numeric(15,3), 250::numeric(15,3)),                -- Level 5: 700 XP total (250 XP for level)
(6, 1000::numeric(15,3), 300::numeric(15,3)),               -- Level 6: 1000 XP total (300 XP for level)
(7, 1350::numeric(15,3), 350::numeric(15,3)),               -- Level 7: 1350 XP total (350 XP for level)
(8, 1750::numeric(15,3), 400::numeric(15,3)),               -- Level 8: 1750 XP total (400 XP for level)
(9, 2200::numeric(15,3), 450::numeric(15,3)),               -- Level 9: 2200 XP total (450 XP for level)
(10, 2700::numeric(15,3), 500::numeric(15,3)),              -- Level 10: 2700 XP total (500 XP for level)
(11, 3250::numeric(15,3), 550::numeric(15,3)),              -- Level 11: 3250 XP total (550 XP for level)
(12, 3850::numeric(15,3), 600::numeric(15,3)),              -- Level 12: 3850 XP total (600 XP for level)
(13, 4500::numeric(15,3), 650::numeric(15,3)),              -- Level 13: 4500 XP total (650 XP for level)
(14, 5200::numeric(15,3), 700::numeric(15,3)),              -- Level 14: 5200 XP total (700 XP for level)
(15, 5950::numeric(15,3), 750::numeric(15,3)),              -- Level 15: 5950 XP total (750 XP for level)
(16, 6750::numeric(15,3), 800::numeric(15,3)),              -- Level 16: 6750 XP total (800 XP for level)
(17, 7600::numeric(15,3), 850::numeric(15,3)),              -- Level 17: 7600 XP total (850 XP for level)
(18, 8500::numeric(15,3), 900::numeric(15,3)),              -- Level 18: 8500 XP total (900 XP for level)
(19, 9450::numeric(15,3), 950::numeric(15,3)),              -- Level 19: 9450 XP total (950 XP for level)
(20, 10450::numeric(15,3), 1000::numeric(15,3)),            -- Level 20: 10450 XP total (1000 XP for level)
(21, 11500::numeric(15,3), 1050::numeric(15,3)),            -- Level 21: 11500 XP total (1050 XP for level)
(22, 12600::numeric(15,3), 1100::numeric(15,3)),            -- Level 22: 12600 XP total (1100 XP for level)
(23, 13750::numeric(15,3), 1150::numeric(15,3)),            -- Level 23: 13750 XP total (1150 XP for level)
(24, 14950::numeric(15,3), 1200::numeric(15,3)),            -- Level 24: 14950 XP total (1200 XP for level)
(25, 16200::numeric(15,3), 1250::numeric(15,3)),            -- Level 25: 16200 XP total (1250 XP for level) + CASE REWARD
(26, 17500::numeric(15,3), 1300::numeric(15,3)),            -- Level 26: 17500 XP total (1300 XP for level)
(27, 18850::numeric(15,3), 1350::numeric(15,3)),            -- Level 27: 18850 XP total (1350 XP for level)
(28, 20250::numeric(15,3), 1400::numeric(15,3)),            -- Level 28: 20250 XP total (1400 XP for level)
(29, 21700::numeric(15,3), 1450::numeric(15,3)),            -- Level 29: 21700 XP total (1450 XP for level)
(30, 23200::numeric(15,3), 1500::numeric(15,3))             -- Level 30: 23200 XP total (1500 XP for level)
ON CONFLICT (level) DO UPDATE SET
  total_xp_required = EXCLUDED.total_xp_required,
  xp_for_this_level = EXCLUDED.xp_for_this_level;

-- Generate remaining levels (31-100) with proper casting
DO $$
DECLARE
    current_level integer;
    current_total_xp numeric(15,3);
    current_level_xp numeric(15,3);
BEGIN
    -- Start from level 31
    current_level := 31;
    current_total_xp := 23200::numeric(15,3); -- Last known total (level 30)
    current_level_xp := 1500::numeric(15,3);  -- Last known level XP (level 30)
    
    -- Generate levels 31-100
    WHILE current_level <= 100 LOOP
        -- Increase XP requirement by 50 each level
        current_level_xp := current_level_xp + 50::numeric(15,3);
        current_total_xp := current_total_xp + current_level_xp;
        
        -- Insert the level requirement
        INSERT INTO public.level_requirements (level, total_xp_required, xp_for_this_level)
        VALUES (current_level, current_total_xp, current_level_xp)
        ON CONFLICT (level) DO UPDATE SET
          total_xp_required = EXCLUDED.total_xp_required,
          xp_for_this_level = EXCLUDED.xp_for_this_level;
        
        current_level := current_level + 1;
    END LOOP;
END $$;

-- ==================================================
-- STEP 2: Simplify profiles table to single XP field
-- ==================================================

-- Add new unified XP column (if not exists)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'total_xp' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN total_xp NUMERIC(15,3) DEFAULT 0;
  END IF;
END $$;

-- Migrate existing XP data to unified total_xp field
UPDATE public.profiles 
SET total_xp = GREATEST(
  COALESCE(lifetime_xp, 0),
  COALESCE(current_xp, 0),
  COALESCE(xp, 0)
);

-- ==================================================
-- STEP 3: Create unified level calculation functions
-- ==================================================

-- Drop existing functions
DROP TRIGGER IF EXISTS game_history_trigger ON public.game_history;
DROP FUNCTION IF EXISTS public.calculate_xp_from_bet(numeric) CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.handle_game_history_insert() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_level_from_xp(integer) CASCADE;

-- Create function to calculate level and progress from total XP
CREATE OR REPLACE FUNCTION public.calculate_level_from_total_xp(total_xp_amount numeric)
RETURNS TABLE(
  current_level integer,
  current_level_xp numeric,
  xp_to_next_level numeric,
  total_xp_for_next_level numeric,
  progress_percentage numeric
)
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  user_level INTEGER := 1;
  level_start_xp NUMERIC(15,3) := 0;
  level_end_xp NUMERIC(15,3) := 100;
  current_xp_in_level NUMERIC(15,3);
  xp_needed NUMERIC(15,3);
  progress NUMERIC(15,3);
BEGIN
  -- Find the user's current level
  SELECT lr.level, lr.total_xp_required, 
         COALESCE(next_lr.total_xp_required, lr.total_xp_required + 5000::numeric(15,3)) -- Default next level requirement
  INTO user_level, level_start_xp, level_end_xp
  FROM public.level_requirements lr
  LEFT JOIN public.level_requirements next_lr ON next_lr.level = lr.level + 1
  WHERE lr.total_xp_required <= total_xp_amount
  ORDER BY lr.level DESC
  LIMIT 1;
  
  -- If no level found, user is level 1
  IF user_level IS NULL THEN
    user_level := 1;
    level_start_xp := 0::numeric(15,3);
    level_end_xp := 100::numeric(15,3);
  END IF;
  
  -- Calculate XP progress within current level
  current_xp_in_level := total_xp_amount - level_start_xp;
  xp_needed := level_end_xp - total_xp_amount;
  
  -- Calculate progress percentage within current level
  IF level_end_xp > level_start_xp THEN
    progress := (current_xp_in_level / (level_end_xp - level_start_xp)) * 100::numeric(15,3);
  ELSE
    progress := 100::numeric(15,3); -- Max level reached
  END IF;
  
  -- Ensure values are non-negative
  current_xp_in_level := GREATEST(current_xp_in_level, 0::numeric(15,3));
  xp_needed := GREATEST(xp_needed, 0::numeric(15,3));
  progress := GREATEST(LEAST(progress, 100::numeric(15,3)), 0::numeric(15,3));
  
  RETURN QUERY SELECT 
    user_level,
    current_xp_in_level,
    xp_needed,
    level_end_xp,
    progress;
END;
$function$;

-- Create XP calculation function (unchanged)
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

-- Create unified XP update function
CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(user_uuid uuid, xp_amount numeric)
RETURNS TABLE(leveled_up boolean, new_level integer, old_level integer, bonus_earned numeric, cases_earned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  old_total_xp NUMERIC(15,3);
  new_total_xp NUMERIC(15,3);
  old_level_data RECORD;
  new_level_data RECORD;
  did_level_up BOOLEAN := false;
  old_border_tier INTEGER;
  new_border_tier INTEGER;
  cases_to_add INTEGER := 0;
  level_diff INTEGER;
  i INTEGER;
BEGIN
  -- Get current total XP from profiles (SINGLE SOURCE OF TRUTH)
  SELECT total_xp, COALESCE(border_tier, 1) 
  INTO old_total_xp, old_border_tier
  FROM public.profiles 
  WHERE id = user_uuid;
  
  -- If user not found, return defaults
  IF old_total_xp IS NULL THEN
    RETURN QUERY SELECT false, 1, 1, 0::numeric, 0;
    RETURN;
  END IF;
  
  -- Calculate new total XP with 3 decimal precision
  new_total_xp := ROUND(COALESCE(old_total_xp, 0::numeric(15,3)) + xp_amount, 3);
  
  -- Get old level data
  SELECT * INTO old_level_data 
  FROM public.calculate_level_from_total_xp(old_total_xp);
  
  -- Get new level data
  SELECT * INTO new_level_data 
  FROM public.calculate_level_from_total_xp(new_total_xp);
  
  -- Check for level up
  IF new_level_data.current_level > old_level_data.current_level THEN
    did_level_up := true;
    level_diff := new_level_data.current_level - old_level_data.current_level;
    
    -- Calculate case rewards (every 25 levels)
    FOR i IN (old_level_data.current_level + 1)..new_level_data.current_level LOOP
      IF i % 25 = 0 THEN
        cases_to_add := cases_to_add + 1;
      END IF;
    END LOOP;
    
    -- Get new border tier
    SELECT tier INTO new_border_tier
    FROM public.border_tiers 
    WHERE new_level_data.current_level >= min_level AND new_level_data.current_level <= max_level
    LIMIT 1;
    
    -- Update profiles table with unified XP system
    UPDATE public.profiles 
    SET 
      total_xp = new_total_xp,
      current_level = new_level_data.current_level,
      current_xp = new_level_data.current_level_xp,  -- For backward compatibility
      xp_to_next_level = new_level_data.xp_to_next_level,  -- For backward compatibility
      lifetime_xp = new_total_xp,  -- For backward compatibility
      xp = new_total_xp,  -- For backward compatibility
      border_tier = COALESCE(new_border_tier, old_border_tier),
      available_cases = available_cases + cases_to_add,
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Sync to user_level_stats (for compatibility with existing components)
    INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier)
    VALUES (user_uuid, new_level_data.current_level, FLOOR(new_total_xp)::integer, FLOOR(new_level_data.current_level_xp)::integer, FLOOR(new_level_data.xp_to_next_level)::integer, COALESCE(new_border_tier, old_border_tier))
    ON CONFLICT (user_id) DO UPDATE SET
      current_level = new_level_data.current_level,
      lifetime_xp = FLOOR(new_total_xp)::integer,
      current_level_xp = FLOOR(new_level_data.current_level_xp)::integer,
      xp_to_next_level = FLOOR(new_level_data.xp_to_next_level)::integer,
      border_tier = COALESCE(new_border_tier, old_border_tier);
    
    -- Create notifications
    IF cases_to_add > 0 THEN
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        user_uuid, 'level_reward_case', 'Level ' || new_level_data.current_level || ' Reward Case!',
        'You''ve earned ' || cases_to_add || ' reward case(s) for reaching level ' || new_level_data.current_level || '!',
        jsonb_build_object('level', new_level_data.current_level, 'cases_earned', cases_to_add, 'border_tier', new_border_tier)
      );
    END IF;
    
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      user_uuid, 'level_up', 'Level Up!',
      'Congratulations! You''ve reached level ' || new_level_data.current_level || '!',
      jsonb_build_object('old_level', old_level_data.current_level, 'new_level', new_level_data.current_level, 'border_tier', new_border_tier)
    );
  ELSE
    -- No level up, just update XP
    UPDATE public.profiles 
    SET 
      total_xp = new_total_xp,
      current_level = new_level_data.current_level,
      current_xp = new_level_data.current_level_xp,  -- For backward compatibility
      xp_to_next_level = new_level_data.xp_to_next_level,  -- For backward compatibility
      lifetime_xp = new_total_xp,  -- For backward compatibility
      xp = new_total_xp,  -- For backward compatibility
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Sync to user_level_stats
    INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier)
    VALUES (user_uuid, new_level_data.current_level, FLOOR(new_total_xp)::integer, FLOOR(new_level_data.current_level_xp)::integer, FLOOR(new_level_data.xp_to_next_level)::integer, old_border_tier)
    ON CONFLICT (user_id) DO UPDATE SET
      current_level = new_level_data.current_level,
      lifetime_xp = FLOOR(new_total_xp)::integer,
      current_level_xp = FLOOR(new_level_data.current_level_xp)::integer,
      xp_to_next_level = FLOOR(new_level_data.xp_to_next_level)::integer;
  END IF;
  
  RETURN QUERY SELECT did_level_up, new_level_data.current_level, old_level_data.current_level, 0::numeric, cases_to_add;
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
  
  -- Add XP using unified system
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
-- STEP 4: Update all existing user data to unified system (FIXED)
-- ==================================================

-- Step 4a: First update all users with proper total_xp values
UPDATE public.profiles 
SET total_xp = GREATEST(
  COALESCE(lifetime_xp, 0),
  COALESCE(current_xp, 0),
  COALESCE(xp, 0)
)
WHERE total_xp IS NULL OR total_xp = 0;

-- Step 4b: Update each user's level data individually using a loop
DO $$
DECLARE
    user_record RECORD;
    calc_data RECORD;
BEGIN
    -- Process each user individually
    FOR user_record IN 
        SELECT id, total_xp 
        FROM public.profiles 
        WHERE total_xp IS NOT NULL 
    LOOP
        -- Get calculated level data for this user
        SELECT * INTO calc_data
        FROM public.calculate_level_from_total_xp(user_record.total_xp);
        
        -- Update this user's profile with calculated data
        UPDATE public.profiles 
        SET 
            current_level = calc_data.current_level,
            current_xp = calc_data.current_level_xp,
            xp_to_next_level = calc_data.xp_to_next_level,
            lifetime_xp = user_record.total_xp,
            xp = user_record.total_xp
        WHERE id = user_record.id;
    END LOOP;
END $$;

-- Sync user_level_stats with the new unified data
INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier)
SELECT 
  p.id,
  p.current_level,
  FLOOR(p.total_xp)::integer,
  FLOOR(p.current_xp)::integer,
  p.xp_to_next_level,
  p.border_tier
FROM public.profiles p
WHERE p.total_xp IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  current_level = EXCLUDED.current_level,
  lifetime_xp = EXCLUDED.lifetime_xp,
  current_level_xp = EXCLUDED.current_level_xp,
  xp_to_next_level = EXCLUDED.xp_to_next_level,
  border_tier = EXCLUDED.border_tier;

-- ==================================================
-- STEP 5: Verification and testing
-- ==================================================

-- Test XP calculation
SELECT 
  'XP CALCULATION TEST' as test_name,
  public.calculate_xp_from_bet(0.01) as cent_result,
  public.calculate_xp_from_bet(1.00) as dollar_result,
  public.calculate_xp_from_bet(10.00) as ten_dollar_result;

-- Test level calculation
SELECT 
  'LEVEL CALCULATION TEST' as test_name,
  150::numeric as input_xp,
  current_level,
  current_level_xp,
  xp_to_next_level,
  ROUND(progress_percentage, 2) as progress_pct
FROM public.calculate_level_from_total_xp(150::numeric) -- Should be level 2
UNION ALL
SELECT 
  'LEVEL CALCULATION TEST',
  1500::numeric,
  current_level,
  current_level_xp,
  xp_to_next_level,
  ROUND(progress_percentage, 2)
FROM public.calculate_level_from_total_xp(1500::numeric) -- Should be level 7
UNION ALL
SELECT 
  'LEVEL CALCULATION TEST',
  10000::numeric,
  current_level,
  current_level_xp,
  xp_to_next_level,
  ROUND(progress_percentage, 2)
FROM public.calculate_level_from_total_xp(10000::numeric); -- Should be level 19

-- Check unified data consistency
SELECT 
  'UNIFIED XP DATA CHECK' as test_name,
  p.username,
  p.total_xp,
  p.current_level,
  p.current_xp as current_level_xp,
  p.xp_to_next_level
FROM public.profiles p
WHERE p.total_xp > 0
ORDER BY p.total_xp DESC
LIMIT 5;

-- Check level requirements table
SELECT 
  'LEVEL REQUIREMENTS CHECK' as test_name,
  level,
  total_xp_required,
  xp_for_this_level
FROM public.level_requirements
WHERE level IN (1, 2, 10, 25, 50, 100)
ORDER BY level;

SELECT 
  'UNIFIED XP SYSTEM COMPLETE' as status,
  'All users now have single total_xp field with calculated levels' as message,
  'All XP displays will show consistent data from total_xp' as result;