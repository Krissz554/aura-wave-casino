import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useAdminStatus = (userId?: string) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

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
          setIsAdmin(!!data && !error);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    };

    checkAdminStatus();

    return () => {
      mounted = false;
    };
  }, [targetUserId]);

  return { isAdmin, loading };
};

// Hook to check multiple users' admin status at once
export const useMultipleAdminStatus = (userIds: string[]) => {
  const [adminStatuses, setAdminStatuses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

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

        if (mounted && !error) {
          const adminUserIds = new Set(data.map(admin => admin.user_id));
          const statuses: Record<string, boolean> = {};
          
          userIds.forEach(userId => {
            statuses[userId] = adminUserIds.has(userId);
          });

          setAdminStatuses(statuses);
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setAdminStatuses({});
          setLoading(false);
        }
      }
    };

    checkMultipleAdminStatus();

    return () => {
      mounted = false;
    };
  }, [userIds.join(',')]);

  return { adminStatuses, loading };
};