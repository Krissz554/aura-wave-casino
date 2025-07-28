
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export interface UserProfile {
  id: string
  username: string
  registration_date: string
  balance: number
  level: number
  xp: number
  current_level: number
  current_xp: number
  xp_to_next_level: number
  lifetime_xp: number
  total_wagered: number
  total_profit: number
  last_claim_time: string
  badges: string[]
  gameStats: {
    coinflip: { wins: number; losses: number; profit: number }
    crash: { wins: number; losses: number; profit: number }
    roulette: { wins: number; losses: number; profit: number }
    tower: { wins: number; losses: number; profit: number }
  }
}

export function useUserProfile() {
  const { user } = useAuth()
  const [userData, setUserData] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setUserData(null)
      setLoading(false)
      return
    }

    fetchUserProfile()
    
    // Set up real-time subscription for user_level_stats (primary data source)
    console.log('🔗 Setting up comprehensive stats subscription for user:', user.id);
    
    const statsChannel = supabase
      .channel(`user_stats_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_level_stats',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📊 USER STATS UPDATE RECEIVED:', payload);
          
          if (payload.new) {
            const newStats = payload.new as any;
            setUserData(prev => {
              if (!prev) return null;
              return {
                ...prev,
                // Update all level/XP/stats data from user_level_stats
                current_level: newStats.current_level,
                current_xp: newStats.current_level_xp,
                xp_to_next_level: newStats.xp_to_next_level,
                lifetime_xp: newStats.lifetime_xp,
                total_wagered: newStats.total_wagered,
                total_profit: newStats.total_profit,
        gameStats: {
          coinflip: {
            wins: newStats.coinflip_wins || 0,
            losses: Math.max(0, (newStats.coinflip_games || 0) - (newStats.coinflip_wins || 0)),
            profit: newStats.coinflip_profit || 0,
          },
          crash: {
            wins: newStats.crash_wins || 0,
            losses: Math.max(0, (newStats.crash_games || 0) - (newStats.crash_wins || 0)),
            profit: newStats.crash_profit || 0,
          },
          roulette: {
            wins: newStats.roulette_wins || 0,
            losses: Math.max(0, (newStats.roulette_games || 0) - (newStats.roulette_wins || 0)),
            profit: newStats.roulette_profit || 0,
          },
          tower: {
            wins: newStats.tower_wins || 0,
            losses: Math.max(0, (newStats.tower_games || 0) - (newStats.tower_wins || 0)),
            profit: newStats.tower_profit || 0,
          },
        },
              };
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('👤 PROFILE UPDATE RECEIVED:', payload);
          console.log('👤 Old balance:', payload.old?.balance, 'New balance:', payload.new?.balance);
          
          if (payload.new && payload.old) {
            // Only update profile-specific data (balance, username, etc.)
            if (payload.new.balance !== payload.old.balance) {
              console.log('✅ UPDATING BALANCE FROM', payload.old.balance, 'TO', payload.new.balance);
              console.log('💰 Balance change detected - updating user data');
              setUserData(prev => {
                if (!prev) return null;
                const updated = {
                  ...prev,
                  balance: payload.new.balance,
                  username: payload.new.username,
                  badges: payload.new.badges,
                };
                console.log('💰 Updated user data:', { oldBalance: prev.balance, newBalance: updated.balance });
                return updated;
              });
            } else {
              console.log('ℹ️ Profile update received but balance unchanged');
            }
          } else {
            console.log('⚠️ Profile update missing old or new data');
          }
        }
      )
      .subscribe((status) => {
        console.log('📊 Comprehensive stats subscription status:', status);
      });

    // Additional dedicated balance subscription for maximum reliability
    const balanceChannel = supabase
      .channel(`balance_updates_${user.id}_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('🏦 DEDICATED BALANCE UPDATE:', payload);
          
          if (payload.new && payload.new.balance !== undefined) {
            console.log('💰 BALANCE SYNC: Updating balance to', payload.new.balance);
            setUserData(prev => {
              if (!prev) return null;
              return {
                ...prev,
                balance: payload.new.balance,
                username: payload.new.username || prev.username,
                badges: payload.new.badges || prev.badges,
              };
            });
          }
        }
      )
      .subscribe();

    // Periodic balance refresh to ensure sync (every 10 seconds)
    const balanceRefreshInterval = setInterval(async () => {
      try {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .single();

        if (currentProfile) {
          setUserData(prev => {
            if (!prev) return null;
            if (prev.balance !== currentProfile.balance) {
              console.log('🔄 PERIODIC BALANCE SYNC:', prev.balance, '→', currentProfile.balance);
              return {
                ...prev,
                balance: currentProfile.balance,
              };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error in periodic balance refresh:', error);
      }
    }, 5000); // Every 5 seconds

    return () => {
      console.log('🧹 Cleaning up comprehensive stats subscription');
      supabase.removeChannel(statsChannel);
      supabase.removeChannel(balanceChannel);
      clearInterval(balanceRefreshInterval);
    };
  }, [user])

  const fetchUserProfile = async () => {
    if (!user) {
      console.warn('[useUserProfile] No user found, skipping fetch');
      return;
    }

    console.log('[useUserProfile] Fetching profile for user:', user.id);

    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('[useUserProfile] Profile fetch result:', { profile, profileError });

      if (profileError) {
        console.error('[useUserProfile] Error fetching profile:', profileError);
        setUserData(null);
        setLoading(false);
        return;
      }

      // Fetch level stats
      const { data: levelStats, error: levelStatsError } = await supabase
        .from('user_level_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      console.log('[useUserProfile] Level stats fetch result:', { levelStats, levelStatsError });

      if (levelStatsError && levelStatsError.code === 'PGRST116') {
        console.log('[useUserProfile] No level stats found, creating initial stats for user:', user.id);
        const { data: newLevelStats, error: createError } = await supabase
          .from('user_level_stats')
          .insert({ user_id: user.id })
          .select('*')
          .single();

        console.log('[useUserProfile] Created new level stats:', { newLevelStats, createError });

        if (createError) {
          console.error('[useUserProfile] Error creating level stats:', createError);
          setUserData(null);
          setLoading(false);
          return;
        }

        const combinedData = {
          ...profile,
          ...newLevelStats,
          gameStats: {
            coinflip: {
              wins: newLevelStats?.coinflip_wins || 0,
              losses: Math.max(0, (newLevelStats?.coinflip_games || 0) - (newLevelStats?.coinflip_wins || 0)),
              profit: newLevelStats?.coinflip_profit || 0,
            },
            crash: {
              wins: newLevelStats?.crash_wins || 0,
              losses: Math.max(0, (newLevelStats?.crash_games || 0) - (newLevelStats?.crash_wins || 0)),
              profit: newLevelStats?.crash_profit || 0,
            },
            roulette: {
              wins: newLevelStats?.roulette_wins || 0,
              losses: Math.max(0, (newLevelStats?.roulette_games || 0) - (newLevelStats?.roulette_wins || 0)),
              profit: newLevelStats?.roulette_profit || 0,
            },
            tower: {
              wins: newLevelStats?.tower_wins || 0,
              losses: Math.max(0, (newLevelStats?.tower_games || 0) - (newLevelStats?.tower_wins || 0)),
              profit: newLevelStats?.tower_profit || 0,
            },
          }
        };
        setUserData(combinedData);
        setLoading(false);
        console.log('[useUserProfile] User data set (profile + newLevelStats):', combinedData);
        return;
      }

      if (levelStatsError) {
        console.error('[useUserProfile] Error fetching level stats:', levelStatsError);
        const profileWithGameStats = {
          ...profile,
          gameStats: {
            coinflip: { wins: 0, losses: 0, profit: 0 },
            crash: { wins: 0, losses: 0, profit: 0 },
            roulette: { wins: 0, losses: 0, profit: 0 },
            tower: { wins: 0, losses: 0, profit: 0 },
          }
        };
        setUserData(profileWithGameStats);
        setLoading(false);
        console.log('[useUserProfile] User data set (profile only, stats error):', profileWithGameStats);
        return;
      }

      const combinedData = {
        ...profile,
        ...levelStats,
        gameStats: {
          coinflip: {
            wins: levelStats?.coinflip_wins || 0,
            losses: Math.max(0, (levelStats?.coinflip_games || 0) - (levelStats?.coinflip_wins || 0)),
            profit: levelStats?.coinflip_profit || 0,
          },
          crash: {
            wins: levelStats?.crash_wins || 0,
            losses: Math.max(0, (levelStats?.crash_games || 0) - (levelStats?.crash_wins || 0)),
            profit: levelStats?.crash_profit || 0,
          },
          roulette: {
            wins: levelStats?.roulette_wins || 0,
            losses: Math.max(0, (levelStats?.roulette_games || 0) - (levelStats?.roulette_wins || 0)),
            profit: levelStats?.roulette_profit || 0,
          },
          tower: {
            wins: levelStats?.tower_wins || 0,
            losses: Math.max(0, (levelStats?.tower_games || 0) - (levelStats?.tower_wins || 0)),
            profit: levelStats?.tower_profit || 0,
          },
        }
      };
      setUserData(combinedData);
      setLoading(false);
      console.log('[useUserProfile] User data set (profile + levelStats):', { ...profile, ...levelStats });
    } catch (err) {
      console.error('[useUserProfile] Unexpected error:', err);
      setUserData(null);
      setLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !userData) return

    try {
      // Only update profile table for profile-specific data (balance, username, badges)
      const profileUpdates: any = {};
      if (updates.balance !== undefined) profileUpdates.balance = updates.balance;
      if (updates.username !== undefined) profileUpdates.username = updates.username;
      if (updates.badges !== undefined) profileUpdates.badges = updates.badges;
      if (updates.last_claim_time !== undefined) profileUpdates.last_claim_time = updates.last_claim_time;
      
      if (Object.keys(profileUpdates).length > 0) {
        profileUpdates.updated_at = new Date().toISOString();
        
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      // Note: Level, XP, and game stats are now managed by the trigger system
      // They are automatically updated in user_level_stats when games are played
      // No manual updates needed here

      // Refresh profile data to get latest state
      await fetchUserProfile();
      
      // Additional force balance sync if balance was updated
      if (updates.balance !== undefined) {
        console.log('💰 Force syncing balance after manual update');
        setTimeout(async () => {
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', user.id)
            .single();

          if (currentProfile) {
            setUserData(prev => {
              if (!prev) return null;
              if (prev.balance !== currentProfile.balance) {
                console.log('🔄 POST-UPDATE BALANCE SYNC:', prev.balance, '→', currentProfile.balance);
                return {
                  ...prev,
                  balance: currentProfile.balance,
                };
              }
              return prev;
            });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  return {
    userData,
    loading,
    updateUserProfile,
    refetch: fetchUserProfile,
  }
}
