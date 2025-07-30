-- Create a comprehensive user deletion function
-- This function will delete all user data and the user from auth.users
CREATE OR REPLACE FUNCTION public.delete_user_complete(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deletion_result JSONB;
    deleted_tables TEXT[] := ARRAY[]::TEXT[];
    error_messages TEXT[] := ARRAY[]::TEXT[];
    success BOOLEAN := TRUE;
BEGIN
    -- Log the deletion attempt
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (user_uuid, 'account_deletion_initiated', jsonb_build_object('timestamp', now()));
    
    -- Delete from all user-related tables
    -- Delete notifications
    DELETE FROM notifications WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'notifications'); END IF;
    
    -- Delete tips (both sent and received)
    DELETE FROM tips WHERE from_user_id = user_uuid OR to_user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'tips'); END IF;
    
    -- Delete user achievements
    DELETE FROM user_achievements WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'user_achievements'); END IF;
    
    -- Delete user daily logins
    DELETE FROM user_daily_logins WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'user_daily_logins'); END IF;
    
    -- Delete user level stats
    DELETE FROM user_level_stats WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'user_level_stats'); END IF;
    
    -- Delete game history
    DELETE FROM game_history WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'game_history'); END IF;
    
    -- Delete game stats
    DELETE FROM game_stats WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'game_stats'); END IF;
    
    -- Delete case rewards
    DELETE FROM case_rewards WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'case_rewards'); END IF;
    
    -- Delete free case claims
    DELETE FROM free_case_claims WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'free_case_claims'); END IF;
    
    -- Delete level daily cases
    DELETE FROM level_daily_cases WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'level_daily_cases'); END IF;
    
    -- Delete user rate limits
    DELETE FROM user_rate_limits WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'user_rate_limits'); END IF;
    
    -- Delete admin users
    DELETE FROM admin_users WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'admin_users'); END IF;
    
    -- Delete chat messages
    DELETE FROM chat_messages WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'chat_messages'); END IF;
    
    -- Delete unlocked achievements
    DELETE FROM unlocked_achievements WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'unlocked_achievements'); END IF;
    
    -- Delete live bet feed
    DELETE FROM live_bet_feed WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'live_bet_feed'); END IF;
    
    -- Delete crash bets
    DELETE FROM crash_bets WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'crash_bets'); END IF;
    
    -- Delete roulette bets
    DELETE FROM roulette_bets WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'roulette_bets'); END IF;
    
    -- Delete tower games
    DELETE FROM tower_games WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'tower_games'); END IF;
    
    -- Delete roulette client seeds
    DELETE FROM roulette_client_seeds WHERE user_id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'roulette_client_seeds'); END IF;
    
    -- Delete audit logs (except this one)
    DELETE FROM audit_logs WHERE user_id = user_uuid AND action != 'account_deletion_initiated';
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'audit_logs'); END IF;
    
    -- Finally, delete from profiles table
    DELETE FROM profiles WHERE id = user_uuid;
    IF FOUND THEN deleted_tables := array_append(deleted_tables, 'profiles'); END IF;
    
    -- Attempt to delete from auth.users (this requires admin privileges)
    BEGIN
        DELETE FROM auth.users WHERE id = user_uuid;
        IF FOUND THEN 
            deleted_tables := array_append(deleted_tables, 'auth.users');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        error_messages := array_append(error_messages, 'auth.users: ' || SQLERRM);
        success := FALSE;
    END;
    
    -- Log the completion
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (user_uuid, 'account_deletion_completed', jsonb_build_object(
        'timestamp', now(),
        'deleted_tables', deleted_tables,
        'success', success,
        'errors', error_messages
    ));
    
    -- Return result
    deletion_result := jsonb_build_object(
        'success', success,
        'deleted_tables', deleted_tables,
        'errors', error_messages,
        'user_id', user_uuid
    );
    
    RETURN deletion_result;
    
EXCEPTION WHEN OTHERS THEN
    -- Log any errors
    INSERT INTO audit_logs (user_id, action, details)
    VALUES (user_uuid, 'account_deletion_error', jsonb_build_object(
        'timestamp', now(),
        'error', SQLERRM
    ));
    
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', SQLERRM,
        'user_id', user_uuid
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_complete(UUID) TO authenticated;

-- Create a trigger to automatically clean up audit logs for deleted users
CREATE OR REPLACE FUNCTION public.cleanup_audit_logs_on_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Delete audit logs for the deleted user (except the deletion logs)
    DELETE FROM audit_logs 
    WHERE user_id = OLD.id 
    AND action NOT IN ('account_deletion_initiated', 'account_deletion_completed', 'account_deletion_error');
    
    RETURN OLD;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS cleanup_audit_logs_trigger ON profiles;
