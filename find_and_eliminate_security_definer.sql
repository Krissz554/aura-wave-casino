-- Find and eliminate the SECURITY DEFINER view issue step by step

-- First, run the diagnostic to see what we're dealing with
SELECT 'DIAGNOSTIC: Current view definition' as step;
SELECT definition FROM pg_views WHERE viewname = 'user_profile_view' AND schemaname = 'public';

-- Check for any SECURITY DEFINER functions that might be creating views
SELECT 'DIAGNOSTIC: SECURITY DEFINER functions' as step;
SELECT 
    proname,
    prosecdef,
    prosrc
FROM pg_proc 
WHERE prosecdef = true 
AND (prosrc ILIKE '%view%' OR prosrc ILIKE '%user_profile%');

-- Now let's completely remove the view and prevent any recreation
SELECT 'ACTION: Dropping all variations' as step;
DROP VIEW IF EXISTS public.user_profile_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.user_profile_view CASCADE;

-- Check if the view was created as SECURITY DEFINER somehow - let's be very explicit
SELECT 'ACTION: Creating new view explicitly WITHOUT security definer' as step;

-- Create the view with the most basic, clean approach
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

-- Grant minimal permissions
GRANT SELECT ON public.user_profile_view TO authenticated;
GRANT SELECT ON public.user_profile_view TO anon;

-- Verify what we created
SELECT 'VERIFICATION: New view properties' as step;
SELECT 
    viewname,
    viewowner,
    length(definition) as def_length,
    substring(definition, 1, 100) as def_start
FROM pg_views 
WHERE viewname = 'user_profile_view' AND schemaname = 'public';

-- Also check if this might be an issue with the Supabase dashboard creating views
-- Let's see if there are any other views with SECURITY DEFINER
SELECT 'INFO: Other views that might have SECURITY DEFINER' as step;
SELECT 
    schemaname,
    viewname,
    viewowner
FROM pg_views 
WHERE definition ILIKE '%security%definer%' OR viewowner != 'postgres';