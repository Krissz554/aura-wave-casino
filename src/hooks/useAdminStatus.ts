import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Global cache for admin status to prevent excessive queries
const adminStatusCache = new Map<string, { isAdmin: boolean; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (increased from 5)

export const useAdminStatus = (userId?: string) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const targetUserId = userId || user?.id;

  const checkAdminStatus = useCallback(async () => {
    if (!targetUserId) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Check cache first
    const cached = adminStatusCache.get(targetUserId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setIsAdmin(cached.isAdmin);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', targetUserId)
        .single();

      if (mountedRef.current) {
        const adminStatus = !!data && !error;
        
        // Cache the result
        adminStatusCache.set(targetUserId, {
          isAdmin: adminStatus,
          timestamp: Date.now()
        });
        
        if (error) {
          // Handle 406 errors gracefully - treat as "not admin" instead of error
          if (error.code === 'PGRST116' || error.message?.includes('406') || error.code === '406') {
            console.log('Admin status check: 406 error, treating as non-admin');
            setIsAdmin(false);
            setError(null); // Don't treat this as an error
          } else {
            console.error('Admin status check error:', error);
            setError(error.message);
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(adminStatus);
          setError(null);
        }
        setLoading(false);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        // Handle 406 errors gracefully
        if (err?.code === 'PGRST116' || err?.message?.includes('406') || err?.code === '406') {
          console.log('Admin status check exception: 406 error, treating as non-admin');
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
  }, [targetUserId]);

  useEffect(() => {
    mountedRef.current = true;

    const fetchStatus = async () => {
      await checkAdminStatus();
    };

    fetchStatus();

    return () => {
      mountedRef.current = false;
    };
  }, [checkAdminStatus]);

  return { isAdmin, loading, error, refetch: checkAdminStatus };
};

// Hook to check multiple users' admin status at once
export const useMultipleAdminStatus = (userIds: string[]) => {
  const [adminStatuses, setAdminStatuses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const checkMultipleAdminStatus = useCallback(async () => {
    if (userIds.length === 0) {
      setAdminStatuses({});
      setLoading(false);
      return;
    }

    // Check cache first for all user IDs
    const uncachedUserIds: string[] = [];
    const cachedStatuses: Record<string, boolean> = {};
    
    userIds.forEach(userId => {
      const cached = adminStatusCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        cachedStatuses[userId] = cached.isAdmin;
      } else {
        uncachedUserIds.push(userId);
      }
    });

    // If all users are cached, return immediately
    if (uncachedUserIds.length === 0) {
      setAdminStatuses(cachedStatuses);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .in('user_id', uncachedUserIds);

      if (mountedRef.current) {
        if (error) {
          // Handle 406 errors gracefully - treat as "not admin" instead of error
          if (error.code === 'PGRST116' || error.message?.includes('406') || error.code === '406') {
            console.log('Multiple admin status check: 406 error, treating all as non-admin');
            const statuses: Record<string, boolean> = { ...cachedStatuses };
            userIds.forEach(userId => {
              if (!cachedStatuses[userId]) {
                statuses[userId] = false;
                // Cache the "not admin" result
                adminStatusCache.set(userId, {
                  isAdmin: false,
                  timestamp: Date.now()
                });
              }
            });
            setAdminStatuses(statuses);
            setError(null); // Don't treat this as an error
          } else {
            console.error('Multiple admin status check error:', error);
            setError(error.message);
            setAdminStatuses(cachedStatuses);
          }
        } else {
          const adminUserIds = new Set(data.map(admin => admin.user_id));
          const statuses: Record<string, boolean> = { ...cachedStatuses };
          
          userIds.forEach(userId => {
            if (!cachedStatuses[userId]) {
              const isAdmin = adminUserIds.has(userId);
              statuses[userId] = isAdmin;
              // Cache the result
              adminStatusCache.set(userId, {
                isAdmin,
                timestamp: Date.now()
              });
            }
          });

          setAdminStatuses(statuses);
          setError(null);
        }
        setLoading(false);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        // Handle 406 errors gracefully
        if (err?.code === 'PGRST116' || err?.message?.includes('406') || err?.code === '406') {
          console.log('Multiple admin status check exception: 406 error, treating all as non-admin');
          const statuses: Record<string, boolean> = { ...cachedStatuses };
          userIds.forEach(userId => {
            if (!cachedStatuses[userId]) {
              statuses[userId] = false;
              // Cache the "not admin" result
              adminStatusCache.set(userId, {
                isAdmin: false,
                timestamp: Date.now()
              });
            }
          });
          setAdminStatuses(statuses);
          setError(null); // Don't treat this as an error
        } else {
          console.error('Multiple admin status check exception:', err);
          setError(err?.message || 'Unknown error');
          setAdminStatuses(cachedStatuses);
        }
        setLoading(false);
      }
    }
  }, [userIds.join(',')]);

  useEffect(() => {
    mountedRef.current = true;

    const fetchStatuses = async () => {
      await checkMultipleAdminStatus();
    };

    fetchStatuses();

    return () => {
      mountedRef.current = false;
    };
  }, [checkMultipleAdminStatus]);

  return { adminStatuses, loading, error, refetch: checkMultipleAdminStatus };
};