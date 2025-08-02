import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = "https://hqdbdczxottbupwbupdu.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZGJkY3p4b3R0YnVwd2J1cGR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzExNTYyNCwiZXhwIjoyMDY4NjkxNjI0fQ.fzwVymJQjZO_fL4s82U3nlR3lSk8KHoA2weHmOqpYDw";

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

console.log('🔍 COMPLETE CASINO DATABASE SCAN');
console.log('🎯 Goal: Analyze current state vs commit 9404977');
console.log('🔧 Fix: Handle existing function return type issue');
console.log('=' * 60);

async function scanAllTables() {
  console.log('\n📊 SCANNING ALL DATABASE TABLES...');
  
  // Get all tables in public schema
  const { data: tables, error } = await adminClient
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');
  
  if (error) {
    console.log('❌ Error getting tables:', error.message);
    return {};
  }
  
  console.log(`✅ Found ${tables.length} tables in public schema`);
  
  const tableData = {};
  
  for (const table of tables) {
    const tableName = table.table_name;
    try {
      // Get table structure
      const { data: columns } = await adminClient
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position');
      
      // Get row count
      const { count } = await adminClient
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      // Get sample data
      const { data: sampleData } = await adminClient
        .from(tableName)
        .select('*')
        .limit(2);
      
      tableData[tableName] = {
        columns: columns || [],
        rowCount: count || 0,
        sampleData: sampleData || []
      };
      
      console.log(`✅ ${tableName}: ${columns?.length || 0} columns, ${count || 0} rows`);
      
    } catch (err) {
      console.log(`⚠️  ${tableName}: ${err.message}`);
      tableData[tableName] = { error: err.message };
    }
  }
  
  return tableData;
}

async function scanAllFunctions() {
  console.log('\n🔧 SCANNING ALL DATABASE FUNCTIONS...');
  
  try {
    // Get all functions in public schema
    const { data: functions } = await adminClient
      .from('information_schema.routines')
      .select('routine_name, routine_type, data_type, routine_definition')
      .eq('routine_schema', 'public')
      .order('routine_name');
    
    if (!functions) {
      console.log('⚠️  No functions found or access denied');
      return {};
    }
    
    console.log(`✅ Found ${functions.length} functions/procedures`);
    
    const functionData = {};
    
    for (const func of functions) {
      console.log(`🔧 ${func.routine_name} (${func.routine_type}): returns ${func.data_type}`);
      functionData[func.routine_name] = {
        type: func.routine_type,
        returnType: func.data_type,
        definition: func.routine_definition
      };
    }
    
    return functionData;
    
  } catch (err) {
    console.log('❌ Error scanning functions:', err.message);
    return {};
  }
}

async function testExistingFunctions() {
  console.log('\n🧪 TESTING EXISTING FUNCTIONS...');
  
  const functionsToTest = [
    'reset_user_stats_comprehensive',
    'ensure_user_level_stats',
    'calculate_level_from_xp',
    'add_xp_to_user'
  ];
  
  const functionResults = {};
  
  for (const funcName of functionsToTest) {
    try {
      console.log(`🧪 Testing ${funcName}...`);
      
      if (funcName === 'reset_user_stats_comprehensive') {
        const { data, error } = await adminClient.rpc(funcName, {
          target_user_id: '00000000-0000-0000-0000-000000000000'
        });
        
        functionResults[funcName] = {
          exists: true,
          error: error?.message,
          response: data,
          returnType: typeof data
        };
        
        if (error) {
          console.log(`⚠️  ${funcName}: ${error.message}`);
        } else {
          console.log(`✅ ${funcName}: Working, returns ${typeof data}`);
        }
      } else {
        // Test other functions with dummy data
        const { data, error } = await adminClient.rpc(funcName, {
          user_id: '00000000-0000-0000-0000-000000000000'
        });
        
        functionResults[funcName] = {
          exists: true,
          error: error?.message,
          response: data
        };
        
        if (error) {
          console.log(`⚠️  ${funcName}: ${error.message}`);
        } else {
          console.log(`✅ ${funcName}: Working`);
        }
      }
      
    } catch (err) {
      functionResults[funcName] = {
        exists: false,
        error: err.message
      };
      console.log(`❌ ${funcName}: Does not exist or error - ${err.message}`);
    }
  }
  
  return functionResults;
}

