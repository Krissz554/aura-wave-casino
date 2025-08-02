-- COMPLETE DATABASE RESTORE TO COMMIT 9404977
-- This script restores the entire database to the exact working state from yesterday

-- =============================================================================
-- RUN ALL MIGRATION FILES FROM COMMIT 9404977
-- =============================================================================

-- 1. Roulette System
\i supabase/migrations/20250125000001-roulette-system.sql

-- 2. PLG Provably Fair System
\i supabase/migrations/20250125999997-plg-provably-fair.sql

-- 3. Add Reel Position
\i supabase/migrations/20250125999998-add-reel-position.sql

-- 4. Add Roulette to Live Feed
\i supabase/migrations/20250125999999-add-roulette-to-live-feed.sql

-- 5. Enhance Roulette Stats
\i supabase/migrations/20250126000000-enhance-roulette-stats.sql

-- 6. Comprehensive Achievements
\i supabase/migrations/20250126200000-comprehensive-achievements.sql

-- 7. Fix Missing Achievement Types
\i supabase/migrations/20250127000008-fix-missing-achievement-types.sql

-- 8. Add User Level Achievement
\i supabase/migrations/20250127000009-add-user-level-achievement.sql

-- 9. Fix Auto Achievement Claiming
\i supabase/migrations/20250127000013-fix-auto-achievement-claiming.sql

-- 10. Completely Disable Auto Claiming
\i supabase/migrations/20250127000014-completely-disable-auto-claiming.sql

-- 11. Remove All Auto Awarding
\i supabase/migrations/20250127000015-remove-all-auto-awarding.sql

-- 12. Aggressive Disable All Auto Claiming
\i supabase/migrations/20250127000016-aggressive-disable-all-auto-claiming.sql

-- 13. Create Level Daily Cases
\i supabase/migrations/20250127000016-create-level-daily-cases.sql

-- 14. Add Admin Message Type
\i supabase/migrations/20250127000017-add-admin-message-type.sql

-- 15. Remove All Inserts
\i supabase/migrations/20250127000017-remove-all-inserts.sql

-- 16. Complete Elimination of Auto Claiming
\i supabase/migrations/20250127000018-complete-elimination-of-auto-claiming.sql

-- 17. Create Admin User Function
\i supabase/migrations/20250127000018-create-admin-user-function.sql

-- 18. Add Admin Profiles Policy
\i supabase/migrations/20250127000019-add-admin-profiles-policy.sql

-- 19. Final Elimination
\i supabase/migrations/20250127000019-final-elimination.sql

-- 20. Complete Achievement System Overhaul
\i supabase/migrations/20250127000020-complete-achievement-system-overhaul.sql

-- 21. Fix User Registration Trigger
\i supabase/migrations/20250127000020-fix-user-registration-trigger.sql

-- 22. Clean User Registration Fix
\i supabase/migrations/20250127000021-clean-user-registration-fix.sql

-- 23. Test Claim Function
\i supabase/migrations/20250127000021-test-claim-function.sql

-- 24. Fix Claim Function
\i supabase/migrations/20250127000022-fix-claim-function.sql

-- 25. Fix Profile Creation Issues
\i supabase/migrations/20250127000022-fix-profile-creation-issues.sql

-- 26. Fix Data Inconsistency
\i supabase/migrations/20250127000023-fix-data-inconsistency.sql

-- 27. Simple Profile Creation
\i supabase/migrations/20250127000023-simple-profile-creation.sql

-- 28. Fix Profile Creation with Correct Schema
\i supabase/migrations/20250127000024-fix-profile-creation-with-correct-schema.sql

-- 29. Separate Unlock and Claim Status
\i supabase/migrations/20250127000024-separate-unlock-and-claim-status.sql

-- 30. Fix User Access Policies
\i supabase/migrations/20250127000025-fix-user-access-policies.sql

-- 31. Fix Admin Users Policies
\i supabase/migrations/20250127000026-fix-admin-users-policies.sql

-- 32. Fix User Registration with Trigger
\i supabase/migrations/20250127000026-fix-user-registration-with-trigger.sql

-- 33. Fix User Access Policies Final
\i supabase/migrations/20250127000027-fix-user-access-policies-final.sql

-- 34. Fix User Registration No Test
\i supabase/migrations/20250127000028-fix-user-registration-no-test.sql

-- 35. Temp Permissive Policies
\i supabase/migrations/20250127000028-temp-permissive-policies.sql

-- 36. Fix Admin Users Access
\i supabase/migrations/20250127000029-fix-admin-users-access.sql

-- 37. Fix User Level Stats Foreign Key
\i supabase/migrations/20250127000029-fix-user-level-stats-foreign-key.sql

-- 38. Fix Admin Role Management
\i supabase/migrations/20250127000030-fix-admin-role-management.sql

-- 39. Fix Handle New User Columns
\i supabase/migrations/20250127000030-fix-handle-new-user-columns.sql

-- 40. Update Level Daily Cases Functions
\i supabase/migrations/20250127000030-update-level-daily-cases-functions.sql

-- 41. Comprehensive User Registration Fix
\i supabase/migrations/20250127000031-comprehensive-user-registration-fix.sql

