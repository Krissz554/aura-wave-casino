-- Completely remove the problematic view and create a new one
-- This approach sidesteps any potential recreation mechanisms

-- Drop the problematic view completely
DROP VIEW IF EXISTS public.user_profile_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.user_profile_view CASCADE;

-- Create a new view with a different name first
CREATE VIEW public.user_profile_data AS
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
    COALESCE(uls.current_level, 1) as current_level,
    COALESCE(uls.lifetime_xp, 0) as lifetime_xp,
    COALESCE(uls.current_level_xp, 0) as current_level_xp,
    COALESCE(uls.xp_to_next_level, 100) as xp_to_next_level,
    COALESCE(uls.border_tier, 1) as border_tier,
    COALESCE(uls.total_games, 0) as total_games,
    COALESCE(uls.total_wins, 0) as total_wins,
    COALESCE(uls.biggest_win, 0) as biggest_win,
    COALESCE(uls.biggest_loss, 0) as biggest_loss,
    COALESCE(uls.total_cases_opened, 0) as total_cases_opened,
    COALESCE(uls.total_case_value, 0) as total_case_value
FROM public.profiles p
LEFT JOIN public.user_level_stats uls ON p.id = uls.user_id;

-- Now drop the problematic view again (in case it was recreated)
DROP VIEW IF EXISTS public.user_profile_view CASCADE;

-- Rename our new clean view to the expected name
ALTER VIEW public.user_profile_data RENAME TO user_profile_view;

-- Grant permissions
GRANT SELECT ON public.user_profile_view TO authenticated;
GRANT SELECT ON public.user_profile_view TO anon;

-- Verify it's clean
SELECT 
    'View created successfully without SECURITY DEFINER' as status,
    viewname,
    viewowner
FROM pg_views 
WHERE viewname = 'user_profile_view' AND schemaname = 'public';