-- Fix user access policies to ensure normal users can see their data while admins can see all data

-- 1. First, let's check what RLS policies exist
DO $$
DECLARE
  policy RECORD;
BEGIN
  RAISE NOTICE 'Checking existing RLS policies...';
  
  FOR policy IN 
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'user_level_stats', 'game_stats', 'game_history')
    ORDER BY tablename, policyname
  LOOP
    RAISE NOTICE 'Table: %, Policy: %, Command: %, Qual: %, With Check: %', 
      policy.tablename, policy.policyname, policy.cmd, policy.qual, policy.with_check;
  END LOOP;
END $$;

-- 2. Remove ALL existing policies on key tables
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all profile inserts" ON public.profiles;
DROP POLICY IF EXISTS "Allow all profile updates" ON public.profiles;
DROP POLICY IF EXISTS "Allow all profile selects" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all_operations" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;

-- Remove policies from user_level_stats
DROP POLICY IF EXISTS "Users can view their own user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Users can update their own user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Users can insert their own user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Service role can insert user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Service role can update user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_select_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_update_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_insert_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_admin_select" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_admin_update" ON public.user_level_stats;

-- Remove policies from game_stats
DROP POLICY IF EXISTS "Users can view their own game stats" ON public.game_stats;
DROP POLICY IF EXISTS "Users can update their own game stats" ON public.game_stats;
DROP POLICY IF EXISTS "Users can insert their own game stats" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_select_own" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_update_own" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_insert_own" ON public.game_stats;
DROP POLICY IF EXISTS "game_stats_admin_select" ON public.game_stats;

-- Remove policies from game_history
DROP POLICY IF EXISTS "Users can view their own game history" ON public.game_history;
DROP POLICY IF EXISTS "Users can insert their own game history" ON public.game_history;
DROP POLICY IF EXISTS "game_history_select_own" ON public.game_history;
DROP POLICY IF EXISTS "game_history_insert_own" ON public.game_history;
DROP POLICY IF EXISTS "game_history_admin_select" ON public.game_history;

-- 3. Create proper policies for profiles table
-- Allow users to view their own profile
CREATE POLICY "profiles_select_own" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_own" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "profiles_insert_own" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Allow admins to view all profiles
CREATE POLICY "profiles_admin_select" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to update all profiles
CREATE POLICY "profiles_admin_update" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- 4. Create proper policies for user_level_stats table
-- Allow users to view their own user_level_stats
CREATE POLICY "user_level_stats_select_own" 
ON public.user_level_stats 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to update their own user_level_stats
CREATE POLICY "user_level_stats_update_own" 
ON public.user_level_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to insert their own user_level_stats
CREATE POLICY "user_level_stats_insert_own" 
ON public.user_level_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all user_level_stats
CREATE POLICY "user_level_stats_admin_select" 
ON public.user_level_stats 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to update all user_level_stats
CREATE POLICY "user_level_stats_admin_update" 
ON public.user_level_stats 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- 5. Create proper policies for game_stats table
-- Allow users to view their own game_stats
CREATE POLICY "game_stats_select_own" 
ON public.game_stats 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to update their own game_stats
CREATE POLICY "game_stats_update_own" 
ON public.game_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow users to insert their own game_stats
CREATE POLICY "game_stats_insert_own" 
ON public.game_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all game_stats
CREATE POLICY "game_stats_admin_select" 
ON public.game_stats 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- 6. Create proper policies for game_history table
-- Allow users to view their own game_history
CREATE POLICY "game_history_select_own" 
ON public.game_history 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own game_history
CREATE POLICY "game_history_insert_own" 
ON public.game_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all game_history
CREATE POLICY "game_history_admin_select" 
ON public.game_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- 7. Drop existing function if it exists, then create the ensure_user_level_stats function
DROP FUNCTION IF EXISTS public.ensure_user_level_stats(UUID);

CREATE OR REPLACE FUNCTION public.ensure_user_level_stats(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user_level_stats already exists
  IF EXISTS (SELECT 1 FROM public.user_level_stats WHERE user_id = user_uuid) THEN
    RETURN TRUE;
  END IF;
  
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
    tower_games,
    tower_wins,
    tower_wagered,
    tower_profit,
    total_games,
    total_wins,
    total_wagered,
    total_profit,
    created_at,
    updated_at
  ) VALUES (
    user_uuid,
    1,    -- current_level
    0,    -- current_level_xp
    0,    -- lifetime_xp
    100,  -- xp_to_next_level
    1,    -- border_tier
    0,    -- available_cases
    0,    -- total_cases_opened
    0,    -- coinflip_games
    0,    -- coinflip_wins
    0,    -- coinflip_wagered
    0,    -- coinflip_profit
    0,    -- crash_games
    0,    -- crash_wins
    0,    -- crash_wagered
    0,    -- crash_profit
    0,    -- roulette_games
    0,    -- roulette_wins
    0,    -- roulette_wagered
    0,    -- roulette_profit
    0,    -- tower_games
    0,    -- tower_wins
    0,    -- tower_wagered
    0,    -- tower_profit
    0,    -- total_games
    0,    -- total_wins
    0,    -- total_wagered
    0,    -- total_profit
    now(), -- created_at
    now()  -- updated_at
  );
  
  RAISE NOTICE 'Created user_level_stats for user: %', user_uuid;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user_level_stats for user %: %', user_uuid, SQLERRM;
    RETURN FALSE;
END;
$$;

-- 8. Grant execute permission
GRANT EXECUTE ON FUNCTION public.ensure_user_level_stats(UUID) TO authenticated;

-- 9. Update the trigger function to start new users with $0 balance
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  username_val text;
BEGIN
  RAISE NOTICE 'handle_new_user triggered for user: %', NEW.id;
  username_val := COALESCE(NEW.raw_user_meta_data->>'username', 'User' || substr(NEW.id::text, 1, 8));
  
  RAISE NOTICE 'Creating profile for user % with username: %', NEW.id, username_val;
  
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
      updated_at, 
      current_level, 
      current_xp, 
      xp_to_next_level, 
      lifetime_xp, 
      border_tier, 
      available_cases, 
      total_cases_opened, 
      total_xp
    ) VALUES (
      NEW.id, 
      username_val, 
      NEW.created_at, 
      0,  -- Changed from 1000 to 0 - new users start with $0
      1, 
      0, 
      0, 
      0, 
      '1970-01-01T00:00:00Z', 
      ARRAY['welcome'], 
      NEW.created_at, 
      NEW.created_at, 
      1, 
      0, 
      100, 
      0, 
      1, 
      0, 
      0, 
      0
    );
    
    RAISE NOTICE 'Profile created successfully for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
      RAISE NOTICE 'Error details - Code: %, Message: %', SQLSTATE, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- 10. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 11. Test the setup
DO $$
BEGIN
  RAISE NOTICE 'User access policies setup completed';
  RAISE NOTICE 'Users can now access their own profiles and stats';
  RAISE NOTICE 'Admins can access all user data';
  RAISE NOTICE 'Function: ensure_user_level_stats available';
  RAISE NOTICE 'New users will start with $0 balance';
END $$;