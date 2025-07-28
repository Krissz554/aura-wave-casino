-- Final Index Optimization Migration
-- Add essential foreign key indexes and remove unused strategic indexes

BEGIN;

-- Add essential foreign key indexes
CREATE INDEX IF NOT EXISTS idx_crash_bets_round_id 
ON public.crash_bets (round_id);

CREATE INDEX IF NOT EXISTS idx_tower_levels_game_id 
ON public.tower_levels (game_id);

-- Remove unused strategic indexes (can be re-added when usage justifies them)
DROP INDEX IF EXISTS idx_roulette_results_round_id;
DROP INDEX IF EXISTS idx_roulette_results_round_color;
DROP INDEX IF EXISTS idx_unlocked_achievements_achievement_id;
DROP INDEX IF EXISTS idx_unlocked_achievements_user_unlocked;
DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP INDEX IF EXISTS idx_crash_bets_user_status;
DROP INDEX IF EXISTS idx_tower_games_user_status;
DROP INDEX IF EXISTS idx_live_bet_feed_game_created;
DROP INDEX IF EXISTS idx_chat_messages_created_desc;

-- Ensure essential roulette foreign key index exists
CREATE INDEX IF NOT EXISTS idx_roulette_results_round_id_essential 
ON public.roulette_results (round_id);

COMMIT;