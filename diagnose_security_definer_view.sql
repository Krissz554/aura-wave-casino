-- Step-by-step diagnosis of the SECURITY DEFINER view issue
-- Let's find exactly where this view is coming from

-- STEP 1: Check current view definition
SELECT 
    'Current view definition:' as step,
    schemaname, 
    viewname, 
    viewowner,
    definition
FROM pg_views 
WHERE viewname = 'user_profile_view' AND schemaname = 'public';

-- STEP 2: Check the actual view source in system catalogs
SELECT 
    'System catalog check:' as step,
    c.relname as view_name,
    c.relowner::regrole as owner,
    pg_get_viewdef(c.oid) as view_definition
FROM pg_class c 
WHERE c.relname = 'user_profile_view' 
AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND c.relkind = 'v';

-- STEP 3: Check if there are any functions that might be creating this view
SELECT 
    'Functions that might create views:' as step,
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE prosrc ILIKE '%user_profile_view%' 
   OR prosrc ILIKE '%CREATE%VIEW%'
   OR prosrc ILIKE '%SECURITY%DEFINER%';

-- STEP 4: Check for any triggers that might recreate the view
SELECT 
    'Triggers that might affect views:' as step,
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as trigger_function,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE p.prosrc ILIKE '%user_profile_view%'
   OR p.prosrc ILIKE '%CREATE%VIEW%';

-- STEP 5: Check for any migrations that might be running
SELECT 
    'Recent migrations that might create views:' as step,
    *
FROM supabase_migrations.schema_migrations 
ORDER BY inserted_at DESC 
LIMIT 5;