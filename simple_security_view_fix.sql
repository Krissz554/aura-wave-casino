-- Simple fix for SECURITY DEFINER view warning
-- Drop and recreate user_profile_view without SECURITY DEFINER

-- Check what the current view looks like
SELECT definition FROM pg_views WHERE viewname = 'user_profile_view' AND schemaname = 'public';

-- Drop the problematic view
DROP VIEW IF EXISTS public.user_profile_view;

-- Recreate it without SECURITY DEFINER (views are NOT SECURITY DEFINER by default)
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

-- Grant permissions
GRANT SELECT ON public.user_profile_view TO authenticated;
GRANT SELECT ON public.user_profile_view TO anon;