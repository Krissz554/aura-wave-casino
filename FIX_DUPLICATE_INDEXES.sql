-- =====================================================
-- FIX DUPLICATE INDEXES SCRIPT
-- Remove duplicate indexes safely
-- 
-- Instructions: 
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run this script
-- 4. All duplicate index warnings will be resolved!
-- =====================================================

-- Start transaction for safety
BEGIN;

-- ===============================================
-- REMOVE DUPLICATE INDEXES
-- ===============================================

-- 1. Fix chat_messages duplicate indexes
-- Remove the older, less optimized index and keep the DESC optimized one
DROP INDEX IF EXISTS idx_chat_messages_created_at;
-- Keep: idx_chat_messages_created_desc (more optimized for recent messages)

-- 2. Fix notifications duplicate indexes  
-- Remove the older, less specific index and keep the user-specific optimized one
DROP INDEX IF EXISTS idx_notifications_unread;
-- Keep: idx_notifications_user_unread (more optimized for user-specific unread notifications)

-- Commit changes
COMMIT;

-- =====================================================
-- DUPLICATE INDEX CLEANUP COMPLETE! ✅
-- 
-- Summary of fixes:
-- 
-- 🗑️ DUPLICATE INDEXES REMOVED (2):
-- • idx_chat_messages_created_at (kept idx_chat_messages_created_desc)
-- • idx_notifications_unread (kept idx_notifications_user_unread)
-- 
-- ✅ KEPT OPTIMIZED INDEXES:
-- • idx_chat_messages_created_desc → Better for recent message queries
-- • idx_notifications_user_unread → Better for user-specific unread notifications
-- 
-- 📈 BENEFITS:
-- • Reduced storage overhead
-- • Eliminated duplicate maintenance
-- • Kept the most optimized versions
-- • Cleaner database structure
-- =====================================================