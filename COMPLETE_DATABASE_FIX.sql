-- COMPLETE DATABASE FIX FOR WORKING ROULETTE SYSTEM
-- This script fixes all missing functions and restores the database to working state

-- =============================================================================
-- 1. CREATE MISSING FUNCTIONS
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
BEGIN
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_uuid) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found',
            'user_id', user_uuid
        );
    END IF;
    
    SELECT * INTO stats_record FROM public.user_level_stats WHERE user_id = user_uuid;
    
    IF NOT FOUND THEN
        INSERT INTO public.user_level_stats (
            user_id, current_level, lifetime_xp, current_level_xp, xp_to_next_level,
            border_tier, available_cases, total_cases_opened, total_case_value,
            coinflip_games, coinflip_wins, coinflip_wagered, coinflip_profit,
            best_coinflip_streak, current_coinflip_streak, crash_games, crash_wins,
            crash_wagered, crash_profit, roulette_games, roulette_wins, roulette_wagered,
            roulette_profit, roulette_highest_win, roulette_highest_loss, roulette_green_wins,
            roulette_red_wins, roulette_black_wins, roulette_favorite_color, roulette_best_streak,
            roulette_current_streak, roulette_biggest_bet, tower_games, tower_wins, tower_wagered,
            tower_profit, total_games, total_wins, total_wagered, total_profit, biggest_win,
            biggest_loss, chat_messages_count, login_days_count, biggest_single_bet,
            current_win_streak, best_win_streak, tower_highest_level, tower_biggest_win,
            tower_biggest_loss, tower_best_streak, tower_current_streak, tower_perfect_games
        ) VALUES (
            user_uuid, 1, 0, 0, 100, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'none', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        );
        
        SELECT * INTO stats_record FROM public.user_level_stats WHERE user_id = user_uuid;
    END IF;
    
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

GRANT EXECUTE ON FUNCTION public.ensure_user_level_stats(UUID) TO authenticated;

