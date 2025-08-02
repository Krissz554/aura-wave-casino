# Roulette Fix Guide

## Current Status
The codebase has been reverted but the database still has the previous changes applied, causing a desync. I've fixed the frontend code to match the current database schema and created a migration to ensure all required functions exist.

## Steps to Fix

### 1. Apply the Database Migration
Run this migration in your Supabase dashboard SQL editor:

```sql
-- Copy and paste the contents of: supabase/migrations/20250130000060_fix-frontend-database-sync.sql
```

This migration will:
- Create/update the `ensure_user_level_stats` function
- Create/update the `create_user_profile_manual` function  
- Create/update the `place_roulette_bet` function
- Create/update the `complete_roulette_round` function
- Ensure the `daily_seeds` and `roulette_client_seeds` tables exist
- Add necessary permissions and RLS policies

### 2. Deploy the Edge Function
You need to deploy the updated `roulette-engine` edge function. You can do this by:

**Option A: Using Supabase CLI (if you have access)**
```bash
cd supabase
npx supabase functions deploy roulette-engine
```

**Option B: Manual deployment via Supabase Dashboard**
1. Go to your Supabase dashboard
2. Navigate to Edge Functions
3. Find the `roulette-engine` function
4. Copy the contents of `supabase/functions/roulette-engine/index.ts`
5. Paste and deploy

### 3. Test the Fix
After applying the migration and deploying the edge function:

1. Refresh your application
2. Check the browser console for errors
3. Try to place a roulette bet
4. Verify that active rounds are displayed

## What Was Fixed

### Frontend Changes
- Removed references to `total_wagered` and `total_profit` from the `profiles` table
- Updated `useUserProfile.ts` to match the current database schema
- Fixed the `UserProfile` interface to remove non-existent columns

### Database Functions
- **`ensure_user_level_stats`**: Creates user level stats if they don't exist
- **`create_user_profile_manual`**: Creates user profiles if they don't exist
- **`place_roulette_bet`**: Handles bet placement with balance validation
- **`complete_roulette_round`**: Processes round completion and awards XP/stats

### Provably Fair System
- Maintained all provably fair features
- Daily seeds system for enhanced security
- Client seed management
- Round verification capabilities

## Expected Behavior After Fix

1. **User Profiles**: Should load without errors about missing columns
2. **Active Rounds**: Should display current betting/spinning rounds
3. **Bet Placement**: Should work without function not found errors
4. **XP/Stats**: Should be awarded when rounds complete (not when bets are placed)
5. **Provably Fair**: All verification features should work

## If Issues Persist

If you still see errors after applying these fixes:

1. Check the browser console for specific error messages
2. Verify the migration was applied successfully in Supabase
3. Confirm the edge function was deployed
4. Check if there are any remaining database schema mismatches

The key issue was that the frontend code was reverted but the database still had the updated schema, causing a mismatch. This fix aligns both the frontend and database to work together properly.