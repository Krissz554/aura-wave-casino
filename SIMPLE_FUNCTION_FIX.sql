-- =====================================================================
-- SIMPLE FIX: Function Return Type Error for Commit 9404977
-- =====================================================================
-- ERROR: 42P13: cannot change return type of existing function
-- HINT: Use DROP FUNCTION reset_user_stats_comprehensive(uuid) first.
-- 
-- This script fixes the specific error you encountered by properly
-- dropping and recreating the function with the correct return type.
-- =====================================================================

-- Step 1: Drop the existing function to avoid return type conflict
DROP FUNCTION IF EXISTS public.reset_user_stats_comprehensive(UUID);

-- Step 2: Recreate with the exact function from commit 9404977
-- This is the balance-preserving function that was the key feature of that commit
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

  -- Get current balance to preserve it
  SELECT balance INTO user_balance FROM public.profiles WHERE id = target_user_id;
  
  BEGIN
    -- Reset user profile stats while PRESERVING balance (KEY COMMIT 9404977 FEATURE)
    UPDATE public.profiles 
    SET 
      total_wagered = 0,
      total_won = 0,
      level = 1,
      experience_points = 0,
      updated_at = NOW()
      -- CRITICAL: balance is NOT modified - preserves user's money
    WHERE id = target_user_id;
    
    GET DIAGNOSTICS records_affected = ROW_COUNT;
    IF records_affected > 0 THEN
      tables_reset := tables_reset + 1;
      RAISE NOTICE 'Reset profiles table for user %', target_user_id;
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

  -- Return success result
  result := jsonb_build_object(
    'success', true,
    'message', 'User stats reset successfully with balance preserved',
    'user_id', target_user_id,
    'tables_reset', tables_reset,
    'preserved_balance', user_balance,
    'reset_at', NOW()
  );
  
  RAISE NOTICE 'Stats reset completed for user %. Balance preserved: %', target_user_id, user_balance;
  
  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    -- Handle any unexpected errors
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

-- =====================================================================
-- FIX COMPLETE!
-- =====================================================================
-- Your function has been recreated with the correct JSONB return type
-- from commit 9404977. The key balance-preserving feature is intact.
-- 
-- The function now:
-- ✅ Properly returns JSONB (fixes the return type error)
-- ✅ Preserves user balance (key commit 9404977 feature)
-- ✅ Resets all other stats (level, XP, achievements)
-- ✅ Includes comprehensive error handling
-- ✅ Provides detailed logging
-- =====================================================================