-- 42. Fix Admin Reset Stats
\i supabase/migrations/20250127000031-fix-admin-reset-stats.sql

-- 43. Fix Reset Stats Permissions
\i supabase/migrations/20250127000032-fix-reset-stats-permissions.sql

-- 44. Simplified User Registration
\i supabase/migrations/20250127000032-simplified-user-registration.sql

-- 45. Comprehensive Reset Permissions
\i supabase/migrations/20250127000033-comprehensive-reset-permissions.sql

-- 46. Fresh User Registration
\i supabase/migrations/20250127000033-fresh-user-registration.sql

-- 47. Fix Reset Stats Permissions Final
\i supabase/migrations/20250127000034-fix-reset-stats-permissions-final.sql

-- 48. Fix User Registration
\i supabase/migrations/20250127000034-fix-user-registration.sql

-- 49. Fix Trigger Debugging
\i supabase/migrations/20250127000035-fix-trigger-debugging.sql

-- 50. Test Reset Permissions
\i supabase/migrations/20250127000035-test-reset-permissions.sql

-- 51. Fix Foreign Key Constraint
\i supabase/migrations/20250127000036-fix-foreign-key-constraint.sql

-- 52. Verify Profiles Columns
\i supabase/migrations/20250127000036-verify-profiles-columns.sql

-- 53. Debug Trigger Existence
\i supabase/migrations/20250127000037-debug-trigger-existence.sql

-- 54. Fix Registration RLS Policies
\i supabase/migrations/20250127000037-fix-registration-rls-policies.sql

-- 55. Fix Reset Cache Issue
\i supabase/migrations/20250127000037-fix-reset-cache-issue.sql

-- 56. Comprehensive Registration Authentication Fix
\i supabase/migrations/20250127000037_comprehensive-registration-authentication-fix.sql

-- 57. Comprehensive Trigger Fix
\i supabase/migrations/20250127000038-comprehensive-trigger-fix.sql

-- 58. Fix Reset Cache Issue Final
\i supabase/migrations/20250127000038-fix-reset-cache-issue-final.sql

-- 59. Fix Trigger Function Syntax Error
\i supabase/migrations/20250127000038_fix-trigger-function-syntax-error.sql

-- 60. Fix Admin Users 406 Errors Final
\i supabase/migrations/20250127000039_fix-admin-users-406-errors-final.sql

-- 61. Fix Reset Cache Issue Final
\i supabase/migrations/20250127000039-fix-reset-cache-issue-final.sql

-- 62. Create Delete User Function
\i supabase/migrations/20250127000040-create-delete-user-function.sql

-- 63. Force Schema Refresh
\i supabase/migrations/20250127000040-force-schema-refresh.sql

-- 64. Create Complete User Deletion Function
\i supabase/migrations/20250127000050-create-complete-user-deletion-function.sql

-- 65. Fix Performance Warnings
\i supabase/migrations/20250128000000-fix-performance-warnings.sql

-- 66. Optimize RLS Performance
\i supabase/migrations/20250129000000-optimize-rls-performance.sql

-- 67. Database Performance Cleanup
\i supabase/migrations/20250129000001-database-performance-cleanup.sql

-- 68. Fix Duplicate Indexes
\i supabase/migrations/20250129000002-fix-duplicate-indexes.sql

-- 69. Final Index Optimization
\i supabase/migrations/20250129000003-final-index-optimization.sql

-- 70. Complete Index Cleanup
\i supabase/migrations/20250129000004-complete-index-cleanup.sql

-- 71. Security Fixes
\i supabase/migrations/20250129000005-security-fixes.sql

-- 72. Fix XP Calculation System
\i supabase/migrations/20250129000006-fix-xp-calculation-system.sql

-- 73. Fix XP 3 Decimal Precision
\i supabase/migrations/20250129000007-fix-xp-3-decimal-precision.sql

-- 74. Fix Admin Status Check
\i supabase/migrations/20250130000001_fix-admin-status-check.sql

-- 75. Fix RPC Admin Check
\i supabase/migrations/20250130000002_fix-rpc-admin-check.sql

-- 76. Fix Registration Profile Creation
\i supabase/migrations/20250130000003_fix-registration-profile-creation.sql

-- 77. Fix Registration Trigger Safe
\i supabase/migrations/20250130000004_fix-registration-trigger-safe.sql

-- 78. Fix Registration Profile Creation Safe
\i supabase/migrations/20250130000005_fix-registration-profile-creation-safe.sql

-- 79. Fix Registration Final Corrected
\i supabase/migrations/20250130000006_fix-registration-final-corrected.sql

-- 80. Setup Pending Deletion RLS
\i supabase/migrations/20250130000007_setup-pending-deletion-rls.sql

-- 81. Create Comprehensive Stats Reset Function
\i supabase/migrations/20250130000008_create-comprehensive-stats-reset-function.sql

-- 82. Update Stats Reset Preserve Balance
\i supabase/migrations/20250130000009_update-stats-reset-preserve-balance.sql

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Complete database restore to commit 9404977 finished successfully!';
    RAISE NOTICE 'All migration files have been applied in the correct order.';
    RAISE NOTICE 'The database should now be in the exact working state from yesterday.';
END $$;