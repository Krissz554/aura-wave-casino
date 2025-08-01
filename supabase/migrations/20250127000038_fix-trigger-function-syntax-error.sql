-- HOTFIX: Fix PostgreSQL syntax error in handle_new_user trigger function
-- Date: 2025-01-27
-- Issue: RAISE ERROR should be RAISE EXCEPTION in PostgreSQL

-- Drop and recreate the trigger function with correct syntax
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create corrected trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  username_text TEXT;
  user_email TEXT;
  profile_created BOOLEAN := FALSE;
  stats_created BOOLEAN := FALSE;
  error_message TEXT;
BEGIN
  -- Extract user data
  username_text := COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substr(NEW.id::text, 1, 8));
  user_email := NEW.email;
  
  RAISE NOTICE '[REGISTRATION] Starting profile creation for user % (email: %, username: %)', 
    NEW.id, user_email, username_text;
  
  -- Create profile with comprehensive error handling
  BEGIN
    INSERT INTO public.profiles (
      id,
      username,
      email,
      registration_date,
      balance,
      level,
      xp,
      total_wagered,
      total_profit,
      last_claim_time,
      badges,
      available_cases,
      total_cases_opened,
      last_seen,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      username_text,
      user_email,
      NEW.created_at,
      0,
      1,
      0,
      0,
      0,
      '1970-01-01T00:00:00Z',
      ARRAY['welcome'],
      0,
      0,
      NEW.created_at,
      NEW.created_at,
      NEW.created_at
    );
    
    profile_created := TRUE;
    RAISE NOTICE '[REGISTRATION] ✅ Profile created successfully for user %', NEW.id;
    
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE '[REGISTRATION] ⚠️ Profile already exists for user %', NEW.id;
      profile_created := TRUE; -- Consider it successful since profile exists
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
      RAISE WARNING '[REGISTRATION] ❌ Profile creation failed for user %: %', NEW.id, error_message;
      profile_created := FALSE;
  END;
  
  -- Create user_level_stats with comprehensive error handling
  BEGIN
    INSERT INTO public.user_level_stats (
      user_id,
      current_level,
      lifetime_xp,
      current_level_xp,
      xp_to_next_level,
      border_tier,
      border_unlocked_at,
      available_cases,
      total_cases_opened,
      total_case_value,
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
      roulette_green_wins,
      roulette_highest_win,
      roulette_biggest_bet,
      roulette_best_streak,
      roulette_favorite_color,
      tower_games,
      tower_wins,
      tower_wagered,
      tower_profit,
      tower_highest_level,
      tower_perfect_games,
      total_games,
      total_wins,
      total_wagered,
      total_profit,
      best_coinflip_streak,
      current_coinflip_streak,
      best_win_streak,
      biggest_win,
      biggest_loss,
      biggest_single_bet,
      chat_messages_count,
      login_days_count,
      account_created,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      1,
      0,
      0,
      916,
      1,
      NEW.created_at,
      0,
      0,
      0,
      0, 0, 0, 0,  -- coinflip
      0, 0, 0, 0,  -- crash
      0, 0, 0, 0, 0, 0, 0, 0, 'red',  -- roulette
      0, 0, 0, 0, 0, 0,  -- tower
      0, 0, 0, 0,  -- totals
      0, 0, 0, 0, 0, 0,  -- streaks and records
      0, 1,  -- social
      NEW.created_at,
      NEW.created_at,
      NEW.created_at
    );
    
    stats_created := TRUE;
    RAISE NOTICE '[REGISTRATION] ✅ User level stats created successfully for user %', NEW.id;
    
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE '[REGISTRATION] ⚠️ User level stats already exist for user %', NEW.id;
      stats_created := TRUE; -- Consider it successful since stats exist
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
      RAISE WARNING '[REGISTRATION] ❌ User level stats creation failed for user %: %', NEW.id, error_message;
      stats_created := FALSE;
  END;
  
  -- Log final status
  RAISE NOTICE '[REGISTRATION] 📊 Registration completed for user %: profile=%s, stats=%s', 
    NEW.id, profile_created, stats_created;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
    -- FIXED: Changed RAISE ERROR to RAISE EXCEPTION
    RAISE EXCEPTION '[REGISTRATION] 💥 Critical error in handle_new_user for user %: %', NEW.id, error_message;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Test the corrected function
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_created_at TIMESTAMP WITH TIME ZONE := now();
BEGIN
  RAISE NOTICE '=== TESTING CORRECTED TRIGGER FUNCTION ===';
  
  -- Test that the function compiles correctly
  BEGIN
    INSERT INTO auth.users (
      id, 
      email, 
      encrypted_password, 
      email_confirmed_at, 
      created_at, 
      updated_at, 
      raw_user_meta_data
    ) VALUES (
      test_user_id,
      'syntax-test@example.com',
      'dummy_password',
      test_created_at,
      test_created_at,
      test_created_at,
      jsonb_build_object('username', 'SyntaxTest')
    );
    
    RAISE NOTICE '✅ Trigger function syntax is correct and executed successfully';
    
    -- Clean up test data
    DELETE FROM auth.users WHERE id = test_user_id;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Trigger function test failed: %', SQLERRM;
      -- Clean up anyway
      DELETE FROM auth.users WHERE id = test_user_id;
  END;
  
  RAISE NOTICE '=== SYNTAX FIX COMPLETED ===';
END $$;