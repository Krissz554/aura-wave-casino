import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useAdminStatus = (userId?: string) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    let mounted = true;

    const checkAdminStatus = async () => {
      if (!targetUserId) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', targetUserId)
          .single();

        if (mounted) {
          if (error) {
            // Handle 406 errors gracefully - treat as "not admin" instead of error
            if (error.code === 'PGRST116' || error.message?.includes('406')) {
              setIsAdmin(false);
              setError(null); // Don't treat this as an error
            } else {
              console.error('Admin status check error:', error);
              setError(error.message);
              setIsAdmin(false);
            }
          } else {
            setIsAdmin(!!data);
            setError(null);
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          // Handle 406 errors gracefully
          if (err?.code === 'PGRST116' || err?.message?.includes('406')) {
            setIsAdmin(false);
            setError(null); // Don't treat this as an error
          } else {
            console.error('Admin status check exception:', err);
            setError(err?.message || 'Unknown error');
            setIsAdmin(false);
          }
          setLoading(false);
        }
      }
    };

    checkAdminStatus();

    return () => {
      mounted = false;
    };
  }, [targetUserId]);

  return { isAdmin, loading, error };
};

// Hook to check multiple users' admin status at once
export const useMultipleAdminStatus = (userIds: string[]) => {
  const [adminStatuses, setAdminStatuses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkMultipleAdminStatus = async () => {
      if (userIds.length === 0) {
        setAdminStatuses({});
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('user_id')
          .in('user_id', userIds);

        if (mounted) {
          if (error) {
            // Handle 406 errors gracefully - treat as "not admin" instead of error
            if (error.code === 'PGRST116' || error.message?.includes('406')) {
              const statuses: Record<string, boolean> = {};
              userIds.forEach(userId => {
                statuses[userId] = false;
              });
              setAdminStatuses(statuses);
              setError(null); // Don't treat this as an error
            } else {
              console.error('Multiple admin status check error:', error);
              setError(error.message);
              setAdminStatuses({});
            }
          } else {
            const adminUserIds = new Set(data.map(admin => admin.user_id));
            const statuses: Record<string, boolean> = {};
            
            userIds.forEach(userId => {
              statuses[userId] = adminUserIds.has(userId);
            });

            setAdminStatuses(statuses);
            setError(null);
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          // Handle 406 errors gracefully
          if (err?.code === 'PGRST116' || err?.message?.includes('406')) {
            const statuses: Record<string, boolean> = {};
            userIds.forEach(userId => {
              statuses[userId] = false;
            });
            setAdminStatuses(statuses);
            setError(null); // Don't treat this as an error
          } else {
            console.error('Multiple admin status check exception:', err);
            setError(err?.message || 'Unknown error');
            setAdminStatuses({});
          }
          setLoading(false);
        }
      }
    };

    checkMultipleAdminStatus();

    return () => {
      mounted = false;
    };
  }, [userIds.join(',')]);

  return { adminStatuses, loading, error };
};