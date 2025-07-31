import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserLevelStats {
  id: string;
  user_id: string;
  
  // Core leveling
  current_level: number;
  lifetime_xp: number;
  current_level_xp: number;
  xp_to_next_level: number;
  
  // Border system
  border_tier: number;
  border_unlocked_at: string | null;
  
  // Case system
  available_cases: number;
  total_cases_opened: number;
  total_case_value: number;
  
  // Game statistics per game type
  coinflip_games: number;
  coinflip_wins: number;
  coinflip_wagered: number;
  coinflip_profit: number;
  
  crash_games: number;
  crash_wins: number;
  crash_wagered: number;
  crash_profit: number;
  
  roulette_games: number;
  roulette_wins: number;
  roulette_wagered: number;
  roulette_profit: number;
  roulette_green_wins: number;
  roulette_highest_win: number;
  roulette_biggest_bet: number;
  roulette_best_streak: number;
  roulette_favorite_color: string;
  
  tower_games: number;
  tower_wins: number;
  tower_wagered: number;
  tower_profit: number;
  tower_highest_level: number;
  tower_perfect_games: number;
  
  // Overall statistics
  total_games: number;
  total_wins: number;
  total_wagered: number;
  total_profit: number;
  
  // Streaks and achievements
  best_coinflip_streak: number;
  current_coinflip_streak: number;
  best_win_streak: number;
  biggest_win: number;
  biggest_loss: number;
  biggest_single_bet: number;
  
  // User activity tracking
  chat_messages_count: number;
  login_days_count: number;
  account_created: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export function useUserLevelStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserLevelStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStats(null);
      setLoading(false);
      return;
    }

    fetchStats();
    
    // Temporarily disable realtime subscription to prevent schema mismatch errors
    // This will be re-enabled once the schema issues are resolved
    const ENABLE_REALTIME = false;
    
    if (!ENABLE_REALTIME) {
      console.log('📊 USER_LEVEL_STATS: Realtime disabled, using polling fallback');
      return;
    }
    
    // Set up real-time subscription with stable channel name
    // TEMPORARILY DISABLED: Realtime subscription causing schema mismatch errors    return;
    const channelName = `user_level_stats_${user.id}`;
    
    // Remove any existing channel first to prevent duplicates
    const existingChannels = supabase.getChannels();
    const existingChannel = existingChannels.find(ch => ch.topic === channelName);
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }
    
    // DISABLED:     const subscription = supabase
    // DISABLED:       .channel(channelName)
    // DISABLED:       .on(
    // DISABLED:         'postgres_changes',
    // DISABLED:         {
    // DISABLED:           event: 'UPDATE',
    // DISABLED:           schema: 'public',
    // DISABLED:           table: 'user_level_stats',
    // DISABLED:           filter: `user_id=eq.${user.id}`
    // DISABLED:         },
    // DISABLED:         (payload) => {
    // DISABLED:           console.log('📊 USER_LEVEL_STATS: Received update:', payload);
    // DISABLED:           fetchStats();
    // DISABLED:         }
    // DISABLED:       )
    // DISABLED:       .on(
    // DISABLED:         'postgres_changes',
    // DISABLED:         {
    // DISABLED:           event: 'INSERT',
    // DISABLED:           schema: 'public',
    // DISABLED:           table: 'user_level_stats',
    // DISABLED:           filter: `user_id=eq.${user.id}`
    // DISABLED:         },
    // DISABLED:         (payload) => {
    // DISABLED:           console.log('📊 USER_LEVEL_STATS: Received insert:', payload);
    // DISABLED:           fetchStats();
    // DISABLED:         }
    // DISABLED:       )
    // DISABLED:       .subscribe((status, err) => {
    // DISABLED:         if (err) {
    // DISABLED:           console.error('📊 USER_LEVEL_STATS: Subscription error:', err);
    // DISABLED:           console.error('📊 USER_LEVEL_STATS: Status:', status);
        } else {
          console.log('📊 USER_LEVEL_STATS: Subscription status:', status);
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_level_stats')
        .select(`
          id,
          user_id,
          current_level,
          lifetime_xp,
          current_level_xp,
          xp_to_next_level,
          border_tier,
          border_unlocked_at,
          available_cases,
          total_cases_opened,
          total_case_value,
          coinflip_games,
          coinflip_wins,
          coinflip_wagered,
          coinflip_profit,
          crash_games,
          crash_wins,
          crash_wagered,
          crash_profit,
          roulette_games,
          roulette_wins,
          roulette_wagered,
          roulette_profit,
          roulette_green_wins,
          roulette_highest_win,
          roulette_biggest_bet,
          roulette_best_streak,
          roulette_favorite_color,
          tower_games,
          tower_wins,
          tower_wagered,
          tower_profit,
          tower_highest_level,
          tower_perfect_games,
          total_games,
          total_wins,
          total_wagered,
          total_profit,
          best_coinflip_streak,
          current_coinflip_streak,
          best_win_streak,
          biggest_win,
          biggest_loss,
          biggest_single_bet,
          chat_messages_count,
          login_days_count,
          account_created,
          created_at,
          updated_at
        `)
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
          .select()
          .single();

        if (insertError) throw insertError;
        setStats(newStats);
      } else {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching user level stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWinRate = (wins: number, games: number) => {
    return games > 0 ? (wins / games) * 100 : 0;
  };

  const getGameStats = (gameType: 'coinflip' | 'crash' | 'roulette' | 'tower') => {
    if (!stats) return { games: 0, wins: 0, wagered: 0, profit: 0, winRate: 0 };
    
    const games = stats[`${gameType}_games`];
    const wins = stats[`${gameType}_wins`];
    const wagered = stats[`${gameType}_wagered`];
    const profit = stats[`${gameType}_profit`];
    
    return {
      games,
      wins,
      wagered,
      profit,
      winRate: getWinRate(wins, games)
    };
  };

  return {
    stats,
    loading,
    getWinRate,
    getGameStats,
    refetch: fetchStats
  };
}