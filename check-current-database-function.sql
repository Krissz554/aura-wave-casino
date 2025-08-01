-- Check current database function definition
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'update_user_stats_and_level'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Also check if the function exists at all
SELECT EXISTS(
  SELECT 1 FROM pg_proc 
  WHERE proname = 'update_user_stats_and_level'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
) as function_exists;

-- Check table columns to verify lifetime_xp exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_level_stats'
  AND column_name IN ('lifetime_xp', 'current_level_xp', 'xp_to_next_level')
ORDER BY column_name;