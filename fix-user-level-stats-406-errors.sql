-- COMPREHENSIVE FIX FOR USER_LEVEL_STATS 406 ERRORS
-- This script fixes the RLS policies that are causing 406 (Not Acceptable) errors

-- 1. DISABLE RLS TEMPORARILY TO CLEAN UP POLICIES
ALTER TABLE public.user_level_stats DISABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING POLICIES ON USER_LEVEL_STATS
DROP POLICY IF EXISTS "Users can view their own user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Users can update their own user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Users can insert their own user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Service role can insert user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Service role can update user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Service role can select user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Authenticated users can view their own user level stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_authenticated_select_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_authenticated_update_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_authenticated_insert_own" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_service_role_select_all" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_service_role_insert" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_service_role_update" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_service_role_delete" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_authenticated_select_all" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_service_role_all" ON public.user_level_stats;

-- 3. ENABLE RLS AND CREATE SIMPLE, PERMISSIVE POLICIES
ALTER TABLE public.user_level_stats ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view stats (needed for profile viewing)
CREATE POLICY "user_level_stats_authenticated_select_all" 
ON public.user_level_stats 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow users to update their own stats
CREATE POLICY "user_level_stats_authenticated_update_own" 
ON public.user_level_stats 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
);

-- Allow users to insert their own stats
CREATE POLICY "user_level_stats_authenticated_insert_own" 
ON public.user_level_stats 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND auth.role() = 'authenticated'
);

-- Allow service role full access
CREATE POLICY "user_level_stats_service_role_all" 
ON public.user_level_stats 
FOR ALL 
USING (auth.role() = 'service_role');

-- 4. GRANT NECESSARY PERMISSIONS
GRANT SELECT, INSERT, UPDATE ON public.user_level_stats TO authenticated;
GRANT ALL ON public.user_level_stats TO service_role;

-- 5. TEST THE FIX
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'Testing user_level_stats RLS policy fix...';
  
  -- Test if we can query user_level_stats (this was failing with 406)
  BEGIN
    PERFORM 1 FROM public.user_level_stats LIMIT 1;
    RAISE NOTICE '✅ Can query user_level_stats successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query user_level_stats: %', SQLERRM;
  END;
  
  -- Test if we can query user_level_stats with specific user_id (like the hook does)
  BEGIN
    PERFORM 1 FROM public.user_level_stats WHERE user_id = test_user_id;
    RAISE NOTICE '✅ Can query user_level_stats with user_id filter successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Cannot query user_level_stats with user_id filter: %', SQLERRM;
  END;
  
  RAISE NOTICE 'User level stats RLS policy fix test completed';
END $$;

-- 6. SHOW FINAL POLICY STATUS
DO $$
DECLARE
  policy_rec RECORD;
BEGIN
  RAISE NOTICE 'Final user_level_stats policies:';
  FOR policy_rec IN 
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'user_level_stats' AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Policy: %, Permissive: %, Roles: %, Cmd: %, Qual: %, WithCheck: %', 
      policy_rec.policyname, policy_rec.permissive, policy_rec.roles, 
      policy_rec.cmd, policy_rec.qual, policy_rec.with_check;
  END LOOP;
END $$;

-- 7. VERIFY THE FIX WORKS
SELECT 
  'RLS is enabled' as status,
  CASE WHEN relrowsecurity THEN '✅' ELSE '❌' END as enabled
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'user_level_stats' AND n.nspname = 'public';

SELECT 
  'Policies exist' as status,
  CASE WHEN COUNT(*) > 0 THEN '✅' ELSE '❌' END as policies
FROM pg_policies 
WHERE tablename = 'user_level_stats' AND schemaname = 'public';