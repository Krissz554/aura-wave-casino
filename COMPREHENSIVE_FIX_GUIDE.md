# 🎰 COMPREHENSIVE ROULETTE FIX GUIDE

## 🚨 CURRENT ISSUES IDENTIFIED & FIXED

### 1. ✅ Frontend-Database Schema Mismatch (FIXED)
**Problem**: Frontend code was trying to access `total_wagered` and `total_profit` columns from `profiles` table that no longer exist.

**Files Fixed**:
- `src/components/RouletteGame.tsx` - Removed `total_wagered` references
- `src/components/UserProfile.tsx` - Removed `total_wagered` from profiles query
- `src/components/AdminPanel.tsx` - Updated to get `total_wagered` from `user_level_stats`
- `src/components/UserStatsModal.tsx` - Removed fallback to `profile.total_wagered`

### 2. ✅ Database Functions (SHOULD EXIST)
**Status**: The migration `20250130000060_fix-frontend-database-sync.sql` contains all required functions:
- `public.ensure_user_level_stats(user_uuid UUID)`
- `public.create_user_profile_manual(user_id UUID, username TEXT)`
- `public.place_roulette_bet(p_user_id UUID, p_round_id UUID, p_bet_color TEXT, p_bet_amount DECIMAL)`
- `public.complete_roulette_round(p_round_id UUID)`
- `daily_seeds` and `roulette_client_seeds` tables

### 3. 🔧 Edge Function Deployment (REQUIRED)
**Problem**: The `roulette-engine` edge function is causing 500 errors because it's outdated.

## 🛠️ IMMEDIATE ACTION REQUIRED

### Step 1: Deploy the Updated Edge Function
```bash
# Login to Supabase (if not already logged in)
npx supabase login

# Deploy the roulette-engine function
npx supabase functions deploy roulette-engine
```

### Step 2: Verify Database Functions Exist
Run this SQL query in your Supabase SQL editor to verify all functions exist:

```sql
-- Check if required functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'ensure_user_level_stats',
    'create_user_profile_manual', 
    'place_roulette_bet',
    'complete_roulette_round'
  );
```

### Step 3: Apply Migration if Not Already Applied
If any functions are missing, run this migration:

