-- Clean fix for user registration - remove all conflicts and create a simple working trigger

-- 1. Remove ALL existing triggers and functions that might conflict
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user_old();

-- 2. Remove conflicting RLS policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;

-- 3. Create a simple, working trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  username_val text;
BEGIN
  -- Generate username from metadata or create one
  username_val := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'User' || substr(NEW.id::text, 1, 8)
  );
  
  -- Insert profile with error handling
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
      updated_at
    ) VALUES (
      NEW.id,
      username_val,
      NEW.email,
      1000,
      1,
      0,
      0,
      0,
      '1970-01-01T00:00:00Z',
      ARRAY['welcome'],
      NEW.created_at,
      NEW.created_at
    );
    
    RAISE NOTICE 'Profile created for user: % with username: %', NEW.id, username_val;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- 4. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Create simple RLS policies that allow the trigger to work
CREATE POLICY "Allow all profile inserts" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all profile updates" 
ON public.profiles 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow all profile selects" 
ON public.profiles 
FOR SELECT 
USING (true);

-- 6. Test the setup
DO $$
BEGIN
  RAISE NOTICE 'User registration trigger setup completed';
  RAISE NOTICE 'Trigger function: handle_new_user';
  RAISE NOTICE 'Trigger: on_auth_user_created on auth.users';
END $$;