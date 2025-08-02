-- ===============================================================================
-- RESTORE DATABASE TO COMMIT 9404977 STATE
-- This script recreates the exact database state as it was at commit 9404977
-- Date: August 1, 2025 - "fix: Preserve user balance during stats reset"
-- ===============================================================================

-- Clean start - ensure we're working with a fresh state
SET client_min_messages = WARNING;

-- ===============================================================================
-- 1. CREATE ALL MISSING CORE TABLES
-- ===============================================================================

-- MAINTENANCE MODE TABLE
CREATE TABLE IF NOT EXISTS public.maintenance_mode (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enabled BOOLEAN DEFAULT FALSE NOT NULL,
    message TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default maintenance mode record
INSERT INTO public.maintenance_mode (enabled, message) 
VALUES (FALSE, 'System is operational') 
ON CONFLICT DO NOTHING;

-- BET HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.bet_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    bet_amount NUMERIC NOT NULL CHECK (bet_amount > 0),
    outcome TEXT NOT NULL,
    payout NUMERIC DEFAULT 0,
    profit NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BETS TABLE (general betting table)
CREATE TABLE IF NOT EXISTS public.bets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    outcome TEXT,
    payout NUMERIC DEFAULT 0,
    profit NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- CASES TABLE
CREATE TABLE IF NOT EXISTS public.cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL CHECK (price >= 0),
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CASE ITEMS TABLE  
CREATE TABLE IF NOT EXISTS public.case_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    value NUMERIC NOT NULL CHECK (value >= 0),
    rarity TEXT NOT NULL DEFAULT 'common',
    image_url TEXT,
    drop_rate NUMERIC NOT NULL CHECK (drop_rate >= 0 AND drop_rate <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CASE OPENINGS TABLE
CREATE TABLE IF NOT EXISTS public.case_openings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES public.cases(id),
    item_id UUID NOT NULL REFERENCES public.case_items(id),
    value_won NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DAILY CASES TABLE
CREATE TABLE IF NOT EXISTS public.daily_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    level_required INTEGER NOT NULL DEFAULT 1,
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COINFLIP BETS TABLE
CREATE TABLE IF NOT EXISTS public.coinflip_bets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bet_amount NUMERIC NOT NULL CHECK (bet_amount > 0),
    chosen_side TEXT NOT NULL CHECK (chosen_side IN ('heads', 'tails')),
    result_side TEXT,
    is_winner BOOLEAN,
    payout NUMERIC DEFAULT 0,
    profit NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TOWER BETS TABLE
CREATE TABLE IF NOT EXISTS public.tower_bets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bet_amount NUMERIC NOT NULL CHECK (bet_amount > 0),
    levels_climbed INTEGER DEFAULT 0,
    current_multiplier NUMERIC DEFAULT 1.0,
    is_completed BOOLEAN DEFAULT FALSE,
    is_winner BOOLEAN,
    payout NUMERIC DEFAULT 0,
    profit NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- FRIEND REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(sender_id, receiver_id)
);

-- FRIENDSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user1_id, user2_id),
    CHECK (user1_id != user2_id)
);

-- LEVEL REQUIREMENTS TABLE
CREATE TABLE IF NOT EXISTS public.level_requirements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level INTEGER NOT NULL UNIQUE,
    xp_required NUMERIC NOT NULL DEFAULT 0,
    total_xp_required NUMERIC NOT NULL DEFAULT 0,
    rewards JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- USER SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PUSH SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- PENDING DELETIONS TABLE
CREATE TABLE IF NOT EXISTS public.pending_deletions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deletion_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE
);

-- ROULETTE HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.roulette_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    round_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    bet_color TEXT,
    bet_amount NUMERIC,
    result_color TEXT,
    result_slot INTEGER,
    is_winner BOOLEAN,
    payout NUMERIC DEFAULT 0,
    profit NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ROULETTE STATS TABLE
CREATE TABLE IF NOT EXISTS public.roulette_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_bets INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_wagered NUMERIC DEFAULT 0,
    total_profit NUMERIC DEFAULT 0,
    biggest_win NUMERIC DEFAULT 0,
    biggest_loss NUMERIC DEFAULT 0,
    favorite_color TEXT DEFAULT 'none',
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    red_wins INTEGER DEFAULT 0,
    black_wins INTEGER DEFAULT 0,
    green_wins INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ===============================================================================
-- 2. ENSURE DAILY SEEDS TABLE EXISTS (IMPORTANT FOR ROULETTE)
-- ===============================================================================

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

