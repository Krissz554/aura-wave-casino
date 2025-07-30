-- Create the pending_account_deletions table and related functions
-- Run this script immediately to fix the deletion system

BEGIN;

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

COMMIT;

-- Show success message
SELECT 'Pending account deletions table and functions created successfully!' as result;