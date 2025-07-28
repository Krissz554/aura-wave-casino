import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Deployment test after Git reconnection - trigger deploy
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Users, Wallet, Shield, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeFeeds } from '@/hooks/useRealtimeFeeds';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { RouletteReel } from './RouletteReel';
import { ProvablyFairModal } from './ProvablyFairModal';
import { ProvablyFairHistoryModal } from './ProvablyFairHistoryModal';

interface RouletteRound {
  id: string;
  round_number: number;
  status: 'betting' | 'spinning' | 'completed';
  result_slot?: number;
  result_color?: string;
  result_multiplier?: number;
  reel_position?: number;
  betting_start_time: string;
  betting_end_time: string;
  spinning_end_time: string;
  server_seed_hash: string;
  nonce: number;
  created_at: string;
}

interface RouletteBet {
  id: string;
  round_id: string;
  user_id: string;
  bet_color: string;
  bet_amount: number;
  potential_payout: number;
  actual_payout?: number;
  is_winner?: boolean;
  profit?: number;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

interface RouletteResult {
  id: string;
  round_number: number;
  result_color: string;
  result_slot: number;
  result_multiplier?: number;
  created_at: string;
}

interface BetTotals {
  green: { total: number; count: number; users: RouletteBet[] };
  red: { total: number; count: number; users: RouletteBet[] };
  black: { total: number; count: number; users: RouletteBet[] };
}

interface RouletteGameProps {
  userData: UserProfile | null;
  onUpdateUser: (updatedData: Partial<UserProfile>) => Promise<void>;
}

export function RouletteGame({ userData, onUpdateUser }: RouletteGameProps) {
  const { user } = useAuth();
  const profile = userData;
  const { toast } = useToast();
  const { liveBetFeed, isConnected } = useRealtimeFeeds();
  const { isMaintenanceMode } = useMaintenance();

  // Game state
  const [currentRound, setCurrentRound] = useState<RouletteRound | null>(null);
  const [roundBets, setRoundBets] = useState<RouletteBet[]>([]);
  const [recentResults, setRecentResults] = useState<RouletteResult[]>([]);
  const [userBets, setUserBets] = useState<Record<string, number>>({});
  const [isolatedRoundTotals, setIsolatedRoundTotals] = useState<Record<string, number>>({});
  const [isolatedRoundId, setIsolatedRoundId] = useState<string | null>(null); // Track which round the totals belong to
  const [provablyFairModalOpen, setProvablyFairModalOpen] = useState(false);
  const [provablyFairHistoryOpen, setProvablyFairHistoryOpen] = useState(false);
  const [selectedRoundData, setSelectedRoundData] = useState<RouletteRound | null>(null);
  const [betTotals, setBetTotals] = useState<BetTotals>({
    green: { total: 0, count: 0, users: [] },
    red: { total: 0, count: 0, users: [] },
    black: { total: 0, count: 0, users: [] }
  });

  // UI state
  const [betAmount, setBetAmount] = useState<number | ''>('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [winningColor, setWinningColor] = useState<string | null>(null);
  const [extendedWinAnimation, setExtendedWinAnimation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [testData, setTestData] = useState<any>(null);
  const [lastCompletedRound, setLastCompletedRound] = useState<RouletteRound | null>(null);
  
  // SECURITY: State management for preventing abuse
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [lastBetTime, setLastBetTime] = useState<number>(0);
  const [pendingBets, setPendingBets] = useState<Set<string>>(new Set());
  const [userBetLimits, setUserBetLimits] = useState({ totalThisRound: 0, betCount: 0 });

  // Rate limiting configuration
  const MIN_BET_INTERVAL = 1000; // 1 second between bets
  const MAX_BETS_PER_ROUND = 10; // Maximum 10 bets per round
  const MAX_TOTAL_BET_PER_ROUND = 100000; // Maximum $100,000 per round

  // Refs for preventing race conditions
  const placingBetRef = useRef(false);
  const userBetsRef = useRef<Record<string, number>>({});
  const currentRoundRef = useRef<string>('');
  const balanceRef = useRef<number>(0);
  const lastResultsFetchRef = useRef<number>(0);

  // Update balance ref when profile changes
  useEffect(() => {
    if (profile?.balance !== undefined) {
      balanceRef.current = profile.balance;
    }
  }, [profile?.balance]);
  
  // Filter roulette bets from live feed (only current round, show during betting and spinning)
  const rouletteBets = (liveBetFeed || []).filter(bet => 
    bet.game_type === 'roulette' && 
    bet.round_id === currentRound?.id &&
    (currentRound?.status === 'betting' || currentRound?.status === 'spinning')
  );
  
  // 🔍 DETAILED DEBUG: Live bet feed analysis
  useEffect(() => {
    console.log('🔍 Live bet feed analysis:', {
      totalLiveBets: liveBetFeed?.length || 0,
      currentRoundId: currentRound?.id,
      rouletteBetsCount: rouletteBets.length,
      liveBetFeedSample: liveBetFeed?.slice(0, 3).map(bet => ({
        id: bet.id,
        game_type: bet.game_type,
        round_id: bet.round_id,
        username: bet.username,
        bet_color: bet.bet_color,
        bet_amount: bet.bet_amount,
        is_roulette: bet.game_type === 'roulette',
        matches_current_round: bet.round_id === currentRound?.id
      })),
      allRouletteBets: liveBetFeed?.filter(bet => bet.game_type === 'roulette').map(bet => ({
        round_id: bet.round_id,
        current_round_id: currentRound?.id,
        matches: bet.round_id === currentRound?.id
      }))
    });
  }, [liveBetFeed, currentRound?.id, rouletteBets.length]);
  
  // Debug bet amounts
  useEffect(() => {
    if (rouletteBets.length > 0) {
      console.log('🎯 Live bet feed data:', rouletteBets.map(bet => ({
        username: bet.username,
        bet_amount: bet.bet_amount,
        bet_amount_type: typeof bet.bet_amount,
        bet_color: bet.bet_color,
        round_id: bet.round_id,
        game_type: bet.game_type
      })));
    }
  }, [rouletteBets]);
  
  const greenBets = rouletteBets.filter(bet => bet.bet_color === 'green');
  const redBets = rouletteBets.filter(bet => bet.bet_color === 'red');
  const blackBets = rouletteBets.filter(bet => bet.bet_color === 'black');

  // Clear user bets when round changes
  useEffect(() => {
    if (currentRound?.id && currentRoundRef.current && currentRound.id !== currentRoundRef.current) {
      console.log('🔄 Round changed, clearing user bets');
      setUserBets({});
      
      // Only clear isolated totals if it's actually a different round
      if (isolatedRoundId !== currentRound.id) {
        console.log('🧹 Clearing isolated totals for new round:', currentRound.id);
        setIsolatedRoundTotals({});
        setIsolatedRoundId(currentRound.id);
      }
      
      userBetsRef.current = {};
      currentRoundRef.current = currentRound.id;
    }
  }, [currentRound?.id, isolatedRoundId]);

  // Simple isolated functions - NEVER touched by fetchRoundBets
  const addToIsolatedTotal = (color: string, amount: number) => {
    // Set the round ID if not set or if it's a new round
    if (!isolatedRoundId || isolatedRoundId !== currentRound?.id) {
      setIsolatedRoundId(currentRound?.id || null);
    }
    
    setIsolatedRoundTotals(prev => ({
      ...prev,
      [color]: (prev[color] || 0) + amount
    }));
  };

  // Fetch current round
  const fetchCurrentRound = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: { action: 'get_current_round' }
      });

      if (error) throw error;
      
      console.log('🎰 Current round:', data);
      
      // Check if this is a new round (different ID)
      const isNewRound = currentRound?.id !== data?.id;
      console.log('🔍 Round comparison:', {
        currentRoundId: currentRound?.id,
        dataId: data?.id,
        isNewRound: isNewRound,
        currentRoundRefValue: currentRoundRef.current
      });
      
      if (isNewRound) {
        console.log('🆕 New round detected, clearing user bets');
        setUserBets({});
        
        // Only clear isolated totals if it's actually a different round
        if (isolatedRoundId !== data?.id) {
          console.log('🧹 Clearing isolated totals for new round:', data?.id);
          setIsolatedRoundTotals({});
          setIsolatedRoundId(data?.id);
        }
        
        userBetsRef.current = {};
        currentRoundRef.current = data?.id || null;
        setBetTotals({
          green: { total: 0, count: 0, users: [] },
          red: { total: 0, count: 0, users: [] },
          black: { total: 0, count: 0, users: [] }
        });
      }
      
      setCurrentRound(data);
      
      // Fetch bets for this round
      if (data?.id) {
        fetchRoundBets(data.id);
      }
    } catch (error: any) {
      console.error('Failed to fetch current round:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to the game server",
        variant: "destructive",
      });
    }
  };

  // Fetch bets for current round
  const fetchRoundBets = async (roundId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: { action: 'get_round_bets', roundId }
      });

      if (error) throw error;
      
      console.log('🔍 Fetched round bets:', data);
      setRoundBets(data || []);
      calculateBetTotals(data || []);
      
      // Calculate user's bets for this round from database
      if (user) {
        const userRoundBets = (data || []).filter((bet: RouletteBet) => bet.user_id === user.id);
        const dbUserBets: Record<string, number> = {};
        userRoundBets.forEach((bet: RouletteBet) => {
          dbUserBets[bet.bet_color] = (dbUserBets[bet.bet_color] || 0) + bet.bet_amount;
        });
        console.log('👤 Database user bets:', dbUserBets);
        
        // Only update user bets if there's actually a difference to prevent flickering
        const currentBets = userBetsRef.current;
        const hasChanges = Object.keys(dbUserBets).some(color => 
          dbUserBets[color] !== (currentBets[color] || 0)
        ) || Object.keys(currentBets).some(color =>
          (currentBets[color] || 0) !== (dbUserBets[color] || 0)
        );
        
        if (hasChanges || Object.keys(currentBets).length === 0) {
          console.log('🔄 Updating user bets (changes detected):', dbUserBets);
          setUserBets(dbUserBets);
          userBetsRef.current = dbUserBets;
          
          // DO NOT sync isolated totals with database - keep them completely isolated
        } else {
          console.log('✅ User bets unchanged, keeping current state');
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch round bets:', error);
    }
  };

  // Fetch recent results
  const fetchRecentResults = async (forceRefresh = false) => {
    try {
      const now = Date.now();
      
      // Prevent over-fetching (unless forced) - max once per 2 seconds
      if (!forceRefresh && now - lastResultsFetchRef.current < 2000) {
        console.log('⏭️ Skipping recent results fetch (too soon)');
        return;
      }
      
      console.log('🔄 Fetching recent results...');
      lastResultsFetchRef.current = now;
      
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: { action: 'get_recent_results' }
      });

      if (error) throw error;
      
      // 🛡️ DEDUPLICATION: Remove duplicates by round_number (same as Provably Fair History)
      const uniqueResults = data ? data.filter((result: RouletteResult, index: number, self: RouletteResult[]) => 
        index === self.findIndex(r => r.round_number === result.round_number)
      ) : [];
      
      console.log('✅ Recent results fetched:', uniqueResults.length, 'unique results');
      setRecentResults(uniqueResults);
    } catch (error: any) {
      console.error('Failed to fetch recent results:', error);
    }
  };



  // Open provably fair history modal
  const openProvablyFairModal = () => {
    console.log('🛡️ Opening provably fair history modal');
    setProvablyFairHistoryOpen(true);
  };

  // Open round details modal
  const openRoundDetails = (result: RouletteResult) => {
    // Convert RouletteResult to RouletteRound format for the modal
    const roundData: RouletteRound = {
      id: result.id, // Fixed: use id instead of round_id
      round_number: result.round_number,
      status: 'completed',
      result_slot: result.result_slot,
      result_color: result.result_color,
      result_multiplier: result.result_multiplier,
      reel_position: 0, // Not needed for display
      betting_start_time: '',
      betting_end_time: '',
      spinning_end_time: '',
      server_seed_hash: '',
      nonce: 0,
      created_at: result.created_at
    };
    setSelectedRoundData(roundData);
    setProvablyFairModalOpen(true);
  };

  // Verify round fairness
  const verifyRoundFairness = async (roundId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: { action: 'verify_round', roundId }
      });

      if (error) throw error;
      
      // Show verification in a toast or modal
      toast({
        title: "🔍 Fairness Verification",
        description: `Round ${data.round_number}: Server seed verified. Result: ${data.result_color} (slot ${data.result_slot})`,
      });
      
      console.log('🔍 Fairness verification:', data);
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || 'Failed to verify round',
        variant: "destructive",
      });
    }
  };

  // Calculate bet totals by color
  const calculateBetTotals = (bets: RouletteBet[]) => {
    const totals: BetTotals = {
      green: { total: 0, count: 0, users: [] },
      red: { total: 0, count: 0, users: [] },
      black: { total: 0, count: 0, users: [] }
    };

    bets.forEach(bet => {
      const color = bet.bet_color as keyof BetTotals;
      totals[color].total += bet.bet_amount;
      totals[color].count += 1;
      totals[color].users.push(bet);
    });

    console.log('📊 Calculated bet totals:', totals);
    setBetTotals(totals);
  };

  // Timer for countdown
  useEffect(() => {
    if (!currentRound) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      let targetTime: number;
      
      if (currentRound.status === 'betting') {
        targetTime = new Date(currentRound.betting_end_time).getTime();
      } else if (currentRound.status === 'spinning') {
        targetTime = new Date(currentRound.spinning_end_time).getTime();
      } else {
        setTimeLeft(0);
        return;
      }

      const remaining = Math.max(0, Math.floor((targetTime - now) / 1000));
      setTimeLeft(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [currentRound]);

  // Real-time subscriptions
  useEffect(() => {
    console.log('🔔 Setting up real-time subscriptions');

    // Subscribe to round updates
    const roundSubscription = supabase
      .channel('roulette_rounds')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'roulette_rounds'
      }, (payload) => {
        console.log('🎰 Round update:', payload);
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const round = payload.new as RouletteRound;
          const oldRound = payload.old as RouletteRound;
          
          // Check if this is a new round (different ID)
          const isNewRound = currentRound?.id !== round.id;
          
          // Save completed round for fairness checking and handle payouts
          if (oldRound?.status === 'spinning' && round.status === 'completed') {
            console.log('✅ Round completed, saving for fairness check');
            setLastCompletedRound(round);
            
            // Set winning color for button highlighting
            if (round.result_color) {
              setWinningColor(round.result_color);
              // Clear winning color after 5 seconds
              setTimeout(() => setWinningColor(null), 5000);
            }
            
            // Start extended win animation for winning tile (2 seconds)
            setExtendedWinAnimation(true);
            setTimeout(() => setExtendedWinAnimation(false), 2000);
            
            // Handle payouts for this user (TowerGame pattern)
            handleRoundPayout(round);
          }
          
          setCurrentRound(round);
          
          // Handle different scenarios
          if (isNewRound) {
            console.log('🆕 New round detected, clearing user bets and fetching fresh data');
            setUserBets({});
            
            // Only clear isolated totals if it's actually a different round
            if (isolatedRoundId !== round.id) {
              console.log('🧹 Clearing isolated totals for new round:', round.id);
              setIsolatedRoundTotals({});
              setIsolatedRoundId(round.id);
            }
            
            userBetsRef.current = {};
            currentRoundRef.current = round.id;
            setWinningColor(null); // Clear winning color for new round
            setExtendedWinAnimation(false); // Clear extended win animation for new round
            fetchRoundBets(round.id);
          } else if (round.status === 'betting' && oldRound?.status !== 'betting') {
            console.log('🎲 Betting phase started');
            fetchRoundBets(round.id);
          } else if (round.status === 'spinning' && oldRound?.status === 'betting') {
            console.log('🌀 Spinning started, fetching final bets');
            fetchRoundBets(round.id);
          } else if (round.status === 'completed') {
            console.log('🏁 Round completed, fetching final results');
            fetchRoundBets(round.id);
            
            // IMPROVED: Always update recent results when ANY round becomes completed
            // This handles all possible completion scenarios
            if (round.status === 'completed') {
              console.log('🎯 Completed round detected, updating recent results');
              
              // Immediate update for responsiveness (forced)
              fetchRecentResults(true);
              
              // Also update after delay to ensure DB consistency
              setTimeout(() => fetchRecentResults(true), 500);
            }
          } else {
            console.log('⏭️ Round update but keeping current state');
          }
        }
      })
      .subscribe();

    // Additional subscription for newly inserted completed rounds (edge case handling)
    const completedRoundsSubscription = supabase
      .channel('completed_roulette_rounds')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'roulette_rounds',
        filter: 'status=eq.completed'
      }, (payload) => {
        console.log('🎯 New completed round inserted:', payload.new);
        // Immediate update for new completed rounds (forced)
        fetchRecentResults(true);
      })
      .subscribe();

    // Subscribe to bet updates for live feed
    const betSubscription = supabase
      .channel('roulette_bets')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'roulette_bets'
      }, (payload) => {
        console.log('💰 New bet placed:', payload);
        
        // Always refresh bets to show live updates for all users
        if (currentRound?.id) {
          console.log('🔄 Refreshing bets for live updates');
          fetchRoundBets(currentRound.id);
        }
      })
      .subscribe();

    // Subscribe to results updates - REMOVED: No longer needed since we use roulette_rounds
    // The round subscription already handles result updates
    
    return () => {
      roundSubscription.unsubscribe();
      completedRoundsSubscription.unsubscribe();
      betSubscription.unsubscribe();
      // resultsSubscription.unsubscribe(); - REMOVED
    };
  }, [user, currentRound?.id]);

  // 🛡️ DEDUPLICATE RECENT RESULTS - Ensure no duplicate bubbles in UI
  useEffect(() => {
    if (recentResults.length > 0) {
      const uniqueResults = recentResults.filter((result, index, self) => 
        index === self.findIndex(r => r.round_number === result.round_number)
      );
      
      if (uniqueResults.length !== recentResults.length) {
        console.log('🧹 Removed duplicate results:', recentResults.length - uniqueResults.length, 'duplicates');
        setRecentResults(uniqueResults);
      }
    }
  }, [recentResults]);

  // Initial data fetch
  useEffect(() => {
    const initializeGame = async () => {
      setLoading(true);
      await Promise.all([
        fetchCurrentRound(),
        fetchRecentResults()
      ]);
      setLoading(false);
    };

    initializeGame();

    // Refresh current round every 2 seconds
    const refreshInterval = setInterval(fetchCurrentRound, 2000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Handle round payout (Fetch updated balance from backend)
  const handleRoundPayout = async (completedRound: RouletteRound) => {
    if (!user || !profile || !completedRound.result_color) {
      return;
    }

    try {
      console.log('💰 Round completed, fetching updated user balance:', completedRound.id);
      
      // Check if user had any bets in this round
      const userBetsInRound = Object.entries(userBets).filter(([_, amount]) => amount > 0);
      
      if (userBetsInRound.length === 0) {
        console.log('ℹ️ No bets placed by user in this round');
        return;
      }

      // Calculate total bet amount and profit for this round
      const totalBetAmount = userBetsInRound.reduce((sum, [_, amount]) => sum + amount, 0);
      let totalProfit = 0;
      let isWin = false;

      // Calculate profit for each bet
      for (const [betColor, betAmount] of userBetsInRound) {
        if (betColor === completedRound.result_color) {
          // User won this bet
          const multiplier = betColor === 'green' ? 14 : 2; // Green pays 14x, red/black pay 2x
          const profit = (betAmount * multiplier) - betAmount;
          totalProfit += profit;
          isWin = true;
        } else {
          // User lost this bet
          totalProfit -= betAmount;
        }
      }

      console.log(`💰 Round results: Bet ${totalBetAmount}, Profit ${totalProfit}, Win: ${isWin}`);

      // Update user statistics using the proper function
      console.log('📊 Updating roulette statistics with:', {
        user_id: user.id,
        game_type: 'roulette',
        bet_amount: totalBetAmount,
        result: isWin ? 'win' : 'loss',
        profit: totalProfit,
        winning_color: completedRound.result_color,
        bet_colors: userBetsInRound.map(([color, _]) => color).join(',') // Multiple colors if user bet on multiple
      });

      const { data: statsResult, error: statsError } = await supabase.rpc('update_user_stats_and_level', {
        p_user_id: user.id,
        p_game_type: 'roulette',
        p_bet_amount: totalBetAmount,
        p_result: isWin ? 'win' : 'loss',
        p_profit: totalProfit,
        p_winning_color: completedRound.result_color,
        p_bet_color: userBetsInRound.map(([color, _]) => color).join(',') // Multiple colors if user bet on multiple
      });

      if (statsError) {
        console.error('❌ Error updating user stats:', statsError);
      } else {
        console.log('✅ User stats updated successfully:', statsResult);
      }

      // Small delay to let backend finish processing payouts
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch the updated profile from backend with retry logic
      let updatedProfile = null;
      let error = null;
      
      // Try up to 3 times to get the updated balance
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`💰 Fetching updated balance (attempt ${attempt}/3)`);
        
        const result = await supabase
          .from('profiles')
          .select('balance, total_profit')
          .eq('id', user.id)
          .single();
          
        if (result.error) {
          error = result.error;
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 200));
            continue;
          }
        } else {
          updatedProfile = result.data;
          error = null;
          break;
        }
      }

      if (error) {
        console.error('❌ Error fetching updated profile:', error);
        return;
      }

      if (updatedProfile) {
        const oldBalance = profile.balance;
        const newBalance = updatedProfile.balance;
        const balanceDifference = newBalance - oldBalance;

        console.log(`💰 Balance update: ${oldBalance} → ${newBalance} (difference: ${balanceDifference})`);

        // Update frontend with the actual backend values
        await onUpdateUser({
          balance: newBalance,
          total_profit: updatedProfile.total_profit
        });

        // Show appropriate notification
        if (balanceDifference > 0) {
          // Check which color won to show in message
          const winningBets = userBetsInRound.filter(([betColor]) => betColor === completedRound.result_color);
          
          toast({
            title: "🎉 You Won!",
            description: `Won $${balanceDifference.toFixed(2)} on ${completedRound.result_color}!`,
          });
          
          console.log(`🎯 User won $${balanceDifference} on ${completedRound.result_color}`);
        } else {
          console.log(`😢 User lost (no balance increase)`);
        }
      }

    } catch (error: any) {
      console.error('❌ Error handling round payout:', error);
    }
  };

  // Place bet
  const placeBet = async (color: string) => {
    // MAINTENANCE CHECK: Prevent betting during maintenance
    if (isMaintenanceMode) {
      toast({
        title: "Game Paused",
        description: "This game is temporarily unavailable during maintenance.",
        variant: "destructive",
      });
      return;
    }

    // SECURITY 1: Comprehensive validation checks
    if (!user || !profile || !currentRound) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to place bets",
        variant: "destructive",
      });
      return;
    }

    // SECURITY 2: Round status and timing validation
    if (currentRound.status !== 'betting') {
      toast({
        title: "Betting Closed",
        description: "Betting is closed for this round",
        variant: "destructive",
      });
      return;
    }

    // SECURITY 3: Rate limiting - prevent spam clicking
    const now = Date.now();
    if (now - lastBetTime < MIN_BET_INTERVAL) {
      toast({
        title: "Rate Limited",
        description: "Please wait before placing another bet",
        variant: "destructive",
      });
      return;
    }

    // SECURITY 4: Prevent concurrent bet placement
    if (isPlacingBet || placingBetRef.current) {
      toast({
        title: "Bet In Progress",
        description: "Please wait for current bet to complete",
        variant: "destructive",
      });
      return;
    }

    // SECURITY 5: Validate bet amount
    const currentBalance = balanceRef.current;
    if (betAmount === '' || betAmount < 0.01 || betAmount > 1000000) {
      toast({
        title: "Invalid Bet Amount",
        description: "Bet must be between $0.01 and $1,000,000",
        variant: "destructive",
      });
      return;
    }

    if (Number(betAmount) > currentBalance) {
      toast({
        title: "Insufficient Balance",
        description: `Your balance is $${currentBalance.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    // SECURITY 6: Check betting limits per round
    if (userBetLimits.betCount >= MAX_BETS_PER_ROUND) {
      toast({
        title: "Bet Limit Reached",
        description: `Maximum ${MAX_BETS_PER_ROUND} bets per round`,
        variant: "destructive",
      });
      return;
    }

    if (userBetLimits.totalThisRound + Number(betAmount) > MAX_TOTAL_BET_PER_ROUND) {
      toast({
        title: "Round Limit Exceeded",
        description: `Maximum $${MAX_TOTAL_BET_PER_ROUND} total per round`,
        variant: "destructive",
      });
      return;
    }

    // SECURITY 7: Prevent duplicate bet detection
    const betKey = `${currentRound.id}-${color}-${betAmount}`;
    if (pendingBets.has(betKey)) {
      toast({
        title: "Duplicate Bet",
        description: "This bet is already being processed",
        variant: "destructive",
      });
      return;
    }

    // SECURITY 8: Set all protection flags
    setIsPlacingBet(true);
    placingBetRef.current = true;
    setLastBetTime(now);
    setPendingBets(prev => new Set([...prev, betKey]));

    try {
      // SECURITY 9: Final balance check before API call
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

      if (profileError || !currentProfile) {
        throw new Error('Failed to verify current balance');
      }

      if (currentProfile.balance < Number(betAmount)) {
        throw new Error(`Insufficient balance. Current: $${currentProfile.balance.toFixed(2)}`);
      }

      // SECURITY 10: Update balance ref with latest value
      balanceRef.current = currentProfile.balance;

      // Make the secure API call
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: {
          action: 'place_bet',
          userId: user.id,
          betColor: color,
          betAmount: Number(betAmount),
          roundId: currentRound.id
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.message || 'Failed to place bet');
      }

      // SECURITY 11: Success handling with optimistic updates
      toast({
        title: "Bet Placed!",
        description: `$${betAmount} on ${color}`,
      });

      // Update local user bets immediately
      setUserBets(prev => {
        const newBets = {
          ...prev,
          [color]: (prev[color] || 0) + Number(betAmount)
        };
        userBetsRef.current = newBets;
        return newBets;
      });
      
      // Add to round bet totals
      addToIsolatedTotal(color, Number(betAmount));

      // Update bet limits tracking
      setUserBetLimits(prev => ({
        totalThisRound: prev.totalThisRound + Number(betAmount),
        betCount: prev.betCount + 1
      }));

      // Update balance optimistically
      const newBalance = currentProfile.balance - Number(betAmount);
      balanceRef.current = newBalance;
      
      // Update profile balance through the parent component
      await onUpdateUser({
        balance: newBalance,
        total_wagered: profile.total_wagered + Number(betAmount)
      });

      currentRoundRef.current = currentRound.id;

    } catch (error: any) {
      console.error('❌ Bet placement failed:', error);
      
      // SECURITY 12: Comprehensive error handling
      let errorMessage = 'Failed to place bet';
      
      if (error.message.includes('Rate limit')) {
        errorMessage = 'Too many requests. Please wait before betting again.';
      } else if (error.message.includes('Insufficient balance')) {
        errorMessage = error.message;
      } else if (error.message.includes('Betting is closed')) {
        errorMessage = 'Betting period has ended for this round';
      } else if (error.message.includes('Duplicate bet')) {
        errorMessage = 'Duplicate bet detected. Please try again.';
      } else if (error.message.includes('Maximum bet limit')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Bet Failed",
        description: errorMessage,
        variant: "destructive",
      });

      // SECURITY 13: Refresh user balance on error to prevent desync
      try {
        const { data: refreshedProfile } = await supabase
          .from('profiles')
          .select('balance, total_wagered')
          .eq('id', user.id)
          .single();

        if (refreshedProfile) {
          balanceRef.current = refreshedProfile.balance;
          await onUpdateUser({
            balance: refreshedProfile.balance,
            total_wagered: refreshedProfile.total_wagered
          });
        }
      } catch (refreshError) {
        console.error('❌ Failed to refresh balance:', refreshError);
      }

    } finally {
      // SECURITY 14: Always clean up protection flags
      setIsPlacingBet(false);
      placingBetRef.current = false;
      setPendingBets(prev => {
        const newSet = new Set(prev);
        newSet.delete(betKey);
        return newSet;
      });
    }
  };

  const getMultiplierText = (color: string) => {
    return color === 'green' ? '14x' : '2x';
  };

  const getBetColorClass = (color: string) => {
    const isWinning = winningColor === color;
    
    switch (color) {
      case 'green': 
        return isWinning 
          ? 'bg-gradient-to-r from-green-400 to-green-500 hover:from-green-300 hover:to-green-400 text-white border-green-300 ring-4 ring-green-300 shadow-xl shadow-green-400/50 animate-pulse'
          : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white border-green-400 hover:shadow-lg hover:shadow-green-500/25 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 ease-out hover:brightness-110';
      case 'red': 
        return isWinning 
          ? 'bg-gradient-to-r from-red-400 to-red-500 hover:from-red-300 hover:to-red-400 text-white border-red-300 ring-4 ring-red-300 shadow-xl shadow-red-400/50 animate-pulse'
          : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white border-red-400 hover:shadow-lg hover:shadow-red-500/25 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 ease-out hover:brightness-110';
      case 'black': 
        return isWinning 
          ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white border-gray-400 ring-4 ring-gray-400 shadow-xl shadow-gray-400/50 animate-pulse'
          : 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white border-gray-500 hover:shadow-lg hover:shadow-gray-500/25 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 ease-out hover:brightness-110';
      default: return '';
    }
  };

  const getStatusText = () => {
    if (!currentRound) return 'Loading...';
    
    switch (currentRound.status) {
      case 'betting': return 'Betting Open';
      case 'spinning': return 'Spinning...';
      case 'completed': return 'Round Complete';
      default: return currentRound.status;
    }
  };

  const getResultColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'red': return 'bg-red-500';
      case 'black': return 'bg-gray-800';
      default: return 'bg-gray-500';
    }
  };

  const getResultBubbleClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/50';
      case 'red': return 'bg-gradient-to-br from-red-500 to-red-700 shadow-red-500/50';
      case 'black': return 'bg-gradient-to-br from-gray-700 to-gray-900 shadow-gray-500/50';
      default: return 'bg-gradient-to-br from-gray-500 to-gray-700 shadow-gray-500/50';
    }
  };

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // SECURITY: Reset bet limits and state when round changes
  useEffect(() => {
    if (currentRound?.id && currentRound.id !== currentRoundRef.current) {
      console.log('🔄 New round detected, resetting security state');
      
      // Reset bet limits for new round
      setUserBetLimits({ totalThisRound: 0, betCount: 0 });
      
      // Clear pending bets
      setPendingBets(new Set());
      
      // Reset betting state
      setIsPlacingBet(false);
      placingBetRef.current = false;
      
      // Clear user bets for new round
      setUserBets({});
      
      // Only clear isolated totals if it's actually a different round
      if (isolatedRoundId !== currentRound.id) {
        console.log('🧹 Clearing isolated totals for new round (security reset):', currentRound.id);
        setIsolatedRoundTotals({});
        setIsolatedRoundId(currentRound.id);
      }
      
      userBetsRef.current = {};
      
      // Update current round reference
      currentRoundRef.current = currentRound.id;
      
      // Clear any extended win animations
      setWinningColor(null);
      setExtendedWinAnimation(false);
    }
  }, [currentRound?.id]);

  // Debug bet amount state
  useEffect(() => {
    console.log('🔍 Bet amount debug:', {
      betAmount,
      betAmountType: typeof betAmount,
      betAmountNumber: Number(betAmount),
      isValidNumber: !isNaN(Number(betAmount)),
      isGreaterThanZero: Number(betAmount) > 0,
      isGreaterThanMin: Number(betAmount) >= 0.01,
      isLessThanBalance: Number(betAmount) <= (profile?.balance || 0),
      userBalance: profile?.balance,
      currentRoundStatus: currentRound?.status,
      isPlacingBet,
      userBetLimits,
      lastBetTime,
      timeSinceLastBet: Date.now() - lastBetTime,
      MIN_BET_INTERVAL
    });
  }, [betAmount, profile?.balance, currentRound?.status, isPlacingBet, userBetLimits, lastBetTime]);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Loading</p>
        </div>
      </div>
    );
  }

  if (!currentRound) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">No active round found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <div className="relative overflow-hidden group">
        {/* Cyberpunk Background with Advanced Effects */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl animate-cyber-header-pulse" />
        
        {/* Animated Circuit Board Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent)] bg-[20px_20px] animate-grid-move-slow" />
        </div>
        
        {/* Animated Border Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
        
        {/* Corner Tech Details */}
        <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-primary/60" />
        <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-accent/60" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-accent/60" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-primary/60" />
        
        <Card className="relative z-10 bg-transparent border-0">
          <CardHeader className="pb-4">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <svg 
                className="w-5 h-5 text-primary" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                <circle cx="12" cy="12" r="3" strokeWidth="2"/>
                <path d="M12 2v4M12 18v4M22 12h-4M6 12H2" strokeWidth="2"/>
              </svg>
              Roulette
              <Badge variant="outline">Round #{currentRound.round_number}</Badge>
            </span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <Button 
                onClick={openProvablyFairModal}
                variant="outline" 
                size="sm"
                className="glass border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-400 text-emerald-400 hover:text-emerald-300 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out"
                title="Provably Fair Verification"
              >
                <Shield className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Provably Fair</span>
              </Button>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-lg font-mono">
                  {timeLeft}s
                </span>
              </div>
              <Badge variant={currentRound.status === 'betting' ? 'default' : 'secondary'}>
                {getStatusText()}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>
    </div>

      <div className="w-full">
        {/* Main Game Area */}
        <div className="space-y-6">
          {/* Recent Results Bubbles */}
          <div className="flex justify-end mb-4">
            <div className="relative overflow-hidden group">
              {/* Cyberpunk Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-800/85 to-slate-900/90 backdrop-blur-md rounded-xl" />
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-xl blur-sm group-hover:blur-md transition-all duration-300" />
              
              {/* Tech corner accents */}
              <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-primary/60" />
              <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-accent/60" />
              
              <div className="relative z-10 p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-muted-foreground font-medium hidden sm:inline">Recent Results:</span>
              <span className="text-xs text-muted-foreground font-medium sm:hidden">Recent:</span>
              <div className="flex items-center gap-1 sm:gap-2">
                {recentResults.slice(0, isMobile ? 5 : 8).map((result, index) => (
                  <div
                    key={result.id}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-current/50 ${getResultBubbleClass(result.result_color)} animate-in slide-in-from-right-5`}
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animationFillMode: 'both'
                    }}
                    onClick={() => openRoundDetails(result)}
                    title={`Round #${result.round_number} - Click for details`}
                  >
                    {result.result_slot}
                  </div>
                ))}
                {recentResults.length === 0 && (
                  <span className="text-xs sm:text-sm text-muted-foreground">No results yet</span>
                )}
              </div>
            </div>
          </div>
        </div>

          {/* Roulette Reel */}
          <div className="relative overflow-hidden group">
            {/* Cyberpunk Background with Roulette Theme */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl" />
            
            {/* Animated Circuit Board Pattern with Primary Theme */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.4)_25%,rgba(99,102,241,0.4)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.4)_75%,rgba(99,102,241,0.4)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.4)_25%,rgba(99,102,241,0.4)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.4)_75%,rgba(99,102,241,0.4)_76%,transparent_77%,transparent)] bg-[24px_24px] animate-grid-move-slow" />
            </div>
            
            {/* Animated Border Glow with Site Colors */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-accent/40 to-primary/30 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
            
            {/* Enhanced Corner Tech Details */}
            <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-primary/70" />
            <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-accent/70" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-accent/70" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-primary/70" />
            
            <Card className="relative z-10 bg-transparent border-0">
              <CardContent className="p-6">
                <RouletteReel 
                  isSpinning={currentRound.status === 'spinning'}
                  winningSlot={currentRound.result_slot !== undefined ? currentRound.result_slot : null}
                  showWinAnimation={currentRound.status === 'completed'}
                  extendedWinAnimation={extendedWinAnimation}
                  serverReelPosition={currentRound.reel_position}
                />
              </CardContent>
            </Card>
          </div>

          {/* Betting Interface */}
          <div className="relative overflow-hidden group">
            {/* Cyberpunk Background with Betting Theme */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl" />
            
            {/* Animated Circuit Board Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent)] bg-[22px_22px] animate-grid-move-slow" />
            </div>
            
            {/* Animated Border Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
            
            {/* Corner Tech Details */}
            <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-primary/60" />
            <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-accent/60" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-accent/60" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-primary/60" />
            
            <Card className="relative z-10 bg-transparent border-0">
              <CardHeader className="pb-4">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>Place Your Bets</span>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {user && profile && (
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      <span>Balance: ${profile.balance.toFixed(2)}</span>
                    </div>
                  )}
                  <span className="text-muted-foreground">
                    {timeLeft > 0 ? `${timeLeft}s remaining` : 'Bets closed'}
                  </span>
                  {user && (
                    <div className="flex items-center gap-1">
                      {currentRound.status === 'betting' ? (
                        <>
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                          <span className="text-xs text-emerald-400">Open</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          <span className="text-xs text-red-400">Closed</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Full-Width Betting Interface */}
              {user && profile ? (
                <div className="w-full">
                  <div className="relative overflow-hidden group">
                    {/* Cyberpunk Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-sm rounded-xl" />
                    
                    {/* Subtle Border Glow */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 via-accent/15 to-primary/10 rounded-xl blur-sm transition-all duration-300" />
                    
                    {/* Tech Corner Accents */}
                    <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-primary/50" />
                    <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-accent/50" />
                    
                    <div className="relative z-10 px-4 py-2">
                      <div className="relative flex items-center justify-between gap-4">
                        {/* Left Side - Bet Amount Input with Floating Label */}
                        <div className="flex items-center gap-3 flex-1">
                          <div className="relative flex-1 max-w-xs">
                            {/* Clean Floating Label */}
                            <div className="absolute -top-2.5 left-3 z-20">
                              <label className="text-xs font-medium text-primary uppercase tracking-wider bg-slate-800/90 px-2 rounded">
                                Bet Amount
                              </label>
                            </div>
                            
                            {/* Futuristic Input Container */}
                            <div className="relative group/cyber">
                              {/* Holographic Scan Lines */}
                              <div className="absolute inset-0 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent translate-x-[-100%] group-focus-within/cyber:translate-x-[100%] transition-transform duration-1000 ease-out"></div>
                              </div>
                              
                                                             {/* Main Container */}
                               <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-primary/40 overflow-hidden" style={{
                                 clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                               }}>
                                {/* Inner Glow Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 opacity-0 group-focus-within/cyber:opacity-100 transition-opacity duration-300"></div>
                                
                                {/* Tech Corner Indicators */}
                                <div className="absolute top-0 right-0 w-2 h-2 bg-primary/60 animate-pulse"></div>
                                <div className="absolute bottom-0 left-0 w-2 h-2 bg-accent/60 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                                
                                                                 <div className="flex items-center gap-3 px-3 py-2 relative z-10">
                                                                     {/* Cyber Dollar Symbol */}
                                   <div className="flex items-center justify-center min-w-[28px] h-7 bg-gradient-to-br from-slate-800/80 via-slate-700/60 to-slate-800/80 border border-primary/60 text-primary font-bold text-sm relative overflow-hidden" style={{
                                     clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))'
                                   }}>
                                    <div className="absolute inset-0 bg-primary/20 translate-x-[-100%] group-hover/cyber:translate-x-[100%] transition-transform duration-500"></div>
                                    <span className="relative z-10">$</span>
                                  </div>
                                  
                                  <div className="relative flex-1">
                                <input
                                  type="text"
                                  value={betAmount}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '') {
                                      setBetAmount('');
                                      return;
                                    }
                                    
                                    // Only allow numbers, one decimal point, and max 2 decimal places
                                    const regex = /^\d*\.?\d{0,2}$/;
                                    if (!regex.test(value)) {
                                      return; // Don't update if doesn't match pattern
                                    }
                                    
                                    const newAmount = Number(value);
                                    if (isNaN(newAmount)) {
                                      return; // Don't update if not a valid number
                                    }
                                    
                                    const maxBalance = profile?.balance || 0;
                                    setBetAmount(newAmount > maxBalance ? maxBalance : Math.max(0.01, newAmount));
                                  }}
                                  onBlur={(e) => {
                                    // Format to 2 decimal places on blur if there's a value
                                    if (betAmount !== '' && !isNaN(Number(betAmount))) {
                                      setBetAmount(Number(Number(betAmount).toFixed(2)));
                                    }
                                  }}
                                  style={{
                                    fontSize: '24px',
                                    fontFamily: 'monospace',
                                    fontWeight: 'bold',
                                    letterSpacing: '0.1em'
                                  }}
                                  className="w-full text-center bg-transparent border-none focus:ring-0 focus:outline-none p-0 pr-8 text-primary focus:text-white placeholder:text-primary/40 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors duration-300 min-h-[36px]"
                                  disabled={currentRound.status !== 'betting'}
                                  placeholder="[ 0.00 ]"
                                />
                                
                                {/* Cyber Control Buttons */}
                                <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex flex-col gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentAmount = betAmount === '' ? 0 : Number(betAmount);
                                      const newAmount = currentAmount + 0.01;
                                      const maxBalance = profile?.balance || 0;
                                      setBetAmount(newAmount > maxBalance ? maxBalance : newAmount);
                                    }}
                                    disabled={currentRound.status !== 'betting'}
                                    className="w-5 h-4 flex items-center justify-center bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-primary/50 text-primary hover:text-white hover:border-primary hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 active:scale-95 relative overflow-hidden group"
                                    style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
                                  >
                                    <div className="absolute inset-0 bg-primary/30 translate-y-full group-hover:translate-y-0 transition-transform duration-200"></div>
                                    <div className="relative z-10 text-xs font-bold">▲</div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentAmount = betAmount === '' ? 0.02 : Number(betAmount);
                                      const newAmount = Math.max(0.01, currentAmount - 0.01);
                                      setBetAmount(newAmount);
                                    }}
                                    disabled={currentRound.status !== 'betting'}
                                    className="w-5 h-4 flex items-center justify-center bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-primary/50 text-primary hover:text-white hover:border-primary hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 active:scale-95 relative overflow-hidden group"
                                    style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
                                  >
                                    <div className="absolute inset-0 bg-primary/30 translate-y-full group-hover:translate-y-0 transition-transform duration-200"></div>
                                    <div className="relative z-10 text-xs font-bold">▼</div>
                                  </button>
                                </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-br from-slate-800/70 to-slate-900/80 border border-accent/40 relative overflow-hidden" style={{
                            clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))'
                          }}>
                            <div className="w-1 h-1 bg-accent animate-pulse"></div>
                            <span className="text-xs text-slate-300 whitespace-nowrap font-mono tracking-wide">
                              MAX: <span className="text-accent font-bold">${profile?.balance?.toFixed(2) || '0.00'}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Right Side - Multiplier Controls */}
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setBetAmount(Math.max(0.01, Math.floor(Number(betAmount) / 2 * 100) / 100))}
                          disabled={currentRound.status !== 'betting'}
                          className="h-9 w-14 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 border border-red-500/30 hover:border-red-400 text-red-400 hover:text-red-300 font-bold text-sm hover:shadow-lg hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out"
                        >
                          ÷2
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setBetAmount(Math.min(profile?.balance || 0, Number(betAmount) * 2))}
                          disabled={currentRound.status !== 'betting'}
                          className="h-9 w-14 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 hover:from-emerald-500/30 hover:to-emerald-600/30 border border-emerald-500/30 hover:border-emerald-400 text-emerald-400 hover:text-emerald-300 font-bold text-sm hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out"
                        >
                          ×2
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Sign in to place bets</p>
                </div>
              )}

              {/* Betting Options with Live Feeds */}
              <div className="grid grid-cols-3 gap-4">
                {(['red', 'green', 'black'] as const).map((color) => (
                  <div key={color} className="space-y-2">
                    {/* Cyberpunk Betting Button */}
                    <div className="relative group/bet">
                      {/* Holographic Scan Lines */}
                      <div className="absolute inset-0 overflow-hidden">
                        <div className={`absolute inset-0 transition-transform duration-1000 ease-out ${
                          color === 'red' ? 'bg-gradient-to-r from-transparent via-red-400/20 to-transparent' :
                          color === 'green' ? 'bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent' :
                          'bg-gradient-to-r from-transparent via-slate-400/20 to-transparent'
                        } translate-x-[-100%] group-hover/bet:translate-x-[100%]`}></div>
                      </div>
                      
                      {/* Main Button Container */}
                      <button
                        onClick={() => placeBet(color)}
                        disabled={
                          !user || 
                          !profile || 
                          currentRound.status !== 'betting' || 
                          isPlacingBet ||
                          betAmount === '' ||
                          isNaN(Number(betAmount)) ||
                          Number(betAmount) <= 0 ||
                          Number(betAmount) < 0.01 ||
                          Number(betAmount) > (profile?.balance || 0) ||
                          userBetLimits.betCount >= MAX_BETS_PER_ROUND ||
                          userBetLimits.totalThisRound + Number(betAmount) > MAX_TOTAL_BET_PER_ROUND ||
                          Date.now() - lastBetTime < MIN_BET_INTERVAL
                        }
                        className={`w-full h-12 relative overflow-hidden border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                          color === 'red' ? 'bg-gradient-to-br from-red-900/80 via-red-800/60 to-red-900/80 border-red-500/70 hover:border-red-400 text-red-100 hover:text-white hover:from-red-800/90 hover:to-red-800/90' :
                          color === 'green' ? 'bg-gradient-to-br from-emerald-900/80 via-emerald-800/60 to-emerald-900/80 border-emerald-500/70 hover:border-emerald-400 text-emerald-100 hover:text-white hover:from-emerald-800/90 hover:to-emerald-800/90' :
                          'bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 border-slate-500/70 hover:border-slate-400 text-slate-100 hover:text-white hover:from-slate-800/90 hover:to-slate-800/90'
                        } ${isPlacingBet ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{
                          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                        }}
                        title={
                          !user ? 'Sign in to bet' :
                          currentRound.status !== 'betting' ? 'Betting closed' :
                          isPlacingBet ? 'Processing bet...' :
                          betAmount === '' ? 'Enter bet amount' :
                          isNaN(Number(betAmount)) ? 'Invalid bet amount' :
                          Number(betAmount) <= 0 ? 'Bet amount must be greater than 0' :
                          Number(betAmount) < 0.01 ? 'Minimum bet is $0.01' :
                          Number(betAmount) > (profile?.balance || 0) ? 'Insufficient balance' :
                          userBetLimits.betCount >= MAX_BETS_PER_ROUND ? 'Max bets reached' :
                          userBetLimits.totalThisRound + Number(betAmount) > MAX_TOTAL_BET_PER_ROUND ? 'Round limit reached' :
                          Date.now() - lastBetTime < MIN_BET_INTERVAL ? 'Rate limited' :
                          `Bet $${Number(betAmount).toFixed(2)} on ${color}`
                        }
                      >
                        {/* Inner Glow Effect */}
                        <div className={`absolute inset-0 opacity-0 group-hover/bet:opacity-100 transition-opacity duration-300 ${
                          color === 'red' ? 'bg-gradient-to-r from-red-500/20 via-red-400/30 to-red-500/20' :
                          color === 'green' ? 'bg-gradient-to-r from-emerald-500/20 via-emerald-400/30 to-emerald-500/20' :
                          'bg-gradient-to-r from-slate-500/20 via-slate-400/30 to-slate-500/20'
                        }`}></div>
                        
                        {/* Tech Corner Indicators */}
                        <div className={`absolute top-0 right-0 w-2 h-2 animate-pulse ${
                          color === 'red' ? 'bg-red-500/60' :
                          color === 'green' ? 'bg-emerald-500/60' :
                          'bg-slate-500/60'
                        }`}></div>
                        <div className={`absolute bottom-0 left-0 w-2 h-2 animate-pulse ${
                          color === 'red' ? 'bg-red-500/60' :
                          color === 'green' ? 'bg-emerald-500/60' :
                          'bg-slate-500/60'
                        }`} style={{ animationDelay: '0.5s' }}></div>
                        
                        <div className="flex flex-col gap-1 items-center justify-center relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold capitalize">{color}</span>
                        <span className="text-xs">{getMultiplierText(color)}</span>
                        {isPlacingBet && <div className="w-3 h-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>}
                      </div>
                          {isolatedRoundTotals[color] && (
                            <span className="text-xs opacity-90 bg-white/20 px-2 py-1 rounded">
                              Total: ${isolatedRoundTotals[color].toFixed(2)}
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                    
                    {/* Live totals calculated from live feed */}
                    <div className="text-center text-xs space-y-1">
                      <div className="font-medium">
                        ${(color === 'green' ? greenBets : color === 'red' ? redBets : blackBets).reduce((sum, bet) => sum + bet.bet_amount, 0).toFixed(0)} total
                      </div>
                      <div className="text-muted-foreground">
                        {(color === 'green' ? greenBets : color === 'red' ? redBets : blackBets).length} bets
                      </div>
                    </div>

                    {/* Live Bet Feed (Cyberpunk Design) */}
                    <div className="relative overflow-hidden group">
                      {/* Clean Cyberpunk Background */}
                      <div className={`absolute inset-0 backdrop-blur-sm rounded-xl ${
                        color === 'red' ? 'bg-gradient-to-br from-slate-900/60 via-slate-800/50 to-slate-900/60' :
                        color === 'green' ? 'bg-gradient-to-br from-slate-900/60 via-slate-800/50 to-slate-900/60' :
                        'bg-gradient-to-br from-slate-900/60 via-slate-800/50 to-slate-900/60'
                      }`} />
                      
                      {/* Subtle Border Accent */}
                      <div className={`absolute -inset-0.5 rounded-xl blur-sm transition-all duration-300 ${
                        color === 'red' ? 'bg-gradient-to-r from-red-500/10 via-red-400/15 to-red-500/10' :
                        color === 'green' ? 'bg-gradient-to-r from-emerald-500/10 via-emerald-400/15 to-emerald-500/10' :
                        'bg-gradient-to-r from-slate-500/10 via-slate-400/15 to-slate-500/10'
                      }`} />
                      
                      {/* Tech Corner Accents */}
                      <div className={`absolute top-1 left-1 w-1.5 h-1.5 border-l border-t ${
                        color === 'red' ? 'border-red-400/60' :
                        color === 'green' ? 'border-emerald-400/60' :
                        'border-slate-400/60'
                      }`} />
                      <div className={`absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b ${
                        color === 'red' ? 'border-red-400/60' :
                        color === 'green' ? 'border-emerald-400/60' :
                        'border-slate-400/60'
                      }`} />
                      
                      <Card className="relative z-10 bg-transparent border-0">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center justify-between">
                            <span className="capitalize">{color} Bets</span>
                            <Badge variant="outline" className={`text-xs ${
                              color === 'red' ? 'border-red-400/50 text-red-400' :
                              color === 'green' ? 'border-emerald-400/50 text-emerald-400' :
                              'border-slate-400/50 text-slate-400'
                            }`}>
                              {(color === 'green' ? greenBets : color === 'red' ? redBets : blackBets).length} live
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                        <ScrollArea className="h-32">
                          {(color === 'green' ? greenBets : color === 'red' ? redBets : blackBets).length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                              <svg 
                                className="w-8 h-8 mx-auto mb-2 opacity-60" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <circle cx="8" cy="8" r="6" strokeWidth="2"/>
                                <path d="M16 16c0-3.314-2.686-6-6-6s-6 2.686-6 6" strokeWidth="2"/>
                                <circle cx="16" cy="16" r="6" strokeWidth="2"/>
                              </svg>
                              <p className="text-xs">No bets yet</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {(color === 'green' ? greenBets : color === 'red' ? redBets : blackBets).slice(0, 8).map((bet, index) => (
                                <div
                                  key={index}
                                  className={`p-2 rounded-lg border transition-colors animate-fade-in ${
                                    color === 'red' ? 'bg-red-950/40 hover:bg-red-950/60 border-red-500/20' :
                                    color === 'green' ? 'bg-emerald-950/40 hover:bg-emerald-950/60 border-emerald-500/20' :
                                    'bg-slate-900/40 hover:bg-slate-900/60 border-slate-500/20'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                                        color === 'red' ? 'bg-gradient-to-br from-red-500/30 to-red-600/50 border-red-400/50 text-red-200' :
                                        color === 'green' ? 'bg-gradient-to-br from-emerald-500/30 to-emerald-600/50 border-emerald-400/50 text-emerald-200' :
                                        'bg-gradient-to-br from-slate-500/30 to-slate-600/50 border-slate-400/50 text-slate-200'
                                      }`}>
                                        {bet.username[0].toUpperCase()}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className={`font-medium text-xs truncate ${
                                          color === 'red' ? 'text-red-300' :
                                          color === 'green' ? 'text-emerald-300' :
                                          'text-slate-300'
                                        }`}>
                                          {bet.username}
                                        </div>
                                        {bet.result !== 'pending' && (
                                          <div className="text-xs text-muted-foreground">
                                            Round completed
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      {bet.result === 'pending' ? (
                                        // Show bet amount for pending bets
                                        <div className={`font-bold text-xs ${
                                          color === 'red' ? 'text-red-200' :
                                          color === 'green' ? 'text-emerald-200' :
                                          'text-slate-200'
                                        }`}>
                                          ${bet.bet_amount.toFixed(0)}
                                        </div>
                                      ) : (
                                        // Show profit/loss for completed bets
                                        <div className={`font-bold text-xs ${bet.result === 'win' ? 'text-emerald-400' : 'text-red-400'}`}>
                                          {bet.result === 'win' ? '+' : '-'}${Math.abs(bet.profit || 0).toFixed(0)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

      {/* Provably Fair Modal */}
      <ProvablyFairModal
        isOpen={provablyFairModalOpen}
        onClose={() => setProvablyFairModalOpen(false)}
        roundData={selectedRoundData}
        showCurrentRound={selectedRoundData?.id === currentRound?.id}
      />

      {/* Provably Fair History Modal */}
      <ProvablyFairHistoryModal
        isOpen={provablyFairHistoryOpen}
        onClose={() => setProvablyFairHistoryOpen(false)}
      />
    </div>
  );
}