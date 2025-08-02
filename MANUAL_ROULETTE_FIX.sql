-- =====================================================
-- MANUAL ROULETTE DATABASE FIX
-- =====================================================
-- Run this SQL in your Supabase SQL Editor to fix the roulette issues
-- This addresses:
-- 1. Missing lifetime_xp column error (functions referencing wrong table)
-- 2. Foreign key relationship between roulette_bets and profiles
-- 3. Proper permissions for service_role

-- =====================================================
-- STEP 1: Remove problematic functions that reference lifetime_xp in profiles
-- =====================================================

-- Drop any triggers and functions that incorrectly reference lifetime_xp in profiles table
DROP TRIGGER IF EXISTS total_wagered_xp_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_total_wagered_change() CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_from_wager(UUID, NUMERIC) CASCADE;

-- =====================================================
-- STEP 2: Fix foreign key relationship between roulette_bets and profiles
-- =====================================================

-- Drop existing foreign key constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'roulette_bets_user_id_fkey'
    AND table_name = 'roulette_bets'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.roulette_bets DROP CONSTRAINT roulette_bets_user_id_fkey;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if constraint doesn't exist
    NULL;
END $$;

-- Add proper foreign key constraint
ALTER TABLE public.roulette_bets 
ADD CONSTRAINT roulette_bets_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- =====================================================
-- STEP 3: Ensure profiles table has avatar_url column
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'avatar_url'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- =====================================================
-- STEP 4: Ensure user_level_stats table exists with proper structure
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_level_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level INTEGER NOT NULL DEFAULT 1,
  lifetime_xp INTEGER NOT NULL DEFAULT 0,
  current_level_xp INTEGER NOT NULL DEFAULT 0,
  xp_to_next_level INTEGER NOT NULL DEFAULT 916,
  border_tier INTEGER NOT NULL DEFAULT 1,
  available_cases INTEGER NOT NULL DEFAULT 0,
  total_cases_opened INTEGER NOT NULL DEFAULT 0,
  total_case_value NUMERIC NOT NULL DEFAULT 0,
  total_games INTEGER NOT NULL DEFAULT 0,
  roulette_games INTEGER NOT NULL DEFAULT 0,
  roulette_wins INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- STEP 5: Grant proper permissions
-- =====================================================

-- Grant permissions to service_role (needed for edge functions)
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.roulette_bets TO service_role;
GRANT ALL ON public.roulette_rounds TO service_role;
GRANT ALL ON public.user_level_stats TO service_role;

-- Grant read permissions to authenticated users
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_level_stats TO authenticated;

-- =====================================================
-- STEP 6: Create corrected XP functions (optional - only if you want XP tracking)
-- =====================================================

-- Only create these if you want automatic XP tracking from wagering
-- These functions properly use user_level_stats table for lifetime_xp

CREATE OR REPLACE FUNCTION public.add_xp_from_wager_corrected(user_uuid uuid, wager_amount numeric)
RETURNS TABLE(xp_gained numeric, total_xp integer, level_up boolean, new_level integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  calculated_xp NUMERIC;
  current_lifetime_xp INTEGER;
  new_lifetime_xp INTEGER;
  old_level INTEGER;
  did_level_up BOOLEAN := false;
BEGIN
  -- Calculate XP from wager (0.1 XP per dollar wagered)
  calculated_xp := wager_amount * 0.1;
  
  -- Get current XP and level from user_level_stats (CORRECT TABLE)
  SELECT lifetime_xp, current_level INTO current_lifetime_xp, old_level
  FROM public.user_level_stats 
  WHERE user_id = user_uuid;
  
  -- If user doesn't have stats record, create one
  IF current_lifetime_xp IS NULL THEN
    INSERT INTO public.user_level_stats (user_id, lifetime_xp, current_level)
    VALUES (user_uuid, 0, 1)
    ON CONFLICT (user_id) DO NOTHING;
    current_lifetime_xp := 0;
    old_level := 1;
  END IF;
  
  -- Calculate new total XP
  new_lifetime_xp := current_lifetime_xp + FLOOR(calculated_xp)::INTEGER;
  
  -- Check for level up (simple level calculation)
  IF new_lifetime_xp > old_level * 1000 THEN
    did_level_up := true;
    old_level := old_level + 1;
  END IF;
  
  -- Update user_level_stats with new XP and level info (CORRECT TABLE)
  UPDATE public.user_level_stats 
  SET 
    lifetime_xp = new_lifetime_xp,
    current_level = old_level,
    updated_at = now()
  WHERE user_id = user_uuid;
  
  -- Also update profiles table with basic level info (no lifetime_xp)
  UPDATE public.profiles 
  SET 
    level = old_level,
    xp = new_lifetime_xp,
    updated_at = now()
  WHERE id = user_uuid;
  
  RETURN QUERY SELECT calculated_xp, new_lifetime_xp, did_level_up, old_level;
END;
$$;

-- Grant permissions on the corrected function
GRANT EXECUTE ON FUNCTION public.add_xp_from_wager_corrected(UUID, NUMERIC) TO authenticated, service_role;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these to verify the fixes worked:

SELECT 'VERIFICATION RESULTS' as status;

-- Check if foreign key exists
SELECT 
  'Foreign Key Check' as test,
  CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as result
FROM information_schema.table_constraints 
WHERE constraint_name = 'roulette_bets_user_id_fkey'
AND table_name = 'roulette_bets';

-- Check if avatar_url column exists
SELECT 
  'Avatar URL Column' as test,
  CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as result
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'avatar_url';

-- Check if user_level_stats has lifetime_xp
SELECT 
  'Lifetime XP in user_level_stats' as test,
  CASE WHEN COUNT(*) > 0 THEN 'EXISTS' ELSE 'MISSING' END as result
FROM information_schema.columns 
WHERE table_name = 'user_level_stats' 
AND column_name = 'lifetime_xp';

-- Check if problematic functions are gone
SELECT 
  'Problematic Functions Removed' as test,
  CASE WHEN COUNT(*) = 0 THEN 'SUCCESS' ELSE 'STILL EXISTS' END as result
FROM information_schema.routines 
WHERE routine_name IN ('add_xp_from_wager', 'handle_total_wagered_change')
AND routine_schema = 'public';

SELECT 'ROULETTE DATABASE FIX COMPLETED' as final_status;