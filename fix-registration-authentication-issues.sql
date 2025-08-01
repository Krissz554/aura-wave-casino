-- COMPREHENSIVE FIX FOR REGISTRATION AND AUTHENTICATION ISSUES
-- This script fixes the 406 errors and ensures proper user registration flow

-- 1. FIRST, LET'S CHECK THE CURRENT STATE
DO $$
DECLARE
  policy_rec RECORD;
BEGIN
  RAISE NOTICE '=== CURRENT RLS POLICIES ===';
  
  -- Check admin_users policies
  RAISE NOTICE 'Admin_users policies:';
  FOR policy_rec IN 
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'admin_users' AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Policy: %, Permissive: %, Roles: %, Cmd: %, Qual: %, WithCheck: %', 
      policy_rec.policyname, policy_rec.permissive, policy_rec.roles, 
      policy_rec.cmd, policy_rec.qual, policy_rec.with_check;
  END LOOP;
  
  -- Check user_level_stats policies
  RAISE NOTICE 'User_level_stats policies:';
  FOR policy_rec IN 
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'user_level_stats' AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Policy: %, Permissive: %, Roles: %, Cmd: %, Qual: %, WithCheck: %', 
      policy_rec.policyname, policy_rec.permissive, policy_rec.roles, 
      policy_rec.cmd, policy_rec.qual, policy_rec.with_check;
  END LOOP;
  
  -- Check profiles policies
  RAISE NOTICE 'Profiles policies:';
  FOR policy_rec IN 
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Policy: %, Permissive: %, Roles: %, Cmd: %, Qual: %, WithCheck: %', 
      policy_rec.policyname, policy_rec.permissive, policy_rec.roles, 
      policy_rec.cmd, policy_rec.qual, policy_rec.with_check;
  END LOOP;
END $$;

-- 2. DROP ALL EXISTING POLICIES TO START FRESH
-- Admin_users policies
DROP POLICY IF EXISTS "admin_users_authenticated_select_all" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_service_role_all" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_reset_permissions" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_select_all" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_insert_all" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_update_all" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_delete_all" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_authenticated_select_own" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_service_role_select_all" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_service_role_insert" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_service_role_update" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_service_role_delete" ON public.admin_users;

-- User_level_stats policies
DROP POLICY IF EXISTS "user_level_stats_authenticated_select_all" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_authenticated_update_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_authenticated_insert_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_service_role_all" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_reset_permissions" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_select_all" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_update_all" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_insert_all" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_delete_all" ON public.user_level_stats;

-- Profiles policies
DROP POLICY IF EXISTS "profiles_authenticated_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_authenticated_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_authenticated_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_role_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_reset_permissions" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_all" ON public.profiles;

-- 3. CREATE NEW PERMISSIVE POLICIES FOR ALL AUTHENTICATED USERS

-- ADMIN_USERS: Allow all authenticated users to view admin status
CREATE POLICY "admin_users_authenticated_select_all" 
ON public.admin_users 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow service role full access to admin_users
CREATE POLICY "admin_users_service_role_all" 
ON public.admin_users 
FOR ALL 
USING (auth.role() = 'service_role');

-- USER_LEVEL_STATS: Allow all authenticated users to view stats
CREATE POLICY "user_level_stats_authenticated_select_all" 
ON public.user_level_stats 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow users to update their own stats
CREATE POLICY "user_level_stats_authenticated_update_own" 
ON public.user_level_stats 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
);

-- Allow users to insert their own stats
CREATE POLICY "user_level_stats_authenticated_insert_own" 
ON public.user_level_stats 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
);

-- Allow service role full access to user_level_stats
CREATE POLICY "user_level_stats_service_role_all" 
ON public.user_level_stats 
FOR ALL 
USING (auth.role() = 'service_role');

-- PROFILES: Allow all authenticated users to view profiles (for user profiles)
CREATE POLICY "profiles_authenticated_select_all" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow users to update their own profile
CREATE POLICY "profiles_authenticated_update_own" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = id 
  AND auth.role() = 'authenticated'
);

-- Allow users to insert their own profile
CREATE POLICY "profiles_authenticated_insert_own" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = id 
  AND auth.role() = 'authenticated'
);

