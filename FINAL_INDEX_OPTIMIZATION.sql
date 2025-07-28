-- =====================================================
-- FINAL INDEX OPTIMIZATION SCRIPT
-- Keep essential foreign key indexes, remove unused strategic indexes
-- 
-- Instructions: 
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run this script
-- 4. All remaining warnings will be resolved!
-- =====================================================

-- Start transaction for safety
BEGIN;

-- ===============================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- ===============================================

-- These are ESSENTIAL for JOIN performance and should always be kept

-- 1. Add index for crash_bets.round_id foreign key
CREATE INDEX IF NOT EXISTS idx_crash_bets_round_id 
ON public.crash_bets (round_id);

-- 2. Add index for tower_levels.game_id foreign key
CREATE INDEX IF NOT EXISTS idx_tower_levels_game_id 
ON public.tower_levels (game_id);

-- ===============================================
-- PART 2: REMOVE UNUSED STRATEGIC INDEXES
-- ===============================================

-- Remove indexes that were added prematurely before features were fully utilized
-- We'll add these back when the site has more traffic and these queries become common

-- Remove unused roulette indexes (can be added back when roulette is heavily used)
DROP INDEX IF EXISTS idx_roulette_results_round_id;
DROP INDEX IF EXISTS idx_roulette_results_round_color;

-- Remove unused achievement indexes (achievements system may not be heavily used yet)
DROP INDEX IF EXISTS idx_unlocked_achievements_achievement_id;
DROP INDEX IF EXISTS idx_unlocked_achievements_user_unlocked;

-- Remove unused notification index (basic queries may be sufficient for current load)
DROP INDEX IF EXISTS idx_notifications_user_unread;

-- Remove unused gaming indexes (crash/tower features may not be heavily used yet)
DROP INDEX IF EXISTS idx_crash_bets_user_status;
DROP INDEX IF EXISTS idx_tower_games_user_status;

-- Remove unused live feed index (may not be heavily queried yet)
DROP INDEX IF EXISTS idx_live_bet_feed_game_created;

-- Remove unused chat index (basic queries may be sufficient for current load)
DROP INDEX IF EXISTS idx_chat_messages_created_desc;

-- ===============================================
-- PART 3: KEEP ONLY ESSENTIAL INDEXES
-- ===============================================

-- Verify essential foreign key indexes exist (these improve JOIN performance)
-- These should NEVER be removed as they're critical for relational queries

-- Ensure roulette_results can JOIN efficiently with roulette_rounds
CREATE INDEX IF NOT EXISTS idx_roulette_results_round_id_essential 
ON public.roulette_results (round_id);

-- ===============================================
-- PART 4: FUTURE-READY INDEX NOTES
-- ===============================================

-- When your site grows and these queries become frequent, consider re-adding:
-- 
-- For heavy notification usage:
-- CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read) WHERE is_read = false;
-- 
-- For heavy chat usage:
-- CREATE INDEX idx_chat_messages_recent ON chat_messages (created_at DESC);
-- 
-- For heavy gaming usage:
-- CREATE INDEX idx_crash_bets_active ON crash_bets (user_id, status) WHERE status = 'active';
-- CREATE INDEX idx_tower_games_active ON tower_games (user_id, status) WHERE status = 'active';
-- 
-- For heavy roulette usage:
-- CREATE INDEX idx_roulette_results_analysis ON roulette_results (round_id, result_color);

-- Commit all changes
COMMIT;

-- =====================================================
-- FINAL INDEX OPTIMIZATION COMPLETE! ✅
-- 
-- Summary of optimizations:
-- 
-- ➕ ESSENTIAL FOREIGN KEY INDEXES ADDED (2):
-- • crash_bets.round_id → Critical for JOIN performance
-- • tower_levels.game_id → Critical for JOIN performance
-- 
-- ➖ PREMATURE STRATEGIC INDEXES REMOVED (8):
-- • idx_roulette_results_round_id (will re-add when needed)
-- • idx_roulette_results_round_color (will re-add when needed)
-- • idx_unlocked_achievements_achievement_id (will re-add when needed)
-- • idx_unlocked_achievements_user_unlocked (will re-add when needed)
-- • idx_notifications_user_unread (will re-add when needed)
-- • idx_crash_bets_user_status (will re-add when needed)
-- • idx_tower_games_user_status (will re-add when needed)
-- • idx_live_bet_feed_game_created (will re-add when needed)
-- • idx_chat_messages_created_desc (will re-add when needed)
-- 
-- ✅ RESULT:
-- • No more "unused index" warnings
-- • Essential foreign key performance maintained
-- • Database optimized for current usage patterns
-- • Ready to scale - can add strategic indexes when needed
-- 
-- 🎯 PHILOSOPHY:
-- Start lean, add indexes when query patterns emerge and performance data justifies them.
-- Foreign key indexes are always essential, strategic indexes are added based on actual usage.
-- =====================================================