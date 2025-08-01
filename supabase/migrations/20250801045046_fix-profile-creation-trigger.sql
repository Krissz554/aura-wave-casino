-- Fix profile creation trigger function to include all required columns
-- The current trigger is missing created_at and updated_at columns

-- Add service role policies for profiles table to allow trigger to work
CREATE POLICY "Service role can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (auth.role() = 'service_role');

-- Add service role policies for user_level_stats table
CREATE POLICY "Service role can insert user level stats" 
ON public.user_level_stats 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update user level stats" 
ON public.user_level_stats 
FOR UPDATE 
USING (auth.role() = 'service_role');

-- Drop and recreate the trigger function with improved error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  username_text TEXT;
BEGIN
  -- Generate username
  username_text := COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substr(NEW.id::text, 1, 8));
  
  -- Insert into profiles with error handling
  BEGIN
    INSERT INTO public.profiles (
      id, 
      username, 
      registration_date, 
      balance, 
      level, 
      xp, 
      total_wagered, 
      total_profit, 
      last_claim_time, 
      badges,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      username_text,
      NEW.created_at,
      0,
      1,
      0,
      0,
      0,
      '1970-01-01T00:00:00Z',
      ARRAY['welcome'],
      NEW.created_at,
      NEW.created_at
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error inserting profile for user %: %', NEW.id, SQLERRM;
      -- Continue execution even if profile insert fails
  END;
  
  -- Insert into user_level_stats with error handling
  BEGIN
    INSERT INTO public.user_level_stats (
      user_id,
      current_level,
      current_level_xp,
      lifetime_xp,
      xp_to_next_level,
      border_tier,
      available_cases,
      total_cases_opened,
      coinflip_games,
      coinflip_wins,
      coinflip_wagered,
      coinflip_profit,
      crash_games,
      crash_wins,
      crash_wagered,
      crash_profit,
      roulette_games,
      roulette_wins,
      roulette_wagered,
      roulette_profit,
      roulette_highest_win,
      roulette_highest_loss,
      roulette_green_wins,
      roulette_red_wins,
      roulette_black_wins,
      roulette_favorite_color,
      tower_games,
      tower_wins,
      tower_wagered,
      tower_profit,
      total_games,
      total_wins,
      total_wagered,
      total_profit,
      biggest_win,
      biggest_loss,
      chat_messages_count,
      login_days_count,
      biggest_single_bet,
      account_created,
      current_win_streak,
      best_win_streak,
      tower_highest_level,
      tower_biggest_win,
      tower_biggest_loss,
      tower_best_streak,
      tower_current_streak,
      tower_perfect_games,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      1,
      0,
      0,
      100,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      'none',
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      NEW.created_at,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      NEW.created_at,
      NEW.created_at
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error inserting user_level_stats for user %: %', NEW.id, SQLERRM;
      -- Continue execution even if stats insert fails
  END;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Critical error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();