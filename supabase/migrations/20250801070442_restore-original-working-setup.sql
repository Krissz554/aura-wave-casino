-- RESTORE ORIGINAL WORKING SETUP
-- This migration restores the original working RLS setup that allowed registration to work

-- 1. ENABLE RLS ON ALL TABLES (this was the original working state)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_level_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_rewards ENABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING POLICIES TO START FRESH
-- Profiles
DROP POLICY IF EXISTS "profiles_all_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_role_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_role_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_role_update" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_unified_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_unified_delete" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all_operations" ON public.profiles;
DROP POLICY IF EXISTS "profiles_reset_permissions" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- User level stats
DROP POLICY IF EXISTS "user_level_stats_all_access" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_select_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_update_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_insert_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_service_role_select" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_service_role_insert" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_service_role_update" ON public.user_level_stats;
DROP POLICY IF EXISTS "Users can view their own user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Users can update their own user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Users can insert their own user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Service role can insert user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Service role can update user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_select_policy" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_insert_policy" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_update_policy" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_delete_policy" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_unified_select" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_unified_delete" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_reset_permissions" ON public.user_level_stats;

-- Admin users
DROP POLICY IF EXISTS "admin_users_all_access" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_select_own" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_service_role_select" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_service_role_insert" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_service_role_update" ON public.admin_users;
DROP POLICY IF EXISTS "Users can view their own admin status" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can view all admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Service role can insert admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Service role can update admin users" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_select_policy" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_insert_policy" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_update_policy" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_delete_policy" ON public.admin_users;

-- Notifications
DROP POLICY IF EXISTS "notifications_all_access" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_service_role_insert" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_unified_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_unified_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_unified_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_unified_delete" ON public.notifications;
DROP POLICY IF EXISTS "notifications_reset_permissions" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications for any user" ON public.notifications;

-- Case rewards
DROP POLICY IF EXISTS "case_rewards_all_access" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_select_own" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_service_role_insert" ON public.case_rewards;
DROP POLICY IF EXISTS "Users can view their own case rewards" ON public.case_rewards;
DROP POLICY IF EXISTS "Service role can insert case rewards" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_unified_select" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_unified_update" ON public.case_rewards;
DROP POLICY IF EXISTS "case_rewards_reset_permissions" ON public.case_rewards;

-- 3. CREATE THE ORIGINAL WORKING POLICIES (from the working migration)

-- Profiles table - original working policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Service role policies for profiles (needed for trigger function)
CREATE POLICY "Service role can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (auth.role() = 'service_role');

-- User level stats table - original working policies
CREATE POLICY "Users can view their own user level stats" 
ON public.user_level_stats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own user level stats" 
ON public.user_level_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own user level stats" 
ON public.user_level_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Service role policies for user_level_stats (needed for trigger function)
CREATE POLICY "Service role can insert user level stats" 
ON public.user_level_stats 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update user level stats" 
ON public.user_level_stats 
FOR UPDATE 
USING (auth.role() = 'service_role');

-- Admin users table - original working policies
CREATE POLICY "Users can view their own admin status" 
ON public.admin_users 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all admin users" 
ON public.admin_users 
FOR SELECT 
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert admin users" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update admin users" 
ON public.admin_users 
FOR UPDATE 
USING (auth.role() = 'service_role');

-- Notifications table - original working policies
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Case rewards table - original working policies
CREATE POLICY "Users can view their own case rewards" 
ON public.case_rewards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert case rewards" 
ON public.case_rewards 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- 4. CREATE THE ORIGINAL WORKING TRIGGER FUNCTION
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

-- 5. RECREATE THE TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. CREATE THE ORIGINAL WORKING RPC FUNCTIONS
DROP FUNCTION IF EXISTS public.create_user_profile_manual(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.create_user_profile_manual(user_id UUID, username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile if it doesn't exist
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
  )
  VALUES (
    user_id,
    username,
    now(),
    0,
    0,
    0,
    '1970-01-01T00:00:00Z',
    ARRAY['welcome'],
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create user_level_stats if it doesn't exist
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
    user_id,
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
    now(),
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in create_user_profile_manual for user %: %', user_id, SQLERRM;
    RETURN FALSE;
END;
$$;

DROP FUNCTION IF EXISTS public.ensure_user_level_stats(UUID);
CREATE OR REPLACE FUNCTION public.ensure_user_level_stats(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create user_level_stats if it doesn't exist
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
    user_uuid,
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
    now(),
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in ensure_user_level_stats for user %: %', user_uuid, SQLERRM;
    RETURN FALSE;
END;
$$;

-- 7. GRANT EXECUTE PERMISSIONS
GRANT EXECUTE ON FUNCTION public.create_user_profile_manual(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_level_stats(UUID) TO authenticated;

-- 8. TEST THE ORIGINAL WORKING SETUP
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_created_at TIMESTAMP WITH TIME ZONE := now();
BEGIN
  RAISE NOTICE 'Testing original working setup...';
  
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
  
  -- Wait a moment for trigger to execute
  PERFORM pg_sleep(1);
  
  -- Check if profile was created
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
    RAISE NOTICE '✅ Profile created successfully';
  ELSE
    RAISE NOTICE '❌ Profile was NOT created';
  END IF;
  
  -- Check if stats were created
  IF EXISTS (SELECT 1 FROM public.user_level_stats WHERE user_id = test_user_id) THEN
    RAISE NOTICE '✅ Stats created successfully';
  ELSE
    RAISE NOTICE '❌ Stats were NOT created';
  END IF;
  
  -- Clean up test data
  DELETE FROM auth.users WHERE id = test_user_id;
  RAISE NOTICE 'Test completed and cleaned up';
END $$;