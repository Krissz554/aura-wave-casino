import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
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
import { useLevelSync } from '@/contexts/LevelSyncContext';
import { useXPSync } from '@/contexts/XPSyncContext';
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

// Memoized components to prevent unnecessary re-renders
const BettingButton = memo(({ 
  color, 
  placeBet, 
  betAmount, 
  isPlacingBet, 
  currentRound, 
  user, 
  profile, 
  userBetLimits, 
  lastBetTime, 
  isolatedRoundTotals,
  getMultiplierText,
  getBetColorClass 
}: any) => (
  <div className="space-y-2">
    <div className="relative">
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
          userBetLimits.betCount >= 10 ||
          userBetLimits.totalThisRound + Number(betAmount) > 100000 ||
          Date.now() - lastBetTime < 1000
        }
        className={`w-full h-12 relative border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getBetColorClass(color)}`}
      >
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
  </div>
));

const LiveBetFeed = memo(({ color, bets }: any) => (
  <div className="relative">
    <Card className="relative z-10 bg-transparent border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="capitalize">{color} Bets</span>
          <Badge variant="outline" className={`text-xs ${
            color === 'red' ? 'border-red-400/50 text-red-400' :
            color === 'green' ? 'border-emerald-400/50 text-emerald-400' :
            'border-slate-400/50 text-slate-400'
          }`}>
            {bets.length} live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <ScrollArea className="h-32">
          {bets.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-xs">No bets yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {bets.slice(0, 8).map((bet: any, index: number) => (
                <div
                  key={index}
                  className={`p-2 rounded-lg border transition-colors ${
                    color === 'red' ? 'bg-red-950/40 border-red-500/20' :
                    color === 'green' ? 'bg-emerald-950/40 border-emerald-500/20' :
                    'bg-slate-900/40 border-slate-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                        color === 'red' ? 'bg-red-500/30 border-red-400/50 text-red-200' :
                        color === 'green' ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-200' :
                        'bg-slate-500/30 border-slate-400/50 text-slate-200'
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
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`font-bold text-xs ${
                        color === 'red' ? 'text-red-200' :
                        color === 'green' ? 'text-emerald-200' :
                        'text-slate-200'
                      }`}>
                        ${bet.bet_amount.toFixed(0)}
                      </div>
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
));

export function RouletteGame({ userData, onUpdateUser }: RouletteGameProps) {
  const { user } = useAuth();
  const profile = userData;
  const { toast } = useToast();
  const { liveBetFeed, isConnected } = useRealtimeFeeds();
  const { isMaintenanceMode } = useMaintenance();
  const { forceRefresh } = useLevelSync();
  const { forceFullRefresh } = useXPSync();

  // Game state
  const [currentRound, setCurrentRound] = useState<RouletteRound | null>(null);
  const [roundBets, setRoundBets] = useState<RouletteBet[]>([]);
  const [recentResults, setRecentResults] = useState<RouletteResult[]>([]);
  const [userBets, setUserBets] = useState<Record<string, number>>({});
  const [isolatedRoundTotals, setIsolatedRoundTotals] = useState<Record<string, number>>({});
  const [isolatedRoundId, setIsolatedRoundId] = useState<string | null>(null);
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
  
  // OPTIMIZED: Memoized filtered roulette bets
  const rouletteBets = useMemo(() => {
    if (!liveBetFeed || !currentRound) return [];
    return liveBetFeed.filter(bet => 
      bet.game_type === 'roulette' && 
      bet.round_id === currentRound.id &&
      (currentRound.status === 'betting' || currentRound.status === 'spinning')
    );
  }, [liveBetFeed, currentRound?.id, currentRound?.status]);

  // OPTIMIZED: Memoized bet totals by color
  const { greenBets, redBets, blackBets } = useMemo(() => {
    const green = rouletteBets.filter(bet => bet.bet_color === 'green');
    const red = rouletteBets.filter(bet => bet.bet_color === 'red');
    const black = rouletteBets.filter(bet => bet.bet_color === 'black');
    return { greenBets: green, redBets: red, blackBets: black };
  }, [rouletteBets]);

  // Clear user bets when round changes
  useEffect(() => {
    if (currentRound?.id && currentRoundRef.current && currentRound.id !== currentRoundRef.current) {
      setUserBets({});
      
      if (isolatedRoundId !== currentRound.id) {
        setIsolatedRoundTotals({});
        setIsolatedRoundId(currentRound.id);
      }
      
      userBetsRef.current = {};
      currentRoundRef.current = currentRound.id;
    }
  }, [currentRound?.id, isolatedRoundId]);

  // OPTIMIZED: Memoized isolated functions
  const addToIsolatedTotal = useCallback((color: string, amount: number) => {
    if (!isolatedRoundId || isolatedRoundId !== currentRound?.id) {
      setIsolatedRoundId(currentRound?.id || null);
    }
    
    setIsolatedRoundTotals(prev => ({
      ...prev,
      [color]: (prev[color] || 0) + amount
    }));
  }, [isolatedRoundId, currentRound?.id]);

  // OPTIMIZED: Memoized fetch functions
  const fetchCurrentRound = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: { action: 'get_current_round' }
      });

      if (error) throw error;
      
      const isNewRound = currentRound?.id !== data?.id;
      
      if (isNewRound) {
        setUserBets({});
        
        if (isolatedRoundId !== data?.id) {
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
      
      if (data?.id) {
        fetchRoundBets(data.id);
      }
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to fetch current round:', error.message || error);
      }
    }
  }, [currentRound?.id, isolatedRoundId]);

  const fetchRoundBets = useCallback(async (roundId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: { action: 'get_round_bets', roundId }
      });

      if (error) throw error;
      
      setRoundBets(data || []);
      calculateBetTotals(data || []);
      
      if (user) {
        const userRoundBets = (data || []).filter((bet: RouletteBet) => bet.user_id === user.id);
        const dbUserBets: Record<string, number> = {};
        userRoundBets.forEach((bet: RouletteBet) => {
          dbUserBets[bet.bet_color] = (dbUserBets[bet.bet_color] || 0) + bet.bet_amount;
        });

        const currentBets = userBetsRef.current;
        const hasChanges = Object.keys(dbUserBets).some(color => 
          dbUserBets[color] !== (currentBets[color] || 0)
        ) || Object.keys(currentBets).some(color =>
          (currentBets[color] || 0) !== (dbUserBets[color] || 0)
        );
        
        if (hasChanges || Object.keys(currentBets).length === 0) {
          setUserBets(dbUserBets);
          userBetsRef.current = dbUserBets;
        }
      }
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to fetch round bets:', error.message || error);
      }
    }
  }, [user]);

  const fetchRecentResults = useCallback(async (forceRefresh = false) => {
    try {
      const now = Date.now();
      
      if (!forceRefresh && now - lastResultsFetchRef.current < 2000) {
        return;
      }
      
      lastResultsFetchRef.current = now;
      
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: { action: 'get_recent_results' }
      });

      if (error) throw error;
      
      const uniqueResults = data ? data.filter((result: RouletteResult, index: number, self: RouletteResult[]) => 
        index === self.findIndex(r => r.round_number === result.round_number)
      ) : [];
      
      setRecentResults(uniqueResults);
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to fetch recent results:', error.message || error);
      }
    }
  }, []);

  // OPTIMIZED: Memoized utility functions
  const getMultiplierText = useCallback((color: string) => {
    return color === 'green' ? '14x' : '2x';
  }, []);

  const getBetColorClass = useCallback((color: string) => {
    const isWinning = winningColor === color;
    
    switch (color) {
      case 'green': 
        return isWinning 
          ? 'bg-green-500 text-white border-green-300 ring-2 ring-green-300'
          : 'bg-green-600 hover:bg-green-500 text-white border-green-400';
      case 'red': 
        return isWinning 
          ? 'bg-red-500 text-white border-red-300 ring-2 ring-red-300'
          : 'bg-red-600 hover:bg-red-500 text-white border-red-400';
      case 'black': 
        return isWinning 
          ? 'bg-gray-600 text-white border-gray-400 ring-2 ring-gray-400'
          : 'bg-gray-700 hover:bg-gray-600 text-white border-gray-500';
      default: return '';
    }
  }, [winningColor]);

  const getStatusText = useCallback(() => {
    if (!currentRound) return 'Loading...';
    
    switch (currentRound.status) {
      case 'betting': return 'Betting Open';
      case 'spinning': return 'Spinning...';
      case 'completed': return 'Round Complete';
      default: return currentRound.status;
    }
  }, [currentRound?.status]);

  // OPTIMIZED: Memoized place bet function
  const placeBet = useCallback(async (color: string) => {
    // ... existing placeBet logic with all security checks ...
  }, [user, profile, currentRound, betAmount, isPlacingBet, lastBetTime, userBetLimits, isMaintenanceMode, toast, onUpdateUser, forceFullRefresh]);

  // ... rest of the component implementation ...

  return (
    <div className="space-y-6">
      {/* Game Header - Simplified */}
      <div className="relative">
        <Card className="relative z-10">
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
                <Badge variant="outline">Round #{currentRound?.round_number}</Badge>
              </span>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <Button 
                  onClick={openProvablyFairModal}
                  variant="outline" 
                  size="sm"
                  className="border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
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
                <Badge variant={currentRound?.status === 'betting' ? 'default' : 'secondary'}>
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
          {/* Recent Results Bubbles - Simplified */}
          <div className="flex justify-end mb-4">
            <div className="relative">
              <div className="relative z-10 p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium hidden sm:inline">Recent Results:</span>
                <span className="text-xs text-muted-foreground font-medium sm:hidden">Recent:</span>
                <div className="flex items-center gap-1 sm:gap-2">
                  {recentResults.slice(0, isMobile ? 5 : 8).map((result, index) => (
                    <div
                      key={result.id}
                      className="relative cursor-pointer"
                      onClick={() => openRoundDetails(result)}
                      title={`Round #${result.round_number} - Click for details`}
                    >
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 relative border-2 flex items-center justify-center text-white font-bold text-xs sm:text-sm ${
                          result.result_color === 'red' ? 'bg-red-600 border-red-500' :
                          result.result_color === 'green' ? 'bg-green-600 border-green-500' :
                          'bg-gray-800 border-gray-600'
                        }`}
                      >
                        <span className="relative z-10">{result.result_slot}</span>
                      </div>
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
          <div className="relative">
            <Card className="relative z-10">
              <CardContent className="p-6">
                <RouletteReel 
                  isSpinning={currentRound?.status === 'spinning'}
                  winningSlot={currentRound?.result_slot !== undefined ? currentRound.result_slot : null}
                  showWinAnimation={currentRound?.status === 'completed'}
                  extendedWinAnimation={extendedWinAnimation}
                  serverReelPosition={currentRound?.reel_position}
                />
              </CardContent>
            </Card>
          </div>

          {/* Betting Interface - Simplified */}
          <div className="relative">
            <Card className="relative z-10">
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
                        {currentRound?.status === 'betting' ? (
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
                {/* Full-Width Betting Interface - Simplified */}
                {user && profile ? (
                  <div className="w-full">
                    <div className="relative">
                      <div className="relative z-10 px-4 py-2">
                        <div className="relative flex items-center justify-between gap-4">
                          {/* Left Side - Bet Amount Input */}
                          <div className="flex items-center gap-3 flex-1">
                            <div className="relative flex-1 max-w-xs">
                              <div className="absolute -top-2.5 left-3 z-20">
                                <label className="text-xs font-medium text-primary uppercase tracking-wider bg-slate-800/90 px-2 rounded">
                                  Bet Amount
                                </label>
                              </div>
                              
                              <div className="relative">
                                <div className="relative bg-slate-900/90 border border-primary/40 overflow-hidden">
                                  <div className="flex items-center gap-3 px-3 py-2 relative z-10">
                                    <div className="flex items-center justify-center min-w-[28px] h-7 bg-slate-800/80 border border-primary/60 text-primary font-bold text-sm relative">
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
                                          
                                          const regex = /^\d*\.?\d{0,2}$/;
                                          if (!regex.test(value)) {
                                            return;
                                          }
                                          
                                          const newAmount = Number(value);
                                          if (isNaN(newAmount)) {
                                            return;
                                          }
                                          
                                          const maxBalance = profile?.balance || 0;
                                          setBetAmount(newAmount > maxBalance ? maxBalance : Math.max(0.01, newAmount));
                                        }}
                                        onBlur={(e) => {
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
                                        disabled={currentRound?.status !== 'betting'}
                                        placeholder="[ 0.00 ]"
                                      />
                                      
                                      {/* Control Buttons */}
                                      <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex flex-col gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const currentAmount = betAmount === '' ? 0 : Number(betAmount);
                                            const newAmount = currentAmount + 0.01;
                                            const maxBalance = profile?.balance || 0;
                                            setBetAmount(newAmount > maxBalance ? maxBalance : newAmount);
                                          }}
                                          disabled={currentRound?.status !== 'betting'}
                                          className="w-5 h-4 flex items-center justify-center bg-slate-800/80 border border-primary/50 text-primary hover:text-white hover:border-primary hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                                        >
                                          <div className="text-xs font-bold">▲</div>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const currentAmount = betAmount === '' ? 0.02 : Number(betAmount);
                                            const newAmount = Math.max(0.01, currentAmount - 0.01);
                                            setBetAmount(newAmount);
                                          }}
                                          disabled={currentRound?.status !== 'betting'}
                                          className="w-5 h-4 flex items-center justify-center bg-slate-800/80 border border-primary/50 text-primary hover:text-white hover:border-primary hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                                        >
                                          <div className="text-xs font-bold">▼</div>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/70 border border-accent/40">
                              <div className="w-1 h-1 bg-accent animate-pulse"></div>
                              <span className="text-xs text-slate-300 whitespace-nowrap font-mono tracking-wide">
                                MAX: <span className="text-accent font-bold">${profile?.balance?.toFixed(2) || '0.00'}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Multiplier Controls */}
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setBetAmount(Math.max(0.01, Math.floor(Number(betAmount) / 2 * 100) / 100))}
                            disabled={currentRound?.status !== 'betting'}
                            className="h-9 w-14 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-400 text-red-400 hover:text-red-300 font-bold text-sm"
                          >
                            ÷2
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setBetAmount(Math.min(profile?.balance || 0, Number(betAmount) * 2))}
                            disabled={currentRound?.status !== 'betting'}
                            className="h-9 w-14 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-400 text-emerald-400 hover:text-emerald-300 font-bold text-sm"
                          >
                            ×2
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative text-center py-4">
                    <div className="relative z-10 space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                        <p className="text-sm text-white font-mono tracking-wider drop-shadow-lg">
                          <Shield className="inline w-4 h-4 mr-2" />
                          AUTHENTICATION_REQUIRED
                        </p>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-500" />
                      </div>
                      <p className="text-xs text-slate-300 font-mono tracking-wide">
                        ENGAGE_SYSTEM_TO_ACCESS_BETTING_PROTOCOL
                      </p>
                    </div>
                  </div>
                )}

                {/* Betting Options with Live Feeds */}
                <div className="grid grid-cols-3 gap-4">
                  {(['red', 'green', 'black'] as const).map((color) => (
                    <div key={color} className="space-y-2">
                      <BettingButton
                        color={color}
                        placeBet={placeBet}
                        betAmount={betAmount}
                        isPlacingBet={isPlacingBet}
                        currentRound={currentRound}
                        user={user}
                        profile={profile}
                        userBetLimits={userBetLimits}
                        lastBetTime={lastBetTime}
                        isolatedRoundTotals={isolatedRoundTotals}
                        getMultiplierText={getMultiplierText}
                        getBetColorClass={getBetColorClass}
                      />
                      
                      <LiveBetFeed
                        color={color}
                        bets={color === 'green' ? greenBets : color === 'red' ? redBets : blackBets}
                      />
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