import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trophy, Target, TrendingUp, Calendar, Star, Gamepad2, Coins, Zap, Gift, Award, Users, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatXP, formatXPProgress, calculateXPProgress } from '@/lib/xpUtils';


interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlocked_at?: string;
}

interface UserStats {
  id: string;
  username: string;
  registration_date: string;
  current_level: number;
  lifetime_xp: number;
  current_xp: number;
  xp_to_next_level: number;
  badges: string[];
  total_wagered: number;
  total_profit: number;
  gameStats: {
    crash: {
      wins: number;
      losses: number;
      total_profit: number;
    };
    coinflip: {
      wins: number;
      losses: number;
      total_profit: number;
    };
    tower: {
      wins: number;
      losses: number;
      total_profit: number;
    };
    roulette: {
      wins: number;
      losses: number;
      total_profit: number;
    };
  };
  recentGames: {
    game_type: string;
    bet_amount: number;
    result: string;
    profit: number;
    multiplier?: number;
    created_at: string;
  }[];
  achievements: Achievement[];
  tipsSent: number;
  tipsReceived: number;
}

interface UserStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string | null;
}

export default function UserStatsModal({ isOpen, onClose, username }: UserStatsModalProps) {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && username) {
      fetchUserStats(username);
    }
  }, [isOpen, username]);

  const { user } = useAuth();
  const { toast } = useToast();
  const [tipAmount, setTipAmount] = useState('');
  const [tipMessage, setTipMessage] = useState('');
  const [showTipForm, setShowTipForm] = useState(false);
  const [tipping, setTipping] = useState(false);

  const fetchUserStats = async (targetUsername: string) => {
    setLoading(true);
    try {
      // Fetch user profile by username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', targetUsername)
        .single();

      if (profileError || !profile) {
        console.error('Error fetching user profile:', profileError);
        return;
      }

      // Fetch comprehensive user level stats
      const { data: levelStats, error: levelStatsError } = await supabase
        .from('user_level_stats')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      // Fetch recent games
      const { data: recentGames, error: recentGamesError } = await supabase
        .from('game_history')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch achievements
      const { data: userAchievements, error: achievementsError } = await supabase
        .from('user_achievements')
        .select(`
          unlocked_at,
          achievement:achievements(*)
        `)
        .eq('user_id', profile.id);

      // Fetch tips sent
      const { data: tipsSentData, error: tipsSentError } = await supabase
        .from('tips')
        .select('amount')
        .eq('from_user_id', profile.id);

      // Fetch tips received
      const { data: tipsReceivedData, error: tipsReceivedError } = await supabase
        .from('tips')
        .select('amount')
        .eq('to_user_id', profile.id);

      const tipsSent = tipsSentData?.reduce((sum, tip) => sum + Number(tip.amount), 0) || 0;
      const tipsReceived = tipsReceivedData?.reduce((sum, tip) => sum + Number(tip.amount), 0) || 0;

      const achievements: Achievement[] = userAchievements?.map(ua => ({
        id: ua.achievement.id,
        name: ua.achievement.name,
        description: ua.achievement.description,
        icon: ua.achievement.icon,
        category: ua.achievement.category,
        unlocked_at: ua.unlocked_at
      })) || [];

      // Use level stats if available, otherwise fallback to profile
      const stats: UserStats = {
        id: profile.id,
        username: profile.username,
        registration_date: profile.registration_date,
        current_level: levelStats?.current_level || 1,
        lifetime_xp: levelStats?.lifetime_xp || 0,
        current_xp: levelStats?.current_level_xp || 0,
        xp_to_next_level: levelStats?.xp_to_next_level || 100,
        badges: profile.badges || [],
        total_wagered: levelStats?.total_wagered || 0,
        total_profit: levelStats?.total_profit || 0,
        gameStats: {
          coinflip: {
            wins: levelStats?.coinflip_wins || 0,
            losses: Math.max(0, (levelStats?.coinflip_games || 0) - (levelStats?.coinflip_wins || 0)),
            total_profit: levelStats?.coinflip_profit || 0
          },
          crash: {
            wins: levelStats?.crash_wins || 0,
            losses: Math.max(0, (levelStats?.crash_games || 0) - (levelStats?.crash_wins || 0)),
            total_profit: levelStats?.crash_profit || 0
          },
          tower: {
            wins: levelStats?.tower_wins || 0,
            losses: Math.max(0, (levelStats?.tower_games || 0) - (levelStats?.tower_wins || 0)),
            total_profit: levelStats?.tower_profit || 0
          },
          roulette: {
            wins: levelStats?.roulette_wins || 0,
            losses: Math.max(0, (levelStats?.roulette_games || 0) - (levelStats?.roulette_wins || 0)),
            total_profit: levelStats?.roulette_profit || 0
          }
        },
        recentGames: recentGames || [],
        achievements,
        tipsSent,
        tipsReceived
      };

      setUserStats(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTip = async () => {
    if (!user || !userStats || !tipAmount) return;

    const amount = parseFloat(tipAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid tip amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setTipping(true);
      
      const { data, error } = await supabase.functions.invoke('process-tip', {
        body: {
          to_user_id: userStats.id,
          amount: amount,
          message: tipMessage || null
        }
      });

      if (error) throw error;

      toast({
        title: "Tip Sent! 🎁",
        description: `Successfully sent $${amount.toFixed(2)} to ${userStats.username}`,
      });

      setTipAmount('');
      setTipMessage('');
      setShowTipForm(false);
      
      // Refresh stats to show updated tip data
      await fetchUserStats(userStats.username);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send tip",
        variant: "destructive",
      });
    } finally {
      setTipping(false);
    }
  };

  const getWinRate = (gameType: keyof typeof userStats.gameStats) => {
    if (!userStats?.gameStats[gameType]) return '0.0';
    const gameStats = userStats.gameStats[gameType];
    const { wins, losses } = gameStats;
    const total = wins + losses;
    return total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  };

  const getGameIcon = (gameType: string) => {
    if (gameType === 'crash') return <Zap className="w-4 h-4" />;
    if (gameType === 'tower') return <TrendingUp className="w-4 h-4" />;
    return <Coins className="w-4 h-4" />;
  };

  if (!username) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} />
              <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-bold">{username}</h2>
              {userStats && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Joined {formatDistanceToNow(new Date(userStats.registration_date), { addSuffix: true })}
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : userStats ? (
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6">
              {/* Level Progress Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Level Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">Level {userStats.current_level}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatXPProgress(userStats.current_xp, userStats.current_xp + userStats.xp_to_next_level)}
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${calculateXPProgress(userStats.current_xp, userStats.xp_to_next_level)}%` 
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-400">{formatXP(userStats.lifetime_xp)}</div>
                        <div className="text-sm text-muted-foreground">Total XP</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-orange-400">${userStats.total_wagered.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">Total Wagered</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Social Stats & Tipping */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    Social & Tipping
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-400">${userStats.tipsSent.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Tips Sent</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-400">${userStats.tipsReceived.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Tips Received</div>
                    </div>
                  </div>
                  
                  {/* Tip Button */}
                  {user && user.id !== userStats.id && (
                    <div className="mt-4">
                      {!showTipForm ? (
                        <Button 
                          onClick={() => setShowTipForm(true)}
                          className="w-full gradient-primary hover:glow-primary transition-smooth"
                        >
                          <Gift className="w-4 h-4 mr-2" />
                          Send Tip
                        </Button>
                      ) : (
                        <div className="space-y-3 p-4 border rounded-lg bg-card/30">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Amount ($)</label>
                            <Input
                              type="number"
                              placeholder="10.00"
                              value={tipAmount}
                              onChange={(e) => setTipAmount(e.target.value)}
                              min="0.01"
                              step="0.01"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Message (optional)</label>
                            <Textarea
                              placeholder="Great play!"
                              value={tipMessage}
                              onChange={(e) => setTipMessage(e.target.value)}
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={handleTip}
                              disabled={tipping || !tipAmount}
                              className="flex-1"
                            >
                              {tipping ? 'Sending...' : `Send $${tipAmount || '0'}`}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowTipForm(false);
                                setTipAmount('');
                                setTipMessage('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Achievements ({userStats.achievements.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {userStats.achievements.map((achievement) => (
                      <div
                        key={achievement.id}
                        className="p-3 rounded-lg border bg-card/30 hover:bg-card/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{achievement.icon}</div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">{achievement.name}</h4>
                            <p className="text-xs text-muted-foreground">{achievement.description}</p>
                            {achievement.unlocked_at && (
                              <p className="text-xs text-green-400 mt-1">
                                Unlocked {formatDistanceToNow(new Date(achievement.unlocked_at), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {userStats.achievements.length === 0 && (
                      <div className="col-span-2 text-center text-muted-foreground py-8">
                        <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No achievements unlocked yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Game Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5" />
                    Game Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {Object.entries(userStats.gameStats)
                      .filter(([_, stats]) => stats && (stats.wins > 0 || stats.losses > 0)) // Only show games with activity
                      .map(([gameType, stats]) => (
                      <div key={gameType} className="p-4 rounded-lg bg-card/50 border">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getGameIcon(gameType)}
                            <span className="font-semibold capitalize">{gameType}</span>
                          </div>
                          <Badge variant="secondary">
                            {getWinRate(gameType as keyof typeof userStats.gameStats)}% Win Rate
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-green-400">{stats.wins}</div>
                            <div className="text-xs text-muted-foreground">Wins</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-red-400">{stats.losses}</div>
                            <div className="text-xs text-muted-foreground">Losses</div>
                          </div>
                          <div>
                            <div className={`text-lg font-bold ${stats.total_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {stats.total_profit >= 0 ? '+' : ''}${stats.total_profit.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">Profit</div>
                          </div>
                        </div>
                        
                        {/* Enhanced Roulette Stats */}
                        {gameType === 'roulette' && levelStats && (
                          <div className="mt-3 p-3 rounded-lg bg-card/30 border">
                            <div className="text-sm font-medium mb-2">Detailed Roulette Statistics</div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Best Streak:</span>
                                  <span className="font-medium">{levelStats.roulette_best_streak || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Current Streak:</span>
                                  <span className="font-medium">{levelStats.roulette_current_streak || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Biggest Bet:</span>
                                  <span className="font-medium">${(levelStats.roulette_biggest_bet || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Favorite Color:</span>
                                  <span className={`font-medium capitalize ${
                                    levelStats.roulette_favorite_color === 'green' ? 'text-green-400' :
                                    levelStats.roulette_favorite_color === 'red' ? 'text-red-400' :
                                    levelStats.roulette_favorite_color === 'black' ? 'text-gray-300' : ''
                                  }`}>
                                    {levelStats.roulette_favorite_color || 'None'}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-green-400">Green Wins:</span>
                                  <span className="font-medium">{levelStats.roulette_green_wins || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-red-400">Red Wins:</span>
                                  <span className="font-medium">{levelStats.roulette_red_wins || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-300">Black Wins:</span>
                                  <span className="font-medium">{levelStats.roulette_black_wins || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Highest Win:</span>
                                  <span className="font-medium text-green-400">+${(levelStats.roulette_highest_win || 0).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {Object.values(userStats.gameStats).every(stats => stats.wins === 0 && stats.losses === 0) && (
                      <div className="text-center text-muted-foreground py-8">
                        <Gamepad2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No games played yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Games */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Recent Games
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {userStats.recentGames.map((game, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border">
                        <div className="flex items-center gap-3">
                          {getGameIcon(game.game_type)}
                          <div>
                            <div className="font-medium capitalize">{game.game_type}</div>
                            <div className="text-sm text-muted-foreground">
                              ${game.bet_amount} • {game.multiplier ? `${game.multiplier}x` : game.result} • {formatDistanceToNow(new Date(game.created_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                        <div className={`font-semibold ${game.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {game.profit >= 0 ? '+' : ''}${game.profit.toFixed(2)}
                        </div>
                      </div>
                    ))}
                    {userStats.recentGames.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No recent games found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            User not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}