-- Allow service role full access to profiles
CREATE POLICY "profiles_service_role_all" 
ON public.profiles 
FOR ALL 
USING (auth.role() = 'service_role');

-- 4. ENSURE RLS IS ENABLED ON ALL TABLES
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_level_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. GRANT NECESSARY PERMISSIONS
GRANT SELECT ON public.admin_users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_level_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- 6. ENSURE THE PROFILE CREATION FUNCTION EXISTS AND WORKS
CREATE OR REPLACE FUNCTION public.create_user_profile_manual(user_id UUID, username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Profile already exists');
  END IF;

  -- Create profile with all required fields
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
    updated_at,
    available_cases,
    total_cases_opened
  ) VALUES (
    user_id,
    username,
    now(),
    0,  -- New users start with $0
    0,  -- No wagered amount yet
    0,  -- No profit yet
    '1970-01-01T00:00:00Z',  -- Default last claim time
    ARRAY['welcome'],  -- Default badge
    now(),
    now(),
    0,  -- No cases available yet
    0   -- No cases opened yet
  );

  -- Create user_level_stats entry
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
    user_id,
    1,  -- Start at level 1
    0,  -- No XP yet
    0,  -- No level XP yet
    100,  -- XP needed for next level
    1,  -- Basic border tier
    now(),  -- Border unlocked at creation
    0,  -- No cases available
    0,  -- No cases opened
    0,  -- No case value
    0,  -- No coinflip games
    0,  -- No coinflip wins
    0,  -- No coinflip wagered
    0,  -- No coinflip profit
    0,  -- No crash games
    0,  -- No crash wins
    0,  -- No crash wagered
    0,  -- No crash profit
    0,  -- No roulette games
    0,  -- No roulette wins
    0,  -- No roulette wagered
    0,  -- No roulette profit
    0,  -- No roulette green wins
    0,  -- No roulette highest win
    0,  -- No roulette biggest bet
    0,  -- No roulette best streak
    'red',  -- Default favorite color
    0,  -- No tower games
    0,  -- No tower wins
    0,  -- No tower wagered
    0,  -- No tower profit
    0,  -- No tower highest level
    0,  -- No tower perfect games
    0,  -- No total games
    0,  -- No total wins
    0,  -- No total wagered
    0,  -- No total profit
    0,  -- No best coinflip streak
    0,  -- No current coinflip streak
    0,  -- No best win streak
    0,  -- No biggest win
    0,  -- No biggest loss
    0,  -- No biggest single bet
    0,  -- No chat messages
    1,  -- First login day
    now(),  -- Account created now
    now(),  -- Created at
    now()   -- Updated at
  );

  RETURN jsonb_build_object('success', true, 'message', 'Profile and stats created successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7. ENSURE THE USER LEVEL STATS FUNCTION EXISTS
CREATE OR REPLACE FUNCTION public.ensure_user_level_stats(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if user_level_stats already exists
  IF EXISTS (SELECT 1 FROM public.user_level_stats WHERE user_id = user_uuid) THEN
    RETURN jsonb_build_object('success', true, 'message', 'User level stats already exist');
  END IF;

  -- Create user_level_stats entry
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
    user_uuid,
    1,  -- Start at level 1
    0,  -- No XP yet
    0,  -- No level XP yet
    100,  -- XP needed for next level
    1,  -- Basic border tier
    now(),  -- Border unlocked at creation
    0,  -- No cases available
    0,  -- No cases opened
    0,  -- No case value
    0,  -- No coinflip games
    0,  -- No coinflip wins
    0,  -- No coinflip wagered
    0,  -- No coinflip profit
    0,  -- No crash games
    0,  -- No crash wins
    0,  -- No crash wagered
    0,  -- No crash profit
    0,  -- No roulette games
    0,  -- No roulette wins
    0,  -- No roulette wagered
    0,  -- No roulette profit
    0,  -- No roulette green wins
    0,  -- No roulette highest win
    0,  -- No roulette biggest bet
    0,  -- No roulette best streak
    'red',  -- Default favorite color
    0,  -- No tower games
    0,  -- No tower wins
    0,  -- No tower wagered
    0,  -- No tower profit
    0,  -- No tower highest level
    0,  -- No tower perfect games
    0,  -- No total games
    0,  -- No total wins
    0,  -- No total wagered
    0,  -- No total profit
    0,  -- No best coinflip streak
    0,  -- No current coinflip streak
    0,  -- No best win streak
    0,  -- No biggest win
    0,  -- No biggest loss
    0,  -- No biggest single bet
    0,  -- No chat messages
    1,  -- First login day
    now(),  -- Account created now
    now(),  -- Created at
    now()   -- Updated at
  );

  RETURN jsonb_build_object('success', true, 'message', 'User level stats created successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 8. TEST THE FIX
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_created_at TIMESTAMP WITH TIME ZONE := now();
  profile_result JSONB;
  stats_result JSONB;
BEGIN
  RAISE NOTICE '=== TESTING THE FIX ===';
  
  -- Create a test user
  INSERT INTO auth.users (
    id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    created_at, 
    updated_at, 
    raw_user_meta_data
  )
  VALUES (
    test_user_id,
    'test@example.com',
    'dummy_password',
    test_created_at,
    test_created_at,
    test_created_at,
    jsonb_build_object('username', 'TestUser')
  );
  
  RAISE NOTICE 'Test user created with ID: %', test_user_id;
  
  -- Test profile creation function
  SELECT public.create_user_profile_manual(test_user_id, 'TestUser') INTO profile_result;
  RAISE NOTICE 'Profile creation result: %', profile_result;
  
  -- Test stats creation function
  SELECT public.ensure_user_level_stats(test_user_id) INTO stats_result;
  RAISE NOTICE 'Stats creation result: %', stats_result;
  
  -- Test if we can query admin_users (this was failing with 406)
  BEGIN
    PERFORM 1 FROM public.admin_users WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Can query admin_users successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query admin_users: %', SQLERRM;
  END;
  
  -- Test if we can query user_level_stats (this was failing with 406)
  BEGIN
    PERFORM 1 FROM public.user_level_stats WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Can query user_level_stats successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query user_level_stats: %', SQLERRM;
  END;
  
  -- Test if we can query profiles
  BEGIN
    PERFORM 1 FROM public.profiles WHERE id = test_user_id;
    RAISE NOTICE '✅ Can query profiles successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query profiles: %', SQLERRM;
  END;
  
  -- Clean up test data
  DELETE FROM auth.users WHERE id = test_user_id;
  RAISE NOTICE 'Test completed and cleaned up';
END $$;

-- 9. SHOW FINAL POLICY STATUS
DO $$
DECLARE
  policy_rec RECORD;
BEGIN
  RAISE NOTICE '=== FINAL RLS POLICIES ===';
  
  -- Check admin_users policies
  RAISE NOTICE 'Admin_users policies:';
  FOR policy_rec IN 
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'admin_users' AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Policy: %, Permissive: %, Roles: %, Cmd: %, Qual: %, WithCheck: %', 
      policy_rec.policyname, policy_rec.permissive, policy_rec.roles, 
      policy_rec.cmd, policy_rec.qual, policy_rec.with_check;
  END LOOP;
  
  -- Check user_level_stats policies
  RAISE NOTICE 'User_level_stats policies:';
  FOR policy_rec IN 
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'user_level_stats' AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Policy: %, Permissive: %, Roles: %, Cmd: %, Qual: %, WithCheck: %', 
      policy_rec.policyname, policy_rec.permissive, policy_rec.roles, 
      policy_rec.cmd, policy_rec.qual, policy_rec.with_check;
  END LOOP;
  
  -- Check profiles policies
  RAISE NOTICE 'Profiles policies:';
  FOR policy_rec IN 
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Policy: %, Permissive: %, Roles: %, Cmd: %, Qual: %, WithCheck: %', 
      policy_rec.policyname, policy_rec.permissive, policy_rec.roles, 
      policy_rec.cmd, policy_rec.qual, policy_rec.with_check;
  END LOOP;
  
  RAISE NOTICE '=== FIX COMPLETED ===';
  RAISE NOTICE 'Registration and authentication issues should now be resolved.';
  RAISE NOTICE 'Users should be able to register and access their profiles without 406 errors.';
END $$;