-- Create a function to completely delete a user account
-- This function will be called by the client and handle all deletion logic

CREATE OR REPLACE FUNCTION public.delete_user_account_complete(user_id_to_delete UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    deleted_count INTEGER := 0;
    error_message TEXT;
BEGIN
    -- Log the deletion attempt
    RAISE NOTICE 'Starting complete deletion for user: %', user_id_to_delete;
    
    -- Delete from all related tables (in correct order to avoid foreign key constraints)
    -- Delete from notifications
    DELETE FROM public.notifications WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % notifications', deleted_count;
    
    -- Delete from tips (both sent and received)
    DELETE FROM public.tips WHERE from_user_id = user_id_to_delete OR to_user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % tips', deleted_count;
    
    -- Delete from user_achievements
    DELETE FROM public.user_achievements WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user_achievements', deleted_count;
    
    -- Delete from user_daily_logins
    DELETE FROM public.user_daily_logins WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user_daily_logins', deleted_count;
    
    -- Delete from user_level_stats
    DELETE FROM public.user_level_stats WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user_level_stats', deleted_count;
    
    -- Delete from game_history
    DELETE FROM public.game_history WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % game_history records', deleted_count;
    
    -- Delete from game_stats
    DELETE FROM public.game_stats WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % game_stats records', deleted_count;
    
    -- Delete from case_rewards
    DELETE FROM public.case_rewards WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % case_rewards', deleted_count;
    
    -- Delete from free_case_claims
    DELETE FROM public.free_case_claims WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % free_case_claims', deleted_count;
    
    -- Delete from level_daily_cases
    DELETE FROM public.level_daily_cases WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % level_daily_cases', deleted_count;
    
    -- Delete from user_rate_limits
    DELETE FROM public.user_rate_limits WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user_rate_limits', deleted_count;
    
    -- Delete from admin_users
    DELETE FROM public.admin_users WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % admin_users records', deleted_count;
    
    -- Delete from chat_messages
    DELETE FROM public.chat_messages WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % chat_messages', deleted_count;
    
    -- Delete from unlocked_achievements
    DELETE FROM public.unlocked_achievements WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % unlocked_achievements', deleted_count;
    
    -- Delete from live_bet_feed
    DELETE FROM public.live_bet_feed WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % live_bet_feed records', deleted_count;
    
    -- Delete from crash_bets
    DELETE FROM public.crash_bets WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % crash_bets', deleted_count;
    
    -- Delete from roulette_bets
    DELETE FROM public.roulette_bets WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % roulette_bets', deleted_count;
    
    -- Delete from tower_games
    DELETE FROM public.tower_games WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % tower_games', deleted_count;
    
    -- Delete from roulette_client_seeds
    DELETE FROM public.roulette_client_seeds WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % roulette_client_seeds', deleted_count;
    
    -- Delete from audit_logs
    DELETE FROM public.audit_logs WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % audit_logs', deleted_count;
    
    -- Finally, delete from profiles table
    DELETE FROM public.profiles WHERE id = user_id_to_delete;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % profiles records', deleted_count;
    
    -- Return success result
    result := json_build_object(
        'success', true,
        'message', 'User account completely deleted from all tables',
        'user_id', user_id_to_delete,
        'deleted_at', now()
    );
    
    RAISE NOTICE '=== ACCOUNT DELETION COMPLETED SUCCESSFULLY ===';
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        error_message := SQLERRM;
        RAISE NOTICE 'Error during account deletion: %', error_message;
        
        -- Return error result
        result := json_build_object(
            'success', false,
            'error', error_message,
            'user_id', user_id_to_delete
        );
        
        RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account_complete(UUID) TO authenticated;

-- Create a trigger to handle auth.users deletion
-- This will be called by the client after the database deletion
CREATE OR REPLACE FUNCTION public.handle_user_deletion_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function will be called by the client to handle auth.users deletion
    -- The actual auth.users deletion needs to be done client-side with admin privileges
    RAISE NOTICE 'User % marked for auth deletion', OLD.id;
    RETURN OLD;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS user_deletion_trigger ON public.profiles;
CREATE TRIGGER user_deletion_trigger
    AFTER DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_deletion_trigger();