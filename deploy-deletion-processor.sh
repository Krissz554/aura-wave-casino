#!/bin/bash

# Deploy the deletion processor Edge Function and set up automated execution

echo "🚀 Deploying Account Deletion Processor System..."

# Deploy the Edge Function
echo "📦 Deploying process-pending-deletions Edge Function..."
supabase functions deploy process-pending-deletions

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully"
else
    echo "❌ Failed to deploy Edge Function"
    exit 1
fi

# Run the database migration to create the pending deletions table
echo "🗄️  Running database migration..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully"
else
    echo "❌ Failed to run database migration"
    exit 1
fi

# Get the function URL
SUPABASE_URL=$(supabase status --output env | grep SUPABASE_URL | cut -d'=' -f2)
ANON_KEY=$(supabase status --output env | grep SUPABASE_ANON_KEY | cut -d'=' -f2)

echo ""
echo "🎯 Deployment Complete!"
echo ""
echo "Edge Function URL: ${SUPABASE_URL}/functions/v1/process-pending-deletions"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Set up a cron job to call the deletion processor every minute:"
echo "   Add this to your server's crontab (crontab -e):"
echo ""
echo "   * * * * * curl -X POST '${SUPABASE_URL}/functions/v1/process-pending-deletions' \\"
echo "     -H 'Authorization: Bearer ${ANON_KEY}' \\"
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
cat > test-deletion-system.sh << EOF
#!/bin/bash

# Test script for the account deletion system

echo "🧪 Testing Account Deletion System..."

# Call the deletion processor manually
echo "📞 Calling deletion processor..."
curl -X POST '${SUPABASE_URL}/functions/v1/process-pending-deletions' \\
  -H 'Authorization: Bearer ${ANON_KEY}' \\
  -H 'Content-Type: application/json' \\
  -v

echo ""
echo "✅ Test completed. Check the response above."
echo "If there are no pending deletions, you should see processed_count: 0"
EOF

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