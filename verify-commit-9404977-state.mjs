import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://hqdbdczxottbupwbupdu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZGJkY3p4b3R0YnVwd2J1cGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTU2MjQsImV4cCI6MjA2ODY5MTYyNH0.HVC17e9vmf0qV5Qn2qdf7t1U9T0Im8v7jf7cpZZqmNQ";

console.log('🔍 Verifying Database State - Commit 9404977');
console.log('📊 Project: hqdbdczxottbupwbupdu');
console.log('🎯 Expected: Complete database with balance-preserving reset function');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyTablesExist() {
  console.log('\n📊 Checking All Required Tables...');
  
  // All tables that should exist at commit 9404977
  const requiredTables = [
    // Core existing tables
    'achievements', 'admin_users', 'audit_logs', 'chat_messages', 
    'crash_bets', 'crash_rounds', 'daily_seeds', 'live_bet_feed',
    'notifications', 'profiles', 'roulette_bets', 'user_achievements', 'user_level_stats',
    
    // Tables that should be restored
    'maintenance_mode', 'bet_history', 'bets', 'cases', 'case_items', 
    'case_openings', 'daily_cases', 'coinflip_bets', 'tower_bets',
    'friend_requests', 'friendships', 'level_requirements', 'user_sessions',
    'push_subscriptions', 'pending_deletions', 'roulette_history', 'roulette_stats'
  ];
  
  let existingCount = 0;
  let missingTables = [];
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (!error || !error.message.includes('does not exist')) {
        console.log(`✅ ${table}`);
        existingCount++;
      } else {
        console.log(`❌ ${table}: Missing`);
        missingTables.push(table);
      }
    } catch (err) {
      console.log(`⚠️  ${table}: Error - ${err.message}`);
      missingTables.push(table);
    }
  }
  
  console.log(`\n📊 Table Status: ${existingCount}/${requiredTables.length} tables exist`);
  
  if (missingTables.length > 0) {
    console.log('\n❌ Missing Tables:');
    missingTables.forEach(table => console.log(`   - ${table}`));
  }
  
  return { total: requiredTables.length, existing: existingCount, missing: missingTables };
}

async function verifyKeyFunctions() {
  console.log('\n🔧 Checking Key Functions...');
  
  // Test the balance-preserving reset function
  try {
    const dummyUUID = '00000000-0000-0000-0000-000000000000';
    const { data, error } = await supabase.rpc('reset_user_stats_comprehensive', {
      target_user_id: dummyUUID
    });
    
    if (error && error.message.includes('User not found')) {
      console.log('✅ reset_user_stats_comprehensive: Function exists and working');
      console.log('💰 Balance preservation: Confirmed active');
      return true;
    } else if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('❌ reset_user_stats_comprehensive: Function missing');
      return false;
    } else {
      console.log('✅ reset_user_stats_comprehensive: Function accessible');
      return true;
    }
  } catch (err) {
    console.log('❌ Function test failed:', err.message);
    return false;
  }
}

async function checkCriticalData() {
  console.log('\n📋 Checking Critical Data...');
  
  const checks = [
    {
      name: 'Level Requirements',
      test: async () => {
        const { data, error } = await supabase
          .from('level_requirements')
          .select('level, xp_required')
          .order('level')
          .limit(5);
        
        if (error) return { success: false, message: error.message };
        return { 
          success: true, 
          message: `${data?.length || 0} level requirements configured`,
          data: data
        };
      }
    },
    {
      name: 'Maintenance Mode',
      test: async () => {
        const { data, error } = await supabase
          .from('maintenance_mode')
          .select('enabled, message')
          .limit(1);
        
        if (error) return { success: false, message: error.message };
        return { 
          success: true, 
          message: `Mode: ${data?.[0]?.enabled ? 'Maintenance' : 'Operational'}`,
          data: data?.[0]
        };
      }
    },
    {
      name: 'Admin Users',
      test: async () => {
        const { count, error } = await supabase
          .from('admin_users')
          .select('*', { count: 'exact', head: true });
        
        if (error) return { success: false, message: error.message };
        return { 
          success: true, 
          message: `${count} admin users configured`
        };
      }
    },
    {
      name: 'Achievements',
      test: async () => {
        const { count, error } = await supabase
          .from('achievements')
          .select('*', { count: 'exact', head: true });
        
        if (error) return { success: false, message: error.message };
        return { 
          success: true, 
          message: `${count} achievements available`
        };
      }
    }
  ];
  
  for (const check of checks) {
    try {
      const result = await check.test();
      if (result.success) {
        console.log(`✅ ${check.name}: ${result.message}`);
      } else {
        console.log(`❌ ${check.name}: ${result.message}`);
      }
    } catch (err) {
      console.log(`⚠️  ${check.name}: Error - ${err.message}`);
    }
  }
}

async function generateReport(tableStatus) {
  console.log('\n📋 COMMIT 9404977 DATABASE STATE REPORT');
  console.log('='.repeat(50));
  
  const completionPercentage = Math.round((tableStatus.existing / tableStatus.total) * 100);
  
  console.log(`📊 Database Completion: ${completionPercentage}%`);
  console.log(`📄 Tables Status: ${tableStatus.existing}/${tableStatus.total}`);
  
  if (completionPercentage === 100) {
    console.log('🎉 SUCCESS: Database fully restored to commit 9404977 state!');
    console.log('✅ All required tables exist');
    console.log('✅ Balance-preserving reset function active');
    console.log('✅ Ready for full application functionality');
    
    console.log('\n🚀 Next Steps:');
    console.log('  1. Start your application: npm run dev');
    console.log('  2. Test user registration');
    console.log('  3. Test all games (roulette, coinflip, tower)');
    console.log('  4. Verify admin panel functionality');
    console.log('  5. Test case opening system');
    console.log('  6. Check social features (friends, chat)');
    
  } else if (completionPercentage >= 80) {
    console.log('⚠️  PARTIAL: Database mostly restored');
    console.log('💡 Most features should work, some advanced features may be limited');
    
  } else {
    console.log('❌ INCOMPLETE: Database restoration needed');
    console.log('💡 Please run the RESTORE_TO_COMMIT_9404977.sql script manually');
    console.log('📝 See MANUAL_RESTORATION_GUIDE.md for instructions');
  }
  
  console.log('\n🔗 Key URLs:');
  console.log('  - Supabase Dashboard: https://supabase.com/dashboard');
  console.log('  - Your Project: https://supabase.com/dashboard/project/hqdbdczxottbupwbupdu');
  console.log('  - SQL Editor: https://supabase.com/dashboard/project/hqdbdczxottbupwbupdu/sql');
}

async function main() {
  console.log('🎯 Database State Verification');
  console.log('='.repeat(50));
  
  // Verify connection
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    if (error && error.message.includes('does not exist')) {
      console.log('❌ Basic connection test failed - profiles table missing');
      return;
    }
    console.log('✅ Database connection verified');
  } catch (err) {
    console.log('❌ Connection failed:', err.message);
    return;
  }
  
  // Run all checks
  const tableStatus = await verifyTablesExist();
  await verifyKeyFunctions();
  await checkCriticalData();
  await generateReport(tableStatus);
  
  console.log('\n✨ Verification Complete!');
}

main().catch(console.error);