import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveBetFeed {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  game_type: 'crash' | 'coinflip' | 'tower' | 'roulette';
  bet_amount: number;
  result: string;
  profit: number;
  multiplier?: number;
  game_data?: any;
  bet_color?: string; // For roulette: 'red', 'green', 'black'
  round_id?: string; // For roulette: current round UUID
  created_at: string;
  streak_length?: number;
  action?: string;
}

export interface CrashRound {
  id: string;
  round_number: number;
  status: 'countdown' | 'active' | 'crashed' | 'ended';
  multiplier: number;
  crash_point?: number;
  start_time: string;
  countdown_end_time?: string;
  crash_time?: string;
  created_at: string;
  updated_at: string;
}

export interface CrashBet {
  id: string;
  user_id: string;
  round_id: string;
  bet_amount: number;
  auto_cashout_at?: number;
  cashed_out_at?: number;
  cashout_time?: string;
  profit: number;
  status: 'active' | 'cashed_out' | 'lost';
  created_at: string;
}

// Debounce utility
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const useRealtimeFeeds = () => {
  const [liveBetFeed, setLiveBetFeed] = useState<LiveBetFeed[]>([]);
  const [currentCrashRound, setCurrentCrashRound] = useState<CrashRound | null>(null);
  const [crashBets, setCrashBets] = useState<CrashBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  
  const channelsRef = useRef<{
    liveFeed?: RealtimeChannel;
    crashRound?: RealtimeChannel;
    crashBets?: RealtimeChannel;
  }>({});
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxRetries = 3; // Reduced from 5
  const isInitializedRef = useRef(false);

  // Optimized data fetching with caching
  const fetchInitialData = useCallback(async () => {
    try {
      const [liveFeedData, crashRoundData, crashBetsData] = await Promise.allSettled([
        supabase
          .from('live_bet_feed')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30), // Reduced from 50
        supabase
          .from('crash_rounds')
          .select('*')
          .in('status', ['countdown', 'active', 'crashed'])
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('crash_bets')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50) // Reduced from 100
      ]);

      if (liveFeedData.status === 'fulfilled' && liveFeedData.value.data) {
        setLiveBetFeed(liveFeedData.value.data as LiveBetFeed[]);
      }
      
      if (crashRoundData.status === 'fulfilled' && crashRoundData.value.data?.[0]) {
        setCurrentCrashRound(crashRoundData.value.data[0] as CrashRound);
      }
      
      if (crashBetsData.status === 'fulfilled' && crashBetsData.value.data) {
        setCrashBets(crashBetsData.value.data as CrashBet[]);
      }

    } catch (error) {
      console.error('Initial data fetch error:', error);
    }
  }, []);

  // Optimized subscription setup with better error handling
  const setupRealtimeSubscriptions = useCallback(async () => {
    if (isInitializedRef.current) return;
    
    try {
      // Clear existing channels
      Object.values(channelsRef.current).forEach(channel => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
      channelsRef.current = {};

      // Debounced state updates to reduce re-renders
      const debouncedSetLiveBetFeed = debounce((updater: (prev: LiveBetFeed[]) => LiveBetFeed[]) => {
        setLiveBetFeed(updater);
      }, 100);

      const debouncedSetCrashBets = debounce((updater: (prev: CrashBet[]) => CrashBet[]) => {
        setCrashBets(updater);
      }, 100);

      // Live bet feed subscription
      channelsRef.current.liveFeed = supabase
        .channel(`live_bet_feed_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'live_bet_feed'
          },
          (payload) => {
            const newBet = payload.new as LiveBetFeed;
            
            debouncedSetLiveBetFeed(prev => {
              const exists = prev.some(bet => bet.id === newBet.id);
              if (exists) return prev;
              return [newBet, ...prev].slice(0, 30); // Reduced limit
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setConnectionAttempts(0);
            setLastError(null);
          } else if (status === 'CHANNEL_ERROR' && connectionAttempts < maxRetries) {
            setIsConnected(false);
            setConnectionAttempts(prev => prev + 1);
            
            const retryDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 10000);
            reconnectTimeoutRef.current = setTimeout(setupRealtimeSubscriptions, retryDelay);
          }
        });

      // Crash rounds subscription
      channelsRef.current.crashRound = supabase
        .channel(`crash_rounds_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'crash_rounds'
          },
          (payload) => {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              setCurrentCrashRound(payload.new as CrashRound);
            }
          }
        )
        .subscribe();

      // Crash bets subscription
      channelsRef.current.crashBets = supabase
        .channel(`crash_bets_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'crash_bets'
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newBet = payload.new as CrashBet;
              debouncedSetCrashBets(prev => {
                const exists = prev.some(bet => bet.id === newBet.id);
                if (exists) return prev;
                return [newBet, ...prev].slice(0, 50);
              });
            } else if (payload.eventType === 'UPDATE') {
              debouncedSetCrashBets(prev => 
                prev.map(bet => 
                  bet.id === payload.new.id ? payload.new as CrashBet : bet
                )
              );
            }
          }
        )
        .subscribe();

      isInitializedRef.current = true;
      setLoading(false);

    } catch (error) {
      setLastError(`Setup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
      setIsConnected(false);
    }
  }, [connectionAttempts, maxRetries]);

  useEffect(() => {
    fetchInitialData().then(() => {
      setupRealtimeSubscriptions();
    });

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      Object.values(channelsRef.current).forEach(channel => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
      
      channelsRef.current = {};
      isInitializedRef.current = false;
    };
  }, [fetchInitialData, setupRealtimeSubscriptions]);

  // Reset connection attempts when component unmounts or retries succeed
  useEffect(() => {
    if (isConnected) {
      setConnectionAttempts(0);
    }
  }, [isConnected]);

  return {
    liveBetFeed,
    currentCrashRound,
    crashBets,
    loading,
    isConnected,
    connectionAttempts,
    lastError
  };
};

export const useCrashRoundUpdates = () => {
  const [currentRound, setCurrentRound] = useState<CrashRound | null>(null);
  
  useEffect(() => {
    if (!currentRound?.status || currentRound.status !== 'active') return;
    
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('crash_rounds')
          .select('*')
          .eq('id', currentRound.id)
          .single();
        
        if (data) {
          setCurrentRound(data as CrashRound);
        }
      } catch (error) {
        // Silently handle error
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRound?.id, currentRound?.status]);

  return { currentRound, setCurrentRound };
};