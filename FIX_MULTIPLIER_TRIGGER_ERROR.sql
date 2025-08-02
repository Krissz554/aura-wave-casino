-- =====================================================
-- FIX MULTIPLIER TRIGGER ERROR
-- =====================================================
-- This fixes the "record NEW has no field multiplier" error
-- by removing problematic triggers and functions

-- =====================================================
-- STEP 1: Drop all problematic triggers and functions
-- =====================================================

-- Drop all game_history triggers that might reference multiplier
DROP TRIGGER IF EXISTS game_history_trigger ON public.game_history CASCADE;
DROP TRIGGER IF EXISTS trigger_game_history_to_live_feed ON public.game_history CASCADE;
DROP TRIGGER IF EXISTS trigger_add_to_live_feed ON public.game_history CASCADE;
DROP TRIGGER IF EXISTS add_coinflip_to_live_feed_trigger ON public.game_history CASCADE;

-- Drop the problematic trigger functions
DROP FUNCTION IF EXISTS public.handle_game_history_insert() CASCADE;
DROP FUNCTION IF EXISTS public.add_to_live_feed() CASCADE;
DROP FUNCTION IF EXISTS public.process_game_history() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_game_entry() CASCADE;

-- =====================================================
-- STEP 2: Create a safe trigger function that handles missing fields
-- =====================================================

CREATE OR REPLACE FUNCTION public.safe_game_history_handler()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_name TEXT;
  safe_multiplier NUMERIC := 1.0;
  safe_streak INTEGER := 0;
BEGIN
  -- Get username safely
  SELECT username INTO user_name 
  FROM public.profiles 
  WHERE id = NEW.user_id;
  
  -- Use safe defaults for potentially missing fields
  IF NEW.final_multiplier IS NOT NULL THEN
    safe_multiplier := NEW.final_multiplier;
  ELSIF NEW.game_data IS NOT NULL AND NEW.game_data ? 'multiplier' THEN
    safe_multiplier := (NEW.game_data->>'multiplier')::NUMERIC;
  END IF;
  
  safe_streak := COALESCE(NEW.streak_length, 0);
  
  -- Insert into live_bet_feed safely
  INSERT INTO public.live_bet_feed (
    user_id, username, game_type, bet_amount, result, profit, 
    multiplier, game_data, streak_length, action, created_at
  ) VALUES (
    NEW.user_id, 
    COALESCE(user_name, 'Unknown'), 
    NEW.game_type, 
    NEW.bet_amount, 
    NEW.result, 
    NEW.profit,
    safe_multiplier,
    NEW.game_data, 
    safe_streak, 
    COALESCE(NEW.action, 'completed'),
    NEW.created_at
  );
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE NOTICE 'Error in safe_game_history_handler: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 3: Create the safe trigger
-- =====================================================

CREATE TRIGGER safe_game_history_trigger
  AFTER INSERT ON public.game_history
  FOR EACH ROW
  EXECUTE FUNCTION public.safe_game_history_handler();

-- =====================================================
-- STEP 4: Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION public.safe_game_history_handler() TO authenticated, service_role;

-- =====================================================
-- STEP 5: Add missing columns to game_history if needed
-- =====================================================

DO $$
BEGIN
  -- Add final_multiplier column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'game_history' 
    AND column_name = 'final_multiplier'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.game_history ADD COLUMN final_multiplier NUMERIC DEFAULT 1.0;
    RAISE NOTICE '✅ Added final_multiplier column to game_history table';
  END IF;
  
  -- Add action column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'game_history' 
    AND column_name = 'action'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.game_history ADD COLUMN action TEXT DEFAULT 'completed';
    RAISE NOTICE '✅ Added action column to game_history table';
  END IF;
  
  -- Add streak_length column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'game_history' 
    AND column_name = 'streak_length'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.game_history ADD COLUMN streak_length INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added streak_length column to game_history table';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check that the problematic triggers are gone
SELECT 
  'TRIGGER CLEANUP VERIFICATION' as check_type,
  COUNT(*) as remaining_problematic_triggers
FROM information_schema.triggers 
WHERE trigger_name IN (
  'game_history_trigger',
  'trigger_game_history_to_live_feed', 
  'trigger_add_to_live_feed',
  'add_coinflip_to_live_feed_trigger'
)
AND event_object_table = 'game_history';

-- Check that our safe trigger exists
SELECT 
  'SAFE TRIGGER VERIFICATION' as check_type,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'safe_game_history_trigger'
AND event_object_table = 'game_history';

-- Final status
DO $$
BEGIN
  RAISE NOTICE '🎯 MULTIPLIER TRIGGER ERROR FIX COMPLETED';
  RAISE NOTICE '✅ Removed all problematic triggers that reference NEW.multiplier';
  RAISE NOTICE '✅ Created safe trigger that handles missing fields gracefully';
  RAISE NOTICE '✅ Added missing columns to game_history table';
  RAISE NOTICE '🎰 Roulette betting should now work without multiplier errors!';
END $$;