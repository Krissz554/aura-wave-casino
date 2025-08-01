-- =====================================================
-- FIX ROULETTE DATABASE ISSUES - LIFETIME_XP REFERENCES
-- =====================================================
-- This fixes the main issues:
-- 1. Remove problematic functions that reference lifetime_xp in profiles
-- 2. Ensure proper foreign key relationship between roulette_bets and profiles
-- 3. Ensure user_level_stats table has proper structure

-- =====================================================
-- ISSUE 1: Remove problematic functions that reference lifetime_xp in profiles
-- =====================================================

-- Drop the total_wagered_xp_trigger if it exists (it references non-existent columns)
DROP TRIGGER IF EXISTS total_wagered_xp_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_total_wagered_change() CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_from_wager(UUID, NUMERIC) CASCADE;

-- =====================================================
-- ISSUE 2: Ensure proper foreign key relationship
-- =====================================================

-- Check if roulette_bets table has proper foreign key to profiles
DO $$
BEGIN
  -- Drop existing foreign key if it exists with wrong reference
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%roulette_bets_user_id%'
    AND table_name = 'roulette_bets'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.roulette_bets 
    DROP CONSTRAINT IF EXISTS roulette_bets_user_id_fkey;
  END IF;
  
  -- Add proper foreign key constraint to profiles table
  ALTER TABLE public.roulette_bets 
  ADD CONSTRAINT roulette_bets_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, just continue - the constraint might already exist properly
    NULL;
END $$;

-- =====================================================
-- ISSUE 3: Ensure user_level_stats table exists and has proper structure
-- =====================================================

-- Ensure user_level_stats table exists with lifetime_xp column
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
-- ISSUE 4: Ensure profiles table has avatar_url column
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'avatar_url'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- =====================================================
-- ISSUE 5: Grant proper permissions
-- =====================================================

-- Ensure service_role can access all tables
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.roulette_bets TO service_role;
GRANT ALL ON public.roulette_rounds TO service_role;
GRANT ALL ON public.user_level_stats TO service_role;

-- Ensure authenticated users can read profiles for joins
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_level_stats TO authenticated;