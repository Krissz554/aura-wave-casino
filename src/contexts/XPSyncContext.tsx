import { createContext, useContext, useEffect, useCallback } from 'react';
import { useLevelSync } from './LevelSyncContext';
import { useUserLevelStats } from '@/hooks/useUserLevelStats';
import { useAuth } from './AuthContext';

interface XPSyncContextType {
  forceFullRefresh: () => Promise<void>;
}

const XPSyncContext = createContext<XPSyncContextType | undefined>(undefined);

export function XPSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { forceRefresh: levelSyncRefresh } = useLevelSync();
  const { refetch: userLevelStatsRefresh } = useUserLevelStats();

  // Force refresh both level/XP data sources (both now use user_level_stats)
  const forceFullRefresh = useCallback(async () => {
    if (!user) return;
    
    try {
      // Refresh both contexts that use user_level_stats table
      await levelSyncRefresh(); // LevelSyncContext using user_level_stats
      
      // Also refresh the direct user_level_stats hook
      await userLevelStatsRefresh(); // Direct user_level_stats table access
    } catch (error) {
      console.error('❌ XP SYNC: Error refreshing data sources:', error);
    }
  }, [user, levelSyncRefresh, userLevelStatsRefresh]);

  return (
    <XPSyncContext.Provider value={{ forceFullRefresh }}>
      {children}
    </XPSyncContext.Provider>
  );
}

export function useXPSync() {
  const context = useContext(XPSyncContext);
  if (context === undefined) {
    throw new Error('useXPSync must be used within a XPSyncProvider');
  }
  return context;
}