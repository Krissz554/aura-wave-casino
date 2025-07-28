
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
  onUserDataUpdate?: () => void;
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

export default function UserProfile({ isOpen, onClose, userData: propUserData, username, onUserDataUpdate }: UserProfileProps) {
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
  
  // Check if this should be treated as the user's own profile (no username provided, opening from header)
  const shouldShowOwnProfile = user && !username;
  
  // Debug logging
  console.log('🔍 UserProfile Debug:', {
    user: user?.id,
    username,
    propUserData: propUserData?.id,
    fetchedUserData: fetchedUserData?.id,
    userData: userData?.id,
    isOwnProfile,
    shouldShowOwnProfile,
    isOpen
  });

  // Fetch user data when only username is provided or when opening from header (no username)
  useEffect(() => {
    if (isOpen && ((username && !propUserData) || (!username && user))) {
      const fetchUserData = async () => {
        setLoading(true);
        try {
          let profile;
          let profileError;

          if (username) {
            // Fetch by username (for other users)
            console.log('🔍 Fetching profile data for username:', username);
            const result = await supabase
              .from('profiles')
              .select('*')
              .eq('username', username)
              .single();
            profile = result.data;
            profileError = result.error;
          } else if (user) {
            // Fetch current user's profile
            console.log('🔍 Fetching current user profile data for user ID:', user.id);
            const result = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
            profile = result.data;
            profileError = result.error;
          }

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
            roulette: { wins: levelStats?.roulette_wins || 0, losses: Math.max(0, (levelStats?.roulette_games || 0) - (levelStats?.roulette_wins || 0)), profit: levelStats?.roulette_profit || 0 },
            tower: { wins: levelStats?.tower_wins || 0, losses: Math.max(0, (levelStats?.tower_games || 0) - (levelStats?.tower_wins || 0)), profit: levelStats?.tower_profit || 0 }
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
  }, [isOpen, username, propUserData, user]);

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
      <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0 border-0 bg-transparent overflow-hidden">
        <div className="relative h-full">
          {/* Multi-layered Cyberpunk Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 backdrop-blur-xl rounded-2xl" />
          
          {/* Animated Circuit Board Pattern */}
          <div className="absolute inset-0 opacity-[0.08]">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.4)_25%,rgba(99,102,241,0.4)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.4)_75%,rgba(99,102,241,0.4)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.4)_25%,rgba(99,102,241,0.4)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.4)_75%,rgba(99,102,241,0.4)_76%,transparent_77%,transparent)] bg-[24px_24px] animate-grid-move-slow" />
          </div>
          
          {/* Animated Border Glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 via-accent/40 to-primary/30 rounded-2xl blur-sm animate-pulse" />
          
          {/* Dynamic Energy Lines */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/30 to-transparent animate-energy-flow" />
            <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-accent/30 to-transparent animate-energy-flow" style={{ animationDelay: '1s' }} />
            <div className="absolute left-0 top-1/3 w-full h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent animate-energy-flow-horizontal" style={{ animationDelay: '2s' }} />
          </div>
          
          {/* Floating Orbs */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 rounded-full opacity-30 animate-float-orb ${
                  i % 3 === 0 ? 'bg-primary/60' : i % 3 === 1 ? 'bg-accent/60' : 'bg-purple-400/60'
                }`}
                style={{
                  left: `${15 + (i * 12)}%`,
                  top: `${10 + (i * 8)}%`,
                  animationDelay: `${i * 0.8}s`,
                  animationDuration: `${4 + (i % 3)}s`
                }}
              />
            ))}
          </div>
          
          {/* Tech Corner Details */}
          <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-primary/60 rounded-tl-sm" />
          <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-accent/60 rounded-tr-sm" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-accent/60 rounded-bl-sm" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-primary/60 rounded-br-sm" />
          
          {/* Enhanced Close Button */}
          <div className="absolute top-4 right-4 z-50 group/close">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="relative h-10 w-10 p-0 overflow-hidden border border-red-500/40 bg-red-950/30 hover:bg-red-900/50 backdrop-blur-sm transition-all duration-300"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
              }}
            >
              {/* Scan line effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/20 to-transparent translate-x-[-100%] group-hover/close:translate-x-[100%] transition-transform duration-700 ease-out" />
              
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 via-red-400/10 to-red-400/5 opacity-0 group-hover/close:opacity-100 transition-opacity duration-300" />
              
              <X className="w-5 h-5 text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.6)] relative z-10" />
              
              {/* Tech corners */}
              <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-red-400/60 group-hover/close:border-red-300" />
              <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-red-400/60 group-hover/close:border-red-300" />
            </Button>
          </div>

          <div className="relative p-8 h-full overflow-y-auto">
            {/* Cyberpunk Hero Header */}
            <div className="relative mb-8 overflow-hidden group">
              {/* Multi-layered Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 rounded-2xl" />
              
              {/* Circuit Board Pattern */}
              <div className="absolute inset-0 opacity-[0.12]">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.5)_25%,rgba(99,102,241,0.5)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.5)_75%,rgba(99,102,241,0.5)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.5)_25%,rgba(99,102,241,0.5)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.5)_75%,rgba(99,102,241,0.5)_76%,transparent_77%,transparent)] bg-[20px_20px] animate-grid-move-slow" />
              </div>
              
              {/* Animated Border Glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-2xl blur-sm group-hover:blur-md transition-all duration-500" />
              
              {/* Holographic Scan Lines */}
              <div className="absolute inset-0 overflow-hidden rounded-2xl">
                <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-cyber-scan-horizontal" />
                <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-accent/60 to-transparent animate-cyber-scan left-1/3" />
                <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-primary/40 to-transparent animate-cyber-scan right-1/4" style={{ animationDelay: '1.5s' }} />
              </div>
              
              {/* Tech Corner Details */}
              <div className="absolute top-3 left-3 w-5 h-5 border-l-2 border-t-2 border-primary/70 rounded-tl-sm" />
              <div className="absolute top-3 right-3 w-5 h-5 border-r-2 border-t-2 border-accent/70 rounded-tr-sm" />
              <div className="absolute bottom-3 left-3 w-5 h-5 border-l-2 border-b-2 border-accent/70 rounded-bl-sm" />
              <div className="absolute bottom-3 right-3 w-5 h-5 border-r-2 border-b-2 border-primary/70 rounded-br-sm" />
              
              <div className="relative z-10 p-8 flex flex-col md:flex-row items-center gap-8"
                   style={{
                     clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))'
                   }}>
                {/* Cyberpunk Avatar */}
                <div className="relative group/avatar">
                  {/* Outer Energy Ring */}
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-primary/40 via-accent/60 to-primary/40 animate-cyber-avatar-scan blur-sm" />
                  
                  {/* Middle Tech Ring */}
                  <div className="absolute -inset-2 rounded-full border-2 border-primary/60 bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-sm" />
                  
                  {/* Holographic Scan Lines */}
                  <div className="absolute -inset-2 rounded-full overflow-hidden">
                    <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-accent/80 to-transparent animate-cyber-scan-horizontal top-1/3" />
                    <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-cyber-scan-horizontal bottom-1/3" style={{ animationDelay: '1s' }} />
                  </div>
                  
                  <ProfileBorder level={currentLevel} size="lg">
                    <div className="w-full h-full rounded-full overflow-hidden relative group-hover/avatar:scale-105 transition-transform duration-500">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`}
                        alt={`${userData.username} avatar`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Cyberpunk Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500" />
                      
                      {/* Level Crown for high levels */}
                      {currentLevel >= 100 && (
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                          <div className="relative">
                            <Crown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(252,211,77,0.8)] animate-bounce" />
                            <div className="absolute inset-0 rounded-full bg-yellow-400/20 blur-md animate-pulse" />
                          </div>
                        </div>
                      )}
                      
                      {/* Level Badge */}
                      <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-primary/90 via-primary/80 to-accent/90 border-2 border-white/20 rounded-full p-2 backdrop-blur-sm">
                        <div className="text-white font-bold text-sm drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">
                          L{currentLevel}
                        </div>
                      </div>
                    </div>
                  </ProfileBorder>
                  
                  {/* Corner Tech Indicators */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-l-2 border-t-2 border-primary/80" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-r-2 border-t-2 border-accent/80" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 border-l-2 border-b-2 border-accent/80" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-r-2 border-b-2 border-primary/80" />
                </div>

                {/* Cyberpunk User Info */}
                <div className="flex-1 text-center md:text-left space-y-4">
                  {/* Username and VIP Badge */}
                  <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(99,102,241,0.5)] animate-cyber-logo-shine">
                      {userData.username}
                    </h1>
                    
                    {currentLevel >= 50 && (
                      <div className="relative group/vip">
                        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/40 to-orange-500/40 rounded-lg blur-sm animate-pulse" />
                        <div className="relative px-3 py-2 bg-gradient-to-r from-yellow-900/80 to-orange-900/80 border border-yellow-500/50 backdrop-blur-sm"
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))'
                             }}>
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-400 drop-shadow-[0_0_6px_rgba(252,211,77,0.8)]" />
                            <span className="text-sm font-bold text-yellow-400 drop-shadow-sm">VIP</span>
                          </div>
                          
                          {/* Tech corners */}
                          <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-yellow-400/60" />
                          <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-yellow-400/60" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Player Details */}
                  <div className="flex items-center justify-center md:justify-start gap-6">
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 border border-slate-600/50 rounded-lg backdrop-blur-sm">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="text-slate-300 font-mono text-sm">Joined {registrationDate}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 border border-slate-600/50 rounded-lg backdrop-blur-sm">
                      <Users className="w-4 h-4 text-accent" />
                      <span className="text-slate-300 font-mono text-sm">ID #{userData.id.slice(-6).toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Cyberpunk Level & XP Display */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-center md:justify-start gap-6">
                      {/* Level Display */}
                      <div className="relative group/level">
                        <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 to-primary/50 rounded-lg blur-sm animate-pulse" />
                        <div className="relative text-center px-4 py-3 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-primary/60 backdrop-blur-sm"
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
                             }}>
                          <div className="text-3xl font-bold text-primary drop-shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-cyber-balance-glow">
                            {animatedStats.level}
                          </div>
                          <div className="text-sm text-primary/80 font-mono tracking-wider">LEVEL</div>
                          
                          {/* Tech corners */}
                          <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-primary/60" />
                          <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-primary/60" />
                        </div>
                      </div>
                      
                      {/* Current XP Display */}
                      <div className="relative group/xp">
                        <div className="absolute -inset-2 bg-gradient-to-r from-accent/30 to-accent/50 rounded-lg blur-sm animate-pulse" style={{ animationDelay: '0.5s' }} />
                        <div className="relative text-center px-4 py-3 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-accent/60 backdrop-blur-sm"
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
                             }}>
                          <div className="text-2xl font-bold text-accent drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]">
                            {animatedStats.xp.toLocaleString()}
                          </div>
                          <div className="text-sm text-accent/80 font-mono tracking-wider">CURRENT XP</div>
                          
                          {/* Tech corners */}
                          <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-accent/60" />
                          <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-accent/60" />
                        </div>
                      </div>
                      
                      {/* XP to Next Display */}
                      <div className="relative group/next">
                        <div className="absolute -inset-2 bg-gradient-to-r from-green-500/30 to-emerald-500/50 rounded-lg blur-sm animate-pulse" style={{ animationDelay: '1s' }} />
                        <div className="relative text-center px-4 py-3 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-green-500/60 backdrop-blur-sm"
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
                             }}>
                          <div className="text-xl font-bold text-green-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.8)]">
                            {xpToNext.toLocaleString()}
                          </div>
                          <div className="text-sm text-green-400/80 font-mono tracking-wider">TO NEXT</div>
                          
                          {/* Tech corners */}
                          <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-green-500/60" />
                          <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-green-500/60" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Cyberpunk Progress Bar */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-mono tracking-wider">
                        <span className="text-primary">LEVEL {currentLevel} PROGRESS</span>
                        <span className="text-accent">{Math.round(xpProgress)}% COMPLETE</span>
                      </div>
                      
                      <div className="relative group/progress">
                        {/* Progress Container */}
                        <div className="relative h-4 bg-slate-800/60 border border-slate-600/50 backdrop-blur-sm overflow-hidden"
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))'
                             }}>
                          
                          {/* Progress Fill */}
                          <div 
                            className="h-full bg-gradient-to-r from-primary via-accent to-primary relative transition-all duration-1000 ease-out"
                            style={{ width: `${xpProgress}%` }}
                          >
                            {/* Animated Glow */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-white/10 to-white/30 animate-pulse" />
                            
                            {/* Moving Scan Line */}
                            <div className="absolute top-0 right-0 w-1 h-full bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse" />
                          </div>
                          
                          {/* Grid Pattern Overlay */}
                          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(255,255,255,0.1)_25%,rgba(255,255,255,0.1)_26%,transparent_27%,transparent_74%,rgba(255,255,255,0.1)_75%,rgba(255,255,255,0.1)_76%,transparent_77%,transparent)] bg-[8px_8px] opacity-20" />
                        </div>
                        
                        {/* Progress Percentage Indicator */}
                        <div 
                          className="absolute top-1/2 transform -translate-y-1/2 text-xs font-mono font-bold text-white drop-shadow-[0_0_4px_rgba(0,0,0,0.8)] transition-all duration-1000 ease-out"
                          style={{ left: `${Math.max(5, Math.min(90, xpProgress))}%` }}
                        >
                          {Math.round(xpProgress)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                                 {/* Cyberpunk Balance Card - Only show for own profile */}
                 {(isOwnProfile || shouldShowOwnProfile) && (
                   <div className="relative group/balance">
                     {/* Outer Glow */}
                     <div className="absolute -inset-2 bg-gradient-to-r from-green-500/40 to-emerald-500/60 rounded-xl blur-md animate-pulse" />
                     
                     {/* Main Card Container */}
                     <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-green-500/60 backdrop-blur-sm p-6 text-center overflow-hidden"
                          style={{
                            clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                          }}>
                       
                       {/* Circuit Pattern */}
                       <div className="absolute inset-0 opacity-10">
                         <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(34,197,94,0.4)_25%,rgba(34,197,94,0.4)_26%,transparent_27%,transparent_74%,rgba(34,197,94,0.4)_75%,rgba(34,197,94,0.4)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(34,197,94,0.4)_25%,rgba(34,197,94,0.4)_26%,transparent_27%,transparent_74%,rgba(34,197,94,0.4)_75%,rgba(34,197,94,0.4)_76%,transparent_77%,transparent)] bg-[16px_16px] animate-grid-move-slow" />
                       </div>
                       
                       {/* Header */}
                       <div className="relative flex items-center justify-center gap-3 mb-4">
                         <Wallet className="w-6 h-6 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                         <span className="text-lg font-bold text-green-400 font-mono tracking-wider">BALANCE</span>
                         <Button
                           variant="ghost"
                           size="sm"
                           className="h-8 w-8 p-0 border border-green-500/40 bg-green-950/30 hover:bg-green-900/50 transition-all duration-300"
                           onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                           style={{
                             clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))'
                           }}
                         >
                           {isBalanceVisible ? 
                             <Eye className="w-4 h-4 text-green-400" /> : 
                             <EyeOff className="w-4 h-4 text-green-400" />
                           }
                         </Button>
                       </div>
                       
                       {/* Balance Amount */}
                       <div className="text-4xl font-bold text-green-400 drop-shadow-[0_0_12px_rgba(34,197,94,0.8)] font-mono animate-cyber-balance-glow">
                         {isBalanceVisible ? `$${animatedStats.balance.toFixed(2)}` : '$••••••'}
                       </div>
                       
                       {/* Tech Corner Indicators */}
                       <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-green-400/80" />
                       <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-green-400/80" />
                       <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-green-400/80" />
                       <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-green-400/80" />
                     </div>
                   </div>
                 )}
                 
                 {/* Cyberpunk Player Info Card for Other Users */}
                 {!isOwnProfile && !shouldShowOwnProfile && (
                   <div className="relative group/playerinfo">
                     {/* Outer Glow */}
                     <div className="absolute -inset-2 bg-gradient-to-r from-primary/40 to-accent/60 rounded-xl blur-md animate-pulse" />
                     
                     {/* Main Card Container */}
                     <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-primary/60 backdrop-blur-sm p-6 text-center overflow-hidden"
                          style={{
                            clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                          }}>
                       
                       {/* Circuit Pattern */}
                       <div className="absolute inset-0 opacity-10">
                         <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.4)_25%,rgba(99,102,241,0.4)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.4)_75%,rgba(99,102,241,0.4)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.4)_25%,rgba(99,102,241,0.4)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.4)_75%,rgba(99,102,241,0.4)_76%,transparent_77%,transparent)] bg-[16px_16px] animate-grid-move-slow" />
                       </div>
                       
                       {/* Header */}
                       <div className="relative flex items-center justify-center gap-3 mb-4">
                         <Globe className="w-6 h-6 text-primary drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                         <span className="text-lg font-bold text-primary font-mono tracking-wider">PLAYER DATA</span>
                       </div>
                       
                       {/* Game Stats */}
                       <div className="space-y-2">
                         <div className="text-3xl font-bold text-primary drop-shadow-[0_0_10px_rgba(99,102,241,0.8)] font-mono">
                           {totalGames}
                         </div>
                         <div className="text-sm text-primary/80 font-mono tracking-wider">GAMES PLAYED</div>
                         
                         <div className="text-xl font-bold text-accent drop-shadow-[0_0_8px_rgba(168,85,247,0.8)] font-mono mt-2">
                           {winRate.toFixed(1)}%
                         </div>
                         <div className="text-sm text-accent/80 font-mono tracking-wider">WIN RATE</div>
                       </div>
                       
                       {/* Tech Corner Indicators */}
                       <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-primary/80" />
                       <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-accent/80" />
                       <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-accent/80" />
                       <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-primary/80" />
                     </div>
                   </div>
                 )}
              </div>
            </div>

            {/* Cyberpunk Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <div className="relative overflow-hidden group">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-800/70 to-slate-900/80 rounded-xl" />
                
                {/* Circuit Pattern */}
                <div className="absolute inset-0 opacity-[0.08]">
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.4)_25%,rgba(99,102,241,0.4)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.4)_75%,rgba(99,102,241,0.4)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.4)_25%,rgba(99,102,241,0.4)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.4)_75%,rgba(99,102,241,0.4)_76%,transparent_77%,transparent)] bg-[12px_12px] animate-grid-move-slow" />
                </div>
                
                {/* Border Glow */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-xl blur-sm" />
                
                <TabsList className="relative grid w-full grid-cols-4 bg-transparent border border-slate-600/50 p-2 backdrop-blur-sm rounded-xl">
                  <TabsTrigger 
                    value="overview" 
                    className="relative overflow-hidden border border-transparent bg-slate-800/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/80 data-[state=active]:to-primary/60 data-[state=active]:border-primary/60 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all duration-300"
                    style={{
                      clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
                    }}
                  >
                    {/* Scan line effect for active state */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] data-[state=active]:translate-x-[100%] transition-transform duration-700 ease-out" />
                    <BarChart3 className="w-4 h-4 mr-2 drop-shadow-sm" />
                    <span className="font-mono tracking-wide">OVERVIEW</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="games" 
                    className="relative overflow-hidden border border-transparent bg-slate-800/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-accent/80 data-[state=active]:to-accent/60 data-[state=active]:border-accent/60 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all duration-300"
                    style={{
                      clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] data-[state=active]:translate-x-[100%] transition-transform duration-700 ease-out" />
                    <Gamepad2 className="w-4 h-4 mr-2 drop-shadow-sm" />
                    <span className="font-mono tracking-wide">GAMES</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="achievements" 
                    className="relative overflow-hidden border border-transparent bg-slate-800/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-600/80 data-[state=active]:to-orange-600/60 data-[state=active]:border-yellow-500/60 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all duration-300"
                    style={{
                      clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] data-[state=active]:translate-x-[100%] transition-transform duration-700 ease-out" />
                    <Award className="w-4 h-4 mr-2 drop-shadow-sm" />
                    <span className="font-mono tracking-wide">ACHIEVEMENTS</span>
                    
                    {/* Enhanced Notification Badge */}
                    {(isOwnProfile || shouldShowOwnProfile) && notificationClaimable.length > 0 && (
                      <div className="absolute -top-2 -right-2 group/badge">
                        <div className="absolute -inset-1 bg-green-500/60 rounded-full blur-sm animate-pulse" />
                        <div className="relative w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 border-2 border-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                          <span className="text-xs font-bold text-white drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">
                            {notificationClaimable.length}
                          </span>
                        </div>
                      </div>
                    )}
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="stats" 
                    className="relative overflow-hidden border border-transparent bg-slate-800/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600/80 data-[state=active]:to-teal-600/60 data-[state=active]:border-emerald-500/60 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-700/60 transition-all duration-300"
                    style={{
                      clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] data-[state=active]:translate-x-[100%] transition-transform duration-700 ease-out" />
                    <TrendingUp className="w-4 h-4 mr-2 drop-shadow-sm" />
                    <span className="font-mono tracking-wide">STATISTICS</span>
                  </TabsTrigger>
                </TabsList>
              </div>

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
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading achievements...</p>
                    </div>
                  </div>
                ) : (
                  <AchievementsSection 
                    isOwnProfile={isOwnProfile || shouldShowOwnProfile}
                    userId={(isOwnProfile || shouldShowOwnProfile) ? user?.id : userData?.id}
                    stats={stats}
                    propUserData={propUserData}
                    onUserDataUpdate={onUserDataUpdate}
                  />
                )}
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
  propUserData?: UserProfileType | null;
  onUserDataUpdate?: () => void;
}

function AchievementsSection({ isOwnProfile, userId, stats, propUserData, onUserDataUpdate }: AchievementsSectionProps) {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [claimableAchievements, setClaimableAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [newlyClaimed, setNewlyClaimed] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<any>(null);

  // Debug: Log the stats being passed
  useEffect(() => {
    console.log('🔍 AchievementsSection Debug:', {
      userId,
      isOwnProfile,
      stats: stats?.user_id,
      userStats: userStats?.user_id,
      loading
    });
  }, [stats, isOwnProfile, userId, userStats, loading]);

  // Fetch user stats for achievement progress calculation
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!userId) return;

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
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Error fetching user stats for achievements:', error);
          return;
        }

        if (data) {
          setUserStats(data);
        } else {
          setUserStats(null);
        }
      } catch (error) {
        console.error('❌ Error in fetchUserStats:', error);
      }
    };

    fetchUserStats();
  }, [userId]);

  // Fetch achievements and user stats in parallel
  const fetchData = async () => {
    if (!userId) return;

    setLoading(true);
    
    try {
              // Fetch only essential data for faster loading
        const [achievementsResult, userStatsResult, unlockedResult] = await Promise.all([
          // Fetch all achievements (lightweight)
          supabase
            .from('achievements')
            .select('id, name, description, category, icon, rarity, difficulty, reward_amount, reward_type, criteria')
            .order('rarity', { ascending: true })
            .order('difficulty', { ascending: true }),
          
          // Fetch user stats (only essential fields for achievements)
          supabase
            .from('user_level_stats')
            .select(`
              total_games,
              total_wins,
              total_profit,
              total_wagered,
              roulette_games,
              roulette_wins,
              roulette_green_wins,
              roulette_highest_win,
              tower_games,
              tower_highest_level,
              tower_perfect_games,
              coinflip_wins,
              total_cases_opened,
              chat_messages_count,
              login_days_count,
              account_created,
              best_win_streak,
              biggest_single_bet,
              current_level
            `)
            .eq('user_id', userId)
            .single(),
          
          // Fetch unlocked but unclaimed achievements
          supabase
            .from('unlocked_achievements')
            .select('achievement_id, unlocked_at')
            .eq('user_id', userId)
        ]);

      // Handle achievements
      if (achievementsResult.error) {
        console.error('Error fetching achievements:', achievementsResult.error);
      } else {
        setAchievements(achievementsResult.data || []);
      }

      // Handle user stats
      if (userStatsResult.error && userStatsResult.error.code !== 'PGRST116') {
        console.error('Error fetching user stats:', userStatsResult.error);
      } else {
        setUserStats(userStatsResult.data);
      }

      // Fetch user's unlocked achievements (lightweight)
      const { data: userAchievements, error: userError } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId);

      if (userError) {
        console.error('Error fetching user achievements:', userError);
      } else {
        const unlockedAchievements = userAchievements || [];
        setUserAchievements(unlockedAchievements);

        // Get unlocked but unclaimed achievements from the database
        if (unlockedResult.error) {
          console.error('Error fetching unlocked achievements:', unlockedResult.error);
        } else {
          const unlockedIds = (unlockedResult.data || []).map(ua => ua.achievement_id);
          
          // Get full achievement details for unlocked but unclaimed achievements
          const claimable = (achievementsResult.data || []).filter(achievement => 
            unlockedIds.includes(achievement.id)
          );

          setClaimableAchievements(claimable);
        }
      }
    } catch (error) {
      console.error('Error fetching achievement data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId, isOwnProfile]);

  const calculateProgressForAchievement = (achievement: any, userStats: any): number => {
    if (!userStats) {
      return 0;
    }
    
    const criteria = achievement.criteria; // Use 'criteria' field from database
    const criteriaType = criteria?.type;
    const targetValue = criteria?.value || 0;

    let currentValue = 0;
    
    switch (criteriaType) {
      case 'total_games': 
        currentValue = userStats.total_games || 0; 
        break;
      case 'total_wins': 
        currentValue = userStats.total_wins || 0; 
        break;
      case 'total_profit': 
        currentValue = userStats.total_profit || 0; 
        break;
      case 'total_wagered': 
        currentValue = userStats.total_wagered || 0; 
        break;
      case 'roulette_games': 
        currentValue = userStats.roulette_games || 0; 
        break;
      case 'roulette_wins': 
        currentValue = userStats.roulette_wins || 0; 
        break;
      case 'roulette_green_wins': 
        currentValue = userStats.roulette_green_wins || 0; 
        break;
      case 'roulette_biggest_win': 
        currentValue = userStats.roulette_highest_win || 0; // Map to correct field
        break;
      case 'tower_games': 
        currentValue = userStats.tower_games || 0; 
        break;
      case 'tower_highest_level': 
        currentValue = userStats.tower_highest_level || 0; 
        break;
      case 'tower_perfect_games': 
        currentValue = userStats.tower_perfect_games || 0; 
        break;
      case 'coinflip_wins': 
        currentValue = userStats.coinflip_wins || 0; 
        break;
      case 'total_cases_opened': 
        currentValue = userStats.total_cases_opened || 0; 
        break;
      case 'account_created': 
        currentValue = userStats.account_created ? 1 : 0; 
        break;
      case 'chat_messages': 
        currentValue = userStats.chat_messages_count || 0; 
        break;
      case 'login_days': 
        currentValue = userStats.login_days_count || 0; 
        break;
      case 'win_streak': 
        currentValue = userStats.best_win_streak || 0; 
        break;
      case 'biggest_single_bet': 
        currentValue = userStats.biggest_single_bet || 0; 
        break;
      case 'user_level': 
        currentValue = userStats.current_level || 0; 
        break;
      default: 
        currentValue = 0; 
        break;
    }

    // Prevent division by zero and handle edge cases
    if (targetValue === 0) return 0;
    if (currentValue >= targetValue) return 100;
    
    return Math.min(100, (currentValue / targetValue) * 100);
  };

  const calculateProgress = (achievement: any): number => {
    // Memoize the calculation for better performance
    const cacheKey = `${achievement.id}-${JSON.stringify(userStats)}`;
    if (!calculateProgress.cache) {
      calculateProgress.cache = new Map();
    }
    
    if (calculateProgress.cache.has(cacheKey)) {
      return calculateProgress.cache.get(cacheKey);
    }
    
    const result = calculateProgressForAchievement(achievement, userStats);
    calculateProgress.cache.set(cacheKey, result);
    
    // Clear cache if it gets too large
    if (calculateProgress.cache.size > 100) {
      calculateProgress.cache.clear();
    }
    
    return result;
  };

  const claimAchievement = async (achievement: any) => {
    console.log('🎯 Claim achievement called:', achievement);
    console.log('🎯 isOwnProfile:', isOwnProfile);
    console.log('🎯 userId:', userId);
    console.log('🎯 Achievement details:', {
      id: achievement.id,
      name: achievement.name,
      reward_type: achievement.reward_type,
      reward_amount: achievement.reward_amount
    });
    
    if (!isOwnProfile) {
      console.log('❌ Not own profile, returning');
      return;
    }
    
    if (!userId) {
      console.log('❌ No userId, returning');
      return;
    }
    
    setClaiming(achievement.id);
    console.log('🎯 Starting claim process for achievement:', achievement.name);
    
    try {
      // Call the manual claim function
      console.log('🎯 Calling manual claim function with params:', {
        p_user_id: userId,
        p_achievement_id: achievement.id
      });
      
      const { data: claimResult, error: claimError } = await supabase.rpc('claim_achievement_manual', {
        p_user_id: userId,
        p_achievement_id: achievement.id
      });

      if (claimError) {
        console.error('❌ Error claiming achievement:', claimError);
        console.error('❌ Error details:', {
          message: claimError.message,
          details: claimError.details,
          hint: claimError.hint
        });
        throw claimError;
      }
      console.log('✅ Achievement claimed successfully:', claimResult);
      
      // Check if the claim was successful
      if (claimResult && claimResult.success) {
        console.log('✅ Claim was successful:', claimResult);
      } else if (claimResult && claimResult.error === 'Achievement already unlocked') {
        console.log('ℹ️ Achievement already unlocked, refreshing data...');
        // Just refresh the data to update the UI
        await fetchData();
        return; // Don't throw error, just return
      } else {
        console.error('❌ Claim was not successful:', claimResult);
        throw new Error('Claim was not successful: ' + JSON.stringify(claimResult));
      }

      // Reward is automatically awarded by the database function
      console.log('🎯 Reward automatically awarded by database function');

      // Show success notification
      console.log(`🎉 Achievement unlocked: ${achievement.name}! Reward: ${achievement.reward_type === 'money' ? '$' : ''}${achievement.reward_amount}${achievement.reward_type === 'cases' ? ' cases' : achievement.reward_type === 'xp' ? ' XP' : ''}`);

      // Show success notification to user
      const rewardText = achievement.reward_type === 'money' 
        ? `$${achievement.reward_amount}` 
        : achievement.reward_type === 'cases' 
        ? `${achievement.reward_amount} cases` 
        : `${achievement.reward_amount} XP`;
        
      // Show success notification (you can replace this with a toast system)
      console.log(`🎉 Achievement Claimed!\n\n${achievement.name}\nReward: ${rewardText}`);

      // Track newly claimed achievement for smooth transition
      setNewlyClaimed(prev => [...prev, achievement.id]);

      // Refresh achievements data to update the UI
      console.log('🎯 Refreshing achievement data...');
      await fetchData();
      
      // Verify the achievement was removed from unlocked achievements
      console.log('🎯 Verifying achievement was removed from unlocked achievements...');
      const { data: remainingUnlocked } = await supabase
        .from('unlocked_achievements')
        .select('achievement_id')
        .eq('user_id', userId)
        .eq('achievement_id', achievement.id);
      
      if (remainingUnlocked && remainingUnlocked.length > 0) {
        console.error('❌ Achievement still in unlocked achievements after claiming!');
      } else {
        console.log('✅ Achievement successfully removed from unlocked achievements');
      }
      
      // Verify the achievement was added to unlocked
      console.log('🎯 Verifying achievement was added to unlocked...');
      const { data: unlockedAchievement } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId)
        .eq('achievement_id', achievement.id);
      
      if (unlockedAchievement && unlockedAchievement.length > 0) {
        console.log('✅ Achievement successfully added to unlocked');
      } else {
        console.error('❌ Achievement not found in unlocked achievements!');
      }
      
      // Also refresh user profile data to update balance display
      if (achievement.reward_type === 'money') {
        // Trigger a refresh of the user profile data
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('balance, level, xp, total_wagered, total_profit')
          .eq('id', userId)
          .single();
          
        if (updatedProfile) {
          // Update the user profile data in the parent component
          if (propUserData) {
            // If we have propUserData, update it through the parent
            // This will trigger a re-render with updated balance
            console.log('Updated balance:', updatedProfile.balance);
            onUserDataUpdate?.(); // Call the callback to update the parent's userData
          }
        }
      }
      
      // Clear the newly claimed status after a delay
      setTimeout(() => {
        setNewlyClaimed(prev => prev.filter(id => id !== achievement.id));
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error claiming achievement:', error);
    } finally {
      setClaiming(null);
      console.log('🎯 Claim process completed');
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
                <Card key={achievement.id} className={`glass border-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 hover:border-green-400/50 transition-all duration-300 hover:scale-105 animate-pulse`} style={{ animationDuration: '2s' }}>
                  <CardContent className="p-4 text-center">
                    <div className="mb-3">
                      <div className="w-8 h-8 mx-auto bg-green-500/20 rounded-full flex items-center justify-center backdrop-blur-sm animate-pulse" style={{ animationDuration: '3s' }}>
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
                        onClick={() => {
                          console.log('🎯 Claim button clicked for:', achievement.name);
                          claimAchievement(achievement);
                        }}
                        disabled={claiming === achievement.id}
                        className="w-full h-7 text-xs bg-green-500 hover:bg-green-400 text-white border-0 transition-all duration-300 hover:scale-105"
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
                <Card key={achievement.id} className={`glass border-0 bg-gradient-to-br ${rarityGradients[achievement.rarity]} opacity-90 hover:opacity-100 transition-all duration-500 hover:scale-105 border ${rarityColors[achievement.rarity]} ${newlyClaimed.includes(achievement.id) ? 'animate-pulse bg-gradient-to-br from-green-500/30 to-emerald-500/30' : ''}`} style={newlyClaimed.includes(achievement.id) ? { animationDuration: '1s' } : {}}>
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
