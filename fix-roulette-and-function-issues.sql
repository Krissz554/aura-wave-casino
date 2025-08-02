-- Fix roulette and function issues
-- This script addresses the 500 errors in roulette-engine and 404 errors in ensure_user_level_stats

-- 1. Drop all existing versions of ensure_user_level_stats function
DROP FUNCTION IF EXISTS public.ensure_user_level_stats(UUID);
DROP FUNCTION IF EXISTS public.ensure_user_level_stats(uuid);
DROP FUNCTION IF EXISTS public.ensure_user_level_stats(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.ensure_user_level_stats(uuid, boolean);

-- 2. Create the correct version of ensure_user_level_stats function
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
            'error', 'User does not exist in auth.users table'
        );
    END IF;

    -- Check if user_level_stats record exists
    SELECT * INTO stats_record 
    FROM user_level_stats 
    WHERE user_id = user_uuid;

    -- If record doesn't exist, create it
    IF NOT FOUND THEN
        INSERT INTO user_level_stats (
            user_id,
            current_level,
            current_level_xp,
            lifetime_xp,
            xp_to_next_level,
            border_tier,
            coinflip_games,
            coinflip_wins,
            coinflip_profit,
            crash_games,
            crash_wins,
            crash_profit,
            roulette_games,
            roulette_wins,
            roulette_profit,
            tower_games,
            tower_wins,
            tower_profit
        ) VALUES (
            user_uuid,
            1, -- current_level
            0, -- current_level_xp
            0, -- lifetime_xp
            100, -- xp_to_next_level
            1, -- border_tier
            0, -- coinflip_games
            0, -- coinflip_wins
            0, -- coinflip_profit
            0, -- crash_games
            0, -- crash_wins
            0, -- crash_profit
            0, -- roulette_games
            0, -- roulette_wins
            0, -- roulette_profit
            0, -- tower_games
            0, -- tower_wins
            0  -- tower_profit
        );
        
        RETURN json_build_object(
            'success', true,
            'action', 'created',
            'user_id', user_uuid
        );
    ELSE
        RETURN json_build_object(
            'success', true,
            'action', 'exists',
            'user_id', user_uuid
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- 3. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.ensure_user_level_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_level_stats(UUID) TO service_role;

-- 4. Ensure daily_seeds table exists and has proper structure
CREATE TABLE IF NOT EXISTS public.daily_seeds (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    date date NOT NULL UNIQUE,
    server_seed text NOT NULL,
    server_seed_hash text NOT NULL,
    lotto text NOT NULL,
    lotto_hash text NOT NULL,
    is_revealed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    revealed_at timestamp with time zone,
    CONSTRAINT daily_seeds_pkey PRIMARY KEY (id)
);

-- 5. Ensure roulette_rounds table has the required columns
ALTER TABLE public.roulette_rounds 
ADD COLUMN IF NOT EXISTS daily_seed_id uuid REFERENCES public.daily_seeds(id),
ADD COLUMN IF NOT EXISTS nonce_id integer;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_daily_seed_id ON public.roulette_rounds(daily_seed_id);
CREATE INDEX IF NOT EXISTS idx_daily_seeds_date ON public.daily_seeds(date);

-- 7. Create a test daily seed for today if it doesn't exist
INSERT INTO public.daily_seeds (date, server_seed, server_seed_hash, lotto, lotto_hash, is_revealed)
SELECT 
    CURRENT_DATE,
    'test_server_seed_' || CURRENT_DATE,
    'test_server_seed_hash_' || CURRENT_DATE,
    'test_lotto_' || CURRENT_DATE,
    'test_lotto_hash_' || CURRENT_DATE,
    false
WHERE NOT EXISTS (
    SELECT 1 FROM public.daily_seeds WHERE date = CURRENT_DATE
);

-- 8. Verify the function works
SELECT public.ensure_user_level_stats('00000000-0000-0000-0000-000000000000'::uuid) as test_result;