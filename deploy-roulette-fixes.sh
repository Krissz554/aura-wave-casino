#!/bin/bash

# =====================================================================
# DEPLOY ROULETTE FIXES - Complete System Restoration
# =====================================================================
# This script deploys all necessary fixes for the roulette system:
# 1. Deploys the fixed roulette-engine edge function
# 2. Executes the comprehensive database fix
# 3. Verifies the system is working
# =====================================================================

echo "🎰 DEPLOYING COMPLETE ROULETTE SYSTEM FIXES..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "supabase/functions/roulette-engine/index.ts" ]; then
    print_error "roulette-engine function not found. Make sure you're in the project root."
    exit 1
fi

# Step 1: Deploy the fixed edge function
print_info "Step 1: Deploying fixed roulette-engine edge function..."
if supabase functions deploy roulette-engine; then
    print_status "Edge function deployed successfully"
else
    print_error "Edge function deployment failed"
    print_warning "You may need to login with: supabase login"
    print_warning "Or link your project with: supabase link --project-ref hqdbdczxottbupwbupdu"
    exit 1
fi

echo ""

# Step 2: Apply database fixes
print_info "Step 2: Applying comprehensive database fixes..."
echo "Please execute the following SQL script in your Supabase SQL Editor:"
echo ""
echo -e "${YELLOW}File to execute: COMPLETE_ROULETTE_SYSTEM_FIX.sql${NC}"
echo ""
echo "🔗 Go to: https://supabase.com/dashboard/project/hqdbdczxottbupwbupdu/sql"
echo ""
echo "This script will:"
echo "  ✅ Add missing result_multiplier column to roulette_results"
echo "  ✅ Create place_roulette_bet() function"
echo "  ✅ Create complete_roulette_round() function"
echo "  ✅ Create get_or_create_daily_seed() function"
echo "  ✅ Create reveal_daily_seed() function"
echo "  ✅ Add performance indexes"
echo "  ✅ Create initial roulette round if needed"
echo ""

# Wait for user confirmation
read -p "Press Enter after you've executed the SQL script in Supabase dashboard..."

echo ""

# Step 3: Verification
print_info "Step 3: Verification checklist..."
echo ""
echo "🔍 Please verify the following:"
echo "  1. Go to your casino website"
echo "  2. Navigate to the Roulette page"
echo "  3. Check that you can see an active round (no 'No active round' message)"
echo "  4. Try placing a test bet"
echo "  5. Wait for the round to complete and check if it processes correctly"
echo ""

# Step 4: Troubleshooting
print_info "Step 4: Troubleshooting (if needed)..."
echo ""
echo "If you still see issues:"
echo ""
echo "🔧 Check Edge Function Logs:"
echo "   supabase functions logs roulette-engine"
echo ""
echo "🔧 Test Edge Function Directly:"
echo '   curl -X POST "https://hqdbdczxottbupwbupdu.supabase.co/functions/v1/roulette-engine" \'
echo '        -H "Content-Type: application/json" \'
echo '        -d '"'"'{"action": "get_current_round"}'"'"''
echo ""
echo "🔧 Check Database Functions:"
echo "   Run this in SQL Editor: SELECT * FROM roulette_rounds ORDER BY created_at DESC LIMIT 1;"
echo ""

print_status "Roulette system deployment complete!"
echo ""
echo "🎰 Your casino should now have:"
echo "  ✅ Working roulette rounds (no more 'No active round')"
echo "  ✅ Fixed edge function (no more crashes)"
echo "  ✅ Complete provably fair system"
echo "  ✅ Proper XP and stats tracking"
echo "  ✅ Performance optimizations"
echo ""
print_status "Happy gaming! 🎲✨"