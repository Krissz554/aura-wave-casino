#!/bin/bash

# Deploy Supabase Edge Functions Script
# This script deploys all Edge Functions to your Supabase project

echo "🚀 Starting Supabase Edge Functions deployment..."

# Check if PROJECT_REF is provided as argument
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your Supabase project reference ID"
    echo "Usage: ./deploy-functions.sh <PROJECT_REF>"
    echo "Example: ./deploy-functions.sh hqdbdczxottbupwbupdu"
    exit 1
fi

PROJECT_REF=$1

echo "📋 Deploying to project: $PROJECT_REF"

# Deploy each function
echo "🎰 Deploying roulette-engine..."
supabase functions deploy roulette-engine --project-ref $PROJECT_REF

echo "🪙 Deploying coinflip-streak-engine..."
supabase functions deploy coinflip-streak-engine --project-ref $PROJECT_REF

echo "💥 Deploying crash-engine..."
supabase functions deploy crash-engine --project-ref $PROJECT_REF

echo "🗼 Deploying tower-engine..."
supabase functions deploy tower-engine --project-ref $PROJECT_REF

echo "📦 Deploying case-opening-engine..."
supabase functions deploy case-opening-engine --project-ref $PROJECT_REF

echo "🎁 Deploying claim-free-case..."
supabase functions deploy claim-free-case --project-ref $PROJECT_REF

echo "✅ All Edge Functions deployed successfully!"
echo "🎯 The roulette game now uses 25-second betting phases!"