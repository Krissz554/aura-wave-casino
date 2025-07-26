import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Users, Wallet, Plus, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { RouletteReel } from './RouletteReel';
import { RouletteResultHistory } from './RouletteResultHistory';

interface RouletteRound {
  id: string;
  round_number: number;
  status: 'betting' | 'spinning' | 'completed';
  result_slot?: number;
  result_color?: string;
  result_multiplier?: number;
  betting_end_time: string;
  spinning_end_time: string;
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
  created_at: string;
  profiles?: {
    username: string;
  };
}

interface RouletteResult {
  id: string;
  round_number: number;
  result_color: string;
  result_slot: number;
  created_at: string;
}

interface BetTotals {
  green: { total: number; count: number; users: RouletteBet[] };
  red: { total: number; count: number; users: RouletteBet[] };
  black: { total: number; count: number; users: RouletteBet[] };
}

export const RouletteGame = () => {
  const { user } = useAuth();
  const { userData: profile, updateUserProfile } = useUserProfile();
  const { toast } = useToast();

  // Game state
  const [currentRound, setCurrentRound] = useState<RouletteRound | null>(null);
  const [roundBets, setRoundBets] = useState<RouletteBet[]>([]);
  const [recentResults, setRecentResults] = useState<RouletteResult[]>([]);
  const [userBets, setUserBets] = useState<Record<string, number>>({});
  const [betTotals, setBetTotals] = useState<BetTotals>({
    green: { total: 0, count: 0, users: [] },
    red: { total: 0, count: 0, users: [] },
    black: { total: 0, count: 0, users: [] }
  });

  // UI state
  const [betAmount, setBetAmount] = useState(10);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch current round
  const fetchCurrentRound = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: { action: 'get_current_round' }
      });

      if (error) throw error;
      
      console.log('🎰 Current round:', data);
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
      
      setRoundBets(data || []);
      calculateBetTotals(data || []);
      
      // Calculate user's bets for this round
      if (user) {
        const userRoundBets = (data || []).filter((bet: RouletteBet) => bet.user_id === user.id);
        const userBetsByColor: Record<string, number> = {};
        userRoundBets.forEach((bet: RouletteBet) => {
          userBetsByColor[bet.bet_color] = (userBetsByColor[bet.bet_color] || 0) + bet.bet_amount;
        });
        setUserBets(userBetsByColor);
      }
    } catch (error: any) {
      console.error('Failed to fetch round bets:', error);
    }
  };

  // Fetch recent results
  const fetchRecentResults = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: { action: 'get_recent_results' }
      });

      if (error) throw error;
      setRecentResults(data || []);
    } catch (error: any) {
      console.error('Failed to fetch recent results:', error);
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
          setCurrentRound(round);
          
          // Fetch bets for new/updated round
          if (round.id) {
            fetchRoundBets(round.id);
          }
        }
      })
      .subscribe();

    // Subscribe to bet updates
    const betSubscription = supabase
      .channel('roulette_bets')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'roulette_bets'
      }, (payload) => {
        console.log('💰 Bet update:', payload);
        if (currentRound?.id) {
          fetchRoundBets(currentRound.id);
        }
      })
      .subscribe();

    // Subscribe to results updates
    const resultsSubscription = supabase
      .channel('roulette_results')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'roulette_results'
      }, (payload) => {
        console.log('🎯 New result:', payload);
        fetchRecentResults();
      })
      .subscribe();

    // Subscribe to profile updates (for balance changes)
    let profileSubscription: any = null;
    if (user) {
      profileSubscription = supabase
        .channel(`profile_${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        }, (payload) => {
          console.log('💳 Balance update:', payload);
          if (payload.new) {
            updateUserProfile(payload.new as any);
          }
        })
        .subscribe();
    }

    return () => {
      roundSubscription.unsubscribe();
      betSubscription.unsubscribe();
      resultsSubscription.unsubscribe();
      if (profileSubscription) {
        profileSubscription.unsubscribe();
      }
    };
  }, [user, currentRound?.id]);

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

  // Place bet
  const placeBet = async (color: string) => {
    if (!user || !profile || !currentRound) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to place bets",
        variant: "destructive",
      });
      return;
    }

    if (currentRound.status !== 'betting') {
      toast({
        title: "Betting Closed",
        description: "Betting is closed for this round",
        variant: "destructive",
      });
      return;
    }

    if (betAmount < 1 || betAmount > profile.balance) {
      toast({
        title: "Invalid Bet",
        description: betAmount > profile.balance ? "Insufficient balance" : "Invalid bet amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: {
          action: 'place_bet',
          userId: user.id,
          betColor: color,
          betAmount: betAmount,
          roundId: currentRound.id
        }
      });

      if (error) throw error;

      toast({
        title: "Bet Placed!",
        description: `$${betAmount} on ${color}`,
      });

      // Update local user bets immediately
      setUserBets(prev => ({
        ...prev,
        [color]: (prev[color] || 0) + betAmount
      }));

    } catch (error: any) {
      toast({
        title: "Bet Failed",
        description: error.message || 'Failed to place bet',
        variant: "destructive",
      });
    }
  };

  const getMultiplierText = (color: string) => {
    return color === 'green' ? '14x' : '2x';
  };

  const getBetColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white border-green-400';
      case 'red': return 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white border-red-400';
      case 'black': return 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white border-gray-500';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading roulette game...</p>
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
      <Card className="glass border-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              🎰 Roulette
              <Badge variant="outline">Round #{currentRound.round_number}</Badge>
            </span>
            <div className="flex items-center gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Game Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Roulette Reel */}
          <Card className="glass border-0">
            <CardContent className="p-6">
              <RouletteReel 
                isSpinning={currentRound.status === 'spinning'}
                winningSlot={currentRound.result_slot || null}
                showWinAnimation={currentRound.status === 'completed'}
              />
            </CardContent>
          </Card>

          {/* Betting Interface */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Place Your Bets</span>
                {user && profile && (
                  <div className="flex items-center gap-2 text-sm">
                    <Wallet className="w-4 h-4" />
                    <span>Balance: ${profile.balance.toFixed(2)}</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bet Amount Controls */}
              {user && profile ? (
                <div className="flex items-center gap-4 justify-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setBetAmount(Math.max(1, betAmount - 5))}
                    disabled={currentRound.status !== 'betting'}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Bet:</span>
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Number(e.target.value))}
                      min="1"
                      max={profile.balance}
                      className="w-24 text-center"
                      disabled={currentRound.status !== 'betting'}
                    />
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setBetAmount(betAmount + 5)}
                    disabled={currentRound.status !== 'betting' || betAmount + 5 > profile.balance}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setBetAmount(10)}
                      disabled={currentRound.status !== 'betting'}
                    >
                      $10
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setBetAmount(50)}
                      disabled={currentRound.status !== 'betting'}
                    >
                      $50
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setBetAmount(Math.min(100, profile.balance))}
                      disabled={currentRound.status !== 'betting'}
                    >
                      $100
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">Sign in to place bets</p>
                </div>
              )}

              {/* Betting Options */}
              <div className="grid grid-cols-3 gap-4">
                {(['green', 'red', 'black'] as const).map((color) => (
                  <div key={color} className="space-y-2">
                    <Button
                      onClick={() => placeBet(color)}
                      disabled={!user || !profile || currentRound.status !== 'betting'}
                      className={`w-full h-20 flex flex-col gap-2 border-2 ${getBetColorClass(color)}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold capitalize">{color}</span>
                        <span className="text-sm">{getMultiplierText(color)}</span>
                      </div>
                      {userBets[color] && (
                        <span className="text-xs opacity-90 bg-white/20 px-2 py-1 rounded">
                          Your bet: ${userBets[color].toFixed(2)}
                        </span>
                      )}
                    </Button>
                    
                    {/* Live Bet Totals */}
                    <div className="text-center text-xs space-y-1">
                      <div className="font-medium">
                        ${betTotals[color].total.toFixed(0)} total
                      </div>
                      <div className="text-muted-foreground">
                        {betTotals[color].count} bets
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Results */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="text-lg">Recent Results</CardTitle>
            </CardHeader>
            <CardContent>
              <RouletteResultHistory results={recentResults} />
            </CardContent>
          </Card>

          {/* Round Bets */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Round Bets ({roundBets.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {roundBets.slice(0, 10).map((bet) => (
                    <div key={bet.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {bet.profiles?.username?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-16">
                          {bet.profiles?.username || 'Anonymous'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${
                          bet.bet_color === 'green' ? 'bg-green-500' :
                          bet.bet_color === 'red' ? 'bg-red-500' : 'bg-gray-500'
                        }`}></span>
                        <span>${bet.bet_amount}</span>
                      </div>
                    </div>
                  ))}
                  {roundBets.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No bets yet</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};