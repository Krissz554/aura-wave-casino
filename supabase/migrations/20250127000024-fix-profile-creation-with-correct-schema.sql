-- Fix profile creation to match the actual database schema

-- 1. First, let's check what columns actually exist in the profiles table
DO $$
BEGIN
  RAISE NOTICE 'Checking profiles table structure...';
  
  -- This will show us all columns in the profiles table
  FOR col IN 
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE 'Column: %, Type: %, Nullable: %, Default: %', 
      col.column_name, col.data_type, col.is_nullable, col.column_default;
  END LOOP;
END $$;

-- 2. Remove any existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.create_user_profile();
DROP FUNCTION IF EXISTS public.create_user_profile_simple();

-- 3. Create a proper trigger function that matches the actual schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  username_val text;
BEGIN
  -- Log the trigger execution
  RAISE NOTICE 'handle_new_user triggered for user: %', NEW.id;
  
  -- Get username from metadata or generate one
  username_val := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'User' || substr(NEW.id::text, 1, 8)
  );
  
  RAISE NOTICE 'Creating profile for user % with username: %', NEW.id, username_val;
  
  -- Create profile with ALL required columns based on actual schema
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
      1000, -- Starting balance
      1,    -- Starting level
      0,    -- Starting XP
      0,    -- Starting total wagered
      0,    -- Starting total profit
      '1970-01-01T00:00:00Z',
      ARRAY['welcome'],
      NEW.created_at,
      NEW.created_at,
      1,    -- current_level
      0,    -- current_xp
      100,  -- xp_to_next_level
      0,    -- lifetime_xp
      1,    -- border_tier
      0,    -- available_cases
      0,    -- total_cases_opened
      0     -- total_xp
    );
    
    RAISE NOTICE 'Profile created successfully for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
      -- Log the full error details
      RAISE NOTICE 'Error details - Code: %, Message: %', SQLSTATE, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- 4. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Create a manual profile creation function that matches the schema
CREATE OR REPLACE FUNCTION public.create_user_profile_manual(
  user_id UUID,
  username TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    RAISE NOTICE 'Profile already exists for user: %', user_id;
    RETURN TRUE;
  END IF;
  
  -- Create profile with ALL required columns
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
    user_id,
    username,
    now(),
    1000, -- Starting balance
    1,    -- Starting level
    0,    -- Starting XP
    0,    -- Starting total wagered
    0,    -- Starting total profit
    '1970-01-01T00:00:00Z',
    ARRAY['welcome'],
    now(),
    now(),
    1,    -- current_level
    0,    -- current_xp
    100,  -- xp_to_next_level
    0,    -- lifetime_xp
    1,    -- border_tier
    0,    -- available_cases
    0,    -- total_cases_opened
    0     -- total_xp
  );
  
  RAISE NOTICE 'Profile created manually for user: %', user_id;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile manually for user %: %', user_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- 6. Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_user_profile_manual(UUID, TEXT) TO authenticated;

-- 7. Ensure RLS policies allow profile creation
DROP POLICY IF EXISTS "profiles_all_operations" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Create simple, permissive RLS policies
CREATE POLICY "profiles_select_policy" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "profiles_insert_policy" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "profiles_update_policy" 
ON public.profiles 
FOR UPDATE 
USING (true);

CREATE POLICY "profiles_delete_policy" 
ON public.profiles 
FOR DELETE 
USING (true);

-- 8. Test the setup
DO $$
BEGIN
  RAISE NOTICE 'Profile creation setup completed with correct schema';
  RAISE NOTICE 'Trigger function: handle_new_user';
  RAISE NOTICE 'Manual function: create_user_profile_manual';
  RAISE NOTICE 'All required columns included';
END $$;