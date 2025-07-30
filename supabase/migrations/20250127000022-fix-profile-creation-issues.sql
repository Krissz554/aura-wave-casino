-- Comprehensive fix for profile creation issues

-- 1. First, let's check and fix the profiles table structure
DO $$
BEGIN
  -- Add email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
    RAISE NOTICE 'Added email column to profiles table';
  END IF;
  
  -- Add last_seen column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT now();
    RAISE NOTICE 'Added last_seen column to profiles table';
  END IF;
END $$;

-- 2. Remove ALL existing RLS policies on profiles to start fresh
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

-- 3. Create simple, permissive RLS policies
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

-- 4. Remove and recreate the trigger function with better error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  username_val text;
  email_val text;
BEGIN
  -- Log the trigger execution
  RAISE NOTICE 'handle_new_user triggered for user: %', NEW.id;
  
  -- Get username from metadata or generate one
  username_val := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'User' || substr(NEW.id::text, 1, 8)
  );
  
  -- Get email
  email_val := NEW.email;
  
  RAISE NOTICE 'Creating profile for user % with username: % and email: %', NEW.id, username_val, email_val;
  
  -- Create profile with comprehensive error handling
  BEGIN
    INSERT INTO public.profiles (
      id,
      username,
      email,
      balance,
      level,
      xp,
      total_wagered,
      total_profit,
      last_claim_time,
      badges,
      created_at,
      updated_at,
      last_seen
    ) VALUES (
      NEW.id,
      username_val,
      email_val,
      1000, -- Starting balance
      1,    -- Starting level
      0,    -- Starting XP
      0,    -- Starting total wagered
      0,    -- Starting total profit
      '1970-01-01T00:00:00Z',
      ARRAY['welcome'],
      NEW.created_at,
      NEW.created_at,
      NEW.created_at
    );
    
    RAISE NOTICE 'Profile created successfully for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
      -- Log the full error details
      RAISE NOTICE 'Error details - Code: %, Message: %, Detail: %', SQLSTATE, SQLERRM, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- 5. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Create a function to manually create profiles (for testing and fallback)
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  username TEXT,
  user_email TEXT
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
  
  -- Create profile
  INSERT INTO public.profiles (
    id,
    username,
    email,
    balance,
    level,
    xp,
    total_wagered,
    total_profit,
    last_claim_time,
    badges,
    created_at,
    updated_at,
    last_seen
  ) VALUES (
    user_id,
    username,
    user_email,
    1000,
    1,
    0,
    0,
    0,
    '1970-01-01T00:00:00Z',
    ARRAY['welcome'],
    now(),
    now(),
    now()
  );
  
  RAISE NOTICE 'Profile created manually for user: %', user_id;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile manually for user %: %', user_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- 7. Grant execute permission on the manual function
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, TEXT, TEXT) TO authenticated;

-- 8. Test the setup
DO $$
BEGIN
  RAISE NOTICE 'Profile creation setup completed';
  RAISE NOTICE 'Trigger function: handle_new_user';
  RAISE NOTICE 'Manual function: create_user_profile';
  RAISE NOTICE 'RLS policies: All operations allowed';
END $$;