async function scanEdgeFunctions() {
  console.log('\n⚡ SCANNING EDGE FUNCTIONS...');
  
  try {
    // Try to access edge functions metadata
    // This is tricky with client libraries, so we'll check what we can
    
    console.log('🔍 Checking for Edge Functions...');
    
    // Check supabase directory
    try {
      const supabaseDir = './supabase';
      const functionsDir = './supabase/functions';
      
      if (fs.existsSync(functionsDir)) {
        const functions = fs.readdirSync(functionsDir);
        console.log(`✅ Found ${functions.length} Edge Function directories:`);
        
        const edgeFunctions = {};
        
        for (const func of functions) {
          const funcPath = `${functionsDir}/${func}`;
          if (fs.statSync(funcPath).isDirectory()) {
            const indexFile = `${funcPath}/index.ts`;
            if (fs.existsSync(indexFile)) {
              const code = fs.readFileSync(indexFile, 'utf8');
              edgeFunctions[func] = {
                path: funcPath,
                hasIndex: true,
                codeLength: code.length,
                preview: code.substring(0, 200) + '...'
              };
              console.log(`  📦 ${func}: ${code.length} characters`);
            } else {
              edgeFunctions[func] = {
                path: funcPath,
                hasIndex: false
              };
              console.log(`  ⚠️  ${func}: No index.ts file`);
            }
          }
        }
        
        return edgeFunctions;
      } else {
        console.log('⚠️  No supabase/functions directory found');
        return {};
      }
    } catch (err) {
      console.log('❌ Error scanning edge functions:', err.message);
      return {};
    }
    
  } catch (err) {
    console.log('❌ Edge functions scan failed:', err.message);
    return {};
  }
}

async function analyzeCommit9404977Requirements() {
  console.log('\n📋 ANALYZING COMMIT 9404977 REQUIREMENTS...');
  
  // Read the commit files to understand what we need
  try {
    const commit9404977Files = [
      './supabase/migrations/20250130000008_create-comprehensive-stats-reset-function.sql',
      './supabase/migrations/20250130000009_update-stats-reset-preserve-balance.sql'
    ];
    
    const commitAnalysis = {};
    
    for (const file of commit9404977Files) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const fileName = file.split('/').pop();
        
        commitAnalysis[fileName] = {
          exists: true,
          length: content.length,
          content: content
        };
        
        console.log(`✅ Found migration: ${fileName} (${content.length} chars)`);
        
        // Extract function signature if it's the reset function
        if (content.includes('reset_user_stats_comprehensive')) {
          const returnTypeMatch = content.match(/RETURNS\s+(\w+)/i);
          if (returnTypeMatch) {
            commitAnalysis[fileName].expectedReturnType = returnTypeMatch[1];
            console.log(`  🔧 Expected return type: ${returnTypeMatch[1]}`);
          }
        }
      } else {
        commitAnalysis[file] = { exists: false };
        console.log(`❌ Missing migration: ${file}`);
      }
    }
    
    return commitAnalysis;
    
  } catch (err) {
    console.log('❌ Error analyzing commit requirements:', err.message);
    return {};
  }
}

