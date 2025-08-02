-- SIMPLE ROULETTE STATS FIX
-- This creates the table if missing and fixes the function

-- Step 1: Create user_level_stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_level_stats (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level INTEGER NOT NULL DEFAULT 1,
  lifetime_xp INTEGER NOT NULL DEFAULT 0,
  current_level_xp INTEGER NOT NULL DEFAULT 0,
  xp_to_next_level INTEGER NOT NULL DEFAULT 1000,
  
  -- Overall stats
  total_games INTEGER NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  total_wagered NUMERIC NOT NULL DEFAULT 0,
  total_profit NUMERIC NOT NULL DEFAULT 0,
  biggest_win NUMERIC NOT NULL DEFAULT 0,
  biggest_loss NUMERIC NOT NULL DEFAULT 0,
  
  -- Roulette stats
  roulette_games INTEGER NOT NULL DEFAULT 0,
  roulette_wins INTEGER NOT NULL DEFAULT 0,
  roulette_wagered NUMERIC NOT NULL DEFAULT 0,
  roulette_profit NUMERIC NOT NULL DEFAULT 0,
  roulette_highest_win NUMERIC NOT NULL DEFAULT 0,
  roulette_highest_loss NUMERIC NOT NULL DEFAULT 0,
  roulette_green_wins INTEGER NOT NULL DEFAULT 0,
  roulette_red_wins INTEGER NOT NULL DEFAULT 0,
  roulette_black_wins INTEGER NOT NULL DEFAULT 0,
  roulette_favorite_color TEXT DEFAULT 'none',
  roulette_best_streak INTEGER NOT NULL DEFAULT 0,
  roulette_current_streak INTEGER NOT NULL DEFAULT 0,
  roulette_biggest_bet NUMERIC NOT NULL DEFAULT 0,
  
  -- Other game stats
  coinflip_games INTEGER NOT NULL DEFAULT 0,
  coinflip_wins INTEGER NOT NULL DEFAULT 0,
  coinflip_wagered NUMERIC NOT NULL DEFAULT 0,
  coinflip_profit NUMERIC NOT NULL DEFAULT 0,
  current_coinflip_streak INTEGER NOT NULL DEFAULT 0,
  best_coinflip_streak INTEGER NOT NULL DEFAULT 0,
  
  crash_games INTEGER NOT NULL DEFAULT 0,
  crash_wins INTEGER NOT NULL DEFAULT 0,
  crash_wagered NUMERIC NOT NULL DEFAULT 0,
  crash_profit NUMERIC NOT NULL DEFAULT 0,
  
  tower_games INTEGER NOT NULL DEFAULT 0,
  tower_wins INTEGER NOT NULL DEFAULT 0,
  tower_wagered NUMERIC NOT NULL DEFAULT 0,
  tower_profit NUMERIC NOT NULL DEFAULT 0,
  
  -- Level system
  available_cases INTEGER NOT NULL DEFAULT 0,
  border_tier INTEGER NOT NULL DEFAULT 1,
  border_unlocked_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add any missing columns to existing table
DO $$
BEGIN
  -- Add roulette columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_games') THEN
    ALTER TABLE public.user_level_stats ADD COLUMN roulette_games INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_wins') THEN
    ALTER TABLE public.user_level_stats ADD COLUMN roulette_wins INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_wagered') THEN
    ALTER TABLE public.user_level_stats ADD COLUMN roulette_wagered NUMERIC NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'roulette_profit') THEN
    ALTER TABLE public.user_level_stats ADD COLUMN roulette_profit NUMERIC NOT NULL DEFAULT 0;
  END IF;
  
  -- Add XP columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'lifetime_xp') THEN
    ALTER TABLE public.user_level_stats ADD COLUMN lifetime_xp INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'current_level_xp') THEN
    ALTER TABLE public.user_level_stats ADD COLUMN current_level_xp INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_level_stats' AND column_name = 'xp_to_next_level') THEN
    ALTER TABLE public.user_level_stats ADD COLUMN xp_to_next_level INTEGER NOT NULL DEFAULT 1000;
  END IF;
END $$;

-- Step 3: Set up RLS policies
ALTER TABLE public.user_level_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_level_stats;
DROP POLICY IF EXISTS "Service role can do everything" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_select_policy" ON public.user_level_stats;
DROP POLICY IF EXISTS "user_level_stats_update_policy" ON public.user_level_stats;

