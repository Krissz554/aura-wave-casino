import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { user_id, deletion_time } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`=== SERVER-SIDE ACCOUNT DELETION ===`)
    console.log(`User ID: ${user_id}`)
    console.log(`Deletion time: ${deletion_time}`)

    // Check if it's time to delete (30 seconds after initiation)
    const now = new Date().getTime()
    const targetTime = new Date(deletion_time).getTime()
    const timeDiff = targetTime - now

    if (timeDiff > 0) {
      console.log(`Deletion not yet due. Time remaining: ${Math.floor(timeDiff / 1000)} seconds`)
      return new Response(
        JSON.stringify({ 
          status: 'pending',
          message: 'Deletion not yet due',
          timeRemaining: Math.floor(timeDiff / 1000)
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Proceeding with account deletion...')

    // Delete from all tables
    const tablesToDelete = [
      'notifications',
      'user_achievements', 
      'user_daily_logins',
      'user_level_stats',
      'game_history',
      'game_stats',
      'case_rewards',
      'free_case_claims',
      'level_daily_cases',
      'user_rate_limits',
      'admin_users',
      'chat_messages',
      'unlocked_achievements',
      'live_bet_feed',
      'crash_bets',
      'roulette_bets',
      'tower_games',
      'roulette_client_seeds',
      'audit_logs'
    ]

    const deletedTables = []
    const errors = []

    // Delete tips (both sent and received)
    try {
      const { error: tipsError1 } = await supabaseClient
        .from('tips')
        .delete()
        .eq('from_user_id', user_id)
      
      const { error: tipsError2 } = await supabaseClient
        .from('tips')
        .delete()
        .eq('to_user_id', user_id)

      if (!tipsError1 && !tipsError2) {
        deletedTables.push('tips')
      } else {
        errors.push(`tips: ${tipsError1?.message || tipsError2?.message}`)
      }
    } catch (error) {
      errors.push(`tips: ${error.message}`)
    }

    // Delete from all other tables
    for (const table of tablesToDelete) {
      try {
        console.log(`Deleting from ${table}...`)
        
        const { error } = await supabaseClient
          .from(table)
          .delete()
          .eq('user_id', user_id)

        if (error) {
          console.error(`Error deleting from ${table}:`, error)
          errors.push(`${table}: ${error.message}`)
        } else {
          console.log(`${table} deleted successfully`)
          deletedTables.push(table)
        }
      } catch (error) {
        console.error(`Exception deleting from ${table}:`, error)
        errors.push(`${table}: ${error.message}`)
      }
    }

    // Delete from profiles table
    try {
      console.log('Deleting from profiles table...')
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .delete()
        .eq('id', user_id)

      if (profileError) {
        console.error('Error deleting profile:', profileError)
        errors.push(`profiles: ${profileError.message}`)
      } else {
        console.log('Profile deleted successfully')
        deletedTables.push('profiles')
      }
    } catch (error) {
      console.error('Exception deleting profile:', error)
      errors.push(`profiles: ${error.message}`)
    }

    // Delete from Supabase Auth (this requires admin privileges)
    let authDeleted = false
    try {
      console.log('Deleting from Supabase Auth...')
      const { error: authError } = await supabaseClient.auth.admin.deleteUser(user_id)
      
      if (authError) {
        console.error('Error deleting from Auth:', authError)
        errors.push(`auth.users: ${authError.message}`)
      } else {
        console.log('✅ User successfully deleted from Supabase Auth')
        authDeleted = true
        deletedTables.push('auth.users')
      }
    } catch (error) {
      console.error('Exception deleting from Auth:', error)
      errors.push(`auth.users: ${error.message}`)
    }

    // Log the deletion completion
    try {
      await supabaseClient
        .from('audit_logs')
        .insert({
          user_id: user_id,
          action: 'account_deletion_completed_server',
          details: {
            timestamp: new Date().toISOString(),
            deleted_tables: deletedTables,
            errors: errors,
            auth_deleted: authDeleted
          }
        })
    } catch (error) {
      console.error('Error logging deletion completion:', error)
    }

    const success = errors.length === 0 || (errors.length === 1 && errors[0].includes('auth.users'))

    console.log('=== DELETION COMPLETED ===')
    console.log('Success:', success)
    console.log('Deleted tables:', deletedTables)
    console.log('Errors:', errors)

    return new Response(
      JSON.stringify({
        success,
        deleted_tables: deletedTables,
        errors,
        auth_deleted: authDeleted,
        user_id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Server error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})