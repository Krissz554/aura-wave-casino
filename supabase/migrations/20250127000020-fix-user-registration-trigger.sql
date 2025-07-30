-- Fix user registration trigger to ensure profiles are created properly

-- First, let's check if the trigger exists and is working
DO $$
BEGIN
  -- Check if trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'Trigger on_auth_user_created does not exist, creating it...';
  ELSE
    RAISE NOTICE 'Trigger on_auth_user_created exists';
  END IF;
  
  -- Check if function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
  ) THEN
    RAISE NOTICE 'Function handle_new_user does not exist, creating it...';
  ELSE
    RAISE NOTICE 'Function handle_new_user exists';
  END IF;
END $$;

-- Drop existing trigger and function to recreate them
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a robust handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
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
  
  RAISE NOTICE 'Creating profile for user % with username: %', NEW.id, username_val;
  
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
      updated_at
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
      NEW.created_at
    );
    
    RAISE NOTICE 'Profile created successfully for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
      -- Don't fail the user creation, just log the error
  END;
  
  -- Create user_level_stats with error handling
  BEGIN
    INSERT INTO public.user_level_stats (
      user_id,
      current_level,
      current_level_xp,
      lifetime_xp,
      xp_to_next_level,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      1, -- Starting level
      0, -- Current level XP
      0, -- Lifetime XP
      1000, -- XP to next level
      NEW.created_at,
      NEW.created_at
    );
    
    RAISE NOTICE 'User level stats created successfully for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating user_level_stats for user %: %', NEW.id, SQLERRM;
      -- Don't fail the user creation, just log the error
  END;
  
  -- Initialize level daily cases
  BEGIN
    PERFORM public.initialize_level_daily_cases(NEW.id);
    RAISE NOTICE 'Level daily cases initialized for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error initializing level daily cases for user %: %', NEW.id, SQLERRM;
      -- Don't fail the user creation, just log the error
  END;
  
  RAISE NOTICE 'handle_new_user completed successfully for user: %', NEW.id;
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure service role policies exist for the trigger to work
DO $$
BEGIN
  -- Add service role policy for profiles if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Service role can insert profiles'
  ) THEN
    CREATE POLICY "Service role can insert profiles" 
    ON public.profiles 
    FOR INSERT 
    WITH CHECK (auth.role() = 'service_role');
    RAISE NOTICE 'Created service role policy for profiles';
  END IF;
  
  -- Add service role policy for user_level_stats if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_level_stats' 
    AND policyname = 'Service role can insert user level stats'
  ) THEN
    CREATE POLICY "Service role can insert user level stats" 
    ON public.user_level_stats 
    FOR INSERT 
    WITH CHECK (auth.role() = 'service_role');
    RAISE NOTICE 'Created service role policy for user_level_stats';
  END IF;
END $$;

-- Test the trigger function
SELECT 'User registration trigger setup completed' as status;