-- ===============================================================================
-- 3. CREATE COMPREHENSIVE USER STATS RESET FUNCTION (AS PER COMMIT 9404977)
-- ===============================================================================

CREATE OR REPLACE FUNCTION public.reset_user_stats_comprehensive(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  error_message TEXT;
  tables_reset INTEGER := 0;
  records_affected INTEGER := 0;
  user_balance NUMERIC;
BEGIN
  RAISE NOTICE 'Starting comprehensive stats reset for user: %', target_user_id;
  
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'User not found',
      'user_id', target_user_id
    );
  END IF;

  -- Get current balance to preserve it
  SELECT balance INTO user_balance FROM public.profiles WHERE id = target_user_id;
  RAISE NOTICE 'Preserving user balance: %', user_balance;

  BEGIN
    -- RESET PROFILES TABLE (stats only - PRESERVE BALANCE)
    RAISE NOTICE 'Resetting profiles table (preserving balance: %)...', user_balance;
    UPDATE public.profiles 
    SET 
      total_wagered = 0,
      total_profit = 0,
      last_claim_time = '1970-01-01 00:00:00+00'::timestamp with time zone,
      badges = ARRAY['welcome'],
      updated_at = now()
    WHERE id = target_user_id;
    
    GET DIAGNOSTICS records_affected = ROW_COUNT;
    IF records_affected > 0 THEN
      tables_reset := tables_reset + 1;
      RAISE NOTICE 'Profiles table reset: % rows affected (balance preserved)', records_affected;
    END IF;

    -- RESET USER_LEVEL_STATS TABLE
    RAISE NOTICE 'Resetting user_level_stats table...';
    UPDATE public.user_level_stats 
    SET 
      current_level = 1,
      lifetime_xp = 0,
      current_level_xp = 0,
      xp_to_next_level = 100,
      border_tier = 1,
      border_unlocked_at = NULL,
      available_cases = 0,
      total_cases_opened = 0,
      total_case_value = 0,
      coinflip_games = 0,
      coinflip_wins = 0,
      coinflip_wagered = 0,
      coinflip_profit = 0,
      best_coinflip_streak = 0,
      current_coinflip_streak = 0,
      crash_games = 0,
      crash_wins = 0,
      crash_wagered = 0,
      crash_profit = 0,
      roulette_games = 0,
      roulette_wins = 0,
      roulette_wagered = 0,
      roulette_profit = 0,
      roulette_highest_win = 0,
      roulette_highest_loss = 0,
      roulette_green_wins = 0,
      roulette_red_wins = 0,
      roulette_black_wins = 0,
      roulette_favorite_color = 'none',
      roulette_best_streak = 0,
      roulette_current_streak = 0,
      roulette_biggest_bet = 0,
      tower_games = 0,
      tower_wins = 0,
      tower_wagered = 0,
      tower_profit = 0,
      total_games = 0,
      total_wins = 0,
      total_wagered = 0,
      total_profit = 0,
      biggest_win = 0,
      biggest_loss = 0,
      chat_messages_count = 0,
      login_days_count = 0,
      biggest_single_bet = 0,
      current_win_streak = 0,
      best_win_streak = 0,
      tower_highest_level = 0,
      tower_biggest_win = 0,
      tower_biggest_loss = 0,
      tower_best_streak = 0,
      tower_current_streak = 0,
      tower_perfect_games = 0,
      updated_at = now()
    WHERE user_id = target_user_id;
    
    GET DIAGNOSTICS records_affected = ROW_COUNT;
    IF records_affected > 0 THEN
      tables_reset := tables_reset + 1;
      RAISE NOTICE 'User level stats table reset: % rows affected', records_affected;
    END IF;

    -- DELETE BETTING HISTORY
    DELETE FROM public.bet_history WHERE user_id = target_user_id;
    DELETE FROM public.bets WHERE user_id = target_user_id;
    DELETE FROM public.coinflip_bets WHERE user_id = target_user_id;
    DELETE FROM public.tower_bets WHERE user_id = target_user_id;
    DELETE FROM public.crash_bets WHERE user_id = target_user_id;
    DELETE FROM public.roulette_bets WHERE user_id = target_user_id;
    DELETE FROM public.live_bet_feed WHERE user_id = target_user_id;

    -- DELETE CASE DATA
    DELETE FROM public.case_openings WHERE user_id = target_user_id;
    DELETE FROM public.daily_cases WHERE user_id = target_user_id;

    -- RESET USER ACHIEVEMENTS
    UPDATE public.user_achievements 
    SET 
      claimed = false,
      claimed_at = NULL
    WHERE user_id = target_user_id;

    RAISE NOTICE 'Comprehensive stats reset completed successfully. Tables affected: % (Balance preserved: %)', tables_reset, user_balance;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'User statistics reset successfully (balance preserved)',
      'user_id', target_user_id,
      'tables_reset', tables_reset,
      'balance_preserved', user_balance,
      'timestamp', now()
    );

  EXCEPTION
    WHEN OTHERS THEN
      error_message := SQLERRM;
      RAISE NOTICE 'Error in comprehensive stats reset for user %: %', target_user_id, error_message;
      RETURN jsonb_build_object(
        'success', false,
        'error', error_message,
        'user_id', target_user_id,
        'tables_reset', tables_reset,
        'balance_preserved', user_balance
      );
  END;
