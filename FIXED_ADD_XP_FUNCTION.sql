-- Fixed add_xp_and_check_levelup function that preserves decimal XP
-- Run this in Supabase Dashboard SQL Editor

-- Step 1: Create corrected add_xp_and_check_levelup function
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
  
  -- Calculate new total XP (keep as numeric for precision)
  new_total_xp := old_xp + xp_amount;
  
  -- Calculate new level (use the TOTAL lifetime XP, not truncated integer)
  -- FIX: Don't truncate to integer, keep decimal precision
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
    
    -- Update profiles with new level and XP (PRESERVE DECIMAL PRECISION)
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
    
    -- Update user_level_stats if it exists (PRESERVE DECIMAL PRECISION)
    UPDATE public.user_level_stats 
    SET 
      current_level = new_level_calc,
      lifetime_xp = FLOOR(new_total_xp)::integer, -- Convert to int for user_level_stats
      current_level_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      border_tier = COALESCE(new_border_tier, old_border_tier)
    WHERE user_id = user_uuid;
    
    -- Create case reward notifications if any
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
    -- Just update XP without level change (PRESERVE DECIMAL PRECISION)
    UPDATE public.profiles 
    SET 
      lifetime_xp = new_total_xp, -- Keep as NUMERIC with decimals
      current_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      updated_at = now()
    WHERE id = user_uuid;
    
    -- Also update user_level_stats table if it exists (PRESERVE DECIMAL PRECISION)
    UPDATE public.user_level_stats 
    SET 
      current_level = new_level_calc,
      lifetime_xp = FLOOR(new_total_xp)::integer, -- Convert to int for user_level_stats
      current_level_xp = (SELECT calc.current_level_xp FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      xp_to_next_level = (SELECT calc.xp_to_next FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer) calc),
      border_tier = COALESCE(new_border_tier, old_border_tier)
    WHERE user_id = user_uuid;
  END IF;
  
  RETURN QUERY SELECT did_level_up, new_level_calc, COALESCE(level_bonus, 0), cases_to_add;
END;
$function$;

-- Step 2: Test the corrected function
SELECT 
  'XP Function Test' as test_name,
  'Testing if decimal XP is preserved correctly' as description;