```sql
-- This is the content of 20250130000060_fix-frontend-database-sync.sql
-- Run this in your Supabase SQL editor

-- 1. Ensure user_level_stats function exists
CREATE OR REPLACE FUNCTION public.ensure_user_level_stats(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_exists BOOLEAN;
    stats_record RECORD;
    result JSON;
BEGIN
    -- Check if user exists in auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_uuid) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User does not exist in auth.users table'
        );
    END IF;

    -- Check if user_level_stats record exists
    SELECT * INTO stats_record 
    FROM user_level_stats 
    WHERE user_id = user_uuid;

    -- If record doesn't exist, create it
    IF NOT FOUND THEN
        INSERT INTO user_level_stats (
            user_id,
            current_level,
            current_level_xp,
            lifetime_xp,
            xp_to_next_level,
            border_tier,
            coinflip_games,
            coinflip_wins,
            coinflip_profit,
            crash_games,
            crash_wins,
            crash_profit,
            roulette_games,
            roulette_wins,
            roulette_profit,
            tower_games,
            tower_wins,
            tower_profit
        ) VALUES (
            user_uuid,
            1, -- current_level
            0, -- current_level_xp
            0, -- lifetime_xp
            100, -- xp_to_next_level
            1, -- border_tier
            0, -- coinflip_games
            0, -- coinflip_wins
            0, -- coinflip_profit
            0, -- crash_games
            0, -- crash_wins
            0, -- crash_profit
            0, -- roulette_games
            0, -- roulette_wins
            0, -- roulette_profit
            0, -- tower_games
            0, -- tower_wins
            0  -- tower_profit
        );
        
        RETURN json_build_object(
            'success', true,
            'action', 'created',
            'user_id', user_uuid
        );
    ELSE
        RETURN json_build_object(
            'success', true,
            'action', 'exists',
            'user_id', user_uuid
        );
    END IF;
END;
$$;

-- 2. Ensure create_user_profile_manual function exists
CREATE OR REPLACE FUNCTION public.create_user_profile_manual(user_id UUID, username TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_exists BOOLEAN;
    profile_exists BOOLEAN;
    result JSON;
BEGIN
    -- Check if user exists in auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) INTO user_exists;
    
    IF NOT user_exists THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User does not exist in auth.users table'
        );
    END IF;

    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id) INTO profile_exists;
    
    IF profile_exists THEN
        RETURN json_build_object(
            'success', true,
            'action', 'exists',
            'user_id', user_id
        );
    END IF;

    -- Create profile
    INSERT INTO profiles (
        id,
        username,
        balance,
        registration_date,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        username,
        1000.00, -- Starting balance
        NOW(),
        NOW(),
        NOW()
    );

    RETURN json_build_object(
        'success', true,
        'action', 'created',
        'user_id', user_id,
        'username', username
    );
END;
$$;

-- 3. Create daily_seeds table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.daily_seeds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    server_seed TEXT NOT NULL,
    server_seed_hash TEXT NOT NULL,
    lotto TEXT NOT NULL,
    lotto_hash TEXT NOT NULL,
    is_revealed BOOLEAN DEFAULT FALSE,
    revealed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create roulette_client_seeds table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.roulette_client_seeds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_seed TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_daily_seeds_date ON public.daily_seeds(date);
CREATE INDEX IF NOT EXISTS idx_roulette_client_seeds_user_active ON public.roulette_client_seeds(user_id, is_active);

-- 6. Ensure place_roulette_bet function exists
CREATE OR REPLACE FUNCTION public.place_roulette_bet(
    p_user_id UUID,
    p_round_id UUID,
    p_bet_color TEXT,
    p_bet_amount DECIMAL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_balance DECIMAL;
    round_status TEXT;
    bet_id UUID;
    potential_payout DECIMAL;
    balance_deducted DECIMAL;
BEGIN
    -- Check if user exists and get balance
    SELECT balance INTO user_balance
    FROM profiles
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User profile not found'
        );
    END IF;

    -- Check if round exists and is in betting phase
    SELECT status INTO round_status
    FROM roulette_rounds
    WHERE id = p_round_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Round not found'
        );
    END IF;

    IF round_status != 'betting' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Round is not in betting phase'
        );
    END IF;

    -- Validate bet amount
    IF p_bet_amount <= 0 OR p_bet_amount > user_balance THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid bet amount'
        );
    END IF;

    -- Calculate potential payout based on color
    CASE p_bet_color
        WHEN 'green' THEN potential_payout := p_bet_amount * 14;
        WHEN 'red', 'black' THEN potential_payout := p_bet_amount * 2;
        ELSE
            RETURN json_build_object(
                'success', false,
                'error', 'Invalid bet color'
            );
    END CASE;

    -- Deduct balance and create bet
    UPDATE profiles
    SET balance = balance - p_bet_amount
    WHERE id = p_user_id;

    GET DIAGNOSTICS balance_deducted = ROW_COUNT;
    
    IF balance_deducted = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to deduct balance'
        );
    END IF;

    -- Insert bet
    INSERT INTO roulette_bets (
        user_id,
        round_id,
        bet_color,
        bet_amount,
        potential_payout,
        created_at
    ) VALUES (
        p_user_id,
        p_round_id,
        p_bet_color,
        p_bet_amount,
        potential_payout,
        NOW()
    ) RETURNING id INTO bet_id;

    RETURN json_build_object(
        'success', true,
        'bet_id', bet_id,
        'balance_deducted', p_bet_amount,
        'potential_payout', potential_payout
    );
END;
$$;

-- 7. Ensure complete_roulette_round function exists
CREATE OR REPLACE FUNCTION public.complete_roulette_round(p_round_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    round_record RECORD;
    bet_record RECORD;
    xp_awarded INTEGER := 0;
    bets_processed INTEGER := 0;
    winners_processed INTEGER := 0;
    total_wagered DECIMAL := 0;
BEGIN
    -- Get round details
    SELECT * INTO round_record
    FROM roulette_rounds
    WHERE id = p_round_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Round not found'
        );
    END IF;

    IF round_record.status != 'spinning' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Round is not in spinning phase'
        );
    END IF;

    -- Process all bets for this round
    FOR bet_record IN 
        SELECT * FROM roulette_bets WHERE round_id = p_round_id
    LOOP
        bets_processed := bets_processed + 1;
        total_wagered := total_wagered + bet_record.bet_amount;
        
        -- Determine if bet is a winner
        IF bet_record.bet_color = round_record.result_color THEN
            -- Winner - add profit to balance
            UPDATE profiles
            SET balance = balance + bet_record.potential_payout
            WHERE id = bet_record.user_id;
            
            -- Update bet as winner
            UPDATE roulette_bets
            SET 
                is_winner = TRUE,
                profit = bet_record.potential_payout - bet_record.bet_amount
            WHERE id = bet_record.id;
            
            winners_processed := winners_processed + 1;
        ELSE
            -- Loser - update bet as loser
            UPDATE roulette_bets
            SET 
                is_winner = FALSE,
                profit = -bet_record.bet_amount
            WHERE id = bet_record.id;
        END IF;
        
        -- Award XP for wagering (only for the wager amount, not profit)
        xp_awarded := xp_awarded + FLOOR(bet_record.bet_amount);
    END LOOP;

    -- Update user_level_stats for all users who bet in this round
    INSERT INTO user_level_stats (
        user_id,
        roulette_games,
        roulette_wins,
        roulette_profit,
        lifetime_xp
    )
    SELECT 
        rb.user_id,
        1, -- games played
        CASE WHEN rb.is_winner THEN 1 ELSE 0 END, -- wins
        rb.profit, -- profit
        FLOOR(rb.bet_amount) -- XP for wagering
    FROM roulette_bets rb
    WHERE rb.round_id = p_round_id
    ON CONFLICT (user_id) DO UPDATE SET
        roulette_games = user_level_stats.roulette_games + 1,
        roulette_wins = user_level_stats.roulette_wins + EXCLUDED.roulette_wins,
        roulette_profit = user_level_stats.roulette_profit + EXCLUDED.roulette_profit,
        lifetime_xp = user_level_stats.lifetime_xp + EXCLUDED.lifetime_xp,
        updated_at = NOW();

    -- Update round status to completed
    UPDATE roulette_rounds
    SET 
        status = 'completed',
        completed_at = NOW()
    WHERE id = p_round_id;

    RETURN json_build_object(
        'success', true,
        'bets_processed', bets_processed,
        'winners_processed', winners_processed,
        'xp_awarded', xp_awarded,
        'total_wagered', total_wagered
    );
END;
$$;

-- 8. Add RLS policies if they don't exist
ALTER TABLE public.daily_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roulette_client_seeds ENABLE ROW LEVEL SECURITY;

-- Allow users to read daily seeds (for verification)
CREATE POLICY IF NOT EXISTS "Users can read daily seeds" ON public.daily_seeds
    FOR SELECT USING (true);

-- Allow users to manage their own client seeds
CREATE POLICY IF NOT EXISTS "Users can manage their own client seeds" ON public.roulette_client_seeds
    FOR ALL USING (auth.uid() = user_id);

-- 9. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.ensure_user_level_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile_manual(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_roulette_bet(UUID, UUID, TEXT, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_roulette_round(UUID) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.daily_seeds TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.roulette_client_seeds TO authenticated;
```

