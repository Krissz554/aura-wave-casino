// ROULETTE ENGINE MAINTENANCE INTEGRATION
// Add this maintenance check to your existing roulette-engine/index.ts

// Add this function at the top of your roulette engine file, after the imports:

async function checkMaintenanceStatus(supabase: any): Promise<{ allowed: boolean; maintenance_info?: any }> {
  try {
    console.log('🔧 Checking maintenance status...');
    
    // Call the maintenance check function
    const { data: maintenanceCheck, error } = await supabase.rpc('edge_function_maintenance_check', {
      p_function_name: 'roulette-engine'
    });
    
    if (error) {
      console.warn('⚠️ Maintenance check failed, assuming allowed:', error);
      return { allowed: true }; // Default to allowed if check fails
    }
    
    const isAllowed = maintenanceCheck?.success === true;
    
    if (!isAllowed) {
      console.log('🚫 Roulette engine blocked due to maintenance mode');
      return { 
        allowed: false, 
        maintenance_info: maintenanceCheck 
      };
    }
    
    console.log('✅ Roulette engine allowed to proceed');
    return { allowed: true };
    
  } catch (error) {
    console.warn('⚠️ Maintenance check error, assuming allowed:', error);
    return { allowed: true }; // Default to allowed if check fails
  }
}

// Add this check at the very beginning of your serve function, right after CORS handling:

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let action = 'unknown';
  
  try {
    return await withTimeout((async () => {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // ⭐ ADD THIS MAINTENANCE CHECK HERE ⭐
      const maintenanceStatus = await checkMaintenanceStatus(supabase);
      if (!maintenanceStatus.allowed) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Roulette engine is temporarily unavailable due to maintenance',
          maintenance_info: maintenanceStatus.maintenance_info
        }), {
          status: 503, // Service Unavailable
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      // ⭐ END MAINTENANCE CHECK ⭐

      const requestData = await req.json();
      ({ action } = requestData);
      const { userId, betColor, betAmount, roundId, clientSeed } = requestData;
      console.log(`🎰 Roulette Engine: ${action} (started at ${new Date().toISOString()})`);

      // ... rest of your existing roulette engine code ...

    }), FUNCTION_TIMEOUT_MS, `Roulette Engine: ${action}`);
    
  } catch (error) {
    // ... rest of your existing error handling ...
  }
});

// Example of how to integrate maintenance checks in specific user actions:

async function placeBetWithMaintenanceCheck(supabase: any, userId: string, roundId: string, betColor: string, betAmount: number, clientSeed?: string) {
  // Check if user actions are allowed
  const { data: userActionCheck, error } = await supabase.rpc('user_action_maintenance_check', {
    p_action_type: 'roulette_bet',
    p_user_id: userId
  });
  
  if (error || !userActionCheck?.success) {
    throw new Error(userActionCheck?.error || 'Betting is temporarily unavailable due to maintenance');
  }
  
  // Proceed with normal bet placement
  return await placeBet(supabase, userId, roundId, betColor, betAmount, clientSeed);
}

// For balance updates and other critical user actions:

async function updateBalanceWithMaintenanceCheck(supabase: any, userId: string, amount: number) {
  // Check if balance updates are allowed
  const { data: balanceCheck, error } = await supabase.rpc('user_action_maintenance_check', {
    p_action_type: 'balance_update',
    p_user_id: userId
  });
  
  if (error || !balanceCheck?.success) {
    console.log('🚫 Balance update blocked due to maintenance for user:', userId);
    return { success: false, error: 'Balance updates temporarily unavailable' };
  }
  
  // Proceed with balance update
  // ... your existing balance update logic ...
}