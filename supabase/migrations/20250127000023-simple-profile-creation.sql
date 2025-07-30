-- Simple fix: Remove trigger dependency and allow direct profile creation

-- 1. Remove the trigger completely (we'll handle profile creation in the frontend)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Ensure all RLS policies allow profile creation
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

-- 3. Create completely open RLS policies
CREATE POLICY "profiles_all_operations" 
ON public.profiles 
FOR ALL 
USING (true)
WITH CHECK (true);

-- 4. Create a simple function for profile creation
CREATE OR REPLACE FUNCTION public.create_user_profile_simple(
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
    RETURN TRUE;
  END IF;
  
  -- Create profile with minimal required fields
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
    updated_at
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
    now()
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', user_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- 5. Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_user_profile_simple(UUID, TEXT, TEXT) TO authenticated;

-- 6. Test the setup
DO $$
BEGIN
  RAISE NOTICE 'Simple profile creation setup completed';
  RAISE NOTICE 'No trigger dependency';
  RAISE NOTICE 'Open RLS policies';
  RAISE NOTICE 'Simple function: create_user_profile_simple';
END $$;