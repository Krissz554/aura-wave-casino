# Database Restore Instructions

## 🎯 Problem Summary

Your roulette game is showing "no active round" because the database is missing critical functions and tables that were present in the working commit 9404977.

## 🔍 Root Cause Analysis

The issues are:

1. **Missing `ensure_user_level_stats` function** - Causing 404 errors
2. **Missing daily seed system** - Required for provably fair roulette
3. **Missing database functions** - Required for roulette engine to work
4. **Incomplete database schema** - Missing required columns and tables

## 🛠️ Solution: Complete Database Restoration

### Step 1: Run the Comprehensive Database Restore Script

1. **Open your Supabase Dashboard**
2. **Go to SQL Editor**
3. **Copy and paste the entire contents of `COMPREHENSIVE_DATABASE_RESTORE.sql`**
4. **Run the script**

This script will:
- ✅ Create all missing tables (daily_seeds, etc.)
- ✅ Add all missing columns (daily_seed_id, nonce_id, reel_position)
- ✅ Create the `ensure_user_level_stats` function
- ✅ Create daily seed management functions
- ✅ Set up all required indexes and policies
- ✅ Create today's daily seed automatically
- ✅ Reveal any expired seeds

### Step 2: Deploy the Roulette Engine Function

The roulette engine function at commit 9404977 is already correct. You need to deploy it:

```bash
# If you have Supabase CLI installed
supabase functions deploy roulette-engine --project-ref YOUR_PROJECT_REF

# Or use the deployment script
./deploy-roulette-engine.sh
```

### Step 3: Verify the Fix

After running the database script and deploying the function:

1. **Refresh your roulette page**
2. **Check the browser console** - should see no more 404 errors
3. **The roulette should show an active round** instead of "no active round"

## 🔧 What the Script Fixes

### 1. **ensure_user_level_stats Function**
- Creates the missing function that was causing 404 errors
- Properly handles user registration and stats creation
- Returns correct JSON format expected by frontend

### 2. **Daily Seed System**
- Creates the `daily_seeds` table with proper structure
- Adds `daily_seed_id` and `nonce_id` columns to `roulette_rounds`
- Creates functions for seed management
- Auto-creates today's seed if missing

### 3. **Database Schema**
- Ensures all required columns exist
- Creates proper indexes for performance
- Sets up RLS policies correctly
- Adds tables to realtime publication

### 4. **Provably Fair System**
- Restores the complete PLG.BET style provably fair system
- Handles seed revelation properly
- Ensures secure result generation

## 🎮 Expected Result

After running the script:

1. **Roulette page loads properly** with active rounds
2. **No more console errors** about missing functions
3. **Bets can be placed** and processed correctly
4. **Results are generated** using the provably fair system
5. **All games work** as they did in the working commit

## 🚨 Important Notes

- **Backup your database** before running the script (just in case)
- **The script is safe** - it uses `IF NOT EXISTS` and `CREATE OR REPLACE`
- **No data will be lost** - it only adds missing structures
- **All existing data** will be preserved

## 🔍 Verification Steps

After running the script, verify:

1. **Check daily_seeds table exists** and has today's seed
2. **Check roulette_rounds has all columns** (daily_seed_id, nonce_id, reel_position)
3. **Test the ensure_user_level_stats function** in SQL editor
4. **Deploy the roulette engine function** if not already done
5. **Test the roulette game** - should work immediately

## 📞 If Issues Persist

If the roulette still doesn't work after running the script:

1. **Check the browser console** for any remaining errors
2. **Verify the roulette engine function** is deployed correctly
3. **Check the database logs** in Supabase dashboard
4. **Ensure all migrations** from commit 9404977 are applied

The script should restore everything to the exact working state from commit 9404977.