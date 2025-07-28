-- ===================================================
-- MANUAL XP TEST - Add Decimal XP and See if Frontend Updates
-- ===================================================
-- Use this to test if the frontend picks up decimal XP changes

-- First, make sure table supports decimals
ALTER TABLE public.profiles 
  ALTER COLUMN lifetime_xp TYPE NUMERIC(15,3),
  ALTER COLUMN current_xp TYPE NUMERIC(15,3),
  ALTER COLUMN total_xp TYPE NUMERIC(15,3),
  ALTER COLUMN xp TYPE NUMERIC(15,3);

-- Show current XP for users with XP > 0
SELECT 
  'BEFORE TEST' as status,
  id,
  username,
  lifetime_xp,
  current_xp,
  total_xp,
  xp
FROM public.profiles 
WHERE lifetime_xp > 0 OR current_xp > 0 OR total_xp > 0 OR xp > 0
ORDER BY lifetime_xp DESC;

-- ===================================================
-- ADD DECIMAL XP TO EACH USER
-- ===================================================

-- Add 0.123 XP to all users with existing XP
UPDATE public.profiles 
SET 
  lifetime_xp = COALESCE(lifetime_xp, 0) + 0.123,
  current_xp = COALESCE(current_xp, 0) + 0.123,
  total_xp = COALESCE(total_xp, 0) + 0.123,
  xp = COALESCE(xp, 0) + 0.123,
  updated_at = now()
WHERE lifetime_xp > 0 OR current_xp > 0 OR total_xp > 0 OR xp > 0;

-- Show results after adding decimal XP
SELECT 
  'AFTER ADDING 0.123 XP' as status,
  id,
  username,
  lifetime_xp,
  current_xp,
  total_xp,
  xp
FROM public.profiles 
WHERE lifetime_xp > 0 OR current_xp > 0 OR total_xp > 0 OR xp > 0
ORDER BY lifetime_xp DESC;

-- ===================================================
-- INSTRUCTIONS
-- ===================================================

SELECT 
  'TEST COMPLETE' as status,
  'Check the frontend now!' as instruction,
  'XP values should show with .123 decimals' as expected_result,
  'Header should auto-update within 5 seconds' as timing;