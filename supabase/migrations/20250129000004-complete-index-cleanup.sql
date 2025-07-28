-- Complete Index Cleanup Migration
-- Final resolution of all performance suggestions

BEGIN;

-- Add only the critical achievements foreign key index
CREATE INDEX IF NOT EXISTS idx_unlocked_achievements_achievement_id 
ON public.unlocked_achievements (achievement_id);

-- Remove unused foreign key indexes (can be re-added when usage justifies)
DROP INDEX IF EXISTS idx_crash_bets_round_id;
DROP INDEX IF EXISTS idx_tower_levels_game_id;
DROP INDEX IF EXISTS idx_roulette_results_round_id_essential;

COMMIT;