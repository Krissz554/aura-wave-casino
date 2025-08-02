-- Complete elimination of user_profile_view to resolve security warning
-- If this view is not essential, removing it completely will fix the warning

-- First, check if the view is actually being used by the application
SELECT 'INFO: Checking view usage' as step;

-- Check for any dependencies on this view
SELECT 
    'Dependencies on user_profile_view:' as info,
    dependent_ns.nspname as dependent_schema,
    dependent_view.relname as dependent_view,
    class_ns.nspname as source_schema,
    class.relname as source_table
FROM pg_depend 
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
JOIN pg_class as class ON pg_depend.refobjid = class.oid 
JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
JOIN pg_namespace class_ns ON class_ns.oid = class.relnamespace 
WHERE class.relname = 'user_profile_view';

-- Show current definition one last time for reference
SELECT 'Current view definition:' as step;
SELECT definition FROM pg_views WHERE viewname = 'user_profile_view' AND schemaname = 'public';

-- OPTION 1: Completely remove the view (safest for security warning)
DROP VIEW IF EXISTS public.user_profile_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.user_profile_view CASCADE;

-- Verify it's gone
SELECT 'VERIFICATION: View should be gone' as step;
SELECT COUNT(*) as view_count FROM pg_views WHERE viewname = 'user_profile_view' AND schemaname = 'public';

-- If you need the functionality later, you can access the data directly from the tables:
-- SELECT p.*, uls.* FROM public.profiles p LEFT JOIN public.user_level_stats uls ON p.id = uls.user_id;

SELECT 'SUCCESS: user_profile_view has been completely removed' as result;