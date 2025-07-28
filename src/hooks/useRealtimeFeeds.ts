import { useState, useEffect, useRef } from 'react';
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
  const maxRetries = 5;

  useEffect(() => {
    const setupRealtimeSubscriptions = async () => {
      try {
        // Clear any existing reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        console.log('🔍 Fetching initial live bet feed data...');
        
        // Initial data fetch with timeout
        const fetchPromise = Promise.all([
          supabase
            .from('live_bet_feed')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50),
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
            .limit(100)
        ]);

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database fetch timeout')), 10000);
        });

        const [liveFeedData, crashRoundData, crashBetsData] = await Promise.race([
          fetchPromise,
          timeoutPromise
        ]) as any;

        console.log('📊 Initial data fetch results:', {
          liveFeedCount: liveFeedData.data?.length || 0,
          liveFeedError: liveFeedData.error,
          crashRoundCount: crashRoundData.data?.length || 0,
          crashBetsCount: crashBetsData.data?.length || 0
        });

        if (liveFeedData.data) {
          console.log('✅ Setting initial live bet feed:', liveFeedData.data.length, 'entries');
          setLiveBetFeed(liveFeedData.data as LiveBetFeed[]);
        } else if (liveFeedData.error) {
          console.error('❌ Error fetching live bet feed:', liveFeedData.error);
          setLastError(`Database error: ${liveFeedData.error.message}`);
        }
        
        if (crashRoundData.data?.[0]) setCurrentCrashRound(crashRoundData.data[0] as CrashRound);
        if (crashBetsData.data) setCrashBets(crashBetsData.data as CrashBet[]);

        // Cleanup existing channels before creating new ones
        Object.values(channelsRef.current).forEach(channel => {
          if (channel) {
            supabase.removeChannel(channel);
          }
        });
        channelsRef.current = {};

        // Set up live bet feed subscription with improved error handling
        console.log('🔗 Setting up live bet feed subscription...');
        channelsRef.current.liveFeed = supabase
          .channel(`live_bet_feed_${Date.now()}`) // Unique channel name
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'live_bet_feed'
            },
            (payload) => {
              console.log('📡 RECEIVED: New bet in feed:', payload);
              const newBet = payload.new as LiveBetFeed;
              
              setLiveBetFeed(prev => {
                // Check for duplicates
                const exists = prev.some(bet => bet.id === newBet.id);
                if (exists) {
                  console.log('⚠️ Duplicate bet detected, skipping:', newBet.id);
                  return prev;
                }
                
                console.log('✅ SUCCESS: Adding bet to feed:', newBet.username, newBet.game_type, newBet.bet_amount);
                
                // Add to beginning of array and limit to 50 items
                return [newBet, ...prev].slice(0, 50);
              });
            }
          )
          .subscribe((status) => {
            console.log('📡 Live bet feed status change:', status);
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ CONNECTED: Live bet feed is now listening for changes');
              setIsConnected(true);
              setConnectionAttempts(0);
              setLastError(null);
            } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
              console.error('❌ ERROR: Live bet feed subscription failed with status:', status);
              setIsConnected(false);
              setLastError(`Connection failed: ${status}`);
              
              // Only retry if we haven't exceeded max attempts
              if (connectionAttempts < maxRetries) {
                const retryDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000); // Exponential backoff, max 30s
                console.log(`🔄 RETRY: Attempting to reconnect in ${retryDelay}ms (attempt ${connectionAttempts + 1}/${maxRetries})`);
                
                setConnectionAttempts(prev => prev + 1);
                
                reconnectTimeoutRef.current = setTimeout(() => {
                  setupRealtimeSubscriptions();
                }, retryDelay);
              } else {
                console.error('❌ MAX RETRIES: Giving up on real-time connection after', maxRetries, 'attempts');
                setLastError('Real-time connection failed after multiple retries');
              }
            }
          });

        // Set up crash rounds subscription with same improvements
        console.log('🎰 Setting up crash rounds subscription...');
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
              console.log('🎰 RECEIVED: Crash round update:', payload);
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                console.log('✅ SUCCESS: Updating crash round:', payload.new);
                setCurrentCrashRound(payload.new as CrashRound);
              }
            }
          )
          .subscribe((status) => {
            console.log('🎰 Crash rounds status change:', status);
          });

        // Set up crash bets subscription with same improvements
        console.log('💰 Setting up crash bets subscription...');
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
              console.log('💰 RECEIVED: Crash bet update:', payload);
              if (payload.eventType === 'INSERT') {
                const newBet = payload.new as CrashBet;
                setCrashBets(prev => {
                  const exists = prev.some(bet => bet.id === newBet.id);
                  if (exists) {
                    console.log('⚠️ Duplicate crash bet detected, skipping:', newBet.id);
                    return prev;
                  }
                  console.log('✅ SUCCESS: Adding new crash bet:', newBet);
                  return [newBet, ...prev].slice(0, 100);
                });
              } else if (payload.eventType === 'UPDATE') {
                console.log('✅ SUCCESS: Updating crash bet:', payload.new);
                setCrashBets(prev => 
                  prev.map(bet => 
                    bet.id === payload.new.id ? payload.new as CrashBet : bet
                  )
                );
              }
            }
          )
          .subscribe((status) => {
            console.log('💰 Crash bets status change:', status);
          });

        console.log('✅ All subscriptions set up successfully');
        setLoading(false);

      } catch (error) {
        console.error('❌ Error setting up realtime subscriptions:', error);
        setLastError(`Setup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setLoading(false);
        setIsConnected(false);
        
        // Retry with backoff if we haven't hit max retries
        if (connectionAttempts < maxRetries) {
          const retryDelay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
          console.log(`🔄 RETRY: Attempting to reconnect after error in ${retryDelay}ms`);
          
          setConnectionAttempts(prev => prev + 1);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setupRealtimeSubscriptions();
          }, retryDelay);
        }
      }
    };

    setupRealtimeSubscriptions();

    // Cleanup subscriptions and timeouts
    return () => {
      console.log('🧹 Cleaning up realtime subscriptions...');
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      Object.entries(channelsRef.current).forEach(([name, channel]) => {
        if (channel) {
          supabase.removeChannel(channel);
          console.log(`🧹 Removed ${name} channel`);
        }
      });
      
      channelsRef.current = {};
    };
  }, []);

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
    // Fetch current round data every second when active
    const interval = setInterval(async () => {
      if (currentRound?.status === 'active') {
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
          console.error('❌ Error fetching round update:', error);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRound?.id, currentRound?.status]);

  return { currentRound, setCurrentRound };
};