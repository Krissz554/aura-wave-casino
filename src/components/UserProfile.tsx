
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, Target, TrendingUp, Calendar, Star, DollarSign, 
  Crown, Flame, Sparkles, Zap, Award, Medal, Gamepad2,
  BarChart3, Coins, X, Wallet, Gift, Globe, Users,
  ChevronUp, ChevronDown, Eye, EyeOff, Loader2, Building
} from 'lucide-react';
import { UserProfile as UserProfileType } from '@/hooks/useUserProfile';
import { ProfileBorder } from './ProfileBorder';
import { useUserLevelStats } from '@/hooks/useUserLevelStats';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievementNotifications } from '@/hooks/useAchievementNotifications';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  userData?: UserProfileType | null;
  username?: string;
}

// Icon mapping for achievements
const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, any> = {
    'DollarSign': DollarSign,
    'User': Users,
    'MessageCircle': Users,
    'Calendar': Calendar,
    'Trophy': Trophy,
    'RotateCcw': Coins,
    'Building': Building,
    'Coins': Coins,
    'Sparkles': Sparkles,
    'Circle': Target,
    'Crown': Crown,
    'Banknote': DollarSign,
    'TrendingUp': TrendingUp,
    'Gamepad': Gamepad2,
    'Target': Target,
    'Star': Star,
    'Flame': Flame,
    'Diamond': Star,
    'Zap': Zap,
    'Package': Gift,
    'MessageSquare': Users,
    'Infinity': Crown,
    'Medal': Medal,
    'Users': Users,
    'Gem': Star
  };
  return iconMap[iconName] || Trophy;
};

// Rarity gradients for achievements
const rarityGradients = {
  common: 'from-gray-500/20 to-gray-600/20',
  rare: 'from-blue-500/20 to-blue-600/20',
  epic: 'from-purple-500/20 to-purple-600/20',
  legendary: 'from-orange-500/20 to-orange-600/20'
};

// Rarity colors for borders and text
const rarityColors = {
  common: 'border-gray-500/30 text-gray-400',
  rare: 'border-blue-500/30 text-blue-400',
  epic: 'border-purple-500/30 text-purple-400',
  legendary: 'border-orange-500/30 text-orange-400'
};

// Difficulty badges
const difficultyColors = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  hard: 'bg-red-500/20 text-red-400 border-red-500/30',
  extreme: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
};

