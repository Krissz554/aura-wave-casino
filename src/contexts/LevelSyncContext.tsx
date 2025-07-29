import { useState, useEffect, useContext, createContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LevelStats {
  current_level: number;
  lifetime_xp: number; // Main XP tracker with decimal precision
  current_level_xp: number; // XP within current level (decimal precision)
  xp_to_next_level: number;
  border_tier: number;
}

interface LevelSyncContextType {
  levelStats: LevelStats | null;
  loading: boolean;
  refreshStats: () => void;
  forceRefresh: () => Promise<void>;
}

const LevelSyncContext = createContext<LevelSyncContextType | undefined>(undefined);

export function LevelSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [levelStats, setLevelStats] = useState<LevelStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!user) {
      setLevelStats(null);
      setLoading(false);
      return;
    }

    try {
      // Get stats from profiles table with decimal precision support
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('current_level, lifetime_xp, current_xp, xp_to_next_level, border_tier')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 is "not found" which is expected for new users
        throw profileError;
      }

      if (profileData) {
        setLevelStats({
          current_level: profileData.current_level || 1,
          lifetime_xp: Number(profileData.lifetime_xp || 0), // Ensure it's a number with decimal precision
          current_level_xp: Number(profileData.current_xp || 0), // Map current_xp to current_level_xp with decimals
          xp_to_next_level: profileData.xp_to_next_level || 100,
          border_tier: profileData.border_tier || 1
        });
      } else {
        // Fallback to default stats for new users
        setLevelStats({
          current_level: 1,
          lifetime_xp: 0,
          current_level_xp: 0,
          xp_to_next_level: 100,
          border_tier: 1
        });
      }
    } catch (error) {
      console.error('Error fetching level stats:', error);
      // Set default stats on error
      setLevelStats({
        current_level: 1,
        lifetime_xp: 0,
        current_level_xp: 0,
        xp_to_next_level: 100,
        border_tier: 1
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLevelStats(null);
      setLoading(false);
      return;
    }

    fetchStats();
    
    // Set up real-time subscription for level stats
    const subscription = supabase
      .channel(`xp_tracking_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new) {
            const newData = payload.new as any;
            const newStats = {
              current_level: newData.current_level || 1,
              lifetime_xp: Number(newData.lifetime_xp || 0), // Ensure decimal precision
              current_level_xp: Number(newData.current_xp || 0), // Map current_xp with decimals
              xp_to_next_level: newData.xp_to_next_level || 100,
              border_tier: newData.border_tier || 1
            };
            
            setLevelStats(newStats);
          }
        }
      )
      .subscribe((status, err) => {
        if (err) console.error('📊 XP tracking subscription error:', err);
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  // Force refresh function for immediate updates
  const forceRefresh = async () => {
    setLoading(true);
    await fetchStats();
  };

  return (
    <LevelSyncContext.Provider value={{ levelStats, loading, refreshStats: fetchStats, forceRefresh }}>
      {children}
    </LevelSyncContext.Provider>
  );
}

export function useLevelSync() {
  const context = useContext(LevelSyncContext);
  if (context === undefined) {
    throw new Error('useLevelSync must be used within a LevelSyncProvider');
  }
  return context;
}