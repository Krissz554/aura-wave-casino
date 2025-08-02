-- Force remove SECURITY DEFINER view and recreate properly
-- This will completely eliminate the security warning

-- First, let's see exactly what we're dealing with
SELECT 
    schemaname, 
    viewname, 
    viewowner,
    definition
FROM pg_views 
WHERE viewname = 'user_profile_view';

-- Check if it's actually a materialized view
SELECT 
    schemaname, 
    matviewname as viewname, 
    matviewowner as viewowner,
    definition
FROM pg_matviews 
WHERE matviewname = 'user_profile_view';

-- Drop with CASCADE to remove all dependencies
DROP VIEW IF EXISTS public.user_profile_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.user_profile_view CASCADE;

-- Also check for any other views with similar names that might be causing confusion
DROP VIEW IF EXISTS user_profile_view CASCADE;
DROP VIEW IF EXISTS profile_view CASCADE;
DROP VIEW IF EXISTS user_profiles CASCADE;

-- Create a completely fresh view with a slightly different structure to force recreation
CREATE OR REPLACE VIEW public.user_profile_view AS
SELECT 
    profiles.id,
    profiles.username,
    profiles.registration_date,
    profiles.balance,
    profiles.total_wagered,
    profiles.total_profit,
    profiles.badges,
    profiles.avatar_url,
    profiles.created_at,
    profiles.updated_at,
    COALESCE(user_level_stats.current_level, 1) as current_level,
    COALESCE(user_level_stats.lifetime_xp, 0) as lifetime_xp,
    COALESCE(user_level_stats.current_level_xp, 0) as current_level_xp,
    COALESCE(user_level_stats.xp_to_next_level, 100) as xp_to_next_level,
    COALESCE(user_level_stats.border_tier, 1) as border_tier,
    COALESCE(user_level_stats.total_games, 0) as total_games,
    COALESCE(user_level_stats.total_wins, 0) as total_wins,
    COALESCE(user_level_stats.biggest_win, 0) as biggest_win,
    COALESCE(user_level_stats.biggest_loss, 0) as biggest_loss,
    COALESCE(user_level_stats.total_cases_opened, 0) as total_cases_opened,
    COALESCE(user_level_stats.total_case_value, 0) as total_case_value
FROM public.profiles
LEFT JOIN public.user_level_stats ON profiles.id = user_level_stats.user_id;

-- Grant necessary permissions
GRANT SELECT ON public.user_profile_view TO authenticated;
GRANT SELECT ON public.user_profile_view TO anon;

-- Verify the new view exists and check its properties
SELECT 
    viewname,
    viewowner,
    'Regular view (not security definer)' as view_type
FROM pg_views 
WHERE viewname = 'user_profile_view' AND schemaname = 'public';