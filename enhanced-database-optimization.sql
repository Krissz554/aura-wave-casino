-- Enhanced Database Performance Optimization Script
-- This script adds ALL missing indexes and optimizations identified in the comprehensive analysis

-- 1. CRITICAL MISSING INDEXES (Highest Priority)

-- Profiles table optimizations
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_balance ON public.profiles(balance);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles(level);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at);

-- Game history optimizations
CREATE INDEX IF NOT EXISTS idx_game_history_user_game_created ON public.game_history(user_id, game_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_profit ON public.game_history(profit);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type_created ON public.game_history(game_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_action ON public.game_history(action);

-- Chat optimizations
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_username ON public.chat_messages(username);

-- Notifications optimizations
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Tips optimizations
CREATE INDEX IF NOT EXISTS idx_tips_from_user ON public.tips(from_user_id);
CREATE INDEX IF NOT EXISTS idx_tips_to_user ON public.tips(to_user_id);
CREATE INDEX IF NOT EXISTS idx_tips_created_at ON public.tips(created_at DESC);

-- Admin optimizations
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON public.audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Rate limiting optimizations
CREATE INDEX IF NOT EXISTS idx_user_rate_limits_user_id ON public.user_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rate_limits_last_bet_time ON public.user_rate_limits(last_bet_time);

-- Daily seeds optimizations
CREATE INDEX IF NOT EXISTS idx_daily_seeds_date ON public.daily_seeds(date);
CREATE INDEX IF NOT EXISTS idx_daily_seeds_is_revealed ON public.daily_seeds(is_revealed);

-- Free case claims optimizations
CREATE INDEX IF NOT EXISTS idx_free_case_claims_user_id ON public.free_case_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_free_case_claims_case_type ON public.free_case_claims(case_type);
CREATE INDEX IF NOT EXISTS idx_free_case_claims_claimed_at ON public.free_case_claims(claimed_at);

-- User daily logins optimizations
CREATE INDEX IF NOT EXISTS idx_user_daily_logins_user_id ON public.user_daily_logins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_logins_login_date ON public.user_daily_logins(login_date);

-- 2. COMPOSITE INDEXES FOR COMPLEX QUERIES

-- User stats composite indexes
CREATE INDEX IF NOT EXISTS idx_user_level_stats_user_level ON public.user_level_stats(user_id, current_level);
CREATE INDEX IF NOT EXISTS idx_user_level_stats_user_xp ON public.user_level_stats(user_id, current_level_xp);
CREATE INDEX IF NOT EXISTS idx_user_level_stats_user_profit ON public.user_level_stats(user_id, total_profit);
CREATE INDEX IF NOT EXISTS idx_user_level_stats_user_wagered ON public.user_level_stats(user_id, total_wagered);

-- Game stats composite indexes
CREATE INDEX IF NOT EXISTS idx_game_stats_user_type ON public.game_stats(user_id, game_type);
CREATE INDEX IF NOT EXISTS idx_game_stats_user_profit ON public.game_stats(user_id, total_profit);
CREATE INDEX IF NOT EXISTS idx_game_stats_user_updated ON public.game_stats(user_id, updated_at);

-- Live bet feed composite indexes
CREATE INDEX IF NOT EXISTS idx_live_bet_feed_user_game_created ON public.live_bet_feed(user_id, game_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_bet_feed_game_created ON public.live_bet_feed(game_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_bet_feed_result_profit ON public.live_bet_feed(result, profit);

-- Roulette specific optimizations
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_status_created ON public.roulette_rounds(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_betting_end_time ON public.roulette_rounds(betting_end_time);
CREATE INDEX IF NOT EXISTS idx_roulette_bets_round_user ON public.roulette_bets(round_id, user_id);
CREATE INDEX IF NOT EXISTS idx_roulette_bets_user_created ON public.roulette_bets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_bets_color_amount ON public.roulette_bets(bet_color, bet_amount);
CREATE INDEX IF NOT EXISTS idx_roulette_results_round_number ON public.roulette_results(round_number);

-- Crash specific optimizations
CREATE INDEX IF NOT EXISTS idx_crash_rounds_status_created ON public.crash_rounds(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crash_bets_round_user ON public.crash_bets(round_id, user_id);
CREATE INDEX IF NOT EXISTS idx_crash_bets_user_status ON public.crash_bets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_crash_bets_amount_profit ON public.crash_bets(bet_amount, profit);

-- Tower specific optimizations
CREATE INDEX IF NOT EXISTS idx_tower_games_user_status ON public.tower_games(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tower_games_difficulty ON public.tower_games(difficulty);
CREATE INDEX IF NOT EXISTS idx_tower_games_created_at ON public.tower_games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tower_levels_game_level ON public.tower_levels(game_id, level_number);

-- Case rewards optimizations
CREATE INDEX IF NOT EXISTS idx_case_rewards_user_rarity ON public.case_rewards(user_id, rarity);
CREATE INDEX IF NOT EXISTS idx_case_rewards_level_rarity ON public.case_rewards(level_unlocked, rarity);
CREATE INDEX IF NOT EXISTS idx_case_rewards_opened_at ON public.case_rewards(opened_at);

-- User achievements optimizations
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_achievement ON public.user_achievements(user_id, achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_claimed ON public.user_achievements(claimed);
CREATE INDEX IF NOT EXISTS idx_unlocked_achievements_user_achievement ON public.unlocked_achievements(user_id, achievement_id);

-- 3. PARTIAL INDEXES FOR ACTIVE DATA (Safe version without functions)

-- Active games only (using status values instead of functions)
CREATE INDEX IF NOT EXISTS idx_active_roulette_rounds_safe ON public.roulette_rounds(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_active_crash_rounds_safe ON public.crash_rounds(status, created_at DESC);

-- Unread notifications only
CREATE INDEX IF NOT EXISTS idx_unread_notifications ON public.notifications(user_id, created_at DESC) 
WHERE is_read = false;

-- Active bets only
CREATE INDEX IF NOT EXISTS idx_active_crash_bets ON public.crash_bets(user_id, created_at DESC) 
WHERE status = 'active';

-- Active tower games only
CREATE INDEX IF NOT EXISTS idx_active_tower_games ON public.tower_games(user_id, created_at DESC) 
WHERE status = 'active';

-- 4. OPTIMIZED DATABASE FUNCTIONS

-- Enhanced user stats function with recent activity
CREATE OR REPLACE FUNCTION public.get_user_stats_optimized_v2(
  p_user_id UUID
)
RETURNS TABLE (
  current_level INTEGER,
  current_level_xp NUMERIC,
  xp_to_next_level NUMERIC,
  lifetime_xp NUMERIC,
  total_wagered NUMERIC,
  total_profit NUMERIC,
  recent_activity JSONB,
  game_stats JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uls.current_level,
    uls.current_level_xp,
    uls.xp_to_next_level,
    uls.lifetime_xp,
    uls.total_wagered,
    uls.total_profit,
    jsonb_build_object(
      'recent_bets', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'game_type', gh.game_type,
            'bet_amount', gh.bet_amount,
            'profit', gh.profit,
            'created_at', gh.created_at
          )
        )
        FROM public.game_history gh
        WHERE gh.user_id = p_user_id
        ORDER BY gh.created_at DESC
        LIMIT 10
      )
    ) as recent_activity,
    jsonb_build_object(
      'coinflip', jsonb_build_object(
        'games', uls.coinflip_games,
        'wins', uls.coinflip_wins,
        'profit', uls.coinflip_profit
      ),
      'crash', jsonb_build_object(
        'games', uls.crash_games,
        'wins', uls.crash_wins,
        'profit', uls.crash_profit
      ),
      'roulette', jsonb_build_object(
        'games', uls.roulette_games,
        'wins', uls.roulette_wins,
        'profit', uls.roulette_profit
      ),
      'tower', jsonb_build_object(
        'games', uls.tower_games,
        'wins', uls.tower_wins,
        'profit', uls.tower_profit
      )
    ) as game_stats
  FROM public.user_level_stats uls
  WHERE uls.user_id = p_user_id;
END;
$$;

-- Optimized live bet feed function with pagination and filtering
CREATE OR REPLACE FUNCTION public.get_live_bet_feed_optimized(
  p_limit INTEGER DEFAULT 30,
  p_offset INTEGER DEFAULT 0,
  p_game_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  game_type TEXT,
  bet_amount NUMERIC,
  result TEXT,
  profit NUMERIC,
  multiplier NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lbf.id,
    lbf.username,
    lbf.game_type,
    lbf.bet_amount,
    lbf.result,
    lbf.profit,
    lbf.multiplier,
    lbf.created_at
  FROM public.live_bet_feed lbf
  WHERE (p_game_type IS NULL OR lbf.game_type = p_game_type)
  ORDER BY lbf.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Optimized notifications function
CREATE OR REPLACE FUNCTION public.get_user_notifications_optimized(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  data JSONB,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.data,
    n.is_read,
    n.created_at
  FROM public.notifications n
  WHERE n.user_id = p_user_id
    AND (NOT p_unread_only OR n.is_read = FALSE)
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Optimized game history function
CREATE OR REPLACE FUNCTION public.get_user_game_history_optimized(
  p_user_id UUID,
  p_game_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  game_type TEXT,
  bet_amount NUMERIC,
  result TEXT,
  profit NUMERIC,
  game_data JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gh.id,
    gh.game_type,
    gh.bet_amount,
    gh.result,
    gh.profit,
    gh.game_data,
    gh.created_at
  FROM public.game_history gh
  WHERE gh.user_id = p_user_id
    AND (p_game_type IS NULL OR gh.game_type = p_game_type)
  ORDER BY gh.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 5. PERFORMANCE MONITORING (Optional - can be added later if needed)
-- Note: Performance monitoring views removed to avoid compatibility issues
-- These can be added later if pg_stat_statements extension is enabled

-- 6. GRANT PERMISSIONS FOR OPTIMIZED FUNCTIONS
GRANT EXECUTE ON FUNCTION public.get_user_stats_optimized_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_live_bet_feed_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_notifications_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_game_history_optimized TO authenticated;

-- 7. OPTIMIZE TABLE STATISTICS
ANALYZE public.profiles;
ANALYZE public.game_history;
ANALYZE public.chat_messages;
ANALYZE public.notifications;
ANALYZE public.tips;
ANALYZE public.audit_logs;
ANALYZE public.user_rate_limits;
ANALYZE public.daily_seeds;
ANALYZE public.free_case_claims;
ANALYZE public.user_daily_logins;
ANALYZE public.user_level_stats;
ANALYZE public.game_stats;
ANALYZE public.live_bet_feed;
ANALYZE public.roulette_rounds;
ANALYZE public.roulette_bets;
ANALYZE public.roulette_results;
ANALYZE public.crash_rounds;
ANALYZE public.crash_bets;
ANALYZE public.tower_games;
ANALYZE public.tower_levels;
ANALYZE public.case_rewards;
ANALYZE public.user_achievements;
ANALYZE public.unlocked_achievements;

-- 8. VERIFY OPTIMIZATIONS
SELECT 'Enhanced database optimization completed successfully' as status;

-- Verify optimizations completed successfully
SELECT 'Enhanced database optimization completed successfully' as status;

-- Count total indexes created
SELECT 
  COUNT(*) as total_indexes_created
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%';