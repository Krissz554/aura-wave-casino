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

    console.log('=== PROCESSING PENDING ACCOUNT DELETIONS ===')
    console.log('Timestamp:', new Date().toISOString())

    // Call the database function to process pending deletions
    const { data, error } = await supabaseClient
      .rpc('process_pending_account_deletions')

    if (error) {
      console.error('Error processing pending deletions:', error)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = data?.[0] || { processed_count: 0, details: [] }
    console.log('Processing result:', result)

    // If we processed any deletions, log them
    if (result.processed_count > 0) {
      console.log(`✅ Successfully processed ${result.processed_count} pending deletions`)
      
      // Log details for each deletion
      const details = Array.isArray(result.details) ? result.details : []
      details.forEach((detail: any, index: number) => {
        console.log(`Deletion ${index + 1}:`, {
          user_id: detail.user_id,
          success: detail.success,
          deletion_id: detail.deletion_id
        })
        
        if (!detail.success && detail.error) {
          console.error(`Error in deletion ${index + 1}:`, detail.error)
        }
      })
    } else {
      console.log('No pending deletions to process')
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_count: result.processed_count,
        details: result.details,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Server error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})