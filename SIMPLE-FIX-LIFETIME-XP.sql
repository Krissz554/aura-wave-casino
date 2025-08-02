-- SIMPLE FIX FOR LIFETIME_XP ERROR
-- Copy and paste this ENTIRE file into Supabase SQL Editor

-- Step 1: Add missing columns (safe - won't fail if they exist)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.user_level_stats ADD COLUMN lifetime_xp INTEGER DEFAULT 0;
    RAISE NOTICE 'Added lifetime_xp column';
  EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'lifetime_xp column already exists';
  END;
  
  BEGIN
    ALTER TABLE public.user_level_stats ADD COLUMN current_level_xp INTEGER DEFAULT 0;
    RAISE NOTICE 'Added current_level_xp column';
  EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'current_level_xp column already exists';
  END;
  
  BEGIN
    ALTER TABLE public.user_level_stats ADD COLUMN xp_to_next_level INTEGER DEFAULT 916;
    RAISE NOTICE 'Added xp_to_next_level column';
  EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'xp_to_next_level column already exists';
  END;
END $$;

-- Step 2: Drop all versions of the function
DROP FUNCTION IF EXISTS public.update_user_stats_and_level CASCADE;

-- Step 3: Create the working function
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
  xp_gained INTEGER;
BEGIN
  RAISE NOTICE 'Stats function called for user: %', p_user_id;
  
  -- Calculate values
  is_win := (p_result = 'win' OR p_result = 'cash_out') AND p_profit > 0;
  xp_gained := GREATEST(1, LEAST(p_bet_amount::INTEGER, 1000));
  
  -- Ensure user record exists
  INSERT INTO public.user_level_stats (user_id) 
  VALUES (p_user_id) 
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current stats
  SELECT 
    COALESCE(current_level, 1) as current_level,
    COALESCE(lifetime_xp, 0) as lifetime_xp,
    COALESCE(roulette_games, 0) as roulette_games,
    COALESCE(roulette_wins, 0) as roulette_wins,
    COALESCE(roulette_wagered, 0) as roulette_wagered,
    COALESCE(roulette_profit, 0) as roulette_profit,
    COALESCE(total_games, 0) as total_games,
    COALESCE(total_wins, 0) as total_wins,
    COALESCE(total_wagered, 0) as total_wagered,
    COALESCE(total_profit, 0) as total_profit
  INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  -- Calculate new values
  old_level := current_stats.current_level;
  new_xp := current_stats.lifetime_xp + xp_gained;
  new_level := GREATEST(1, new_xp / 1000);
  
  -- Update stats
  UPDATE public.user_level_stats 
  SET 
    current_level = new_level,
    lifetime_xp = new_xp,
    current_level_xp = new_xp % 1000,
    xp_to_next_level = 1000 - (new_xp % 1000),
    roulette_games = CASE WHEN p_game_type = 'roulette' THEN current_stats.roulette_games + 1 ELSE current_stats.roulette_games END,
    roulette_wins = CASE WHEN p_game_type = 'roulette' AND is_win THEN current_stats.roulette_wins + 1 ELSE current_stats.roulette_wins END,
    roulette_wagered = CASE WHEN p_game_type = 'roulette' THEN current_stats.roulette_wagered + p_bet_amount ELSE current_stats.roulette_wagered END,
    roulette_profit = CASE WHEN p_game_type = 'roulette' THEN current_stats.roulette_profit + p_profit ELSE current_stats.roulette_profit END,
    total_games = current_stats.total_games + 1,
    total_wins = CASE WHEN is_win THEN current_stats.total_wins + 1 ELSE current_stats.total_wins END,
    total_wagered = current_stats.total_wagered + p_bet_amount,
    total_profit = current_stats.total_profit + p_profit,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Add to game history
  INSERT INTO public.game_history (user_id, game_type, bet_amount, result, profit, created_at) 
  VALUES (p_user_id, p_game_type, p_bet_amount, p_result, p_profit, NOW());
  
  RAISE NOTICE 'Stats updated successfully for user: %', p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'leveled_up', new_level > old_level,
    'old_level', old_level,
    'new_level', new_level,
    'xp_gained', xp_gained
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in stats function: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error_message', SQLERRM
    );
END;
$$;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER, TEXT, TEXT) TO anon;

-- Step 5: Test the function
DO $$
DECLARE
  test_user_id UUID;
  test_result JSONB;
BEGIN
  SELECT user_id INTO test_user_id FROM public.user_level_stats LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE 'Testing function with user: %', test_user_id;
    
    SELECT public.update_user_stats_and_level(
      test_user_id, 'roulette', 1.0, 'win', 1.0, 0, 'red', 'red'
    ) INTO test_result;
    
    IF (test_result->>'success')::BOOLEAN THEN
      RAISE NOTICE 'SUCCESS! Function working correctly';
    ELSE
      RAISE NOTICE 'TEST FAILED: %', test_result->>'error_message';
    END IF;
  END IF;
END $$;

-- Final verification
SELECT 'FIX COMPLETE - Function should now work' as status;