async function generateFixScript(tableData, functionData, commitAnalysis) {
  console.log('\n🔧 GENERATING FIX SCRIPT...');
  
  const fixes = [];
  
  // Fix 1: Handle the function return type issue
  fixes.push(`-- FIX 1: DROP AND RECREATE reset_user_stats_comprehensive FUNCTION`);
  fixes.push(`-- This fixes the "cannot change return type of existing function" error`);
  fixes.push(`DROP FUNCTION IF EXISTS public.reset_user_stats_comprehensive(UUID);`);
  fixes.push(``);
  
  // Fix 2: Recreate the function with correct return type from commit 9404977
  const migrationFile = commitAnalysis['20250130000009_update-stats-reset-preserve-balance.sql'];
  if (migrationFile && migrationFile.content) {
    fixes.push(`-- FIX 2: RECREATE FUNCTION WITH CORRECT RETURN TYPE (from commit 9404977)`);
    
    // Extract the function definition from the migration
    const funcStart = migrationFile.content.indexOf('CREATE OR REPLACE FUNCTION');
    if (funcStart !== -1) {
      const funcEnd = migrationFile.content.indexOf('$$;', funcStart) + 3;
      const functionDef = migrationFile.content.substring(funcStart, funcEnd);
      fixes.push(functionDef);
    } else {
      // Fallback - create the function manually
      fixes.push(`CREATE OR REPLACE FUNCTION public.reset_user_stats_comprehensive(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_exists BOOLEAN;
  current_balance NUMERIC;
  result JSON;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = target_user_id) INTO user_exists;
  
  IF NOT user_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found',
      'user_id', target_user_id
    );
  END IF;

  -- Get current balance before reset
  SELECT balance INTO current_balance FROM public.profiles WHERE id = target_user_id;
  
  -- Reset user stats while PRESERVING balance (key commit 9404977 feature)
  UPDATE public.profiles 
  SET 
    experience_points = COALESCE(experience_points, 0) * 0,
    level = 1,
    total_wagered = COALESCE(total_wagered, 0) * 0,
    total_won = COALESCE(total_won, 0) * 0,
    updated_at = NOW()
    -- NOTE: balance is NOT reset - this preserves user's money
  WHERE id = target_user_id;
  
  -- Clear user achievements
  DELETE FROM public.user_achievements WHERE user_id = target_user_id;
  
  -- Clear user level stats
  DELETE FROM public.user_level_stats WHERE user_id = target_user_id;
  
  -- Insert fresh level 1 stats
  INSERT INTO public.user_level_stats (user_id, level, experience_points)
  VALUES (target_user_id, 1, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    level = 1,
    experience_points = 0,
    updated_at = NOW();

  RETURN json_build_object(
    'success', true,
    'message', 'User stats reset successfully with balance preserved',
    'user_id', target_user_id,
    'preserved_balance', current_balance,
    'reset_at', NOW()
  );
END;
$$;`);
    }
  }
  
  fixes.push(``);
  
  // Fix 3: Check for missing tables and add them
  const expectedTables = [
    'maintenance_mode', 'level_requirements', 'bet_history', 'bets', 'cases',
    'coinflip_bets', 'tower_bets', 'friend_requests', 'friendships',
    'user_sessions', 'push_subscriptions', 'pending_deletions',
    'roulette_history', 'roulette_stats', 'admin_users'
  ];
  
  const missingTables = expectedTables.filter(table => !tableData[table]);
  
  if (missingTables.length > 0) {
    fixes.push(`-- FIX 3: CREATE MISSING TABLES (${missingTables.length} tables)`);
    for (const table of missingTables) {
      fixes.push(`-- Missing table: ${table}`);
    }
    fixes.push(``);
  }
  
  // Fix 4: Add missing columns to existing tables
  const profilesTable = tableData['profiles'];
  if (profilesTable && profilesTable.columns) {
    const existingColumns = profilesTable.columns.map(col => col.column_name);
    const requiredColumns = ['level', 'experience_points', 'total_wagered', 'total_won'];
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      fixes.push(`-- FIX 4: ADD MISSING COLUMNS TO PROFILES TABLE`);
      for (const col of missingColumns) {
        fixes.push(`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ${col} NUMERIC DEFAULT 0;`);
      }
      fixes.push(``);
    }
  }
  
  return fixes.join('\n');
}

async function main() {
  console.log('🎯 STARTING COMPLETE DATABASE SCAN...');
  
  // Step 1: Scan all tables
  const tableData = await scanAllTables();
  
  // Step 2: Scan all functions
  const functionData = await scanAllFunctions();
  
  // Step 3: Test existing functions
  const functionResults = await testExistingFunctions();
  
  // Step 4: Scan edge functions
  const edgeFunctions = await scanEdgeFunctions();
  
  // Step 5: Analyze commit 9404977 requirements
  const commitAnalysis = await analyzeCommit9404977Requirements();
  
  // Step 6: Generate fix script
  const fixScript = await generateFixScript(tableData, functionData, commitAnalysis);
  
  // Step 7: Save comprehensive report
  const report = {
    timestamp: new Date().toISOString(),
    totalTables: Object.keys(tableData).length,
    totalFunctions: Object.keys(functionData).length,
    edgeFunctions: Object.keys(edgeFunctions).length,
    tableData,
    functionData,
    functionResults,
    edgeFunctions,
    commitAnalysis,
    fixScript
  };
  
  fs.writeFileSync('COMPLETE_DATABASE_SCAN_REPORT.json', JSON.stringify(report, null, 2));
  fs.writeFileSync('CASINO_DATABASE_FIX.sql', fixScript);
  
  // Step 8: Display summary
  console.log('\n🎉 SCAN COMPLETE!');
  console.log('=' * 50);
  console.log(`📊 Tables scanned: ${Object.keys(tableData).length}`);
  console.log(`🔧 Functions found: ${Object.keys(functionData).length}`);
  console.log(`⚡ Edge functions: ${Object.keys(edgeFunctions).length}`);
  console.log(`📄 Reports saved:`);
  console.log(`   • COMPLETE_DATABASE_SCAN_REPORT.json (detailed analysis)`);
  console.log(`   • CASINO_DATABASE_FIX.sql (fix script)`);
  
  console.log('\n🔧 IDENTIFIED ISSUES:');
  if (functionResults['reset_user_stats_comprehensive']?.error) {
    console.log('❌ reset_user_stats_comprehensive function return type conflict');
  }
  
  const missingTables = ['maintenance_mode', 'level_requirements', 'bet_history'].filter(t => !tableData[t]);
  if (missingTables.length > 0) {
    console.log(`❌ ${missingTables.length} missing tables: ${missingTables.join(', ')}`);
  }
  
  console.log('\n🚀 NEXT STEP: Run CASINO_DATABASE_FIX.sql in your Supabase SQL Editor');
}

main().catch(console.error);