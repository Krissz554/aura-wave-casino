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
      // Try to get stats from profiles table first (primary source)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('current_level, lifetime_xp, current_xp, xp_to_next_level, border_tier')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setLevelStats({
          current_level: profileData.current_level || 1,
          lifetime_xp: profileData.lifetime_xp || 0,
          current_level_xp: profileData.current_xp || 0,
          xp_to_next_level: profileData.xp_to_next_level || 1000,
          border_tier: profileData.border_tier || 1
        });
      } else {
        // Fallback to default stats
        setLevelStats({
          current_level: 1,
          lifetime_xp: 0,
          current_level_xp: 0,
          xp_to_next_level: 1000,
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
        xp_to_next_level: 1000,
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
    
    // Set up real-time subscription for level stats (profiles table)
    console.log('📊 Setting up level stats subscription for user:', user.id);
    const subscription = supabase
      .channel(`level_stats_${user.id}_${Date.now()}`)
              .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          },
        (payload) => {
          console.log('📊 LEVEL STATS UPDATE:', payload);
          if (payload.new) {
            const newData = payload.new as any;
            setLevelStats({
              current_level: newData.current_level || 1,
              lifetime_xp: newData.lifetime_xp || 0,
              current_level_xp: newData.current_xp || 0,
              xp_to_next_level: newData.xp_to_next_level || 1000,
              border_tier: newData.border_tier || 1
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