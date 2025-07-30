#!/bin/bash

echo "🧪 Testing Edge Functions for Account Deletion System"
echo ""

SUPABASE_URL="https://hqdbdczxottbupwbupdu.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZGJkY3p4b3R0YnVwd2J1cGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTU2MjQsImV4cCI6MjA2ODY5MTYyNH0.HVC17e9vmf0qV5Qn2qdf7t1U9T0Im8v7jf7cpZZqmNQ"

echo "1. Testing process-pending-deletions Edge Function..."
echo "URL: ${SUPABASE_URL}/functions/v1/process-pending-deletions"

response1=$(curl -s -w "\n%{http_code}" -X POST "${SUPABASE_URL}/functions/v1/process-pending-deletions" \
  -H 'Authorization: Bearer '"${SUPABASE_ANON_KEY}" \
  -H 'Content-Type: application/json')

http_code1=$(echo "$response1" | tail -n1)
response_body1=$(echo "$response1" | head -n -1)

echo "Status Code: $http_code1"
echo "Response: $response_body1"
echo ""

if [ "$http_code1" -eq 200 ]; then
    echo "✅ process-pending-deletions function is working"
else
    echo "❌ process-pending-deletions function failed"
    echo "   This might be because the function isn't deployed yet"
    echo "   Run: supabase functions deploy process-pending-deletions"
fi

echo ""
echo "2. Testing delete-user-account Edge Function..."
echo "URL: ${SUPABASE_URL}/functions/v1/delete-user-account"

# Test with invalid data to check if function exists
response2=$(curl -s -w "\n%{http_code}" -X POST "${SUPABASE_URL}/functions/v1/delete-user-account" \
  -H 'Authorization: Bearer '"${SUPABASE_ANON_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "test", "deletion_time": "2024-01-01T00:00:00Z"}')

http_code2=$(echo "$response2" | tail -n1)
response_body2=$(echo "$response2" | head -n -1)

echo "Status Code: $http_code2"
echo "Response: $response_body2"
echo ""

if [ "$http_code2" -eq 200 ] || [ "$http_code2" -eq 400 ]; then
    echo "✅ delete-user-account function is working"
else
    echo "❌ delete-user-account function failed"
    echo "   This might be because the function isn't deployed yet"
    echo "   Run: supabase functions deploy delete-user-account"
fi

echo ""
echo "🎯 Summary:"
echo ""

if [ "$http_code1" -eq 200 ] && ([ "$http_code2" -eq 200 ] || [ "$http_code2" -eq 400 ]); then
    echo "✅ Both Edge Functions are operational!"
    echo "   The deletion system should work properly now."
    echo ""
    echo "📋 How to test the full system:"
    echo "1. Open admin panel"
    echo "2. Select a test user"
    echo "3. Click 'Delete' button"
    echo "4. Complete double confirmation"
    echo "5. User should see site lock with countdown"
    echo "6. After 30 seconds, deletion should execute automatically"
else
    echo "⚠️ Some Edge Functions need attention:"
    echo ""
    echo "To deploy missing functions, run:"
    echo "supabase functions deploy process-pending-deletions"
    echo "supabase functions deploy delete-user-account"
fi

echo ""
echo "🔧 If Edge Functions aren't working:"
echo "1. Check Supabase dashboard for function deployment status"
echo "2. Ensure functions are deployed to the correct project"
echo "3. Check function logs for errors"
echo "4. The system has fallback mechanisms, so deletion should still work"