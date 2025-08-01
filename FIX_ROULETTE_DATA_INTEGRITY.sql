-- =====================================================
-- FIX ROULETTE DATA INTEGRITY ISSUES
-- =====================================================
-- This script fixes the foreign key constraint error by cleaning up orphaned data
-- Run this BEFORE the MANUAL_ROULETTE_FIX.sql

-- =====================================================
-- STEP 1: Identify and clean up orphaned roulette_bets
-- =====================================================

-- First, let's see what we're dealing with
SELECT 
  'ORPHANED ROULETTE BETS ANALYSIS' as analysis_type,
  COUNT(*) as total_orphaned_bets
FROM public.roulette_bets rb
LEFT JOIN public.profiles p ON p.id = rb.user_id
WHERE p.id IS NULL;

-- Show details of orphaned bets
SELECT 
  'ORPHANED BET DETAILS' as details,
  rb.id as bet_id,
  rb.user_id,
  rb.bet_amount,
  rb.bet_color,
  rb.created_at
FROM public.roulette_bets rb
LEFT JOIN public.profiles p ON p.id = rb.user_id
WHERE p.id IS NULL
ORDER BY rb.created_at DESC
LIMIT 10;

-- =====================================================
-- STEP 2: Clean up orphaned roulette_bets records
-- =====================================================

-- Delete roulette_bets that reference non-existent users
DELETE FROM public.roulette_bets 
WHERE user_id NOT IN (
  SELECT id FROM public.profiles
);

-- Show results
SELECT 
  'CLEANUP RESULTS' as result_type,
  COUNT(*) as remaining_roulette_bets
FROM public.roulette_bets;

-- =====================================================
-- STEP 3: Check for orphaned records in other tables
-- =====================================================

-- Check user_level_stats for orphaned records
SELECT 
  'ORPHANED USER_LEVEL_STATS' as check_type,
  COUNT(*) as orphaned_count
FROM public.user_level_stats uls
LEFT JOIN public.profiles p ON p.id = uls.user_id
WHERE p.id IS NULL;

-- Clean up orphaned user_level_stats if any
DELETE FROM public.user_level_stats 
WHERE user_id NOT IN (
  SELECT id FROM public.profiles
);

-- =====================================================
-- STEP 4: Now safely add the foreign key constraint
-- =====================================================

-- Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'roulette_bets_user_id_fkey'
    AND table_name = 'roulette_bets'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.roulette_bets DROP CONSTRAINT roulette_bets_user_id_fkey;
    RAISE NOTICE '✅ Dropped existing foreign key constraint';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ No existing constraint to drop: %', SQLERRM;
END $$;

-- Add the foreign key constraint (should work now)
ALTER TABLE public.roulette_bets 
ADD CONSTRAINT roulette_bets_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

RAISE NOTICE '✅ Successfully added foreign key constraint';

-- =====================================================
-- STEP 5: Verification
-- =====================================================

-- Verify the constraint was added
SELECT 
  'CONSTRAINT VERIFICATION' as verification,
  constraint_name,
  table_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE constraint_name = 'roulette_bets_user_id_fkey'
AND table_name = 'roulette_bets';

-- Final data integrity check
SELECT 
  'FINAL INTEGRITY CHECK' as check_type,
  COUNT(*) as total_roulette_bets,
  COUNT(DISTINCT rb.user_id) as unique_users_with_bets,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles
FROM public.roulette_bets rb
JOIN public.profiles p ON p.id = rb.user_id;

SELECT '🎰 ROULETTE DATA INTEGRITY FIX COMPLETED' as status;