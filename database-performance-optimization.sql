-- Database Performance Optimization Script
-- This script adds missing indexes and optimizes database performance

-- 1. Add missing indexes for frequently queried columns

-- Live bet feed optimizations
CREATE INDEX IF NOT EXISTS idx_live_bet_feed_created_at ON public.live_bet_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_bet_feed_game_type ON public.live_bet_feed(game_type);
CREATE INDEX IF NOT EXISTS idx_live_bet_feed_user_id ON public.live_bet_feed(user_id);

-- Roulette optimizations
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_status_created ON public.roulette_rounds(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_rounds_betting_end_time ON public.roulette_rounds(betting_end_time);
CREATE INDEX IF NOT EXISTS idx_roulette_bets_round_id ON public.roulette_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_roulette_bets_user_id ON public.roulette_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_roulette_bets_created_at ON public.roulette_bets(created_at DESC);

-- Crash game optimizations
CREATE INDEX IF NOT EXISTS idx_crash_rounds_status_created ON public.crash_rounds(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crash_bets_round_id ON public.crash_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_crash_bets_user_id ON public.crash_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_crash_bets_status ON public.crash_bets(status);

-- Tower game optimizations
CREATE INDEX IF NOT EXISTS idx_tower_games_user_id_status ON public.tower_games(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tower_games_created_at ON public.tower_games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tower_levels_game_id ON public.tower_levels(game_id);

-- User stats optimizations
CREATE INDEX IF NOT EXISTS idx_user_level_stats_user_id ON public.user_level_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_level_stats_level ON public.user_level_stats(current_level);
CREATE INDEX IF NOT EXISTS idx_user_level_stats_xp ON public.user_level_stats(current_level_xp);

-- Game history optimizations
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON public.game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON public.game_history(game_type);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON public.game_history(created_at DESC);

-- Notifications optimizations
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_status ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Case rewards optimizations
CREATE INDEX IF NOT EXISTS idx_case_rewards_user_id ON public.case_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_case_rewards_created_at ON public.case_rewards(created_at DESC);

-- Achievement optimizations
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_unlocked_achievements_user_id ON public.unlocked_achievements(user_id);

-- 2. Optimize existing indexes (partial indexes for better performance)

-- Partial index for active games only
CREATE INDEX IF NOT EXISTS idx_active_roulette_rounds ON public.roulette_rounds(status, created_at DESC) 
WHERE status IN ('betting', 'spinning');

CREATE INDEX IF NOT EXISTS idx_active_crash_rounds ON public.crash_rounds(status, created_at DESC) 
WHERE status IN ('countdown', 'active');

-- Partial index for recent bets only (last 24 hours)
CREATE INDEX IF NOT EXISTS idx_recent_live_bet_feed ON public.live_bet_feed(created_at DESC, game_type) 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 3. Add composite indexes for common query patterns

-- User stats with level and XP
CREATE INDEX IF NOT EXISTS idx_user_level_stats_composite ON public.user_level_stats(user_id, current_level, current_level_xp);

-- Game history with user and type
CREATE INDEX IF NOT EXISTS idx_game_history_composite ON public.game_history(user_id, game_type, created_at DESC);

-- Live bet feed with user and game type
CREATE INDEX IF NOT EXISTS idx_live_bet_feed_composite ON public.live_bet_feed(user_id, game_type, created_at DESC);

-- 4. Optimize table statistics
ANALYZE public.live_bet_feed;
ANALYZE public.roulette_rounds;
ANALYZE public.roulette_bets;
ANALYZE public.crash_rounds;
ANALYZE public.crash_bets;
ANALYZE public.tower_games;
ANALYZE public.user_level_stats;
ANALYZE public.game_history;
ANALYZE public.notifications;
ANALYZE public.case_rewards;
ANALYZE public.user_achievements;
ANALYZE public.unlocked_achievements;

-- 5. Create optimized functions for common queries

-- Function to get recent live bet feed with pagination
CREATE OR REPLACE FUNCTION public.get_recent_live_bet_feed(
  p_limit INTEGER DEFAULT 30,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
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
    lbf.user_id,
    lbf.username,
    lbf.avatar_url,
    lbf.game_type,
    lbf.bet_amount,
    lbf.result,
    lbf.profit,
    lbf.multiplier,
    lbf.created_at
  FROM public.live_bet_feed lbf
  ORDER BY lbf.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to get user stats efficiently
CREATE OR REPLACE FUNCTION public.get_user_stats_optimized(
  p_user_id UUID
)
RETURNS TABLE (
  current_level INTEGER,
  current_level_xp NUMERIC,
  xp_to_next_level NUMERIC,
  lifetime_xp NUMERIC,
  total_wagered NUMERIC,
  total_profit NUMERIC,
  coinflip_wins INTEGER,
  coinflip_games INTEGER,
  coinflip_profit NUMERIC,
  crash_wins INTEGER,
  crash_games INTEGER,
  crash_profit NUMERIC,
  roulette_wins INTEGER,
  roulette_games INTEGER,
  roulette_profit NUMERIC,
  tower_wins INTEGER,
  tower_games INTEGER,
  tower_profit NUMERIC
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
    uls.coinflip_wins,
    uls.coinflip_games,
    uls.coinflip_profit,
    uls.crash_wins,
    uls.crash_games,
    uls.crash_profit,
    uls.roulette_wins,
    uls.roulette_games,
    uls.roulette_profit,
    uls.tower_wins,
    uls.tower_games,
    uls.tower_profit
  FROM public.user_level_stats uls
  WHERE uls.user_id = p_user_id;
END;
$$;

-- 6. Add performance monitoring views

-- View for slow queries monitoring
CREATE OR REPLACE VIEW public.performance_monitor AS
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- View for index usage statistics
CREATE OR REPLACE VIEW public.index_usage_stats AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- 7. Grant permissions for optimized functions
GRANT EXECUTE ON FUNCTION public.get_recent_live_bet_feed TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_stats_optimized TO authenticated;
GRANT SELECT ON public.performance_monitor TO service_role;
GRANT SELECT ON public.index_usage_stats TO service_role;

-- 8. Verify optimizations
SELECT 'Indexes created successfully' as status;

-- Check for any missing critical indexes
SELECT 
  t.table_name,
  c.column_name,
  'Missing index on ' || t.table_name || '.' || c.column_name as recommendation
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND c.column_name IN ('user_id', 'created_at', 'status')
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = t.table_name 
    AND indexdef LIKE '%' || c.column_name || '%'
  );