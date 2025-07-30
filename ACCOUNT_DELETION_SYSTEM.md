# Account Deletion System

## Overview

The account deletion system has been redesigned to meet the following requirements:

1. **Admin initiates deletion** with confirmation
2. **User site locks** with 30-second countdown popup
3. **Server-side automatic deletion** after 30 seconds
4. **Works offline** - deletion proceeds even if user is not online

## System Architecture

### 1. Admin Panel (Frontend)
- **File**: `src/components/AdminPanel.tsx`
- **Function**: `deleteUserAccount()`
- **Process**:
  1. Admin clicks "Delete" button
  2. Double confirmation modal (username + "DELETE")
  3. Creates pending deletion record in database
  4. Sends notification to user
  5. Shows success message with scheduled time

### 2. User Interface (Frontend)
- **File**: `src/components/AccountDeletionHandler.tsx`
- **Features**:
  - **Full-screen overlay** that locks the entire site
  - **Prominent "SITE LOCKED" message**
  - **30-second countdown timer**
  - **Visual progress bar**
  - **Cannot be dismissed**
  - **Automatically checks for deletion completion**

### 3. Database Layer
- **File**: `supabase/migrations/20250127000050-create-complete-user-deletion-function.sql`
- **Components**:
  - `pending_account_deletions` table
  - `delete_user_complete()` function
  - `process_pending_account_deletions()` function
  - Comprehensive data cleanup from all tables

### 4. Automated Processing (Backend)
- **File**: `supabase/functions/process-pending-deletions/index.ts`
- **Trigger**: GitHub Actions workflow every minute
- **Process**:
  1. Checks for pending deletions that are due
  2. Executes deletion for each qualifying record
  3. Updates status and logs results
  4. Sends completion notification

## Complete Flow

### Step 1: Admin Initiates Deletion
```
Admin Panel → deleteUserAccount() → Creates pending_account_deletions record → Sends notification
```

### Step 2: User Experience
```
User receives notification → Site locks with overlay → 30-second countdown → Deletion processing
```

### Step 3: Server Processing
```
GitHub Actions (every minute) → Calls Edge Function → Checks pending deletions → Executes deletions
```

### Step 4: Data Cleanup
The system deletes data from all tables in the correct order:
- notifications
- tips (sent/received)
- user_achievements
- user_daily_logins
- user_level_stats
- game_history
- game_stats
- case_rewards
- free_case_claims
- level_daily_cases
- user_rate_limits
- admin_users
- chat_messages
- unlocked_achievements
- live_bet_feed
- crash_bets
- roulette_bets
- tower_games
- roulette_client_seeds
- audit_logs (partial)
- profiles
- auth.users (Supabase Auth)

## Key Features

### ✅ Requirements Met

1. **Admin clicks final deletion button** ✓
   - Double confirmation with username and "DELETE" verification

2. **User site lock with 30-second countdown** ✓
   - Full-screen overlay with prominent lock icon
   - Clear countdown timer and progress bar
   - "SITE LOCKED" message
   - Cannot be dismissed

3. **Server handles deletion automatically** ✓
   - Database function processes pending deletions
   - 30-second delay enforced on server-side
   - Automated via scheduled job

4. **Works when user is offline** ✓
   - Server-side processing is independent of user presence
   - GitHub Actions runs every minute regardless
   - Pending deletions table persists the schedule

### 🔧 Technical Implementation

**Database Schema:**
```sql
CREATE TABLE pending_account_deletions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    initiated_by UUID NOT NULL,
    scheduled_deletion_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending',
    completion_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Edge Function:**
- Processes deletions every minute
- Comprehensive error handling
- Detailed logging and audit trail

**Frontend Components:**
- Site-locking overlay (cannot be bypassed)
- Real-time countdown display
- Automatic status checking

## Deployment

### 1. Deploy the System
```bash
chmod +x deploy-deletion-processor.sh
./deploy-deletion-processor.sh
```

### 2. Set up GitHub Secrets
Add these secrets to your GitHub repository:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key

### 3. Test the System
```bash
./test-deletion-system.sh
```

### 4. Alternative Scheduling Options

**Option A: Cron Job (Linux/macOS)**
```bash
# Add to crontab -e
* * * * * curl -X POST 'YOUR_SUPABASE_URL/functions/v1/process-pending-deletions' -H 'Authorization: Bearer YOUR_ANON_KEY' -H 'Content-Type: application/json' --silent --output /dev/null
```

**Option B: Cloud Provider Scheduled Functions**
- Vercel: API routes with Vercel Cron
- Netlify: Scheduled Netlify Functions
- AWS: CloudWatch Events + Lambda
- Google Cloud: Cloud Scheduler + Cloud Functions

**Option C: Monitoring Services**
- UptimeRobot: Ping every minute
- Pingdom: Uptime monitoring with webhooks

## Security Considerations

1. **Admin-only access**: Only users in `admin_users` table can initiate deletions
2. **Audit trail**: All actions logged in `audit_logs` table
3. **Double confirmation**: Requires username and "DELETE" verification
4. **RLS policies**: Row-level security on all tables
5. **Service role**: Edge Function uses service role for admin operations

## Error Handling

1. **Database errors**: Logged and tracked per deletion
2. **Network failures**: Retry on next scheduled run
3. **Partial failures**: Individual deletion errors don't stop others
4. **Audit logging**: Comprehensive logging at each step

## Monitoring

- Check GitHub Actions logs for processing results
- Monitor `pending_account_deletions` table for stuck deletions
- Review `audit_logs` for deletion history
- Edge Function logs available in Supabase dashboard

## Testing Checklist

- [ ] Admin can initiate deletion with proper confirmation
- [ ] User receives notification and site locks immediately
- [ ] Countdown timer works correctly (30 seconds)
- [ ] Server processes deletion after 30 seconds
- [ ] All user data is completely removed
- [ ] System works when user is offline
- [ ] Audit trail is properly maintained
- [ ] Error cases are handled gracefully