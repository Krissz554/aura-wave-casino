
-- Drop existing function first
DROP FUNCTION IF EXISTS public.reset_user_stats_comprehensive(UUID);

-- Create the exact commit 9404977 function

CREATE OR REPLACE FUNCTION public.reset_user_stats_comprehensive(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  error_message TEXT;
  tables_reset INTEGER := 0;
  records_affected INTEGER := 0;
  user_balance NUMERIC;
BEGIN
  RAISE NOTICE 'Starting comprehensive stats reset for user: %', target_user_id;
  
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'User not found',
      'user_id', target_user_id
    );
  END IF;

  -- Get current balance to preserve it (KEY COMMIT 9404977 FEATURE)
  SELECT balance INTO user_balance FROM public.profiles WHERE id = target_user_id;
  
  BEGIN
    -- Reset user profile stats while PRESERVING balance
    UPDATE public.profiles 
    SET 
      total_wagered = COALESCE(total_wagered, 0) * 0,
      total_won = COALESCE(total_won, 0) * 0,
      level = 1,
      experience_points = COALESCE(experience_points, 0) * 0,
      updated_at = NOW()
      -- CRITICAL: balance is NOT modified - preserves user's money
    WHERE id = target_user_id;
    
    GET DIAGNOSTICS records_affected = ROW_COUNT;
    IF records_affected > 0 THEN
      tables_reset := tables_reset + 1;
      RAISE NOTICE 'Reset profiles table for user %. Balance preserved: %', target_user_id, user_balance;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      error_message := 'Failed to reset profiles: ' || SQLERRM;
      RAISE WARNING '%', error_message;
  END;

  BEGIN
    -- Clear user achievements
    DELETE FROM public.user_achievements WHERE user_id = target_user_id;
    GET DIAGNOSTICS records_affected = ROW_COUNT;
    IF records_affected > 0 THEN
      tables_reset := tables_reset + 1;
      RAISE NOTICE 'Cleared % achievements for user %', records_affected, target_user_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      error_message := 'Failed to clear achievements: ' || SQLERRM;
      RAISE WARNING '%', error_message;
  END;

  BEGIN
    -- Reset user level stats
    DELETE FROM public.user_level_stats WHERE user_id = target_user_id;
    GET DIAGNOSTICS records_affected = ROW_COUNT;
    IF records_affected > 0 THEN
      tables_reset := tables_reset + 1;
      RAISE NOTICE 'Cleared % level stats for user %', records_affected, target_user_id;
    END IF;

    -- Insert fresh level 1 stats
    INSERT INTO public.user_level_stats (user_id, level, experience_points, created_at, updated_at)
    VALUES (target_user_id, 1, 0, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      level = 1,
      experience_points = 0,
      updated_at = NOW();
      
    RAISE NOTICE 'Inserted fresh level 1 stats for user %', target_user_id;
  EXCEPTION
    WHEN OTHERS THEN
      error_message := 'Failed to reset level stats: ' || SQLERRM;
      RAISE WARNING '%', error_message;
  END;

  -- Return success result with balance preserved info
  result := jsonb_build_object(
    'success', true,
    'message', 'User stats reset successfully with balance preserved',
    'user_id', target_user_id,
    'tables_reset', tables_reset,
    'balance_preserved', user_balance,
    'reset_at', NOW()
  );
  
  RAISE NOTICE 'Stats reset completed for user %. Balance preserved: %', target_user_id, user_balance;
  
  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    result := jsonb_build_object(
      'success', false,
      'error', 'Unexpected error during reset: ' || SQLERRM,
      'user_id', target_user_id,
      'tables_reset', tables_reset
    );
    
    RAISE WARNING 'Stats reset failed for user %: %', target_user_id, SQLERRM;
    RETURN result;
END;
$$;
      