CREATE TRIGGER cleanup_audit_logs_trigger
    AFTER DELETE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.cleanup_audit_logs_on_user_deletion();

-- Create a table to track pending account deletions
CREATE TABLE IF NOT EXISTS public.pending_account_deletions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    initiated_by UUID NOT NULL, -- admin who initiated
    initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    scheduled_deletion_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    completion_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for the pending deletions table
ALTER TABLE public.pending_account_deletions ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage pending deletions
CREATE POLICY "admin_can_manage_pending_deletions" ON public.pending_account_deletions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );

-- Users can view their own pending deletion
CREATE POLICY "users_can_view_own_pending_deletion" ON public.pending_account_deletions
    FOR SELECT USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_account_deletions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create a function to process pending account deletions
CREATE OR REPLACE FUNCTION public.process_pending_account_deletions()
RETURNS TABLE(processed_count INTEGER, details JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pending_deletion RECORD;
    deletion_result JSONB;
    processed_count INTEGER := 0;
    results JSONB[] := ARRAY[]::JSONB[];
    current_time TIMESTAMP WITH TIME ZONE := now();
BEGIN
    -- Find all pending deletions that are due
    FOR pending_deletion IN 
        SELECT * FROM public.pending_account_deletions 
        WHERE status = 'pending' 
        AND scheduled_deletion_time <= current_time
        ORDER BY scheduled_deletion_time ASC
    LOOP
        BEGIN
            -- Log the processing attempt
            INSERT INTO audit_logs (user_id, action, details)
            VALUES (pending_deletion.user_id, 'scheduled_deletion_processing', jsonb_build_object(
                'deletion_id', pending_deletion.id,
                'scheduled_time', pending_deletion.scheduled_deletion_time,
                'processing_time', current_time
            ));

            -- Call the deletion function
            SELECT * INTO deletion_result FROM public.delete_user_complete(pending_deletion.user_id);
            
            -- Update the pending deletion record
            UPDATE public.pending_account_deletions 
            SET 
                status = CASE WHEN (deletion_result->>'success')::boolean THEN 'completed' ELSE 'failed' END,
                completion_details = deletion_result,
                updated_at = current_time
            WHERE id = pending_deletion.id;
            
            -- Send completion notification to user (if they still exist)
            IF (deletion_result->>'success')::boolean THEN
                -- Try to insert completion notification (will fail if user is deleted, which is fine)
                BEGIN
                    INSERT INTO notifications (user_id, type, title, message, data)
                    VALUES (
                        pending_deletion.user_id,
                        'admin_message',
                        'Account Deletion Completed',
                        'Your account has been permanently deleted as scheduled.',
                        jsonb_build_object(
                            'deletion_completed', true,
                            'deletion_id', pending_deletion.id,
                            'completion_time', current_time,
                            'deleted_tables', deletion_result->'deleted_tables'
                        )
                    );
                EXCEPTION WHEN OTHERS THEN
                    -- User already deleted, notification can't be sent (expected)
                    NULL;
                END;
            END IF;
            
            processed_count := processed_count + 1;
            results := array_append(results, jsonb_build_object(
                'deletion_id', pending_deletion.id,
                'user_id', pending_deletion.user_id,
                'success', (deletion_result->>'success')::boolean,
                'details', deletion_result
            ));
            
        EXCEPTION WHEN OTHERS THEN
            -- Update the pending deletion record with error
            UPDATE public.pending_account_deletions 
            SET 
                status = 'failed',
                completion_details = jsonb_build_object(
                    'error', SQLERRM,
                    'error_time', current_time
                ),
                updated_at = current_time
            WHERE id = pending_deletion.id;
            
            -- Log the error
            INSERT INTO audit_logs (user_id, action, details)
            VALUES (pending_deletion.user_id, 'scheduled_deletion_error', jsonb_build_object(
                'deletion_id', pending_deletion.id,
                'error', SQLERRM,
                'error_time', current_time
            ));
            
            results := array_append(results, jsonb_build_object(
                'deletion_id', pending_deletion.id,
                'user_id', pending_deletion.user_id,
                'success', false,
                'error', SQLERRM
            ));
        END;
    END LOOP;
    
    RETURN QUERY SELECT processed_count, array_to_json(results)::jsonb;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.process_pending_account_deletions() TO authenticated;