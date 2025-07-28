-- Deploy Correct XP Calculation (1/10 of wager)
-- Run this in Supabase Dashboard SQL Editor

-- Step 1: Drop existing function to ensure clean deployment
DROP FUNCTION IF EXISTS public.calculate_xp_from_bet(numeric);

-- Step 2: Create the correct XP calculation function
CREATE OR REPLACE FUNCTION public.calculate_xp_from_bet(bet_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  -- $1 wager = 0.1 XP (divide by 10)
  -- $0.10 wager = 0.01 XP
  -- $10 wager = 1.0 XP
  RETURN ROUND(bet_amount * 0.1, 2);
END;
$function$;

-- Step 3: Test the function to verify it works correctly
SELECT 
  'XP Calculation Test' as test_name,
  public.calculate_xp_from_bet(1.00) as "1_dollar_should_be_0.1",
  public.calculate_xp_from_bet(0.50) as "50_cents_should_be_0.05", 
  public.calculate_xp_from_bet(0.10) as "10_cents_should_be_0.01",
  public.calculate_xp_from_bet(10.00) as "10_dollars_should_be_1.0";

-- Step 4: Update the game history trigger function to use correct XP calculation  
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
  
  -- Debug log the XP calculation (remove this after verification)
  RAISE LOG 'XP Calculation: Bet Amount: %, Calculated XP: %', NEW.bet_amount, calculated_xp;
  
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

-- Step 5: Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS game_history_trigger ON public.game_history;
CREATE TRIGGER game_history_trigger
  AFTER INSERT ON public.game_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_game_history_insert();

-- Step 6: Verify the deployment
SELECT 
  'Deployment Verification' as status,
  'Functions and trigger are now deployed with correct XP calculation (bet_amount * 0.1)' as message;