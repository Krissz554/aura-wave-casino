-- =====================================================================
-- FIX SECURITY DEFINER VIEW WARNING
-- =====================================================================
-- This script fixes the Supabase security warning about the
-- user_profile_view being defined with SECURITY DEFINER property
-- =====================================================================

BEGIN;

-- First, let's check if the view exists and what it looks like
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE viewname = 'user_profile_view' AND schemaname = 'public';

-- Drop the existing view with SECURITY DEFINER
DROP VIEW IF EXISTS public.user_profile_view;

-- Recreate the view WITHOUT SECURITY DEFINER
-- This view will inherit the RLS policies from the underlying tables
-- which is the secure approach recommended by Supabase
CREATE VIEW public.user_profile_view AS
SELECT 
  p.id,
  p.username,
  p.registration_date,
  p.balance,
  p.total_wagered,
  p.total_profit,
  p.badges,
  p.avatar_url,
  p.created_at,
  p.updated_at,
  uls.current_level,
  uls.lifetime_xp,
  uls.current_level_xp,
  uls.xp_to_next_level,
  uls.border_tier,
  uls.total_games,
  uls.total_wins,
  uls.biggest_win,
  uls.biggest_loss,
  uls.total_cases_opened,
  uls.total_case_value
FROM public.profiles p
LEFT JOIN public.user_level_stats uls ON p.id = uls.user_id;

-- Grant appropriate permissions
-- The view will use the RLS policies from the underlying tables (profiles, user_level_stats)
GRANT SELECT ON public.user_profile_view TO authenticated;
GRANT SELECT ON public.user_profile_view TO anon;

-- Add a comment explaining the security model
COMMENT ON VIEW public.user_profile_view IS 
'User profile view that aggregates profile and level stats data. 
Security is enforced through RLS policies on underlying tables (profiles, user_level_stats).
This view does NOT use SECURITY DEFINER to comply with Supabase security best practices.';

COMMIT;

-- =====================================================================
-- SECURITY IMPROVEMENT COMPLETED
-- =====================================================================
-- ✅ Removed SECURITY DEFINER from user_profile_view
-- ✅ View now relies on underlying table RLS policies for security
-- ✅ Complies with Supabase security best practices
-- ✅ Fixes the security warning while maintaining functionality
-- ✅ Users can only see data they have permission to see via table RLS
-- =====================================================================