-- Create new policies
CREATE POLICY "user_level_stats_select_policy" ON public.user_level_stats
  FOR SELECT USING (true);

CREATE POLICY "user_level_stats_update_policy" ON public.user_level_stats
  FOR ALL USING (true);

-- Step 4: Create a simple, working stats function
DROP FUNCTION IF EXISTS public.update_user_stats_and_level CASCADE;

CREATE OR REPLACE FUNCTION public.update_user_stats_and_level(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount NUMERIC,
  p_result TEXT,
  p_profit NUMERIC,
  p_streak_length INTEGER DEFAULT 0,
  p_winning_color TEXT DEFAULT NULL,
  p_bet_color TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stats RECORD;
  new_xp INTEGER;
  old_level INTEGER;
  new_level INTEGER;
  is_win BOOLEAN;
  v_rows_affected INTEGER;
BEGIN
  -- Determine if this is a win
  is_win := (p_result = 'win' OR p_result = 'cash_out') AND p_profit > 0;
  
  -- Ensure user has stats record
  INSERT INTO public.user_level_stats (user_id) 
  VALUES (p_user_id) 
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current stats
  SELECT * INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  -- Calculate XP and level
  old_level := COALESCE(current_stats.current_level, 1);
  new_xp := COALESCE(current_stats.lifetime_xp, 0) + GREATEST(1, p_bet_amount::INTEGER);
  new_level := GREATEST(1, new_xp / 1000);
  
  -- Update stats
  UPDATE public.user_level_stats 
  SET 
    -- Level data
    current_level = new_level,
    lifetime_xp = new_xp,
    current_level_xp = new_xp % 1000,
    xp_to_next_level = 1000 - (new_xp % 1000),
    
    -- Roulette stats
    roulette_games = CASE WHEN p_game_type = 'roulette' THEN roulette_games + 1 ELSE roulette_games END,
    roulette_wins = CASE WHEN p_game_type = 'roulette' AND is_win THEN roulette_wins + 1 ELSE roulette_wins END,
    roulette_wagered = CASE WHEN p_game_type = 'roulette' THEN roulette_wagered + p_bet_amount ELSE roulette_wagered END,
    roulette_profit = CASE WHEN p_game_type = 'roulette' THEN roulette_profit + p_profit ELSE roulette_profit END,
    
    -- Color-specific wins
    roulette_green_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'green' 
      THEN roulette_green_wins + 1 
      ELSE roulette_green_wins 
    END,
    roulette_red_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'red' 
      THEN roulette_red_wins + 1 
      ELSE roulette_red_wins 
    END,
    roulette_black_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'black' 
      THEN roulette_black_wins + 1 
      ELSE roulette_black_wins 
    END,
    
    -- Overall stats
    total_games = total_games + 1,
    total_wins = CASE WHEN is_win THEN total_wins + 1 ELSE total_wins END,
    total_wagered = total_wagered + p_bet_amount,
    total_profit = total_profit + p_profit,
    
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  -- Insert game history
  INSERT INTO public.game_history (
    user_id, game_type, bet_amount, result, profit, created_at
  ) VALUES (
    p_user_id, p_game_type, p_bet_amount, p_result, p_profit, NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'method', 'simple_stats_update',
    'xp_gained', GREATEST(1, p_bet_amount::INTEGER),
    'leveled_up', new_level > old_level,
    'old_level', old_level,
    'new_level', new_level,
    'rows_affected', v_rows_affected,
    'is_win', is_win
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'method', 'simple_stats_update',
      'error_message', SQLERRM,
      'sql_state', SQLSTATE
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;

-- Step 5: Test the function
DO $$
DECLARE
  test_user_id UUID;
  test_result JSONB;
BEGIN
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    SELECT public.update_user_stats_and_level(
      test_user_id, 'roulette', 10.0, 'win', 5.0, 0, 'red', 'red'
    ) INTO test_result;
    
    RAISE NOTICE 'Test result: %', test_result;
  END IF;
END $$;

SELECT 
  '✅ SIMPLE ROULETTE STATS FIX COMPLETE' as status,
  'Table created, function updated, ready to test roulette bets!' as message;