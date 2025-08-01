-- Fix registration trigger causing 500 errors during signup
-- This migration creates a safer trigger function that won't block user registration

-- =============================================================================
-- 1. CREATE SAFE TRIGGER FUNCTION
-- =============================================================================

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a safer trigger function that won't block registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  extracted_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
  max_attempts INTEGER := 5;
BEGIN
  -- Log the trigger execution
  RAISE NOTICE 'handle_new_user triggered for user: %', NEW.id;
  
  -- Extract username from email (part before @)
  extracted_username := split_part(NEW.email, '@', 1);
  
  -- Clean the username (remove special characters, limit length)
  extracted_username := regexp_replace(extracted_username, '[^a-zA-Z0-9_]', '', 'g');
  extracted_username := substring(extracted_username from 1 for 20);
  
  -- Ensure username is not empty
  IF extracted_username = '' OR extracted_username IS NULL THEN
    extracted_username := 'user';
  END IF;
  
  final_username := extracted_username;
  
  -- Handle username conflicts by appending numbers (limited attempts)
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) AND counter < max_attempts LOOP
    counter := counter + 1;
    final_username := extracted_username || counter::TEXT;
  END LOOP;
  
  -- If still conflicts after max attempts, use UUID suffix
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
    final_username := extracted_username || '_' || substring(NEW.id::TEXT from 1 for 6);
  END IF;
  
  -- Use a nested BEGIN/EXCEPTION block to prevent registration failure
  BEGIN
    -- Create profile
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
    ) VALUES (
      NEW.id,
      final_username,
      now(),
      0,
      1,
      0,
      0,
      0,
      '1970-01-01T00:00:00Z',
      ARRAY['welcome'],
      now(),
      now()
    );
    
    RAISE NOTICE 'Profile created for user % with username %', NEW.id, final_username;
    
  EXCEPTION
    WHEN unique_violation THEN
      -- If username is still taken, use UUID-based username
      final_username := 'user_' || substring(NEW.id::TEXT from 1 for 8);
      
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
      ) VALUES (
        NEW.id,
        final_username,
        now(),
        0,
        1,
        0,
        0,
        0,
        '1970-01-01T00:00:00Z',
        ARRAY['welcome'],
        now(),
        now()
      );
      
      RAISE NOTICE 'Profile created with UUID username for user %: %', NEW.id, final_username;
      
    WHEN OTHERS THEN
      -- Log the error but don't block registration
      RAISE NOTICE 'Error creating profile for user %, will be handled by frontend: %', NEW.id, SQLERRM;
      -- Don't re-raise the exception to avoid blocking registration
  END;
  
  -- Create user_level_stats (also with safe error handling)
  BEGIN
    INSERT INTO public.user_level_stats (
      user_id,
      current_level,
      current_level_xp,
      lifetime_xp,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      1,
      0,
      0,
      now(),
      now()
    );
    
    RAISE NOTICE 'Level stats created for user %', NEW.id;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Log but don't block registration
      RAISE NOTICE 'Error creating level stats for user %, will be handled by frontend: %', NEW.id, SQLERRM;
  END;
  
  -- Always return NEW to allow registration to proceed
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 2. CREATE TRIGGER
-- =============================================================================

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 3. IMPROVE MANUAL FALLBACK FUNCTION
-- =============================================================================

-- Also improve the manual function to be more robust
CREATE OR REPLACE FUNCTION public.create_user_profile_manual(user_id UUID, username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  error_message TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Profile already exists');
  END IF;

  -- Handle username conflicts
  final_username := username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) AND counter < 5 LOOP
    counter := counter + 1;
    final_username := username || counter::TEXT;
  END LOOP;
  
  -- If still conflicts, use UUID suffix
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
    final_username := username || '_' || substring(user_id::TEXT from 1 for 6);
  END IF;

  BEGIN
    -- Create profile
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
    ) VALUES (
      user_id,
      final_username,
      now(),
      0,
      1,
      0,
      0,
      0,
      '1970-01-01T00:00:00Z',
      ARRAY['welcome'],
      now(),
      now()
    );

    -- Create user_level_stats entry
    INSERT INTO public.user_level_stats (
      user_id,
      current_level,
      current_level_xp,
      lifetime_xp,
      created_at,
      updated_at
    ) VALUES (
      user_id,
      1,
      0,
      0,
      now(),
      now()
    ) ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'message', 'Profile and level stats created successfully');
    
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'Username conflict could not be resolved');
    WHEN OTHERS THEN
      error_message := SQLERRM;
      RAISE NOTICE 'Error in create_user_profile_manual for user %: %', user_id, error_message;
      RETURN jsonb_build_object('success', false, 'error', error_message);
  END;
END;
$$;

-- =============================================================================
-- 4. GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.create_user_profile_manual(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile_manual(UUID, TEXT) TO anon;

-- =============================================================================
-- 5. TEST NOTIFICATION
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Safe registration trigger has been deployed!';
  RAISE NOTICE 'The trigger will now log errors instead of blocking registration.';
  RAISE NOTICE 'Frontend fallback will handle any cases where trigger fails.';
END;
$$;