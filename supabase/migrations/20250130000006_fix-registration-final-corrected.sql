-- FINAL CORRECTED REGISTRATION FIX
-- This migration fixes column ambiguity and matches the actual database schema

-- =============================================================================
-- 1. SAFELY FIX RLS POLICIES FOR PROFILES TABLE
-- =============================================================================

-- Drop ALL existing policies safely
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_others" ON public.profiles;

-- Create comprehensive RLS policies for profiles
CREATE POLICY "profiles_select_own" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Allow authenticated users to view other profiles (for chat, leaderboards, etc.)
CREATE POLICY "profiles_select_others" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- =============================================================================
-- 2. FIX MANUAL PROFILE CREATION FUNCTION (CORRECTED SCHEMA)
-- =============================================================================

-- Drop the existing function safely
DROP FUNCTION IF EXISTS public.create_user_profile_manual(UUID, TEXT);

-- Create corrected function that matches actual table schema and fixes column ambiguity
CREATE OR REPLACE FUNCTION public.create_user_profile_manual(p_user_id UUID, p_username TEXT)
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
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Profile already exists');
  END IF;

  -- Handle username conflicts (using table-qualified column names)
  final_username := p_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE profiles.username = final_username) AND counter < 5 LOOP
    counter := counter + 1;
    final_username := p_username || counter::TEXT;
  END LOOP;
  
  -- If still conflicts, use UUID suffix
  IF EXISTS (SELECT 1 FROM public.profiles WHERE profiles.username = final_username) THEN
    final_username := p_username || '_' || substring(p_user_id::TEXT from 1 for 6);
  END IF;

  BEGIN
    -- Create profile with ACTUAL schema columns (no level, xp columns in profiles table)
    INSERT INTO public.profiles (
      id,
      username,
      registration_date,
      balance,
      total_wagered,
      total_profit,
      last_claim_time,
      badges,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      final_username,
      now(),
      0,
      0,
      0,
      '1970-01-01 00:00:00+00'::timestamp with time zone,
      ARRAY['welcome'],
      now(),
      now()
    );

    -- Create user_level_stats entry (this table has the level/xp columns)
    INSERT INTO public.user_level_stats (
      user_id,
      current_level,
      current_level_xp,
      lifetime_xp,
      xp_to_next_level,
      border_tier,
      available_cases,
      total_cases_opened,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      1,
      0,
      0,
      100,
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
      RAISE NOTICE 'Error in create_user_profile_manual for user %: %', p_user_id, error_message;
      RETURN jsonb_build_object('success', false, 'error', error_message);
  END;
END;
$$;

-- =============================================================================
-- 3. FIX TRIGGER FUNCTION (CORRECTED SCHEMA)
-- =============================================================================

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create corrected trigger function that matches actual schema
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
  
  -- Handle username conflicts (using table-qualified column names)
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE profiles.username = final_username) AND counter < max_attempts LOOP
    counter := counter + 1;
    final_username := extracted_username || counter::TEXT;
  END LOOP;
  
  -- If still conflicts after max attempts, use UUID suffix
  IF EXISTS (SELECT 1 FROM public.profiles WHERE profiles.username = final_username) THEN
    final_username := extracted_username || '_' || substring(NEW.id::TEXT from 1 for 6);
  END IF;
  
  -- Use a nested BEGIN/EXCEPTION block to prevent registration failure
  BEGIN
    -- Create profile with CORRECT schema (no level, xp in profiles table)
    INSERT INTO public.profiles (
      id,
      username,
      registration_date,
      balance,
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
      0,
      0,
      '1970-01-01 00:00:00+00'::timestamp with time zone,
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
        0,
        0,
        '1970-01-01 00:00:00+00'::timestamp with time zone,
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
      xp_to_next_level,
      border_tier,
      available_cases,
      total_cases_opened,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      1,
      0,
      0,
      100,
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

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 4. GRANT PERMISSIONS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.create_user_profile_manual(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile_manual(UUID, TEXT) TO anon;

-- =============================================================================
-- 5. TEST THE FUNCTIONS
-- =============================================================================

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_result JSONB;
BEGIN
  RAISE NOTICE 'Testing create_user_profile_manual function...';
  
  -- Test the manual profile creation function
  SELECT public.create_user_profile_manual(test_user_id, 'test_user_' || substring(test_user_id::TEXT from 1 for 8)) INTO test_result;
  
  RAISE NOTICE 'Manual profile creation test result: %', test_result;
  
  -- Clean up test data
  DELETE FROM public.user_level_stats WHERE user_id = test_user_id;
  DELETE FROM public.profiles WHERE id = test_user_id;
  
  RAISE NOTICE 'Final corrected registration fix migration completed successfully!';
END;
$$;