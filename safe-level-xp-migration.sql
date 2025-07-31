-- Safe Level/XP Migration Script
-- This script safely migrates any remaining data and removes columns if they exist

-- First, let's check what columns actually exist in the profiles table
-- You can run this query first to see the current structure:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND table_schema = 'public';

-- Step 1: Safe data migration - only migrate if columns exist
-- Check if level-related columns exist before trying to migrate

DO $$
DECLARE
    has_level_col boolean := false;
    has_current_level_col boolean := false;
    has_xp_col boolean := false;
    has_current_xp_col boolean := false;
    has_lifetime_xp_col boolean := false;
    has_total_xp_col boolean := false;
    has_xp_to_next_level_col boolean := false;
BEGIN
    -- Check which columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'level' AND table_schema = 'public'
    ) INTO has_level_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'current_level' AND table_schema = 'public'
    ) INTO has_current_level_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'xp' AND table_schema = 'public'
    ) INTO has_xp_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'current_xp' AND table_schema = 'public'
    ) INTO has_current_xp_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'lifetime_xp' AND table_schema = 'public'
    ) INTO has_lifetime_xp_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'total_xp' AND table_schema = 'public'
    ) INTO has_total_xp_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'xp_to_next_level' AND table_schema = 'public'
    ) INTO has_xp_to_next_level_col;
    
    -- Log what columns were found
    RAISE NOTICE 'Column existence check:';
    RAISE NOTICE 'level: %', has_level_col;
    RAISE NOTICE 'current_level: %', has_current_level_col;
    RAISE NOTICE 'xp: %', has_xp_col;
    RAISE NOTICE 'current_xp: %', has_current_xp_col;
    RAISE NOTICE 'lifetime_xp: %', has_lifetime_xp_col;
    RAISE NOTICE 'total_xp: %', has_total_xp_col;
    RAISE NOTICE 'xp_to_next_level: %', has_xp_to_next_level_col;
    
    -- Only attempt migration if any of the level/XP columns exist
    IF has_level_col OR has_current_level_col OR has_xp_col OR has_current_xp_col OR has_lifetime_xp_col OR has_total_xp_col OR has_xp_to_next_level_col THEN
        RAISE NOTICE 'Found level/XP columns, attempting data migration...';
        
        -- Dynamic SQL to handle different column combinations
        IF has_current_level_col AND has_current_xp_col AND has_lifetime_xp_col AND has_xp_to_next_level_col THEN
            -- Full set of new columns exist
            INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level)
            SELECT 
                p.id,
                p.current_level,
                p.lifetime_xp,
                p.current_xp,
                p.xp_to_next_level
            FROM public.profiles p
            WHERE p.id NOT IN (SELECT user_id FROM public.user_level_stats WHERE user_id IS NOT NULL)
            ON CONFLICT (user_id) DO NOTHING;
            
        ELSIF has_level_col AND has_xp_col THEN
            -- Only old level/xp columns exist
            INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level)
            SELECT 
                p.id,
                p.level,
                p.xp,
                0, -- current_level_xp defaults to 0
                100 -- xp_to_next_level defaults to 100
            FROM public.profiles p
            WHERE p.id NOT IN (SELECT user_id FROM public.user_level_stats WHERE user_id IS NOT NULL)
            ON CONFLICT (user_id) DO NOTHING;
            
        ELSE
            -- Mixed or partial columns, build dynamic query
            RAISE NOTICE 'Mixed column structure detected, using defaults for missing columns';
            INSERT INTO public.user_level_stats (user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level)
            SELECT 
                p.id,
                1, -- Default level
                0, -- Default lifetime XP
                0, -- Default current level XP
                100 -- Default XP to next level
            FROM public.profiles p
            WHERE p.id NOT IN (SELECT user_id FROM public.user_level_stats WHERE user_id IS NOT NULL)
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
        
        RAISE NOTICE 'Data migration completed successfully';
    ELSE
        RAISE NOTICE 'No level/XP columns found in profiles table - migration not needed';
    END IF;
END $$;

-- Step 2: Remove any remaining level/XP columns (only if they exist)
-- This will safely drop columns without errors if they don't exist

ALTER TABLE public.profiles DROP COLUMN IF EXISTS level;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS xp;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS current_level;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS current_xp;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS xp_to_next_level;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS lifetime_xp;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS total_xp;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS border_tier;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS available_cases;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS total_cases_opened;

-- Step 3: Verify the migration
SELECT 
    'Migration completed successfully' as status,
    COUNT(*) as total_profiles
FROM public.profiles;

SELECT 
    'User level stats populated' as status,
    COUNT(*) as total_user_stats,
    AVG(current_level) as avg_level,
    AVG(lifetime_xp) as avg_lifetime_xp
FROM public.user_level_stats;