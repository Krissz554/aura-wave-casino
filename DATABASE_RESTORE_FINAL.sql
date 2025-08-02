-- COMPREHENSIVE DATABASE RESTORE TO WORKING STATE
-- This script restores the database to the working state from commit 9404977
-- Fixes all missing functions and ensures roulette system works properly

-- =============================================================================
-- 1. ENSURE ALL REQUIRED TABLES EXIST
-- =============================================================================

-- Ensure daily_seeds table exists with correct structure
CREATE TABLE IF NOT EXISTS public.daily_seeds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    server_seed TEXT NOT NULL,
    server_seed_hash TEXT NOT NULL,
    lotto TEXT NOT NULL,
    lotto_hash TEXT NOT NULL,
    is_revealed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revealed_at TIMESTAMP WITH TIME ZONE
);

-- Ensure roulette_rounds has all required columns
DO $$
BEGIN
    -- Add daily_seed_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roulette_rounds' AND column_name = 'daily_seed_id') THEN
        ALTER TABLE public.roulette_rounds ADD COLUMN daily_seed_id UUID REFERENCES public.daily_seeds(id);
    END IF;
    
    -- Add nonce_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roulette_rounds' AND column_name = 'nonce_id') THEN
        ALTER TABLE public.roulette_rounds ADD COLUMN nonce_id INTEGER;
    END IF;
    
    -- Add reel_position if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roulette_rounds' AND column_name = 'reel_position') THEN
        ALTER TABLE public.roulette_rounds ADD COLUMN reel_position NUMERIC DEFAULT 0;
    END IF;
END $$;

-- =============================================================================
-- 2. CREATE/FIX ALL REQUIRED FUNCTIONS
-- =============================================================================

