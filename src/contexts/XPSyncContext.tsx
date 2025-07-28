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

  // Force refresh both data sources - PRIORITIZE profiles (levelSync) for decimal precision
  const forceFullRefresh = useCallback(async () => {
    if (!user) return;
    
    console.log('🔄 XP SYNC: Force refreshing all XP data sources (prioritizing profiles/decimals)');
    
    try {
      // Refresh profiles table first (has decimal precision), then user_level_stats
      await levelSyncRefresh(); // profiles table with decimal XP
      console.log('✅ XP SYNC: Profiles (decimal) refreshed');
      
      // Then refresh user_level_stats as backup
      await userLevelStatsRefresh(); // user_level_stats table with integer XP
      console.log('✅ XP SYNC: User level stats refreshed');
      
      console.log('✅ XP SYNC: All data sources refreshed successfully');
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