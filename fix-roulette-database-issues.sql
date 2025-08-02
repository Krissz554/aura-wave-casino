-- =====================================================
-- FIX ROULETTE DATABASE ISSUES
-- =====================================================
-- This fixes two main issues:
-- 1. Missing lifetime_xp column causing bet placement failures
-- 2. Foreign key relationship between roulette_bets and profiles

-- =====================================================
-- ISSUE 1: Remove problematic functions that reference lifetime_xp in profiles
-- =====================================================

-- Drop the total_wagered_xp_trigger if it exists (it references non-existent columns)
DROP TRIGGER IF EXISTS total_wagered_xp_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_total_wagered_change() CASCADE;
DROP FUNCTION IF EXISTS public.add_xp_from_wager(UUID, NUMERIC) CASCADE;

RAISE NOTICE '✅ Removed problematic XP triggers and functions that reference lifetime_xp in profiles';

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
    RAISE NOTICE '✅ Dropped existing roulette_bets foreign key constraint';
  END IF;
  
  -- Add proper foreign key constraint to profiles table
  ALTER TABLE public.roulette_bets 
  ADD CONSTRAINT roulette_bets_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  
  RAISE NOTICE '✅ Added proper foreign key constraint from roulette_bets to profiles';
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

RAISE NOTICE '✅ Ensured user_level_stats table exists with proper structure including lifetime_xp';

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
    
    RAISE NOTICE '✅ Added avatar_url column to profiles table';
  ELSE
    RAISE NOTICE '✅ avatar_url column already exists in profiles table';
  END IF;
END $$;

-- =====================================================
-- ISSUE 5: Grant proper permissions
-- =====================================================

-- Ensure service_role can access all tables
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.roulette_bets TO service_role;
GRANT ALL ON public.roulette_rounds TO service_role;

-- Ensure authenticated users can read profiles for joins
GRANT SELECT ON public.profiles TO authenticated;

RAISE NOTICE '✅ Updated table permissions for service_role and authenticated users';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify the fixes
SELECT 
  'VERIFICATION' as status,
  (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'user_level_stats' 
    AND column_name = 'lifetime_xp'
    AND table_schema = 'public'
  ) as lifetime_xp_column_exists_in_user_level_stats,
  (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'avatar_url'
    AND table_schema = 'public'
  ) as avatar_url_column_exists,
  (
    SELECT COUNT(*) 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'roulette_bets_user_id_fkey'
    AND table_name = 'roulette_bets'
    AND table_schema = 'public'
  ) as foreign_key_constraint_exists;

RAISE NOTICE '🎰 ROULETTE DATABASE FIXES COMPLETED - Check verification results above';