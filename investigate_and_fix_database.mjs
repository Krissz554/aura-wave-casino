import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hqdbdczxottbupwbupdu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZGJkY3p4b3R0YnVwd2J1cGR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzExNTYyNCwiZXhwIjoyMDY4NjkxNjI0fQ.fzwVymJQjZO_fL4s82U3nlR3lSk8KHoA2weHmOqpYDw';

console.log('🔍 Starting comprehensive database investigation...');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function investigateDatabase() {
  try {
    console.log('\n🔍 === INVESTIGATING ALL FUNCTIONS ===');
    
    // Get all functions that might be problematic
    const { data: functions, error: funcError } = await supabase
      .from('pg_proc')
      .select(`
        proname,
        prosrc,
        pronamespace,
        prorettype,
        proargtypes,
        pg_namespace!inner(nspname)
      `)
      .ilike('proname', '%complete_roulette%')
      .or('proname.ilike.%add_xp%');

    if (funcError) {
      console.error('❌ Error querying functions:', funcError);
      
      // Try alternative approach using RPC
      console.log('🔄 Trying RPC approach to investigate functions...');
      
      const investigationSQL = `
        SELECT 
          n.nspname as schema_name,
          p.proname as function_name,
          pg_get_function_arguments(p.oid) as arguments,
          pg_get_function_result(p.oid) as return_type,
          LENGTH(p.prosrc) as source_length,
          LEFT(p.prosrc, 500) as source_preview
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE (p.proname LIKE '%complete_roulette%' OR p.proname LIKE '%add_xp%')
        ORDER BY n.nspname, p.proname;
      `;
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc('exec_sql', {
        sql_query: investigationSQL
      });
      
      if (rpcError) {
        console.error('❌ RPC investigation failed:', rpcError);
        console.log('📋 Manual investigation required - creating direct fix...');
        await createDirectFix();
        return;
      }
      
      console.log('✅ RPC Investigation Results:', rpcResult);
    } else {
      console.log('✅ Function investigation results:', functions);
    }
    
    // Test our current function
    console.log('\n🧪 === TESTING CURRENT FUNCTION ===');
    await testCurrentFunction();
    
    // Create final fix
    console.log('\n🛠️ === CREATING FINAL FIX ===');
    await createDirectFix();
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
    console.log('🚨 Creating emergency fix...');
    await createDirectFix();
  }
}

async function testCurrentFunction() {
  try {
    // Test if our function exists and works
    const { data: testResult, error: testError } = await supabase.rpc('roulette_round_processor_final', {
      p_round_id: '00000000-0000-0000-0000-000000000000' // Dummy UUID for testing
    });
    
    if (testError) {
      console.log('❌ roulette_round_processor_final test failed:', testError);
    } else {
      console.log('✅ roulette_round_processor_final exists and responds:', testResult);
    }
    
    // Test wrapper function
    const { data: wrapperResult, error: wrapperError } = await supabase.rpc('complete_roulette_round', {
      p_round_id: '00000000-0000-0000-0000-000000000000' // Dummy UUID for testing
    });
    
    if (wrapperError) {
      console.log('❌ complete_roulette_round test failed:', wrapperError);
    } else {
      console.log('✅ complete_roulette_round exists and responds:', wrapperResult);
    }
    
  } catch (error) {
    console.error('❌ Function testing failed:', error);
  }
}

