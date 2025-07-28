-- Database Performance Cleanup Migration
-- Fix unindexed foreign keys and remove unused indexes
-- Add strategic indexes for better performance

BEGIN;

-- ===============================================
-- ADD MISSING FOREIGN KEY INDEXES
-- ===============================================

-- Index for roulette_results.round_id foreign key
CREATE INDEX IF NOT EXISTS idx_roulette_results_round_id 
ON public.roulette_results (round_id);

-- Index for unlocked_achievements.achievement_id foreign key  
CREATE INDEX IF NOT EXISTS idx_unlocked_achievements_achievement_id 
ON public.unlocked_achievements (achievement_id);

-- ===============================================
-- REMOVE UNUSED INDEXES
-- ===============================================

-- Remove indexes that Supabase identified as unused
DROP INDEX IF EXISTS idx_crash_rounds_status;
DROP INDEX IF EXISTS idx_notifications_user_id_is_read;
DROP INDEX IF EXISTS idx_user_level_stats_current_level;
DROP INDEX IF EXISTS idx_roulette_rounds_betting_end;
DROP INDEX IF EXISTS idx_audit_logs_timestamp;
DROP INDEX IF EXISTS idx_crash_bets_round_id;
DROP INDEX IF EXISTS idx_crash_bets_user_id;
DROP INDEX IF EXISTS idx_tower_games_status;
DROP INDEX IF EXISTS idx_tower_levels_game_id;
DROP INDEX IF EXISTS idx_user_daily_logins_login_date;
DROP INDEX IF EXISTS idx_chat_messages_user_id;
DROP INDEX IF EXISTS idx_live_bet_feed_game_type;
DROP INDEX IF EXISTS idx_case_rewards_rarity;

-- ===============================================
-- ADD STRATEGIC INDEXES
-- ===============================================

-- Optimize roulette results queries
CREATE INDEX IF NOT EXISTS idx_roulette_results_round_color 
ON public.roulette_results (round_id, result_color);

-- Optimize notifications queries (partial index for unread only)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications (user_id, is_read) 
WHERE is_read = false;

-- Optimize active crash bets
CREATE INDEX IF NOT EXISTS idx_crash_bets_user_status 
ON public.crash_bets (user_id, status) 
WHERE status = 'active';

-- Optimize active tower games
CREATE INDEX IF NOT EXISTS idx_tower_games_user_status 
ON public.tower_games (user_id, status) 
WHERE status = 'active';

-- Optimize live bet feed queries
CREATE INDEX IF NOT EXISTS idx_live_bet_feed_game_created 
ON public.live_bet_feed (game_type, created_at DESC);

-- Optimize chat message queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_desc 
ON public.chat_messages (created_at DESC);

-- Optimize user achievements queries
CREATE INDEX IF NOT EXISTS idx_unlocked_achievements_user_unlocked 
ON public.unlocked_achievements (user_id, unlocked_at DESC);

COMMIT;