export default function UserProfile({ isOpen, onClose, userData: propUserData, username }: UserProfileProps) {
  const { user } = useAuth();
  const { stats } = useUserLevelStats();
  const { claimableAchievements: notificationClaimable, hasNewClaimable } = useAchievementNotifications();
  const [activeTab, setActiveTab] = useState('overview');
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [fetchedUserData, setFetchedUserData] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(false);
  const [animatedStats, setAnimatedStats] = useState({
    level: 0,
    xp: 0,
    balance: 0
  });

  // Determine which userData to use
  const userData = propUserData || fetchedUserData;
  
  // Check if this is the current user's own profile
  const isOwnProfile = user && userData && user.id === userData.id;

  // Fetch user data when only username is provided
  useEffect(() => {
    if (isOpen && username && !propUserData) {
      const fetchUserData = async () => {
        setLoading(true);
        try {
          console.log('🔍 Fetching profile data for username:', username);

          // First get the user ID from profiles table
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();

          if (profileError) {
            console.error('❌ Error fetching user profile:', profileError);
            setLoading(false);
            return;
          }

          if (!profile) {
            console.warn('⚠️ No profile found for username:', username);
            setLoading(false);
            return;
          }

          // Get user level stats
          const { data: levelStats, error: levelError } = await supabase
            .from('user_level_stats')
            .select('*')
            .eq('user_id', profile.id)
            .single();

          // Create mock game stats - in a real app, you'd fetch these from the database
          const gameStats = {
            coinflip: { wins: levelStats?.coinflip_wins || 0, losses: Math.max(0, (levelStats?.coinflip_games || 0) - (levelStats?.coinflip_wins || 0)), profit: levelStats?.coinflip_profit || 0 },
            crash: { wins: levelStats?.crash_wins || 0, losses: Math.max(0, (levelStats?.crash_games || 0) - (levelStats?.crash_wins || 0)), profit: levelStats?.crash_profit || 0 },
            roulette: { wins: levelStats?.roulette_wins || 0, losses: Math.max(0, (levelStats?.roulette_games || 0) - (levelStats?.roulette_wins || 0)), profit: levelStats?.roulette_profit || 0 }
          };

          // Build user data object
          const fetchedUser: UserProfileType = {
            id: profile.id,
            username: profile.username,
            balance: profile.balance,
            current_level: levelStats?.current_level || 1,
            current_xp: levelStats?.current_level_xp || 0,
            xp_to_next_level: levelStats?.xp_to_next_level || 100,
            registration_date: profile.created_at,
            gameStats,
            badges: [] // You might want to fetch this from a badges table
          };

          console.log('✅ Successfully fetched user data:', fetchedUser);
          setFetchedUserData(fetchedUser);
        } catch (error) {
          console.error('❌ Error in fetchUserData:', error);
        }
        setLoading(false);
      };

      fetchUserData();
    }
  }, [isOpen, username, propUserData]);

  // Reset fetched data when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFetchedUserData(null);
      setActiveTab('overview');
    }
  }, [isOpen]);

  // Animate numbers on mount
  useEffect(() => {
    if (isOpen && userData && stats) {
      const animateValue = (start: number, end: number, duration: number, setter: (value: number) => void) => {
        const range = end - start;
        const startTime = Date.now();
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const current = start + (range * easeOut);
          
          setter(Math.floor(current));
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        
        requestAnimationFrame(animate);
      };

      animateValue(0, stats.current_level, 800, (val) => 
        setAnimatedStats(prev => ({ ...prev, level: val }))
      );
      animateValue(0, stats.current_level_xp, 1000, (val) => 
        setAnimatedStats(prev => ({ ...prev, xp: val }))
      );
      animateValue(0, userData.balance, 1200, (val) => 
        setAnimatedStats(prev => ({ ...prev, balance: val }))
      );
    }
  }, [isOpen, userData, stats]);
  
  // Show loading state
  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md border-0 bg-transparent">
          <div className="relative h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/95 backdrop-blur-xl rounded-2xl border border-white/10" />
            <div className="relative p-8 text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
              <h3 className="text-lg font-semibold mb-2">Loading Profile</h3>
              <p className="text-muted-foreground">Fetching user data...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!userData) return null;

  const currentLevel = stats?.current_level || userData.current_level;
  const currentXP = stats?.current_level_xp || userData.current_xp;
  const xpToNext = stats?.xp_to_next_level || userData.xp_to_next_level;
  const totalXP = currentXP + xpToNext;
  const xpProgress = totalXP > 0 ? (currentXP / totalXP) * 100 : 0;

  const registrationDate = new Date(userData.registration_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate total game stats
  const totalGames = (userData.gameStats.coinflip?.wins || 0) + (userData.gameStats.coinflip?.losses || 0) + 
                    (userData.gameStats.crash?.wins || 0) + (userData.gameStats.crash?.losses || 0) +
                    (userData.gameStats.roulette?.wins || 0) + (userData.gameStats.roulette?.losses || 0);
  
  const totalWins = (userData.gameStats.coinflip?.wins || 0) + (userData.gameStats.crash?.wins || 0) + (userData.gameStats.roulette?.wins || 0);
  const winRate = totalGames > 0 ? (totalWins / totalGames * 100) : 0;
  const totalProfit = (userData.gameStats.coinflip?.profit || 0) + (userData.gameStats.crash?.profit || 0) + (userData.gameStats.roulette?.profit || 0);

  const getBorderTier = (level: number) => {
    if (level >= 100) return 6;
    if (level >= 75) return 5;
    if (level >= 50) return 4;
    if (level >= 25) return 3;
    if (level >= 10) return 2;
    return 1;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[95vh] flex flex-col p-0 border-0 bg-transparent">
        <div className="relative h-full">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/95 backdrop-blur-xl rounded-2xl border border-white/10" />
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-accent/5 rounded-2xl" />
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 h-8 w-8 p-0 rounded-full glass border border-white/20 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="relative p-8 h-full overflow-y-auto">
            {/* Hero Header */}
            <div className="relative mb-8">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent)] rounded-2xl" />
              
              <div className="relative p-8 flex flex-col md:flex-row items-center gap-8">
                {/* Enhanced Avatar */}
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-primary via-accent to-primary rounded-full opacity-75 group-hover:opacity-100 animate-pulse blur-sm" />
                  <ProfileBorder level={currentLevel} size="lg">
                    <div className="w-full h-full rounded-full overflow-hidden relative">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`}
                        alt={`${userData.username} avatar`}
                        className="w-full h-full object-cover"
                      />
                      {/* Level Crown for high levels */}
                      {currentLevel >= 100 && (
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1">
                          <Crown className="w-6 h-6 text-yellow-400 drop-shadow-lg animate-bounce" />
                        </div>
                      )}
                    </div>
                  </ProfileBorder>
                </div>

                {/* User Info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {userData.username}
                    </h1>
                    {currentLevel >= 50 && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs font-bold text-yellow-400">VIP</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-center md:justify-start gap-4 text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {registrationDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Player #{userData.id.slice(-6).toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Level & XP Display */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-center md:justify-start gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary animate-pulse">
                          {animatedStats.level}
                        </div>
                        <div className="text-sm text-muted-foreground">Level</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-accent">
                          {animatedStats.xp.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Current XP</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-400">
                          {xpToNext.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">To Next</div>
                      </div>
                    </div>
                    
                    {/* Enhanced Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Level {currentLevel} Progress</span>
                        <span>{Math.round(xpProgress)}%</span>
                      </div>
                      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 ease-out relative"
                          style={{ width: `${xpProgress}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                                 {/* Balance Card - Only show for own profile */}
                 {isOwnProfile && (
                   <Card className="glass border-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                     <CardContent className="p-6 text-center">
                       <div className="flex items-center justify-center gap-2 mb-2">
                         <Wallet className="w-5 h-5 text-green-400" />
                         <span className="text-sm font-medium text-green-400">Balance</span>
                         <Button
                           variant="ghost"
                           size="sm"
                           className="h-6 w-6 p-0"
                           onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                         >
                           {isBalanceVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                         </Button>
                       </div>
                       <div className="text-3xl font-bold text-green-400">
                         {isBalanceVisible ? `$${animatedStats.balance.toFixed(2)}` : '$••••••'}
                       </div>
                     </CardContent>
                   </Card>
                 )}
                 
                 {/* Player Info Card for Other Users */}
                 {!isOwnProfile && (
                   <Card className="glass border-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                     <CardContent className="p-6 text-center">
                       <div className="flex items-center justify-center gap-2 mb-2">
                         <Globe className="w-5 h-5 text-blue-400" />
                         <span className="text-sm font-medium text-blue-400">Player Info</span>
                       </div>
                       <div className="text-xl font-bold text-blue-400 mb-1">
                         {totalGames} Games
                       </div>
                       <div className="text-sm text-muted-foreground">
                         {winRate.toFixed(1)}% Win Rate
                       </div>
                     </CardContent>
                   </Card>
                 )}
              </div>
            </div>

            {/* Enhanced Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 glass bg-background/50 p-1">
                <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="games" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Gamepad2 className="w-4 h-4 mr-2" />
                  Games
                </TabsTrigger>
                <TabsTrigger value="achievements" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative">
                  <Award className="w-4 h-4 mr-2" />
                  Achievements
                  {isOwnProfile && notificationClaimable.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {notificationClaimable.length}
                    </div>
                  )}
                </TabsTrigger>
                <TabsTrigger value="stats" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Statistics
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="glass border-0 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                    <CardContent className="p-4 text-center">
                      <Gamepad2 className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                      <div className="text-2xl font-bold text-blue-400">{totalGames}</div>
                      <div className="text-xs text-muted-foreground">Games Played</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass border-0 bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20">
                    <CardContent className="p-4 text-center">
                      <Trophy className="w-6 h-6 mx-auto mb-2 text-green-400" />
                      <div className="text-2xl font-bold text-green-400">{totalWins}</div>
                      <div className="text-xs text-muted-foreground">Total Wins</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20">
                    <CardContent className="p-4 text-center">
                      <Target className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                      <div className="text-2xl font-bold text-purple-400">{winRate.toFixed(1)}%</div>
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                    </CardContent>
                  </Card>
                  
                  <Card className={`glass border-0 bg-gradient-to-br ${totalProfit >= 0 ? 'from-green-500/10 to-green-600/10 border-green-500/20' : 'from-red-500/10 to-red-600/10 border-red-500/20'}`}>
                    <CardContent className="p-4 text-center">
                      <DollarSign className={`w-6 h-6 mx-auto mb-2 ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                      <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${Math.abs(totalProfit).toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {totalProfit >= 0 ? 'Total Profit' : 'Total Loss'}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity Preview */}
                <Card className="glass border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Player Highlights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                        <h4 className="font-semibold mb-2 text-primary">Best Streak</h4>
                        <p className="text-2xl font-bold">12 wins</p>
                        <p className="text-sm text-muted-foreground">in Coinflip</p>
                      </div>
                      <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                        <h4 className="font-semibold mb-2 text-green-400">Biggest Win</h4>
                        <p className="text-2xl font-bold text-green-400">$2,450.00</p>
                        <p className="text-sm text-muted-foreground">in Roulette</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Games Tab */}
              <TabsContent value="games" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Coinflip Stats */}
                  <Card className="glass border-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-amber-400">
                        <Coins className="w-5 h-5" />
                        Coinflip
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Games</span>
                        <span className="font-semibold">{(userData.gameStats.coinflip?.wins || 0) + (userData.gameStats.coinflip?.losses || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Wins</span>
                        <span className="font-semibold text-green-400">{userData.gameStats.coinflip?.wins || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Losses</span>
                        <span className="font-semibold text-red-400">{userData.gameStats.coinflip?.losses || 0}</span>
                      </div>
                      <div className="pt-2 border-t border-white/10">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Profit</span>
                          <span className={`font-bold ${(userData.gameStats.coinflip?.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(userData.gameStats.coinflip?.profit || 0) >= 0 ? '+' : ''}${(userData.gameStats.coinflip?.profit || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Roulette Stats */}
                  <Card className="glass border-0 bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/20">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-red-400">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-r from-red-500 to-black border-2 border-white" />
                        Roulette
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Games</span>
                        <span className="font-semibold">{(userData.gameStats.roulette?.wins || 0) + (userData.gameStats.roulette?.losses || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Wins</span>
                        <span className="font-semibold text-green-400">{userData.gameStats.roulette?.wins || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Losses</span>
                        <span className="font-semibold text-red-400">{userData.gameStats.roulette?.losses || 0}</span>
                      </div>
                      {/* Enhanced Roulette Stats */}
                      {stats && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Green Wins</span>
                            <span className="font-semibold text-green-500">{stats.roulette_green_wins || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Red Wins</span>
                            <span className="font-semibold text-red-500">{stats.roulette_red_wins || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Black Wins</span>
                            <span className="font-semibold text-gray-400">{stats.roulette_black_wins || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Highest Win</span>
                            <span className="font-semibold text-yellow-400">${(stats.roulette_highest_win || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Biggest Bet</span>
                            <span className="font-semibold text-purple-400">${(stats.roulette_biggest_bet || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Best Streak</span>
                            <span className="font-semibold text-blue-400">{stats.roulette_best_streak || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Favorite Color</span>
                            <span className="font-semibold capitalize">{stats.roulette_favorite_color || 'none'}</span>
                          </div>
                        </>
                      )}
                      <div className="pt-2 border-t border-white/10">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Profit</span>
                          <span className={`font-bold ${(userData.gameStats.roulette?.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(userData.gameStats.roulette?.profit || 0) >= 0 ? '+' : ''}${(userData.gameStats.roulette?.profit || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tower Stats */}
                  <Card className="glass border-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-amber-400">
                        <Building className="w-5 h-5" />
                        Tower
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Games</span>
                        <span className="font-semibold">{(userData.gameStats.tower?.wins || 0) + (userData.gameStats.tower?.losses || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Wins</span>
                        <span className="font-semibold text-green-400">{userData.gameStats.tower?.wins || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Losses</span>
                        <span className="font-semibold text-red-400">{userData.gameStats.tower?.losses || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Highest Level</span>
                        <span className="font-semibold text-amber-400">{stats?.tower_highest_level || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Perfect Games</span>
                        <span className="font-semibold text-purple-400">{stats?.tower_perfect_games || 0}</span>
                      </div>
                      <div className="pt-2 border-t border-white/10">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Profit</span>
                          <span className={`font-bold ${(userData.gameStats.tower?.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(userData.gameStats.tower?.profit || 0) >= 0 ? '+' : ''}${(userData.gameStats.tower?.profit || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Crash Stats */}
                  <Card className="glass border-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-emerald-400">
                        <TrendingUp className="w-5 h-5" />
                        Crash
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Games</span>
                        <span className="font-semibold">{(userData.gameStats.crash?.wins || 0) + (userData.gameStats.crash?.losses || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Wins</span>
                        <span className="font-semibold text-green-400">{userData.gameStats.crash?.wins || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Losses</span>
                        <span className="font-semibold text-red-400">{userData.gameStats.crash?.losses || 0}</span>
                      </div>
                      <div className="pt-2 border-t border-white/10">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Profit</span>
                          <span className={`font-bold ${(userData.gameStats.crash?.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(userData.gameStats.crash?.profit || 0) >= 0 ? '+' : ''}${(userData.gameStats.crash?.profit || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Achievements Tab */}
              <TabsContent value="achievements" className="space-y-6">
                <AchievementsSection 
                  isOwnProfile={isOwnProfile}
                  userId={userData.id}
                  stats={stats}
                />
              </TabsContent>

              {/* Statistics Tab */}
              <TabsContent value="stats" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Level Progress Chart */}
                  <Card className="glass border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Level Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                        <div className="text-4xl font-bold text-primary mb-2">{currentLevel}</div>
                        <div className="text-muted-foreground mb-4">Current Level</div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress to Level {currentLevel + 1}</span>
                            <span>{Math.round(xpProgress)}%</span>
                          </div>
                          <Progress value={xpProgress} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Border Tier Info */}
                  <Card className="glass border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-yellow-400" />
                        Border Tier
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
                        <div className="text-4xl font-bold text-yellow-400 mb-2">Tier {getBorderTier(currentLevel)}</div>
                        <div className="text-muted-foreground mb-4">Profile Border</div>
                        <div className="text-sm space-y-1">
                          <div>Tier 1: Level 1-9 (Basic)</div>
                          <div>Tier 2: Level 10-24 (Bronze)</div>
                          <div>Tier 3: Level 25-49 (Silver)</div>
                          <div className={currentLevel >= 50 ? 'text-yellow-400 font-semibold' : ''}>
                            Tier 4: Level 50-74 (Gold)
                          </div>
                          <div className={currentLevel >= 75 ? 'text-purple-400 font-semibold' : ''}>
                            Tier 5: Level 75-99 (Platinum)
                          </div>
                          <div className={currentLevel >= 100 ? 'text-pink-400 font-semibold' : ''}>
                            Tier 6: Level 100+ (Diamond)
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Comprehensive Achievements Section Component
interface AchievementsSectionProps {
  isOwnProfile: boolean;
  userId: string;
  stats: any;
}

function AchievementsSection({ isOwnProfile, userId, stats }: AchievementsSectionProps) {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [claimableAchievements, setClaimableAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    fetchAchievements();
  }, [userId]);

  const fetchAchievements = async () => {
    try {
      // Fetch all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('rarity', { ascending: true })
        .order('difficulty', { ascending: true });

      if (achievementsError) throw achievementsError;

      // Fetch user's unlocked achievements
      const { data: unlockedAchievements, error: userError } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements (*)
        `)
        .eq('user_id', userId);

      if (userError) throw userError;

      setAchievements(allAchievements || []);
      setUserAchievements(unlockedAchievements || []);

      // Check for claimable achievements (requirements met but not claimed)
      if (isOwnProfile && stats) {
        const claimable = (allAchievements || []).filter(achievement => {
          const isAlreadyUnlocked = (unlockedAchievements || []).some(ua => ua.achievement_id === achievement.id);
          if (isAlreadyUnlocked) return false;
          
          const progress = calculateProgressForAchievement(achievement, stats);
          return progress >= 100;
        });
        setClaimableAchievements(claimable);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgressForAchievement = (achievement: any, userStats: any): number => {
    if (!userStats) return 0;
    
    const criteria = achievement.unlock_criteria;
    const criteriaType = criteria?.type;
    const targetValue = criteria?.value || 0;

    let currentValue = 0;
    
    switch (criteriaType) {
      case 'total_games': currentValue = userStats.total_games || 0; break;
      case 'total_wins': currentValue = userStats.total_wins || 0; break;
      case 'total_profit': currentValue = userStats.total_profit || 0; break;
      case 'total_wagered': currentValue = userStats.total_wagered || 0; break;
      case 'roulette_games': currentValue = userStats.roulette_games || 0; break;
      case 'roulette_wins': currentValue = userStats.roulette_wins || 0; break;
      case 'roulette_green_wins': currentValue = userStats.roulette_green_wins || 0; break;
      case 'roulette_red_wins': currentValue = userStats.roulette_red_wins || 0; break;
      case 'roulette_black_wins': currentValue = userStats.roulette_black_wins || 0; break;
      case 'roulette_highest_win': currentValue = userStats.roulette_highest_win || 0; break;
      case 'roulette_biggest_bet': currentValue = userStats.roulette_biggest_bet || 0; break;
      case 'roulette_best_streak': currentValue = userStats.roulette_best_streak || 0; break;
      case 'roulette_favorite_color': currentValue = userStats.roulette_favorite_color || 0; break;
      case 'tower_games': currentValue = userStats.tower_games || 0; break;
      case 'tower_highest_level': currentValue = userStats.tower_highest_level || 0; break;
      case 'tower_perfect_games': currentValue = userStats.tower_perfect_games || 0; break;
      case 'coinflip_wins': currentValue = userStats.coinflip_wins || 0; break;
      case 'total_cases_opened': currentValue = userStats.total_cases_opened || 0; break;
      default: currentValue = 0;
    }

    return Math.min(100, (currentValue / targetValue) * 100);
  };

  const calculateProgress = (achievement: any): number => {
    return calculateProgressForAchievement(achievement, stats);
  };

  const claimAchievement = async (achievement: any) => {
    if (!isOwnProfile) return;
    
    setClaiming(achievement.id);
    try {
      // Insert the achievement as unlocked
      const { error: insertError } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievement.id,
          unlocked_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      // Award the reward
      if (achievement.reward_type === 'money') {
        const { error: balanceError } = await supabase
          .from('profiles')
          .update({ 
            balance: supabase.sql`balance + ${achievement.reward_amount}` 
          })
          .eq('id', userId);

        if (balanceError) throw balanceError;
      } else if (achievement.reward_type === 'xp') {
        const { error: xpError } = await supabase
          .from('user_level_stats')
          .update({ 
            lifetime_xp: supabase.sql`lifetime_xp + ${achievement.reward_amount}`,
            current_level_xp: supabase.sql`current_level_xp + ${achievement.reward_amount}`
          })
          .eq('user_id', userId);

        if (xpError) throw xpError;
      } else if (achievement.reward_type === 'cases') {
        const { error: casesError } = await supabase
          .from('user_level_stats')
          .update({ 
            available_cases: supabase.sql`available_cases + ${achievement.reward_amount}` 
          })
          .eq('user_id', userId);

        if (casesError) throw casesError;
      }

      // Show success notification
      console.log(`🎉 Achievement unlocked: ${achievement.name}! Reward: ${achievement.reward_type === 'money' ? '$' : ''}${achievement.reward_amount}${achievement.reward_type === 'cases' ? ' cases' : achievement.reward_type === 'xp' ? ' XP' : ''}`);

      // Refresh achievements
      fetchAchievements();
    } catch (error) {
      console.error('Error claiming achievement:', error);
    } finally {
      setClaiming(null);
    }
  };

  const isUnlocked = (achievementId: string): boolean => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

  const getUnlockDate = (achievementId: string): string | null => {
    const userAchievement = userAchievements.find(ua => ua.achievement_id === achievementId);
    return userAchievement?.unlocked_at || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const unlockedAchievements = achievements.filter(a => isUnlocked(a.id));
  const lockedAchievements = achievements.filter(a => !isUnlocked(a.id));

  return (
    <div className="space-y-6">
      {/* Achievement Stats */}
      <Card className="glass border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Achievement Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{unlockedAchievements.length}</div>
              <div className="text-sm text-muted-foreground">Unlocked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">{achievements.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">
                {unlockedAchievements.filter(a => a.rarity === 'legendary').length}
              </div>
              <div className="text-sm text-muted-foreground">Legendary</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                ${unlockedAchievements.reduce((sum, a) => sum + (a.reward_amount || 0), 0).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Earned Rewards</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claimable Achievements */}
      {isOwnProfile && claimableAchievements.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Gift className="w-5 h-5 text-green-400 animate-pulse" />
            Ready to Claim ({claimableAchievements.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {claimableAchievements.map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon);
              
              return (
                <Card key={achievement.id} className={`glass border-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 hover:border-green-400/50 transition-all duration-300 hover:scale-105 animate-pulse`}>
                  <CardContent className="p-4 text-center">
                    <div className="mb-3">
                      <div className="w-8 h-8 mx-auto bg-green-500/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <IconComponent className="w-4 h-4 text-green-400" />
                      </div>
                    </div>
                    <h3 className="font-bold mb-1 text-green-400 text-sm">{achievement.name}</h3>
                    <p className="text-xs text-green-300/80 mb-2 line-clamp-2">{achievement.description}</p>
                    
                    <div className="flex justify-between items-center mb-2">
                      <Badge variant="secondary" className={`capitalize text-xs ${difficultyColors[achievement.difficulty]} text-xs`}>
                        {achievement.difficulty}
                      </Badge>
                      <Badge variant="secondary" className={`capitalize text-xs ${rarityColors[achievement.rarity]} bg-white/10 text-xs`}>
                        {achievement.rarity}
                      </Badge>
                    </div>
                    
                    <div className="text-xs space-y-2">
                      <div className="flex items-center justify-center gap-1 text-green-400 font-semibold">
                        <DollarSign className="w-3 h-3" />
                        <span>+${achievement.reward_amount}</span>
                      </div>
                      
                      <Button
                        onClick={() => claimAchievement(achievement)}
                        disabled={claiming === achievement.id}
                        className="w-full h-7 text-xs bg-green-500 hover:bg-green-400 text-white border-0 transition-all duration-200"
                      >
                        {claiming === achievement.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          'Claim Reward'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Unlocked Achievements */}
      {unlockedAchievements.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Unlocked Achievements ({unlockedAchievements.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {unlockedAchievements.map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon);
              const unlockDate = getUnlockDate(achievement.id);
              
              return (
                <Card key={achievement.id} className={`glass border-0 bg-gradient-to-br ${rarityGradients[achievement.rarity]} opacity-90 hover:opacity-100 transition-all duration-300 hover:scale-105 border ${rarityColors[achievement.rarity]}`}>
                  <CardContent className="p-4 text-center">
                    <div className="mb-3">
                      <div className="w-8 h-8 mx-auto bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <IconComponent className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <h3 className="font-bold mb-1 text-white text-sm">{achievement.name}</h3>
                    <p className="text-xs opacity-90 text-white mb-2 line-clamp-2">{achievement.description}</p>
                    
                    <div className="flex justify-between items-center mb-3">
                      <Badge variant="secondary" className={`capitalize text-xs ${difficultyColors[achievement.difficulty]}`}>
                        {achievement.difficulty}
                      </Badge>
                      <Badge variant="secondary" className={`capitalize text-xs ${rarityColors[achievement.rarity]} bg-white/10`}>
                        {achievement.rarity}
                      </Badge>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <div className="flex items-center justify-center gap-1 text-green-400">
                        <DollarSign className="w-3 h-3" />
                        <span>+${achievement.reward_amount}</span>
                      </div>
                      {unlockDate && (
                        <div className="text-xs text-white/70">
                          Unlocked: {new Date(unlockDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked Achievements (Only for Own Profile) */}
      {isOwnProfile && lockedAchievements.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-muted-foreground" />
            Locked Achievements ({lockedAchievements.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {lockedAchievements.map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon);
              const progress = calculateProgress(achievement);
              const isNearlyComplete = progress >= 75;
              
              return (
                <Card key={achievement.id} className={`glass border-0 bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-600/30 opacity-60 hover:opacity-80 transition-all duration-300 ${isNearlyComplete ? 'hover:scale-105 border-yellow-500/30' : ''}`}>
                  <CardContent className="p-4 text-center">
                    <div className="mb-3">
                      <div className="w-8 h-8 mx-auto bg-gray-700/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <IconComponent className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    <h3 className="font-bold mb-1 text-gray-300 text-sm">{achievement.name}</h3>
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">{achievement.description}</p>
                    
                    <div className="flex justify-between items-center mb-3">
                      <Badge variant="secondary" className={`capitalize text-xs ${difficultyColors[achievement.difficulty]} opacity-70`}>
                        {achievement.difficulty}
                      </Badge>
                      <Badge variant="secondary" className={`capitalize text-xs ${rarityColors[achievement.rarity]} bg-gray-700/30 opacity-70`}>
                        {achievement.rarity}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-1 text-green-400/70">
                        <DollarSign className="w-3 h-3" />
                        <span>+${achievement.reward_amount}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Progress</span>
                          <span className={progress >= 100 ? 'text-green-400' : 'text-gray-400'}>
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        <Progress 
                          value={progress} 
                          className={`h-2 ${isNearlyComplete ? 'bg-yellow-500/20' : 'bg-gray-700/50'}`} 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {unlockedAchievements.length === 0 && !isOwnProfile && (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Achievements Yet</h3>
          <p className="text-muted-foreground">This player hasn't unlocked any achievements yet.</p>
        </div>
      )}

      {unlockedAchievements.length === 0 && isOwnProfile && (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Start Your Journey!</h3>
          <p className="text-muted-foreground">Play games to unlock your first achievements and earn rewards!</p>
        </div>
      )}
    </div>
  );
}
