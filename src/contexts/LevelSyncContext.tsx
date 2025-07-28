import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

// REBUILT FOR SINGLE XP SYSTEM
// Only tracks total_xp from profiles table
interface LevelStats {
  current_level: number;
  total_xp: number;           // SINGLE SOURCE OF TRUTH
  current_level_xp: number;   // Calculated from total_xp
  xp_to_next_level: number;   // Calculated from total_xp
  border_tier: number;
  progress_percentage: number; // Calculated from total_xp
}

interface LevelSyncContextType {
  levelStats: LevelStats | null;
  isLoading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
}

const LevelSyncContext = createContext<LevelSyncContextType | undefined>(undefined);

interface LevelSyncProviderProps {
  children: ReactNode;
}

export const LevelSyncProvider: React.FC<LevelSyncProviderProps> = ({ children }) => {
  const [levelStats, setLevelStats] = useState<LevelStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchStats = async () => {
    if (!user) {
      setLevelStats(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch ONLY from profiles table - single source of truth
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          current_level,
          total_xp,
          border_tier
        `)
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (profileData) {
        // Use database function to get calculated level info
        const { data: levelInfo, error: levelError } = await supabase
          .rpc('get_level_info', { user_total_xp: profileData.total_xp || 0 });

        if (levelError) {
          console.warn('Could not fetch level info:', levelError);
          // Fallback to basic info
          setLevelStats({
            current_level: profileData.current_level || 1,
            total_xp: profileData.total_xp || 0,
            current_level_xp: 0,
            xp_to_next_level: 100,
            border_tier: profileData.border_tier || 1,
            progress_percentage: 0
          });
        } else if (levelInfo && levelInfo.length > 0) {
          const info = levelInfo[0];
          setLevelStats({
            current_level: info.current_level,
            total_xp: profileData.total_xp || 0,
            current_level_xp: info.current_level_xp,
            xp_to_next_level: info.xp_to_next_level,
            border_tier: profileData.border_tier || 1,
            progress_percentage: info.progress_percentage
          });
        }
      }
    } catch (err) {
      console.error('Error fetching level stats:', err);
      setError('Failed to load level stats');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time updates on profiles table
    const channel = supabase
      .channel('profile_level_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        async (payload) => {
          console.log('Profile XP change detected:', payload);
          
          if (payload.new && 'total_xp' in payload.new) {
            const newTotalXP = payload.new.total_xp || 0;
            
            try {
              // Get updated level info from database function
              const { data: levelInfo, error: levelError } = await supabase
                .rpc('get_level_info', { user_total_xp: newTotalXP });

              if (levelError) {
                console.warn('Could not fetch updated level info:', levelError);
                // Fallback update
                setLevelStats(prev => prev ? {
                  ...prev,
                  total_xp: newTotalXP,
                  current_level: payload.new.current_level || prev.current_level,
                  border_tier: payload.new.border_tier || prev.border_tier
                } : null);
              } else if (levelInfo && levelInfo.length > 0) {
                const info = levelInfo[0];
                setLevelStats({
                  current_level: info.current_level,
                  total_xp: newTotalXP,
                  current_level_xp: info.current_level_xp,
                  xp_to_next_level: info.xp_to_next_level,
                  border_tier: payload.new.border_tier || 1,
                  progress_percentage: info.progress_percentage
                });
              }
            } catch (err) {
              console.error('Error updating level stats:', err);
              // Fallback to basic update
              setLevelStats(prev => prev ? {
                ...prev,
                total_xp: newTotalXP,
                current_level: payload.new.current_level || prev.current_level,
                border_tier: payload.new.border_tier || prev.border_tier
              } : null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const refreshStats = async () => {
    await fetchStats();
  };

  return (
    <LevelSyncContext.Provider
      value={{
        levelStats,
        isLoading,
        error,
        refreshStats,
      }}
    >
      {children}
    </LevelSyncContext.Provider>
  );
};

export const useLevelSync = () => {
  const context = useContext(LevelSyncContext);
  if (context === undefined) {
    throw new Error('useLevelSync must be used within a LevelSyncProvider');
  }
  return context;
};