#!/bin/bash

# Recreate key files to ensure changes are captured

echo "Creating GitHub Actions workflow..."
mkdir -p .github/workflows

cat > .github/workflows/process-deletions.yml << 'WORKFLOW_EOF'
name: Process Pending Account Deletions

on:
  schedule:
    # Run every minute
    - cron: '* * * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  process-deletions:
    runs-on: ubuntu-latest
    
    steps:
      - name: Process Pending Deletions
        run: |
          echo "🔍 Processing pending account deletions..."
          
          # Call the Supabase Edge Function
          response=$(curl -s -w "\n%{http_code}" -X POST '\${{ secrets.SUPABASE_URL }}/functions/v1/process-pending-deletions' \
            -H 'Authorization: Bearer \${{ secrets.SUPABASE_ANON_KEY }}' \
            -H 'Content-Type: application/json')
          
          # Extract response body and status code
          http_code=$(echo "\$response" | tail -n1)
          response_body=$(echo "\$response" | head -n -1)
          
          echo "HTTP Status: \$http_code"
          echo "Response: \$response_body"
          
          # Check if request was successful
          if [ "\$http_code" -eq 200 ]; then
            echo "✅ Successfully processed pending deletions"
            
            # Parse the response to get processed count
            processed_count=$(echo "\$response_body" | grep -o '"processed_count":[0-9]*' | grep -o '[0-9]*')
            
            if [ "\$processed_count" -gt 0 ]; then
              echo "📊 Processed \$processed_count pending deletions"
            else
              echo "📊 No pending deletions found"
            fi
          else
            echo "❌ Failed to process pending deletions"
            echo "Response: \$response_body"
            exit 1
          fi

      - name: Log Completion
        run: |
          echo "🎯 Deletion processing job completed at \$(date -u)"
WORKFLOW_EOF

echo "Creating Edge Function..."
mkdir -p supabase/functions/process-pending-deletions

cat > supabase/functions/process-pending-deletions/index.ts << 'FUNCTION_EOF'
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
      console.log(\`✅ Successfully processed \${result.processed_count} pending deletions\`)
      
      // Log details for each deletion
      const details = Array.isArray(result.details) ? result.details : []
      details.forEach((detail: any, index: number) => {
        console.log(\`Deletion \${index + 1}:\`, {
          user_id: detail.user_id,
          success: detail.success,
          deletion_id: detail.deletion_id
        })
        
        if (!detail.success && detail.error) {
          console.error(\`Error in deletion \${index + 1}:\`, detail.error)
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
FUNCTION_EOF

echo "Creating deployment script..."
cat > deploy-deletion-processor.sh << 'DEPLOY_EOF'
#!/bin/bash

# Deploy the deletion processor Edge Function and set up automated execution

echo "🚀 Deploying Account Deletion Processor System..."

# Deploy the Edge Function
echo "📦 Deploying process-pending-deletions Edge Function..."
supabase functions deploy process-pending-deletions

if [ \$? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully"
else
    echo "❌ Failed to deploy Edge Function"
    exit 1
fi

# Run the database migration to create the pending deletions table
echo "🗄️  Running database migration..."
supabase db push

if [ \$? -eq 0 ]; then
    echo "✅ Database migration completed successfully"
else
    echo "❌ Failed to run database migration"
    exit 1
fi

# Get the function URL
SUPABASE_URL=\$(supabase status --output env | grep SUPABASE_URL | cut -d'=' -f2)
ANON_KEY=\$(supabase status --output env | grep SUPABASE_ANON_KEY | cut -d'=' -f2)

echo ""
echo "🎯 Deployment Complete!"
echo ""
echo "Edge Function URL: \${SUPABASE_URL}/functions/v1/process-pending-deletions"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Set up a cron job to call the deletion processor every minute:"
echo "   Add this to your server's crontab (crontab -e):"
echo ""
echo "   * * * * * curl -X POST '\${SUPABASE_URL}/functions/v1/process-pending-deletions' \\"
echo "     -H 'Authorization: Bearer \${ANON_KEY}' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     --silent --output /dev/null"
echo ""
echo "2. Or if using a cloud provider, set up a webhook/scheduled job:"
echo "   - Vercel: Create an API route and use Vercel Cron"
echo "   - Netlify: Use Netlify Functions with scheduled execution"
echo "   - GitHub Actions: Set up a workflow with cron schedule"
echo ""
echo "3. Alternative: Use a monitoring service like UptimeRobot or Pingdom"
echo "   to ping the endpoint every minute"
echo ""
echo "4. For production, consider using a proper job queue system"
echo "   like Bull Queue, Agenda, or cloud-native solutions"
echo ""

# Create a test file to verify the system works
echo "🧪 Creating test script..."
cat > test-deletion-system.sh << TEST_EOF
#!/bin/bash

# Test script for the account deletion system

echo "🧪 Testing Account Deletion System..."

# Call the deletion processor manually
echo "📞 Calling deletion processor..."
curl -X POST '\${SUPABASE_URL}/functions/v1/process-pending-deletions' \\
  -H 'Authorization: Bearer \${ANON_KEY}' \\
  -H 'Content-Type: application/json' \\
  -v

echo ""
echo "✅ Test completed. Check the response above."
echo "If there are no pending deletions, you should see processed_count: 0"
TEST_EOF

chmod +x test-deletion-system.sh

echo "✅ Test script created: test-deletion-system.sh"
echo ""
echo "🎉 Account Deletion System is ready!"
echo ""
echo "Features implemented:"
echo "• ✅ Admin initiates deletion with confirmation"
echo "• ✅ User receives notification and site locks with countdown"
echo "• ✅ Server-side automatic deletion after 30 seconds"
echo "• ✅ Works even when user is offline"
echo "• ✅ Full audit trail and error handling"
echo "• ✅ Comprehensive data cleanup from all tables"
echo ""
DEPLOY_EOF

chmod +x deploy-deletion-processor.sh

echo "✅ All files recreated successfully!"