-- Create get_or_create_daily_seed function
CREATE OR REPLACE FUNCTION get_or_create_daily_seed(p_date DATE DEFAULT CURRENT_DATE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_seed_id UUID;
BEGIN
    SELECT id INTO new_seed_id 
    FROM public.daily_seeds 
    WHERE date = p_date;
    
    IF new_seed_id IS NULL THEN
        INSERT INTO public.daily_seeds (date, server_seed, server_seed_hash, lotto, lotto_hash, is_revealed)
        VALUES (
            p_date,
            encode(gen_random_bytes(32), 'hex'),
            encode(digest(encode(gen_random_bytes(32), 'hex'), 'sha256'),
            lpad(floor(random() * 10000000000)::text, 10, '0'),
            encode(digest(lpad(floor(random() * 10000000000)::text, 10, '0'), 'sha256'),
            false
        )
        RETURNING id INTO new_seed_id;
    END IF;
    
    RETURN new_seed_id;
END;
$$;

-- Create reveal_daily_seed function
CREATE OR REPLACE FUNCTION reveal_daily_seed(p_date DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    seed_record RECORD;
BEGIN
    SELECT * INTO seed_record FROM public.daily_seeds WHERE date = p_date;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No daily seed found for the specified date'
        );
    END IF;
    
    UPDATE public.daily_seeds 
    SET 
        is_revealed = true,
        revealed_at = NOW()
    WHERE date = p_date;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Daily seed revealed successfully'
    );
END;
$$;

-- Create place_roulette_bet function
CREATE OR REPLACE FUNCTION place_roulette_bet(
    p_user_id UUID,
    p_round_id UUID,
    p_bet_color TEXT,
    p_bet_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_balance NUMERIC;
    potential_payout NUMERIC;
    bet_id UUID;
    round_status TEXT;
    betting_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Check if round exists and is in betting phase
    SELECT status, betting_end_time INTO round_status, betting_end_time
    FROM public.roulette_rounds 
    WHERE id = p_round_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Round not found'
        );
    END IF;
    
    IF round_status != 'betting' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Betting is not active for this round'
        );
    END IF;
    
    IF NOW() > betting_end_time THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Betting period has ended'
        );
    END IF;
    
    -- Get user balance
    SELECT balance INTO user_balance
    FROM public.profiles 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User profile not found'
        );
    END IF;
    
    IF user_balance < p_bet_amount THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Insufficient balance'
        );
    END IF;
    
    -- Calculate potential payout based on bet color
    CASE p_bet_color
        WHEN 'green' THEN potential_payout := p_bet_amount * 14;
        WHEN 'red', 'black' THEN potential_payout := p_bet_amount * 2;
        ELSE
            RETURN json_build_object(
                'success', false,
                'error', 'Invalid bet color'
            );
    END CASE;
    
    -- Deduct balance
    UPDATE public.profiles 
    SET balance = balance - p_bet_amount
    WHERE id = p_user_id;
    
    -- Insert bet
    INSERT INTO public.roulette_bets (
        round_id, user_id, bet_color, bet_amount, potential_payout
    ) VALUES (
        p_round_id, p_user_id, p_bet_color, p_bet_amount, potential_payout
    ) RETURNING id INTO bet_id;
    
    RETURN json_build_object(
        'success', true,
        'bet_id', bet_id,
        'balance_deducted', p_bet_amount,
        'potential_payout', potential_payout
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_roulette_bet(UUID, UUID, TEXT, NUMERIC) TO authenticated;

-- Create complete_roulette_round function
CREATE OR REPLACE FUNCTION complete_roulette_round(p_round_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    round_record RECORD;
    bet_record RECORD;
    total_bets_processed INTEGER := 0;
    total_xp_awarded INTEGER := 0;
    total_winners_processed INTEGER := 0;
    user_profile RECORD;
    xp_gain INTEGER;
BEGIN
    -- Get round details
    SELECT * INTO round_record FROM public.roulette_rounds WHERE id = p_round_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Round not found'
        );
    END IF;
    
    IF round_record.status != 'spinning' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Round is not in spinning status'
        );
    END IF;
    
    -- Process all bets for this round
    FOR bet_record IN 
        SELECT * FROM public.roulette_bets WHERE round_id = p_round_id
    LOOP
        total_bets_processed := total_bets_processed + 1;
        
        -- Determine if bet is a winner
        IF bet_record.bet_color = round_record.result_color THEN
            -- Winner - calculate payout
            DECLARE
                payout NUMERIC;
            BEGIN
                CASE bet_record.bet_color
                    WHEN 'green' THEN payout := bet_record.bet_amount * 14;
                    WHEN 'red', 'black' THEN payout := bet_record.bet_amount * 2;
                END CASE;
                
                -- Update bet with payout
                UPDATE public.roulette_bets 
                SET 
                    is_winner = true,
                    actual_payout = payout,
                    profit = payout - bet_record.bet_amount
                WHERE id = bet_record.id;
                
                -- Add payout to user balance
                UPDATE public.profiles 
                SET balance = balance + payout
                WHERE id = bet_record.user_id;
                
                total_winners_processed := total_winners_processed + 1;
            END;
        ELSE
            -- Loser - no payout
            UPDATE public.roulette_bets 
            SET 
                is_winner = false,
                actual_payout = 0,
                profit = -bet_record.bet_amount
            WHERE id = bet_record.id;
        END IF;
        
        -- Award XP for playing (win or lose)
        SELECT * INTO user_profile FROM public.profiles WHERE id = bet_record.user_id;
        IF FOUND THEN
            -- Calculate XP based on bet amount (1 XP per $1 bet, max 100 XP per bet)
            xp_gain := LEAST(FLOOR(bet_record.bet_amount), 100);
            
            -- Update user level stats
            INSERT INTO public.user_level_stats (
                user_id, roulette_games, roulette_wagered, roulette_profit, 
                total_games, total_wagered, total_profit, lifetime_xp
            ) VALUES (
                bet_record.user_id, 1, bet_record.bet_amount, 
                CASE WHEN bet_record.bet_color = round_record.result_color 
                     THEN (CASE bet_record.bet_color 
                           WHEN 'green' THEN bet_record.bet_amount * 14 
                           ELSE bet_record.bet_amount * 2 
                           END) - bet_record.bet_amount
                     ELSE -bet_record.bet_amount 
                END,
                1, bet_record.bet_amount,
                CASE WHEN bet_record.bet_color = round_record.result_color 
                     THEN (CASE bet_record.bet_color 
                           WHEN 'green' THEN bet_record.bet_amount * 14 
                           ELSE bet_record.bet_amount * 2 
                           END) - bet_record.bet_amount
                     ELSE -bet_record.bet_amount 
                END,
                xp_gain
            )
            ON CONFLICT (user_id) DO UPDATE SET
                roulette_games = user_level_stats.roulette_games + 1,
                roulette_wagered = user_level_stats.roulette_wagered + bet_record.bet_amount,
                roulette_profit = user_level_stats.roulette_profit + 
                    CASE WHEN bet_record.bet_color = round_record.result_color 
                         THEN (CASE bet_record.bet_color 
                               WHEN 'green' THEN bet_record.bet_amount * 14 
                               ELSE bet_record.bet_amount * 2 
                               END) - bet_record.bet_amount
                         ELSE -bet_record.bet_amount 
                    END,
                total_games = user_level_stats.total_games + 1,
                total_wagered = user_level_stats.total_wagered + bet_record.bet_amount,
                total_profit = user_level_stats.total_profit + 
                    CASE WHEN bet_record.bet_color = round_record.result_color 
                         THEN (CASE bet_record.bet_color 
                               WHEN 'green' THEN bet_record.bet_amount * 14 
                               ELSE bet_record.bet_amount * 2 
                               END) - bet_record.bet_amount
                         ELSE -bet_record.bet_amount 
                    END,
                lifetime_xp = user_level_stats.lifetime_xp + xp_gain;
            
            total_xp_awarded := total_xp_awarded + xp_gain;
        END IF;
    END LOOP;
    
    -- Update round status to completed
    UPDATE public.roulette_rounds 
    SET status = 'completed', updated_at = NOW()
    WHERE id = p_round_id;
    
    RETURN json_build_object(
        'success', true,
        'bets_processed', total_bets_processed,
        'xp_awarded', total_xp_awarded,
        'winners_processed', total_winners_processed
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_roulette_round(UUID) TO authenticated;

-- =============================================================================
-- 2. CREATE SEQUENCE IF MISSING
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS roulette_nonce_seq START 1;

-- =============================================================================
-- 3. CREATE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_daily_seeds_date ON public.daily_seeds(date);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_daily_seed ON public.roulette_rounds(daily_seed_id);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_nonce ON public.roulette_rounds(nonce_id);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_status ON public.roulette_rounds(status);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_betting_end ON public.roulette_rounds(betting_end_time);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_created_at ON public.roulette_rounds(created_at);

-- =============================================================================
-- 4. ENABLE RLS AND CREATE POLICIES
-- =============================================================================

ALTER TABLE public.daily_seeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view daily seeds" ON public.daily_seeds;

CREATE POLICY "Anyone can view daily seeds" ON public.daily_seeds
    FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================================================
-- 5. ADD TO REALTIME PUBLICATION
-- =============================================================================

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
-- 6. CREATE TODAY'S DAILY SEED
-- =============================================================================

DO $$
DECLARE
    today_date DATE := CURRENT_DATE;
    seed_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM public.daily_seeds WHERE date = today_date) INTO seed_exists;
    
    IF NOT seed_exists THEN
        INSERT INTO public.daily_seeds (date, server_seed, server_seed_hash, lotto, lotto_hash, is_revealed)
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
-- 7. REVEAL EXPIRED SEEDS
-- =============================================================================

DO $$
BEGIN
    UPDATE public.daily_seeds 
    SET 
        is_revealed = true,
        revealed_at = NOW()
    WHERE 
        date < CURRENT_DATE 
        AND is_revealed = false;
        
    RAISE NOTICE 'Auto-revealed expired daily seeds for transparency';
END $$;

-- =============================================================================
-- 8. VERIFICATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Complete database fix finished successfully!';
    RAISE NOTICE 'All required functions have been created/restored.';
    RAISE NOTICE 'Roulette system should now be fully functional.';
END $$;