# XP Live Update Debugging Guide

## 🔍 STEP-BY-STEP DEBUGGING

### 1. **First - Verify Database Functions Are Deployed**
Run this in Supabase Dashboard SQL Editor:
```sql
-- Test if our XP functions exist and work
SELECT public.calculate_xp_from_bet(10.00) as ten_dollar_bet_xp;
SELECT public.calculate_xp_from_bet(1.00) as one_dollar_bet_xp;
SELECT public.calculate_xp_from_bet(0.10) as ten_cent_bet_xp;
```

**Expected Results:**
- $10 bet = 1.000 XP
- $1 bet = 0.100 XP  
- $0.10 bet = 0.010 XP

### 2. **Check if Game History Trigger Exists**
```sql
-- Verify the trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'game_history_trigger';
```

### 3. **Test Manual XP Addition**
```sql
-- Get your user ID first
SELECT id, username, lifetime_xp FROM profiles WHERE username = 'YOUR_USERNAME';

-- Manually add XP to test the function
SELECT * FROM public.add_xp_and_check_levelup('YOUR_USER_ID'::uuid, 1.000);

-- Check if it updated
SELECT id, username, lifetime_xp, current_xp FROM profiles WHERE username = 'YOUR_USERNAME';
```

### 4. **Check Real-Time Subscriptions**
Open browser console and look for these logs:
- `📊 Setting up enhanced XP tracking subscription`
- `📊 LIVE XP UPDATE RECEIVED:`
- `🎯 HEADER: userLevelStats updated:`

### 5. **Test Game Completion**
Place a small bet and check console for:
- `🎯 BET CONFIRMED: Forcing comprehensive XP refresh`
- `🔄 XP SYNC: Force refreshing all XP data sources`
- `✅ XP SYNC: All data sources refreshed successfully`

## 🚨 **LIKELY ISSUES & FIXES**

### Issue 1: Database Functions Not Deployed
**Fix:** Run `COMPREHENSIVE_XP_SYSTEM_FIX.sql` in Supabase Dashboard

### Issue 2: Game History Not Inserting
**Check:** Look for game_history inserts in Supabase Dashboard > Table Editor

### Issue 3: Subscriptions Not Triggering  
**Check:** Real-time logs in Supabase Dashboard > Database > Realtime

### Issue 4: XP Functions Have Errors
**Check:** Supabase Dashboard > Database > Functions for any error indicators

## 🔧 **QUICK FIX TEST**

If nothing works, try this manual test:
1. Open browser console
2. Place a bet
3. Manually run: `window.location.reload()` 
4. Check if XP increased by correct amount

If XP increased after refresh = Database functions work, subscription issue
If XP didn't increase = Database functions not working