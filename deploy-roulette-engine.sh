#!/bin/bash

# Deploy Roulette Engine Edge Function
# This script redeploys the roulette-engine function to ensure it's working properly

echo "🚀 Deploying roulette-engine Edge Function..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Deploy the function
echo "📦 Deploying roulette-engine function..."
supabase functions deploy roulette-engine

if [ $? -eq 0 ]; then
    echo "✅ roulette-engine function deployed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Run the emergency-comprehensive-fix.sql in your Supabase SQL Editor"
    echo "2. Test placing a roulette bet"
    echo "3. Check browser console for any remaining errors"
else
    echo "❌ Failed to deploy roulette-engine function"
    echo "Please check your Supabase project configuration and try again"
    exit 1
fi