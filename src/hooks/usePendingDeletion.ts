import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PendingDeletion {
  id: string;
  user_id: string;
  initiated_by: string;
  initiated_at: string;
  scheduled_deletion_time: string;
  status: string;
  completion_details?: any;
  created_at: string;
  updated_at: string;
}

export const usePendingDeletion = () => {
  const { user } = useAuth();
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkPendingDeletion = async () => {
      if (!user) {
        setPendingDeletion(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('pending_account_deletions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // No rows returned - no pending deletion
            setPendingDeletion(null);
          } else {
            console.error('Error checking pending deletion:', error);
            setError(error.message);
          }
        } else {
          setPendingDeletion(data);
        }
      } catch (err) {
        console.error('Error checking pending deletion:', err);
        setError('Failed to check pending deletion status');
      } finally {
        setLoading(false);
      }
    };

    checkPendingDeletion();
  }, [user]);

  const refreshPendingDeletion = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pending_account_deletions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setPendingDeletion(null);
        } else {
          setError(error.message);
        }
      } else {
        setPendingDeletion(data);
      }
    } catch (err) {
      console.error('Error refreshing pending deletion:', err);
      setError('Failed to refresh pending deletion status');
    } finally {
      setLoading(false);
    }
  };

  return {
    pendingDeletion,
    loading,
    error,
    hasPendingDeletion: !!pendingDeletion,
    refreshPendingDeletion
  };
};