async function createDirectFix() {
  console.log('🔧 Creating direct database fix...');
  
  const fixSQL = `
-- FINAL EMERGENCY FIX: Create working function with different approach
BEGIN;

-- Drop ALL possible problematic functions again
DO $$
DECLARE
  func_record RECORD;
  drop_sql TEXT;
BEGIN
  -- Dynamic drop of any function containing these names
  FOR func_record IN
    SELECT DISTINCT
      n.nspname as schema_name,
      p.proname as function_name,
      p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE (p.proname LIKE '%complete_roulette%' OR p.proname LIKE '%add_xp%')
  LOOP
    BEGIN
      drop_sql := format('DROP FUNCTION %I.%I CASCADE', 
                        func_record.schema_name, 
                        func_record.function_name);
      EXECUTE drop_sql;
      RAISE NOTICE 'Dropped function: %', drop_sql;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop %: %', func_record.function_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Create the FINAL working function with a completely different name
CREATE OR REPLACE FUNCTION public.execute_roulette_completion(
  round_uuid UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  round_color TEXT;
  round_slot INTEGER;
  bet_count INTEGER := 0;
  winner_count INTEGER := 0;
  total_xp NUMERIC := 0;
  bet_row RECORD;
  winner_flag BOOLEAN;
  payout_amount NUMERIC;
  profit_amount NUMERIC;
  xp_to_award NUMERIC;
BEGIN
  RAISE NOTICE '[EMERGENCY FIX] Processing round completion: %', round_uuid;
  
  -- Get round result
  SELECT result_color, result_slot 
  INTO round_color, round_slot
  FROM roulette_rounds 
  WHERE id = round_uuid;
  
  IF round_color IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Round not found',
      'version', 'emergency_fix_final'
    );
  END IF;
  
  RAISE NOTICE '[EMERGENCY FIX] Round result: % %', round_color, round_slot;
  
  -- Process each bet
  FOR bet_row IN 
    SELECT * FROM roulette_bets WHERE round_id = round_uuid
  LOOP
    bet_count := bet_count + 1;
    
    -- Check if bet won
    winner_flag := (bet_row.bet_color = round_color);
    
    IF winner_flag THEN
      payout_amount := bet_row.potential_payout;
      profit_amount := payout_amount - bet_row.bet_amount;
      winner_count := winner_count + 1;
      
      -- Pay winner
      UPDATE profiles 
      SET balance = balance + payout_amount
      WHERE id = bet_row.user_id;
      
      RAISE NOTICE '[EMERGENCY FIX] Paid winner % amount %', bet_row.user_id, payout_amount;
    ELSE
      payout_amount := 0;
      profit_amount := -bet_row.bet_amount;
      RAISE NOTICE '[EMERGENCY FIX] Bet lost: %', bet_row.bet_amount;
    END IF;
    
    -- Update bet record
    UPDATE roulette_bets 
    SET 
      actual_payout = payout_amount,
      is_winner = winner_flag,
      profit = profit_amount
    WHERE id = bet_row.id;
    
    -- Award XP (10% of bet)
    xp_to_award := bet_row.bet_amount * 0.1;
    total_xp := total_xp + xp_to_award;
    
    RAISE NOTICE '[EMERGENCY FIX] Awarding % XP to user %', xp_to_award, bet_row.user_id;
    
    -- Update user stats (comprehensive)
    INSERT INTO user_level_stats (
      user_id, 
      lifetime_xp,
      roulette_games,
      roulette_wagered,
      roulette_profit,
      total_games,
      total_wagered,
      total_profit,
      current_level,
      current_level_xp,
      xp_to_next_level,
      updated_at
    ) VALUES (
      bet_row.user_id,
      xp_to_award,
      1,
      bet_row.bet_amount,
      profit_amount,
      1,
      bet_row.bet_amount,
      profit_amount,
      1,
      xp_to_award,
      651,
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      lifetime_xp = user_level_stats.lifetime_xp + xp_to_award,
      roulette_games = user_level_stats.roulette_games + 1,
      roulette_wagered = user_level_stats.roulette_wagered + bet_row.bet_amount,
      roulette_profit = user_level_stats.roulette_profit + profit_amount,
      total_games = user_level_stats.total_games + 1,
      total_wagered = user_level_stats.total_wagered + bet_row.bet_amount,
      total_profit = user_level_stats.total_profit + profit_amount,
      updated_at = NOW();
    
    -- Update level (simple calculation)
    UPDATE user_level_stats 
    SET 
      current_level = GREATEST(1, (lifetime_xp / 651)::INTEGER + 1),
      current_level_xp = lifetime_xp % 651,
      xp_to_next_level = 651 - (lifetime_xp % 651)
    WHERE user_id = bet_row.user_id;
    
    -- Add to game history
    INSERT INTO game_history (
      user_id, game_type, bet_amount, result, profit, created_at
    ) VALUES (
      bet_row.user_id, 'roulette', bet_row.bet_amount,
      CASE WHEN winner_flag THEN 'win' ELSE 'loss' END,
      profit_amount, NOW()
    );
  END LOOP;
  
  -- Mark round complete
  UPDATE roulette_rounds SET status = 'completed' WHERE id = round_uuid;
  
  RAISE NOTICE '[EMERGENCY FIX] Completed: % bets, % winners, % XP total', 
    bet_count, winner_count, total_xp;
  
  RETURN jsonb_build_object(
    'success', true,
    'bets_processed', bet_count,
    'winners_processed', winner_count,
    'xp_awarded', total_xp,
    'result_color', round_color,
    'result_slot', round_slot,
    'version', 'emergency_fix_working'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[EMERGENCY FIX] Error: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'version', 'emergency_fix_working'
    );
END;
$$;

-- Create wrapper with expected name
CREATE OR REPLACE FUNCTION public.complete_roulette_round(p_round_id UUID)
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT public.execute_roulette_completion(p_round_id);
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.execute_roulette_completion(UUID) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_roulette_round(UUID) TO postgres, anon, authenticated, service_role;

COMMIT;

SELECT 'EMERGENCY FIX DEPLOYED' as status;
  `;
  
  // Write fix to file for manual execution
  console.log('📝 Writing emergency fix SQL to file...');
  
  const fs = await import('fs');
  await fs.promises.writeFile('emergency_database_fix.sql', fixSQL);
  
  console.log('✅ Emergency fix written to emergency_database_fix.sql');
  console.log('🚨 PLEASE RUN THIS FILE IN SUPABASE SQL EDITOR IMMEDIATELY');
  
  return fixSQL;
}

// Run investigation
investigateDatabase().catch(console.error);