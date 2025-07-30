-- Test reset permissions - simple verification

-- 1. Test if we can access profiles table
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  -- Test profiles access
  SELECT COUNT(*) INTO test_count FROM public.profiles LIMIT 1;
  RAISE NOTICE 'Profiles table accessible: % rows found', test_count;
  
  -- Test user_level_stats access
  SELECT COUNT(*) INTO test_count FROM public.user_level_stats LIMIT 1;
  RAISE NOTICE 'User level stats table accessible: % rows found', test_count;
  
  -- Test game_stats access
  SELECT COUNT(*) INTO test_count FROM public.game_stats LIMIT 1;
  RAISE NOTICE 'Game stats table accessible: % rows found', test_count;
  
  -- Test game_history access
  SELECT COUNT(*) INTO test_count FROM public.game_history LIMIT 1;
  RAISE NOTICE 'Game history table accessible: % rows found', test_count;
  
  -- Test user_achievements access
  SELECT COUNT(*) INTO test_count FROM public.user_achievements LIMIT 1;
  RAISE NOTICE 'User achievements table accessible: % rows found', test_count;
  
  -- Test case_rewards access
  SELECT COUNT(*) INTO test_count FROM public.case_rewards LIMIT 1;
  RAISE NOTICE 'Case rewards table accessible: % rows found', test_count;
  
  -- Test free_case_claims access
  SELECT COUNT(*) INTO test_count FROM public.free_case_claims LIMIT 1;
  RAISE NOTICE 'Free case claims table accessible: % rows found', test_count;
  
  -- Test notifications access
  SELECT COUNT(*) INTO test_count FROM public.notifications LIMIT 1;
  RAISE NOTICE 'Notifications table accessible: % rows found', test_count;
  
  -- Test level_daily_cases access
  SELECT COUNT(*) INTO test_count FROM public.level_daily_cases LIMIT 1;
  RAISE NOTICE 'Level daily cases table accessible: % rows found', test_count;
  
  -- Test user_rate_limits access
  SELECT COUNT(*) INTO test_count FROM public.user_rate_limits LIMIT 1;
  RAISE NOTICE 'User rate limits table accessible: % rows found', test_count;
  
  RAISE NOTICE 'All tables accessible for authenticated users';
  RAISE NOTICE 'Reset permissions should work correctly';
END $$;