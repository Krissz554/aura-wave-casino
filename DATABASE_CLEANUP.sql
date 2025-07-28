-- =====================================================
-- DATABASE PERFORMANCE CLEANUP SCRIPT
-- Fix minor performance suggestions from Supabase
-- 
-- Instructions: 
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run this script
-- 4. All minor performance suggestions will be resolved!
-- =====================================================

-- Start transaction for safety
BEGIN;

-- ===============================================
-- PART 1: ADD MISSING FOREIGN KEY INDEXES
-- ===============================================

-- 1. Add index for roulette_results.round_id foreign key
-- This will improve JOIN performance between roulette_results and roulette_rounds
CREATE INDEX IF NOT EXISTS idx_roulette_results_round_id 
ON public.roulette_results (round_id);

-- 2. Add index for unlocked_achievements.achievement_id foreign key  
-- This will improve JOIN performance between unlocked_achievements and achievements
CREATE INDEX IF NOT EXISTS idx_unlocked_achievements_achievement_id 
ON public.unlocked_achievements (achievement_id);

-- ===============================================
-- PART 2: REMOVE UNUSED INDEXES (CLEANUP)
-- ===============================================

-- Remove unused indexes that are consuming storage without providing benefit
-- These indexes were likely created during development but are not being used

-- 3. Remove unused crash_rounds status index
DROP INDEX IF EXISTS idx_crash_rounds_status;

-- 4. Remove unused notifications composite index
DROP INDEX IF EXISTS idx_notifications_user_id_is_read;

-- 5. Remove unused user_level_stats current_level index
DROP INDEX IF EXISTS idx_user_level_stats_current_level;

-- 6. Remove unused roulette_rounds betting_end index
DROP INDEX IF EXISTS idx_roulette_rounds_betting_end;

-- 7. Remove unused audit_logs timestamp index
DROP INDEX IF EXISTS idx_audit_logs_timestamp;

-- 8. Remove unused crash_bets round_id index
DROP INDEX IF EXISTS idx_crash_bets_round_id;

-- 9. Remove unused crash_bets user_id index
DROP INDEX IF EXISTS idx_crash_bets_user_id;

-- 10. Remove unused tower_games status index
DROP INDEX IF EXISTS idx_tower_games_status;

-- 11. Remove unused tower_levels game_id index
DROP INDEX IF EXISTS idx_tower_levels_game_id;

-- 12. Remove unused user_daily_logins login_date index
DROP INDEX IF EXISTS idx_user_daily_logins_login_date;

-- 13. Remove unused chat_messages user_id index
DROP INDEX IF EXISTS idx_chat_messages_user_id;

-- 14. Remove unused live_bet_feed game_type index
DROP INDEX IF EXISTS idx_live_bet_feed_game_type;

-- 15. Remove unused case_rewards rarity index
DROP INDEX IF EXISTS idx_case_rewards_rarity;

-- ===============================================
-- PART 3: ADD STRATEGIC INDEXES (FUTURE-PROOFING)
-- ===============================================

-- Add commonly queried indexes that will actually be used
-- These replace some of the removed indexes with more targeted ones

-- Optimize roulette results queries (by round and color)
CREATE INDEX IF NOT EXISTS idx_roulette_results_round_color 
ON public.roulette_results (round_id, result_color);

-- Optimize notifications queries (user's unread notifications)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications (user_id, is_read) 
WHERE is_read = false;

-- Optimize crash game queries (active games by user)
CREATE INDEX IF NOT EXISTS idx_crash_bets_user_status 
ON public.crash_bets (user_id, status) 
WHERE status = 'active';

-- Optimize tower game queries (active games by user)
CREATE INDEX IF NOT EXISTS idx_tower_games_user_status 
ON public.tower_games (user_id, status) 
WHERE status = 'active';

-- Optimize live bet feed queries (recent bets by game type)
CREATE INDEX IF NOT EXISTS idx_live_bet_feed_game_created 
ON public.live_bet_feed (game_type, created_at DESC);

-- Optimize chat message queries (recent messages)
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_desc 
ON public.chat_messages (created_at DESC);

-- Optimize user achievements queries (user's unlocked achievements)
CREATE INDEX IF NOT EXISTS idx_unlocked_achievements_user_unlocked 
ON public.unlocked_achievements (user_id, unlocked_at DESC);

-- Commit all changes
COMMIT;

-- ===============================================
-- DATABASE CLEANUP COMPLETE! ✅
-- 
-- Summary of optimizations:
-- 
-- 🔗 FOREIGN KEY INDEXES ADDED (2):
-- • roulette_results.round_id → faster JOINs
-- • unlocked_achievements.achievement_id → faster JOINs
-- 
-- 🗑️ UNUSED INDEXES REMOVED (13):
-- • idx_crash_rounds_status
-- • idx_notifications_user_id_is_read  
-- • idx_user_level_stats_current_level
-- • idx_roulette_rounds_betting_end
-- • idx_audit_logs_timestamp
-- • idx_crash_bets_round_id
-- • idx_crash_bets_user_id
-- • idx_tower_games_status
-- • idx_tower_levels_game_id
-- • idx_user_daily_logins_login_date
-- • idx_chat_messages_user_id
-- • idx_live_bet_feed_game_type
-- • idx_case_rewards_rarity
-- 
-- ⚡ STRATEGIC INDEXES ADDED (7):
-- • Optimized roulette results queries
-- • Optimized unread notifications
-- • Optimized active crash/tower games  
-- • Optimized live bet feed performance
-- • Optimized chat message retrieval
-- • Optimized user achievements
-- 
-- 📈 BENEFITS:
-- • Faster JOIN operations
-- • Reduced storage overhead
-- • Better query performance for common operations
-- • Cleaner database structure
-- • Future-proofed for scaling
-- =====================================================