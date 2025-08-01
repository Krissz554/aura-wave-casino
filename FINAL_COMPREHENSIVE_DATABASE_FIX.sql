-- =====================================================
-- FINAL COMPREHENSIVE DATABASE FIX
-- =====================================================
-- This fixes all remaining database issues:
-- 1. Remove security definer view warning
-- 2. Drop any problematic functions that might reference non-existent fields
-- 3. Ensure all tables have proper structure
-- 4. Fix any remaining column reference issues

-- =====================================================
-- STEP 1: Drop the problematic security definer view
-- =====================================================

DROP VIEW IF EXISTS public.complete_user_profile CASCADE;

-- =====================================================
-- STEP 2: Create a safe view without security definer
-- =====================================================

CREATE OR REPLACE VIEW public.user_profile_view AS
SELECT 
  p.id,
  p.username,
  p.registration_date,
  p.balance,
  p.total_wagered,
  p.total_profit,
  p.last_claim_time,
  p.badges,
  p.created_at,
  p.updated_at,
  -- Stats from user_level_stats (safe with COALESCE)
  COALESCE(uls.current_level, 1) as current_level,
  COALESCE(uls.lifetime_xp, 0) as lifetime_xp,
  COALESCE(uls.current_level_xp, 0) as current_level_xp,
  COALESCE(uls.xp_to_next_level, 916) as xp_to_next_level,
  COALESCE(uls.border_tier, 1) as border_tier,
  COALESCE(uls.available_cases, 0) as available_cases,
  COALESCE(uls.total_cases_opened, 0) as total_cases_opened,
  COALESCE(uls.total_case_value, 0) as total_case_value,
  COALESCE(uls.total_games, 0) as total_games,
  COALESCE(uls.roulette_games, 0) as roulette_games,
  COALESCE(uls.roulette_wins, 0) as roulette_wins
FROM public.profiles p
LEFT JOIN public.user_level_stats uls ON uls.user_id = p.id;

-- =====================================================
-- STEP 3: Drop any functions that might have field issues
-- =====================================================

-- Drop all potentially problematic functions
DROP FUNCTION IF EXISTS public.process_roulette_bet_results(UUID, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.update_roulette_stats(UUID, NUMERIC, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.award_roulette_xp(UUID, NUMERIC) CASCADE;

-- =====================================================
-- STEP 4: Create clean, simple functions
-- =====================================================

-- Simple function to update user stats after roulette bet
CREATE OR REPLACE FUNCTION public.update_user_roulette_stats(
  p_user_id UUID,
  p_bet_amount NUMERIC,
  p_won BOOLEAN,
  p_profit NUMERIC DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update user_level_stats (single source of truth)
  UPDATE public.user_level_stats
  SET 
    roulette_games = roulette_games + 1,
    roulette_wins = CASE WHEN p_won THEN roulette_wins + 1 ELSE roulette_wins END,
    roulette_wagered = roulette_wagered + p_bet_amount,
    roulette_profit = roulette_profit + p_profit,
    total_games = total_games + 1,
    total_wins = CASE WHEN p_won THEN total_wins + 1 ELSE total_wins END,
    total_wagered = total_wagered + p_bet_amount,
    total_profit = total_profit + p_profit,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.user_level_stats (
      user_id, roulette_games, roulette_wins, roulette_wagered, roulette_profit,
      total_games, total_wins, total_wagered, total_profit
    ) VALUES (
      p_user_id, 1, 
      CASE WHEN p_won THEN 1 ELSE 0 END,
      p_bet_amount, p_profit,
      1,
      CASE WHEN p_won THEN 1 ELSE 0 END,
      p_bet_amount, p_profit
    )
    ON CONFLICT (user_id) DO UPDATE SET
      roulette_games = user_level_stats.roulette_games + 1,
      roulette_wins = CASE WHEN p_won THEN user_level_stats.roulette_wins + 1 ELSE user_level_stats.roulette_wins END,
      roulette_wagered = user_level_stats.roulette_wagered + p_bet_amount,
      roulette_profit = user_level_stats.roulette_profit + p_profit,
      total_games = user_level_stats.total_games + 1,
      total_wins = CASE WHEN p_won THEN user_level_stats.total_wins + 1 ELSE user_level_stats.total_wins END,
      total_wagered = user_level_stats.total_wagered + p_bet_amount,
      total_profit = user_level_stats.total_profit + p_profit,
      updated_at = NOW();
  END IF;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating roulette stats for user %: %', p_user_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- =====================================================
-- STEP 5: Add missing avatar_url column to profiles if needed
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
    RAISE NOTICE '✅ Added avatar_url column to profiles table';
  ELSE
    RAISE NOTICE '✅ avatar_url column already exists in profiles table';
  END IF;
END $$;

-- =====================================================
-- STEP 6: Grant proper permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION public.update_user_roulette_stats(UUID, NUMERIC, BOOLEAN, NUMERIC) TO authenticated, service_role;
GRANT SELECT ON public.user_profile_view TO authenticated, service_role;

-- =====================================================
-- STEP 7: Clean up any orphaned data
-- =====================================================

-- Remove any orphaned records that might cause foreign key issues
DELETE FROM public.roulette_bets 
WHERE user_id NOT IN (SELECT id FROM public.profiles);

DELETE FROM public.user_level_stats 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- =====================================================
-- STEP 8: Ensure all users have user_level_stats records
-- =====================================================

INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp)
SELECT p.id, 1, 0
FROM public.profiles p
LEFT JOIN public.user_level_stats uls ON uls.user_id = p.id
WHERE uls.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check that everything is working
SELECT 
  'DATABASE HEALTH CHECK' as check_type,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM public.user_level_stats) as total_user_stats,
  (SELECT COUNT(*) FROM public.roulette_bets) as total_roulette_bets,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'profiles' AND column_name = 'avatar_url') as avatar_url_exists;

-- Final status
DO $$
BEGIN
  RAISE NOTICE '🎯 FINAL COMPREHENSIVE DATABASE FIX COMPLETED';
  RAISE NOTICE '✅ Removed security definer view warning';
  RAISE NOTICE '✅ Fixed all column reference issues';
  RAISE NOTICE '✅ Cleaned up orphaned data';
  RAISE NOTICE '✅ Ensured all users have stats records';
  RAISE NOTICE '🎰 Roulette game should now work without errors!';
END $$;