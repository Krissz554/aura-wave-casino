-- Fix Duplicate Indexes Migration
-- Remove duplicate indexes and keep the most optimized versions

BEGIN;

-- Remove duplicate chat_messages index (keep the DESC optimized one)
DROP INDEX IF EXISTS idx_chat_messages_created_at;

-- Remove duplicate notifications index (keep the user-specific optimized one)  
DROP INDEX IF EXISTS idx_notifications_unread;

COMMIT;