import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PollingXPStats {
  current_level: number;
  lifetime_xp: number;
  current_level_xp: number;
  xp_to_next_level: number;
  border_tier: number;
}

export function usePollingXPStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PollingXPStats | null>(null);
  const [loading, setLoading] = useState(true);
  const lastStatsRef = useRef<string>('');

  const fetchStats = async () => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      // Get from both sources and compare
      const [profileResult, userLevelStatsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('current_level, lifetime_xp, current_xp, xp_to_next_level, border_tier')
          .eq('id', user.id)
          .single(),
        supabase
          .from('user_level_stats')
          .select('current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier')
          .eq('user_id', user.id)
          .single()
      ]);

      // Use user_level_stats as primary, profiles as backup
      const primaryData = userLevelStatsResult.data || profileResult.data;
      
      if (primaryData) {
        const newStats = {
          current_level: primaryData.current_level || 1,
          lifetime_xp: Number(primaryData.lifetime_xp || 0),
          current_level_xp: Number(primaryData.current_level_xp || primaryData.current_xp || 0),
          xp_to_next_level: primaryData.xp_to_next_level || 100,
          border_tier: primaryData.border_tier || 1
        };

        // Check if stats actually changed
        const newStatsString = JSON.stringify(newStats);
        if (newStatsString !== lastStatsRef.current) {
          console.log('📊 POLLING: XP stats changed!', {
            old: lastStatsRef.current,
            new: newStatsString,
            timestamp: new Date().toISOString()
          });
          setStats(newStats);
          lastStatsRef.current = newStatsString;
        }
      }
    } catch (error) {
      console.error('📊 POLLING: Error fetching XP stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchStats();

    // Poll every 2 seconds for changes
    console.log('📊 POLLING: Starting XP polling for user:', user.id);
    const interval = setInterval(() => {
      fetchStats();
    }, 2000);

    return () => {
      console.log('📊 POLLING: Stopping XP polling');
      clearInterval(interval);
    };
  }, [user]);

  return {
    stats,
    loading,
    refetch: fetchStats
  };
}