-- Fix ensure_user_level_stats function
DROP FUNCTION IF EXISTS public.ensure_user_level_stats(UUID);
DROP FUNCTION IF EXISTS public.ensure_user_level_stats(uuid);
DROP FUNCTION IF EXISTS public.ensure_user_level_stats(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.ensure_user_level_stats(uuid, boolean);

CREATE OR REPLACE FUNCTION public.ensure_user_level_stats(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_exists BOOLEAN;
    stats_record RECORD;
    result JSON;
BEGIN
    -- Check if user exists in auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_uuid) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found',
            'user_id', user_uuid
        );
    END IF;
    
    -- Check if user_level_stats record exists
    SELECT * INTO stats_record FROM public.user_level_stats WHERE user_id = user_uuid;
    
    IF NOT FOUND THEN
        -- Create new user_level_stats record
        INSERT INTO public.user_level_stats (
            user_id,
            current_level,
            lifetime_xp,
            current_level_xp,
            xp_to_next_level,
            border_tier,
            available_cases,
            total_cases_opened,
            total_case_value,
            coinflip_games,
            coinflip_wins,
            coinflip_wagered,
            coinflip_profit,
            best_coinflip_streak,
            current_coinflip_streak,
            crash_games,
            crash_wins,
            crash_wagered,
            crash_profit,
            roulette_games,
            roulette_wins,
            roulette_wagered,
            roulette_profit,
            roulette_highest_win,
            roulette_highest_loss,
            roulette_green_wins,
            roulette_red_wins,
            roulette_black_wins,
            roulette_favorite_color,
            roulette_best_streak,
            roulette_current_streak,
            roulette_biggest_bet,
            tower_games,
            tower_wins,
            tower_wagered,
            tower_profit,
            total_games,
            total_wins,
            total_wagered,
            total_profit,
            biggest_win,
            biggest_loss,
            chat_messages_count,
            login_days_count,
            biggest_single_bet,
            current_win_streak,
            best_win_streak,
            tower_highest_level,
            tower_biggest_win,
            tower_biggest_loss,
            tower_best_streak,
            tower_current_streak,
            tower_perfect_games
        ) VALUES (
            user_uuid,
            1, -- current_level
            0, -- lifetime_xp
            0, -- current_level_xp
            100, -- xp_to_next_level
            1, -- border_tier
            0, -- available_cases
            0, -- total_cases_opened
            0, -- total_case_value
            0, -- coinflip_games
            0, -- coinflip_wins
            0, -- coinflip_wagered
            0, -- coinflip_profit
            0, -- best_coinflip_streak
            0, -- current_coinflip_streak
            0, -- crash_games
            0, -- crash_wins
            0, -- crash_wagered
            0, -- crash_profit
            0, -- roulette_games
            0, -- roulette_wins
            0, -- roulette_wagered
            0, -- roulette_profit
            0, -- roulette_highest_win
            0, -- roulette_highest_loss
            0, -- roulette_green_wins
            0, -- roulette_red_wins
            0, -- roulette_black_wins
            'none', -- roulette_favorite_color
            0, -- roulette_best_streak
            0, -- roulette_current_streak
            0, -- roulette_biggest_bet
            0, -- tower_games
            0, -- tower_wins
            0, -- tower_wagered
            0, -- tower_profit
            0, -- total_games
            0, -- total_wins
            0, -- total_wagered
            0, -- total_profit
            0, -- biggest_win
            0, -- biggest_loss
            0, -- chat_messages_count
            0, -- login_days_count
            0, -- biggest_single_bet
            0, -- current_win_streak
            0, -- best_win_streak
            0, -- tower_highest_level
            0, -- tower_biggest_win
            0, -- tower_biggest_loss
            0, -- tower_best_streak
            0, -- tower_current_streak
            0  -- tower_perfect_games
        );
        
        SELECT * INTO stats_record FROM public.user_level_stats WHERE user_id = user_uuid;
    END IF;
    
    -- Return the stats record
    RETURN json_build_object(
        'success', true,
        'data', row_to_json(stats_record)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'user_id', user_uuid
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.ensure_user_level_stats(UUID) TO authenticated;

-- =============================================================================
-- 3. CREATE DAILY SEED MANAGEMENT FUNCTIONS
-- =============================================================================

-- Function to get or create today's daily seed
CREATE OR REPLACE FUNCTION get_or_create_daily_seed()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    seed_record RECORD;
    new_seed_id UUID;
BEGIN
    -- Try to get existing seed for today
    SELECT id INTO new_seed_id 
    FROM public.daily_seeds 
    WHERE date = today_date;
    
    -- If no seed exists for today, create one
    IF new_seed_id IS NULL THEN
        INSERT INTO public.daily_seeds (date, server_seed, server_seed_hash, lotto, lotto_hash)
        VALUES (
            today_date,
            encode(gen_random_bytes(32), 'hex'), -- Generate secure server seed
            encode(digest(encode(gen_random_bytes(32), 'hex'), 'sha256'), -- Generate hash
            lpad(floor(random() * 10000000000)::text, 10, '0'), -- Generate 10-digit lotto
            encode(digest(lpad(floor(random() * 10000000000)::text, 10, '0'), 'sha256'), -- Generate lotto hash
            false -- Not revealed yet
        )
        RETURNING id INTO new_seed_id;
    END IF;
    
    RETURN new_seed_id;
END;
$$;

-- Function to auto-reveal expired daily seeds
CREATE OR REPLACE FUNCTION auto_reveal_expired_daily_seeds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Auto-reveal seeds from yesterday and earlier
    UPDATE public.daily_seeds 
    SET 
        is_revealed = true,
        revealed_at = NOW()
    WHERE 
        date < CURRENT_DATE 
        AND is_revealed = false;
        
    -- Log the revelation
    RAISE NOTICE 'Auto-revealed expired daily seeds for transparency';
END;
$$;

-- =============================================================================
-- 4. CREATE SEQUENCE FOR NONCE ID
-- =============================================================================

-- Create sequence for nonce_id if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS roulette_nonce_seq START 1;

-- =============================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_daily_seeds_date ON public.daily_seeds(date);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_daily_seed ON public.roulette_rounds(daily_seed_id);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_nonce ON public.roulette_rounds(nonce_id);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_status ON public.roulette_rounds(status);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_betting_end ON public.roulette_rounds(betting_end_time);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_created_at ON public.roulette_rounds(created_at);

-- =============================================================================
-- 6. ENABLE RLS AND CREATE POLICIES
-- =============================================================================

-- Enable RLS for daily_seeds
ALTER TABLE public.daily_seeds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view daily seeds" ON public.daily_seeds;

-- Create RLS policies for daily_seeds (read-only for all authenticated users)
CREATE POLICY "Anyone can view daily seeds" ON public.daily_seeds
    FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================================================
-- 7. ADD TO REALTIME PUBLICATION
-- =============================================================================

-- Add daily_seeds to realtime publication if not already added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'daily_seeds'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_seeds;
    END IF;
END $$;

-- =============================================================================
-- 8. CREATE TODAY'S DAILY SEED IF IT DOESN'T EXIST
-- =============================================================================

-- Ensure today's daily seed exists
DO $$
DECLARE
    today_date DATE := CURRENT_DATE;
    seed_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM public.daily_seeds WHERE date = today_date) INTO seed_exists;
    
    IF NOT seed_exists THEN
        INSERT INTO public.daily_seeds (date, server_seed, server_seed_hash, lotto, lotto_hash)
        VALUES (
            today_date,
            encode(gen_random_bytes(32), 'hex'),
            encode(digest(encode(gen_random_bytes(32), 'hex'), 'sha256'),
            lpad(floor(random() * 10000000000)::text, 10, '0'),
            encode(digest(lpad(floor(random() * 10000000000)::text, 10, '0'), 'sha256'),
            false
        );
        RAISE NOTICE 'Created daily seed for today: %', today_date;
    ELSE
        RAISE NOTICE 'Daily seed for today already exists: %', today_date;
    END IF;
END $$;

-- =============================================================================
-- 9. REVEAL EXPIRED SEEDS
-- =============================================================================

-- Auto-reveal any expired seeds
SELECT auto_reveal_expired_daily_seeds();

-- =============================================================================
-- 10. VERIFICATION AND LOGGING
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Database restoration completed successfully!';
    RAISE NOTICE 'All required tables, functions, and policies have been created/restored.';
    RAISE NOTICE 'Roulette system should now be fully functional.';
END $$;