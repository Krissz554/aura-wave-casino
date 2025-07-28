# Supabase Edge Functions Deployment Guide

## 🚨 Important: Functions Must Be Deployed

Changes to Edge Functions in the codebase **do not automatically take effect**. They must be explicitly deployed to your Supabase project.

## Quick Deployment

### Method 1: Manual Deployment (Immediate)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Deploy all functions** using our script:
   ```bash
   ./deploy-functions.sh hqdbdczxottbupwbupdu
   ```
   
   Or deploy the roulette function specifically:
   ```bash
   supabase functions deploy roulette-engine --project-ref hqdbdczxottbupwbupdu
   ```

### Method 2: GitHub Actions (Automatic)

We've created a GitHub Actions workflow that will automatically deploy functions when:
- Code is pushed to the `main` branch
- Changes are made to `supabase/functions/**`

**Setup Required:**
1. Add these secrets to your GitHub repository:
   - `SUPABASE_ACCESS_TOKEN`: Your Supabase access token
   - `SUPABASE_PROJECT_ID`: Your project ID (`hqdbdczxottbupwbupdu`)

2. The workflow will automatically run on the next push to main.

## Current Issue Resolution

The roulette game still shows 15-second betting phases because:

1. ✅ **Code Updated**: `BETTING_DURATION = 25000` is correct in the codebase
2. ❌ **Not Deployed**: The Edge Function hasn't been deployed to Supabase
3. 🎯 **Solution**: Deploy the `roulette-engine` function

## After Deployment

Once deployed:
- New roulette rounds will use 25-second betting phases
- Current rounds (created before deployment) will complete with old timing
- All future rounds will automatically use the new 25-second duration

## Project Information

- **Project ID**: `hqdbdczxottbupwbupdu`
- **Main Function**: `roulette-engine`
- **Location**: `/supabase/functions/roulette-engine/index.ts`

## Verification

After deployment, you can verify the changes by:
1. Watching the roulette game for new rounds
2. Observing the countdown timer shows 25 seconds instead of 15
3. Checking the Supabase dashboard function logs