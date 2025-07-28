# XP System Testing Guide

## How the New XP System Works

**Formula**: `$1 wager = 0.1 XP`

### Examples:
- $0.10 bet = 0.01 XP
- $1.00 bet = 0.10 XP  
- $10.00 bet = 1.00 XP
- $100.00 bet = 10.00 XP

### Level Requirements
The level requirements stay the same as before:
- Level 1 → 2: 1000 XP needed
- Level 2 → 3: 1100 XP needed  
- Level 3 → 4: 1220 XP needed
- And so on...

## What Was Fixed

### 1. **Server-Side Issues Fixed:**
- **Old System**: `NEW.bet_amount::INTEGER` meant $0.50 bet = 0 XP, $1.50 bet = 1 XP
- **New System**: `NEW.bet_amount * 0.1` means $0.50 bet = 0.05 XP, $1.50 bet = 0.15 XP
- **Precision**: Changed `lifetime_xp` from INTEGER to NUMERIC(12,2) for decimal precision
- **Trigger Function**: Updated to use `calculate_xp_from_bet(bet_amount)` helper function

### 2. **Database Functions Updated:**
- `add_xp_and_check_levelup()` - Now accepts NUMERIC XP amounts
- `calculate_xp_from_bet()` - New helper function for bet → XP conversion
- `handle_game_history_insert()` - Updated trigger to use correct XP calculation
- `migrate_existing_user_xp()` - Recalculates all existing user XP based on total_wagered

### 3. **Client-Side Updates:**
- `LevelSyncContext` - Now reads from `profiles` table instead of `user_level_stats`
- Real-time subscriptions - Updated to listen to `profiles` table updates
- Error handling - Better fallbacks for missing data

## Testing Steps

### 1. **Run the SQL Script**
Execute `XP_SYSTEM_FIX.sql` in your Supabase Dashboard SQL Editor.

### 2. **Test XP Calculation**
The script includes a test query that shows:
```sql
SELECT 
  'Testing XP calculation:' as test,
  public.calculate_xp_from_bet(0.10) as xp_from_10_cents,    -- Should be 0.01
  public.calculate_xp_from_bet(1.00) as xp_from_1_dollar,    -- Should be 0.10
  public.calculate_xp_from_bet(10.00) as xp_from_10_dollars,  -- Should be 1.00
  public.calculate_xp_from_bet(100.00) as xp_from_100_dollars; -- Should be 10.00
```

### 3. **Test In-Game**
1. **Small Bets**: Place a $0.25 bet - should get 0.025 XP (instead of 0 XP)
2. **Medium Bets**: Place a $5.50 bet - should get 0.55 XP (instead of 5 XP)  
3. **Large Bets**: Place a $20.00 bet - should get 2.00 XP (instead of 20 XP)

### 4. **Verify Migration**
Check that existing users' XP was recalculated:
```sql
SELECT 
  username,
  total_wagered,
  lifetime_xp,
  current_level,
  (total_wagered * 0.1) as expected_xp
FROM profiles 
WHERE total_wagered > 0
ORDER BY total_wagered DESC
LIMIT 10;
```

### 5. **Check Level Progress Display**
- Verify XP progress bars show correct values
- Confirm level-up notifications work properly
- Test that real-time updates work when other users level up

## Migration Impact

### **Existing Users**
- All users' XP has been recalculated based on their `total_wagered * 0.1`
- Some users may have **lower levels** now (because XP requirement per $ is higher)
- Some users may have **higher levels** (if they had very small previous XP due to the integer casting bug)

### **Case Rewards**
- Level-based case rewards (every 25 levels) will still work correctly
- Users who drop below a case-earning level will keep their existing cases

### **Border Tiers**
- Border tiers are level-based, so they will update with the new levels

## Expected Results

### **More Balanced Progression**
- **Before**: $1 bet = 1 XP → Level 2 in 1000 bets (extremely fast)
- **After**: $1 bet = 0.1 XP → Level 2 in 10,000 bets (more balanced)

### **Small Bet Support**
- **Before**: $0.50 bet = 0 XP (discouraging small bets)
- **After**: $0.50 bet = 0.05 XP (rewards all betting activity)

### **Decimal Precision**
- XP now tracks with 2 decimal places
- More accurate progression tracking
- Better UX for users with various bet sizes