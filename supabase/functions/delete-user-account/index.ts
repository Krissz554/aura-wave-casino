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
    // Create Supabase client with service role key
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

    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('=== STARTING COMPLETE USER ACCOUNT DELETION ===')
    console.log('User ID:', userId)

    // Delete from all related tables (in correct order to avoid foreign key constraints)
    console.log('Deleting user data from all tables...')
    
    const tablesToDelete = [
      { table: 'notifications', field: 'user_id' },
      { table: 'tips', field: 'from_user_id' },
      { table: 'tips', field: 'to_user_id' },
      { table: 'user_achievements', field: 'user_id' },
      { table: 'user_daily_logins', field: 'user_id' },
      { table: 'user_level_stats', field: 'user_id' },
      { table: 'game_history', field: 'user_id' },
      { table: 'game_stats', field: 'user_id' },
      { table: 'case_rewards', field: 'user_id' },
      { table: 'free_case_claims', field: 'user_id' },
      { table: 'level_daily_cases', field: 'user_id' },
      { table: 'user_rate_limits', field: 'user_id' },
      { table: 'admin_users', field: 'user_id' },
      { table: 'chat_messages', field: 'user_id' },
      { table: 'unlocked_achievements', field: 'user_id' },
      { table: 'live_bet_feed', field: 'user_id' },
      { table: 'crash_bets', field: 'user_id' },
      { table: 'roulette_bets', field: 'user_id' },
      { table: 'tower_games', field: 'user_id' },
      { table: 'roulette_client_seeds', field: 'user_id' },
      { table: 'audit_logs', field: 'user_id' }
    ]

    for (const { table, field } of tablesToDelete) {
      console.log(`Deleting from ${table}...`)
      const { error } = await supabaseClient
        .from(table)
        .delete()
        .eq(field, userId)

      if (error) {
        console.error(`Error deleting from ${table}:`, error)
      } else {
        console.log(`${table} deleted successfully`)
      }
    }

    // Delete from profiles table
    console.log('Deleting from profiles table...')
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
    } else {
      console.log('Profile deleted successfully')
    }
    
    // Delete from auth.users (Supabase Auth) - This requires service role
    console.log('Deleting from auth.users...')
    const { error: authError } = await supabaseClient.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Error deleting from auth:', authError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete user from authentication',
          details: authError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      console.log('User deleted from auth successfully')
    }

    console.log('=== ACCOUNT DELETION COMPLETED SUCCESSFULLY ===')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User account completely deleted from all tables and authentication' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in delete-user-account function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})