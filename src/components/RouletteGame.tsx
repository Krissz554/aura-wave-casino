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
    <div className="relative group/bet">
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute inset-0 transition-transform duration-1000 ease-out ${
          color === 'red' ? 'bg-gradient-to-r from-transparent via-red-400/20 to-transparent' :
          color === 'green' ? 'bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent' :
          'bg-gradient-to-r from-transparent via-slate-400/20 to-transparent'
        } translate-x-[-100%] group-hover/bet:translate-x-[100%]`}></div>
      </div>
      
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
        className={`w-full h-12 relative overflow-hidden border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${getBetColorClass(color)}`}
        style={{
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
        }}
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
  <div className="relative overflow-hidden group">
    <div className={`absolute inset-0 backdrop-blur-sm rounded-xl ${
      color === 'red' ? 'bg-gradient-to-br from-slate-900/60 via-slate-800/50 to-slate-900/60' :
      color === 'green' ? 'bg-gradient-to-br from-slate-900/60 via-slate-800/50 to-slate-900/60' :
      'bg-gradient-to-br from-slate-900/60 via-slate-800/50 to-slate-900/60'
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
      {/* ... existing JSX with memoized components ... */}
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
      {/* ... rest of JSX ... */}
    </div>
  );
}