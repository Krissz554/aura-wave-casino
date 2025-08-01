-- Fix registration and profile creation issues (SAFE VERSION)
-- This migration safely handles existing policies and fixes registration

-- =============================================================================
-- 1. SAFELY FIX RLS POLICIES FOR PROFILES TABLE
-- =============================================================================

-- Drop ALL existing policies safely (using IF EXISTS)
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
-- 2. FIX MANUAL PROFILE CREATION FUNCTION
-- =============================================================================

-- Drop the existing function safely
DROP FUNCTION IF EXISTS public.create_user_profile_manual(UUID, TEXT);

-- Create corrected function that matches actual table schema
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
    -- Create profile with only existing columns
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

    -- Also create user_level_stats entry
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
-- 3. GRANT PERMISSIONS
-- =============================================================================

-- Grant execute permission on the manual function
GRANT EXECUTE ON FUNCTION public.create_user_profile_manual(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile_manual(UUID, TEXT) TO anon;

-- =============================================================================
-- 4. TEST THE FUNCTIONS
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
  
  RAISE NOTICE 'Safe registration fix migration completed successfully!';
END;
$$;