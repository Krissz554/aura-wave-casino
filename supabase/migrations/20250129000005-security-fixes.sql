-- Critical Function Security Fixes Migration
-- Fix function search_path security vulnerabilities
-- 
-- This migration addresses the 12 "function_search_path_mutable" security warnings.
-- Anonymous access warnings are intentional for gambling platforms.
-- AUTH configuration warnings are optional dashboard settings.

BEGIN;

-- Fix all functions to have secure search_path to prevent SQL injection attacks

-- 1. Fix check_admin_status_simple function
CREATE OR REPLACE FUNCTION public.check_admin_status_simple(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = user_uuid
  );
END;
$$;

-- 2. Fix check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_bet_time timestamp with time zone;
  rate_limit_seconds integer := 1;
BEGIN
  SELECT user_rate_limits.last_bet_time INTO last_bet_time
  FROM public.user_rate_limits
  WHERE user_id = user_uuid;
  
  IF last_bet_time IS NULL OR 
     (EXTRACT(EPOCH FROM (NOW() - last_bet_time)) >= rate_limit_seconds) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 3. Fix get_user_bet_stats function
CREATE OR REPLACE FUNCTION public.get_user_bet_stats(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_games', COALESCE(total_games, 0),
    'total_wins', COALESCE(total_wins, 0),
    'total_wagered', COALESCE(total_wagered, 0),
    'total_profit', COALESCE(total_profit, 0),
    'win_rate', CASE 
      WHEN COALESCE(total_games, 0) > 0 
      THEN ROUND((COALESCE(total_wins, 0)::numeric / total_games::numeric) * 100, 2)
      ELSE 0 
    END
  ) INTO result
  FROM public.user_level_stats
  WHERE user_id = user_uuid;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 4. Fix validate_bet_limits function
CREATE OR REPLACE FUNCTION public.validate_bet_limits(user_uuid uuid, bet_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_balance numeric;
  min_bet numeric := 1.0;
  max_bet numeric := 10000.0;
BEGIN
  IF bet_amount < min_bet OR bet_amount > max_bet THEN
    RETURN false;
  END IF;
  
  SELECT balance INTO user_balance
  FROM public.profiles
  WHERE id = user_uuid;
  
  IF user_balance IS NULL OR user_balance < bet_amount THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 5. Fix track_game_result function
CREATE OR REPLACE FUNCTION public.track_game_result(
  user_uuid uuid,
  game_type text,
  bet_amount numeric,
  result_type text,
  profit_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.game_history (
    user_id, game_type, bet_amount, result, profit, created_at
  ) VALUES (
    user_uuid, game_type, bet_amount, result_type, profit_amount, NOW()
  );
  
  INSERT INTO public.user_level_stats (
    user_id, total_games, total_wins, total_wagered, total_profit
  ) VALUES (
    user_uuid, 1, CASE WHEN result_type = 'win' THEN 1 ELSE 0 END, bet_amount, profit_amount
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_games = user_level_stats.total_games + 1,
    total_wins = user_level_stats.total_wins + CASE WHEN result_type = 'win' THEN 1 ELSE 0 END,
    total_wagered = user_level_stats.total_wagered + bet_amount,
    total_profit = user_level_stats.total_profit + profit_amount,
    updated_at = NOW();
END;
$$;

-- 6. Fix atomic_bet_balance_check function
CREATE OR REPLACE FUNCTION public.atomic_bet_balance_check(
  user_uuid uuid,
  bet_amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance numeric;
BEGIN
  SELECT balance INTO current_balance
  FROM public.profiles
  WHERE id = user_uuid
  FOR UPDATE;
  
  IF current_balance IS NULL OR current_balance < bet_amount THEN
    RETURN false;
  END IF;
  
  UPDATE public.profiles
  SET balance = balance - bet_amount, updated_at = NOW()
  WHERE id = user_uuid;
  
  RETURN true;
END;
$$;

-- 7. Fix insert_roulette_bet_to_live_feed function
CREATE OR REPLACE FUNCTION public.insert_roulette_bet_to_live_feed(
  user_uuid uuid,
  username_param text,
  bet_amount_param numeric,
  bet_color_param text,
  round_id_param uuid,
  profit_param numeric,
  result_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.live_bet_feed (
    user_id, username, game_type, bet_amount, bet_color, round_id, result, profit, created_at
  ) VALUES (
    user_uuid, username_param, 'roulette', bet_amount_param, bet_color_param, round_id_param, result_param, profit_param, NOW()
  );
END;
$$;

-- 8. Fix initialize_user_level_stats function
CREATE OR REPLACE FUNCTION public.initialize_user_level_stats(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_level_stats (
    user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier, available_cases, total_cases_opened, account_created
  ) VALUES (
    user_uuid, 1, 0, 0, 100, 1, 0, 0, NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- 9. Fix ensure_user_level_stats function
CREATE OR REPLACE FUNCTION public.ensure_user_level_stats(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.initialize_user_level_stats(user_uuid);
END;
$$;

-- 10. Fix create_user_profile function
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_uuid uuid,
  username_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, balance, level, xp, registration_date) 
  VALUES (user_uuid, username_param, 0, 1, 0, NOW())
  ON CONFLICT (id) DO NOTHING;
  
  PERFORM public.initialize_user_level_stats(user_uuid);
END;
$$;

-- 11. Fix create_user_level_stats function
CREATE OR REPLACE FUNCTION public.create_user_level_stats(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.initialize_user_level_stats(user_uuid);
END;
$$;

-- 12. Fix ensure_user_profile function
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_exists boolean;
  default_username text;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = user_uuid) INTO profile_exists;
  
  IF NOT profile_exists THEN
    default_username := 'user_' || SUBSTRING(user_uuid::text FROM 1 FOR 8);
    PERFORM public.create_user_profile(user_uuid, default_username);
  END IF;
  
  PERFORM public.ensure_user_level_stats(user_uuid);
END;
$$;

COMMIT;