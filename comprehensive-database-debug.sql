-- COMPREHENSIVE DATABASE DEBUG SCRIPT
-- This will help us understand what's actually happening

-- Step 1: Check if the user_level_stats table exists at all
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_level_stats') THEN
    RAISE NOTICE '✅ user_level_stats table EXISTS';
  ELSE
    RAISE NOTICE '❌ user_level_stats table DOES NOT EXIST';
  END IF;
END $$;

-- Step 2: List all tables to see what we have
SELECT 
  'ALL_TABLES' as debug_type,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%user%' OR table_name LIKE '%level%' OR table_name LIKE '%stats%'
ORDER BY table_name;

-- Step 3: If user_level_stats exists, show ALL its columns
SELECT 
  'USER_LEVEL_STATS_COLUMNS' as debug_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_level_stats'
ORDER BY ordinal_position;

-- Step 4: Check if we have any users in auth.users
SELECT 
  'AUTH_USERS_COUNT' as debug_type,
  COUNT(*) as total_users
FROM auth.users;

-- Step 5: Check if user_level_stats has any records
DO $$
DECLARE
  record_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_level_stats') THEN
    EXECUTE 'SELECT COUNT(*) FROM public.user_level_stats' INTO record_count;
    RAISE NOTICE '📊 user_level_stats has % records', record_count;
  ELSE
    RAISE NOTICE '❌ Cannot count records - table does not exist';
  END IF;
END $$;

-- Step 6: Try to show structure of user_level_stats table
DO $$
DECLARE
  col_info RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_level_stats') THEN
    RAISE NOTICE '📋 USER_LEVEL_STATS TABLE STRUCTURE:';
    FOR col_info IN 
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'user_level_stats'
      ORDER BY ordinal_position
    LOOP
      RAISE NOTICE '   - %: % (nullable: %, default: %)', 
        col_info.column_name, col_info.data_type, col_info.is_nullable, COALESCE(col_info.column_default, 'none');
    END LOOP;
  ELSE
    RAISE NOTICE '❌ user_level_stats table does not exist - cannot show structure';
  END IF;
END $$;

-- Step 7: Check what functions exist
SELECT 
  'FUNCTIONS_CHECK' as debug_type,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public' 
AND p.proname LIKE '%user%stats%' OR p.proname LIKE '%level%'
ORDER BY p.proname;

-- Step 8: Check if profiles table exists and has the expected structure
SELECT 
  'PROFILES_TABLE_CHECK' as debug_type,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 9: Try to create user_level_stats table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_level_stats') THEN
    RAISE NOTICE '🔧 Creating user_level_stats table since it does not exist...';
    
    CREATE TABLE public.user_level_stats (
      id SERIAL PRIMARY KEY,
      user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      current_level INTEGER NOT NULL DEFAULT 1,
      lifetime_xp INTEGER NOT NULL DEFAULT 0,
      current_level_xp INTEGER NOT NULL DEFAULT 0,
      xp_to_next_level INTEGER NOT NULL DEFAULT 1000,
      
      -- Overall stats
      total_games INTEGER NOT NULL DEFAULT 0,
      total_wins INTEGER NOT NULL DEFAULT 0,
      total_wagered NUMERIC NOT NULL DEFAULT 0,
      total_profit NUMERIC NOT NULL DEFAULT 0,
      
      -- Roulette stats
      roulette_games INTEGER NOT NULL DEFAULT 0,
      roulette_wins INTEGER NOT NULL DEFAULT 0,
      roulette_wagered NUMERIC NOT NULL DEFAULT 0,
      roulette_profit NUMERIC NOT NULL DEFAULT 0,
      roulette_highest_win NUMERIC NOT NULL DEFAULT 0,
      roulette_highest_loss NUMERIC NOT NULL DEFAULT 0,
      roulette_green_wins INTEGER NOT NULL DEFAULT 0,
      roulette_red_wins INTEGER NOT NULL DEFAULT 0,
      roulette_black_wins INTEGER NOT NULL DEFAULT 0,
      roulette_favorite_color TEXT DEFAULT 'none',
      roulette_best_streak INTEGER NOT NULL DEFAULT 0,
      roulette_current_streak INTEGER NOT NULL DEFAULT 0,
      roulette_biggest_bet NUMERIC NOT NULL DEFAULT 0,
      
      -- Other game stats (for completeness)
      coinflip_games INTEGER NOT NULL DEFAULT 0,
      coinflip_wins INTEGER NOT NULL DEFAULT 0,
      coinflip_wagered NUMERIC NOT NULL DEFAULT 0,
      coinflip_profit NUMERIC NOT NULL DEFAULT 0,
      
      crash_games INTEGER NOT NULL DEFAULT 0,
      crash_wins INTEGER NOT NULL DEFAULT 0,
      crash_wagered NUMERIC NOT NULL DEFAULT 0,
      crash_profit NUMERIC NOT NULL DEFAULT 0,
      
      tower_games INTEGER NOT NULL DEFAULT 0,
      tower_wins INTEGER NOT NULL DEFAULT 0,
      tower_wagered NUMERIC NOT NULL DEFAULT 0,
      tower_profit NUMERIC NOT NULL DEFAULT 0,
      
      -- Metadata
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Enable RLS
    ALTER TABLE public.user_level_stats ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Users can view their own stats" ON public.user_level_stats
      FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can update their own stats" ON public.user_level_stats
      FOR UPDATE USING (auth.uid() = user_id);
    
    CREATE POLICY "Service role can do everything" ON public.user_level_stats
      FOR ALL USING (true);
    
    RAISE NOTICE '✅ user_level_stats table created successfully!';
  ELSE
    RAISE NOTICE '✅ user_level_stats table already exists';
  END IF;
END $$;

-- Step 10: Final verification
DO $$
DECLARE
  table_exists BOOLEAN;
  column_count INTEGER;
  record_count INTEGER;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_level_stats'
  ) INTO table_exists;
  
  IF table_exists THEN
    -- Count columns
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'user_level_stats';
    
    -- Count records
    EXECUTE 'SELECT COUNT(*) FROM public.user_level_stats' INTO record_count;
    
    RAISE NOTICE '🎯 FINAL STATUS:';
    RAISE NOTICE '   - Table exists: %', table_exists;
    RAISE NOTICE '   - Column count: %', column_count;
    RAISE NOTICE '   - Record count: %', record_count;
    RAISE NOTICE '   - lifetime_xp column: %', 
      CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_level_stats' AND column_name = 'lifetime_xp'
      ) THEN 'EXISTS' ELSE 'MISSING' END;
  ELSE
    RAISE NOTICE '❌ FINAL STATUS: user_level_stats table still does not exist';
  END IF;
END $$;

SELECT '🔍 COMPREHENSIVE DATABASE DEBUG COMPLETE' as final_status;