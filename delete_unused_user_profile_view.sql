-- Delete unused user_profile_view to fix security warning
-- This view is not used anywhere in the application

-- Check if view exists first
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'user_profile_view EXISTS - will be deleted'
        ELSE 'user_profile_view does not exist'
    END as status
FROM pg_views 
WHERE viewname = 'user_profile_view' AND schemaname = 'public';

-- Delete the problematic view completely
DROP VIEW IF EXISTS public.user_profile_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.user_profile_view CASCADE;

-- Verify deletion
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'SUCCESS: user_profile_view has been deleted'
        ELSE 'WARNING: user_profile_view still exists'
    END as result
FROM pg_views 
WHERE viewname = 'user_profile_view' AND schemaname = 'public';

-- Note: If you ever need this data, you can get it directly from:
-- SELECT p.*, uls.* FROM public.profiles p LEFT JOIN public.user_level_stats uls ON p.id = uls.user_id;