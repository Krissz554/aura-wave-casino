import { useState, useEffect, useContext, createContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LevelStats {
  current_level: number;
  lifetime_xp: number;
  current_level_xp: number;
  xp_to_next_level: number;
  border_tier: number;
}

interface LevelSyncContextType {
  levelStats: LevelStats | null;
  loading: boolean;
  refreshStats: () => void;
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
      const { data, error } = await supabase
        .from('user_level_stats')
        .select('current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        // Create initial stats if they don't exist
        const { data: newStats, error: insertError } = await supabase
          .from('user_level_stats')
          .insert({ user_id: user.id })
          .select('current_level, lifetime_xp, current_level_xp, xp_to_next_level, border_tier')
          .single();

        if (insertError) throw insertError;
        setLevelStats(newStats);
      } else {
        setLevelStats(data);
      }
    } catch (error) {
      console.error('Error fetching level stats:', error);
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
    console.log('📊 Setting up level stats subscription for user:', user.id);
    const subscription = supabase
      .channel(`level_stats_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_level_stats',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📊 LEVEL STATS UPDATE:', payload);
          if (payload.new) {
            const newData = payload.new as any;
            setLevelStats({
              current_level: newData.current_level,
              lifetime_xp: newData.lifetime_xp,
              current_level_xp: newData.current_level_xp,
              xp_to_next_level: newData.xp_to_next_level,
              border_tier: newData.border_tier
            });
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📊 Level stats subscription status:', status);
        if (err) console.error('📊 Subscription error:', err);
      });

    return () => {
      console.log('📊 Cleaning up level stats subscription');
      supabase.removeChannel(subscription);
    };
  }, [user]);

  return (
    <LevelSyncContext.Provider value={{ levelStats, loading, refreshStats: fetchStats }}>
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