## 🎯 EXPECTED RESULTS AFTER FIXES

### ✅ What Should Work:
1. **No more "column profiles.total_wagered does not exist" errors**
2. **No more "404 Not Found" errors for ensure_user_level_stats and create_user_profile_manual**
3. **Roulette game should show active rounds**
4. **Bet placement should work without 500 errors**
5. **XP and stats should be tracked correctly in user_level_stats table**
6. **Provably fair system should be fully functional**

### 🔍 Verification Steps:
1. **Check Console**: No more 400/404 errors related to missing columns or functions
2. **Check Roulette**: Should show "Betting Open" with active round
3. **Check Bet Placement**: Should place bets successfully
4. **Check Stats**: User stats should update correctly after round completion
5. **Check XP**: XP should only be awarded when round completes, not on bet placement

## 🚨 IF ISSUES PERSIST

### Check Edge Function Logs:
```bash
npx supabase functions logs roulette-engine
```

### Check Database Functions:
```sql
-- Verify all functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('ensure_user_level_stats', 'place_roulette_bet', 'complete_roulette_round');
```

### Check Table Structure:
```sql
-- Verify user_level_stats table has correct columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_level_stats' 
  AND table_schema = 'public';
```

## 📞 SUPPORT

If issues persist after following this guide:
1. Check the edge function logs for specific error messages
2. Verify all database functions exist and are accessible
3. Ensure the migration has been applied successfully
4. Check that the frontend code changes have been deployed

The main issue was the frontend-backend-database desync caused by the git revert. This guide addresses all the critical fixes needed to restore full functionality.