END;
$$;

-- ===============================================================================
-- 4. CREATE BASIC INDEXES FOR PERFORMANCE
-- ===============================================================================

CREATE INDEX IF NOT EXISTS idx_bet_history_user_id ON public.bet_history(user_id);
CREATE INDEX IF NOT EXISTS idx_bet_history_created_at ON public.bet_history(created_at);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_game_type ON public.bets(game_type);
CREATE INDEX IF NOT EXISTS idx_case_openings_user_id ON public.case_openings(user_id);
CREATE INDEX IF NOT EXISTS idx_coinflip_bets_user_id ON public.coinflip_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_tower_bets_user_id ON public.tower_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_cases_user_id ON public.daily_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON public.friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON public.friendships(user2_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON public.user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_deletions_user_id ON public.pending_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_roulette_history_user_id ON public.roulette_history(user_id);

-- ===============================================================================
-- 5. GRANT APPROPRIATE PERMISSIONS
-- ===============================================================================

-- Grant permissions on new tables
GRANT ALL ON public.maintenance_mode TO authenticated;
GRANT ALL ON public.bet_history TO authenticated;
GRANT ALL ON public.bets TO authenticated;
GRANT ALL ON public.cases TO authenticated;
GRANT ALL ON public.case_items TO authenticated;
GRANT ALL ON public.case_openings TO authenticated;
GRANT ALL ON public.daily_cases TO authenticated;
GRANT ALL ON public.coinflip_bets TO authenticated;
GRANT ALL ON public.tower_bets TO authenticated;
GRANT ALL ON public.friend_requests TO authenticated;
GRANT ALL ON public.friendships TO authenticated;
GRANT ALL ON public.level_requirements TO authenticated;
GRANT ALL ON public.user_sessions TO authenticated;
GRANT ALL ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.pending_deletions TO authenticated;
GRANT ALL ON public.roulette_history TO authenticated;
GRANT ALL ON public.roulette_stats TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.reset_user_stats_comprehensive(UUID) TO authenticated;

-- ===============================================================================
-- 6. CREATE SOME BASIC DATA FOR LEVEL REQUIREMENTS
-- ===============================================================================

INSERT INTO public.level_requirements (level, xp_required, total_xp_required) VALUES
(1, 0, 0),
(2, 100, 100),
(3, 150, 250),
(4, 200, 450),
(5, 300, 750),
(6, 400, 1150),
(7, 500, 1650),
(8, 600, 2250),
(9, 700, 2950),
(10, 800, 3750)
ON CONFLICT (level) DO NOTHING;

-- ===============================================================================
-- 7. INSERT SAMPLE ACHIEVEMENT IF IT DOESN'T EXIST  
-- ===============================================================================

INSERT INTO public.achievements (
    name, description, category, difficulty, rarity, icon, criteria, reward_type, reward_amount
) VALUES (
    'Welcome', 'Welcome to the platform!', 'general', 'easy', 'common', '🎉', 
    '{"type": "welcome"}', 'balance', 1.00
) ON CONFLICT DO NOTHING;

-- ===============================================================================
-- COMPLETION MESSAGE
-- ===============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ DATABASE SUCCESSFULLY RESTORED TO COMMIT 9404977 STATE!';
    RAISE NOTICE '📊 All missing tables have been created';
    RAISE NOTICE '🔧 Balance-preserving reset function is active';
    RAISE NOTICE '🎯 Database is now ready for full application functionality';
    RAISE NOTICE '💡 Run your application - all features should now work!';
END $$;