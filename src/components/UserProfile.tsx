
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, Target, TrendingUp, Calendar, Star, DollarSign, 
  Crown, Flame, Sparkles, Zap, Award, Medal, Gamepad2,
  BarChart3, Coins, X, Wallet, Gift, Globe, Users,
  ChevronUp, ChevronDown, Eye, EyeOff, Loader2, Building, Shield
} from 'lucide-react';
import { UserProfile as UserProfileType } from '@/hooks/useUserProfile';
import { ProfileBorder } from './ProfileBorder';
import { useUserLevelStats } from '@/hooks/useUserLevelStats';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievementNotifications } from '@/hooks/useAchievementNotifications';
import { formatXP, formatXPProgress, calculateXPProgress } from '@/lib/xpUtils';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { useToast } from '@/hooks/use-toast';

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
  
  // Check admin status for the user whose profile is being viewed
  const profileUserId = userData?.id || (shouldShowOwnProfile ? user?.id : undefined);
  const { isAdmin: profileUserIsAdmin } = useAdminStatus(profileUserId);
  


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
            const result = await supabase
              .from('profiles')
              .select('*')
              .eq('username', username)
              .single();
            profile = result.data;
            profileError = result.error;
          } else if (user) {
            // Fetch current user's profile
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
          console.log('🎯 Fetching level stats for user:', profile.id, 'username:', profile.username);
          const { data: levelStats, error: levelError } = await supabase
            .from('user_level_stats')
            .select('*')
            .eq('user_id', profile.id)
            .single();

          if (levelError) {
            console.warn('⚠️ Level stats error for user', profile.username, ':', levelError);
            if (levelError.code !== 'PGRST116') {
              console.error('❌ Unexpected level stats error:', levelError);
            } else {
              console.log('ℹ️ No level stats found for user, will use defaults');
            }
          } else {
            console.log('✅ Level stats fetched successfully for', profile.username, ':', {
              level: levelStats?.current_level,
              xp: levelStats?.current_level_xp,
              lifetime_xp: levelStats?.lifetime_xp,
              xp_to_next: levelStats?.xp_to_next_level
            });
          }

          // Create game stats from level stats data
          const gameStats = {
            coinflip: { wins: levelStats?.coinflip_wins || 0, losses: Math.max(0, (levelStats?.coinflip_games || 0) - (levelStats?.coinflip_wins || 0)), profit: levelStats?.coinflip_profit || 0 },
            crash: { wins: levelStats?.crash_wins || 0, losses: Math.max(0, (levelStats?.crash_games || 0) - (levelStats?.crash_wins || 0)), profit: levelStats?.crash_profit || 0 },
            roulette: { wins: levelStats?.roulette_wins || 0, losses: Math.max(0, (levelStats?.roulette_games || 0) - (levelStats?.roulette_wins || 0)), profit: levelStats?.roulette_profit || 0 },
            tower: { wins: levelStats?.tower_wins || 0, losses: Math.max(0, (levelStats?.tower_games || 0) - (levelStats?.tower_wins || 0)), profit: levelStats?.tower_profit || 0 }
          };

          // Build user data object using level stats from user_level_stats
          const fetchedUser: UserProfileType = {
            id: profile.id,
            username: profile.username,
            balance: profile.balance,
            registration_date: profile.created_at,
            levelStats: {
              current_level: levelStats?.current_level || 1,
              current_level_xp: levelStats?.current_level_xp || 0,
              lifetime_xp: levelStats?.lifetime_xp || 0,
              xp_to_next_level: levelStats?.xp_to_next_level || 100,
              border_tier: levelStats?.border_tier || 1
            },
            gameStats,
            badges: [] // You might want to fetch this from a badges table
          };


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

      // Use the correct XP source (prioritize stats for own profile, userData levelStats for others)
      const currentLevel = stats?.current_level || userData.levelStats?.current_level || 1;
      const currentXP = stats?.current_level_xp || userData.levelStats?.current_level_xp || 0;
      const lifetimeXP = stats?.lifetime_xp || userData.levelStats?.lifetime_xp || 0;

      animateValue(0, currentLevel, 800, (val) => 
        setAnimatedStats(prev => ({ ...prev, level: val }))
      );
      animateValue(0, lifetimeXP, 1000, (val) => 
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
          <DialogHeader className="sr-only">
            <DialogTitle>Loading Profile</DialogTitle>
            <DialogDescription>Fetching user data, please wait...</DialogDescription>
          </DialogHeader>
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

  // Move variable declarations here to fix initialization order
  const currentLevel = stats?.current_level || userData.levelStats?.current_level || 1;
  const lifetimeXP = stats?.lifetime_xp || userData.levelStats?.lifetime_xp || 0; // Main XP display from user_level_stats
  const currentXP = stats?.current_level_xp || userData.levelStats?.current_level_xp || 0; // XP within current level
  const xpToNext = stats?.xp_to_next_level || userData.levelStats?.xp_to_next_level || 100;
  const totalXP = currentXP + xpToNext;
  const xpProgress = calculateXPProgress(currentXP, xpToNext);

  // Debug logging for level stats display
  console.log('📊 UserProfile level stats display:', {
    username: userData.username,
    isOwnProfile: isOwnProfile || shouldShowOwnProfile,
    hasStats: !!stats,
    hasUserDataLevelStats: !!userData.levelStats,
    currentLevel,
    lifetimeXP,
    currentXP,
    xpToNext,
    xpProgress: Math.round(xpProgress)
  });

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
      <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0 border-0 bg-transparent overflow-hidden user-profile-scrollbar cyberpunk-scrollbar">
        <DialogHeader className="sr-only">
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>View detailed user statistics, achievements, and game history</DialogDescription>
        </DialogHeader>
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

          <div className="relative p-8 h-full overflow-y-auto user-profile-scrollbar cyberpunk-scrollbar">
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
                    <div className="flex items-center gap-3">
                      <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(99,102,241,0.5)] animate-cyber-logo-shine">
                        {userData.username}
                      </h1>
                      {/* Admin Shield Icon */}
                      {profileUserIsAdmin && (
                        <div className="flex items-center text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" title="Admin">
                          <Shield className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    
                    {currentLevel >= 50 && (
                      <div className="relative group/vip">
                        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/40 to-orange-500/40 blur-sm animate-pulse"
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))'
                             }} />
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
                        <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 to-primary/50 blur-sm animate-pulse"
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
                             }} />
                        <div className="relative text-center px-4 py-3 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-primary/60 backdrop-blur-sm"
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
                             }}>
                          <div className="text-3xl font-bold text-primary drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]">
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
                        <div className="absolute -inset-2 bg-gradient-to-r from-accent/30 to-accent/50 blur-sm animate-pulse"
                             style={{ 
                               animationDelay: '0.5s',
                               clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
                             }} />
                        <div className="relative text-center px-4 py-3 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-accent/60 backdrop-blur-sm"
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
                             }}>
                          <div className="text-2xl font-bold text-accent drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]">
                            {formatXP(animatedStats.xp)}
                          </div>
                          <div className="text-sm text-accent/80 font-mono tracking-wider">CURRENT XP</div>
                          
                          {/* Tech corners */}
                          <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-accent/60" />
                          <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-accent/60" />
                        </div>
                      </div>
                      
                      {/* XP to Next Display */}
                      <div className="relative group/next">
                        <div className="absolute -inset-2 bg-gradient-to-r from-green-500/30 to-emerald-500/50 blur-sm animate-pulse"
                             style={{ 
                               animationDelay: '1s',
                               clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
                             }} />
                        <div className="relative text-center px-4 py-3 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-green-500/60 backdrop-blur-sm"
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
                             }}>
                          <div className="text-xl font-bold text-green-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.8)]">
                            {formatXP(xpToNext)}
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
                     <div className="absolute -inset-2 bg-gradient-to-r from-green-500/40 to-emerald-500/60 blur-md animate-pulse"
                          style={{
                            clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                          }} />
                     
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
                       <div className="text-4xl font-bold text-green-400 drop-shadow-[0_0_12px_rgba(34,197,94,0.8)] font-mono">
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
                     <div className="absolute -inset-2 bg-gradient-to-r from-primary/40 to-accent/60 blur-md animate-pulse"
                          style={{
                            clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                          }} />
                     
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
                             <div className="relative group">
                 {/* Background */}
                 <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-800/70 to-slate-900/80 rounded-xl overflow-hidden" />
                 
                 {/* Circuit Pattern */}
                 <div className="absolute inset-0 opacity-[0.08] overflow-hidden">
                   <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.4)_25%,rgba(99,102,241,0.4)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.4)_75%,rgba(99,102,241,0.4)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.4)_25%,rgba(99,102,241,0.4)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.4)_75%,rgba(99,102,241,0.4)_76%,transparent_77%,transparent)] bg-[12px_12px] animate-grid-move-slow" />
                 </div>
                 
                                  {/* Border Glow */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 blur-sm overflow-hidden"
                       style={{
                         clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                       }} />
                 
                                                   <div className="relative p-6">
                  {/* Navigation Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                    <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent font-mono tracking-wider">
                      PROFILE NAVIGATION
                    </h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-primary/50 via-accent/30 to-transparent" />
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                  </div>
                  
                  <TabsList className="relative grid w-full grid-cols-4 gap-3 bg-transparent border-0 p-0 h-auto">
                    {/* Notification Badge - Positioned relative to achievements tab */}
                    {(isOwnProfile || shouldShowOwnProfile) && notificationClaimable.length > 0 && (
                      <div className="absolute top-0 left-[75%] transform -translate-x-1/2 -translate-y-3 group/badge z-[9999]">
                        <div className="absolute -inset-1 bg-emerald-500/60 blur-sm animate-pulse"
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))'
                             }} />
                        <div className="relative w-7 h-7 bg-gradient-to-br from-emerald-500 to-green-600 border-2 border-white/30 backdrop-blur-sm flex items-center justify-center"
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))'
                             }}>
                          <span className="text-xs font-bold text-white drop-shadow-[0_0_6px_rgba(0,0,0,0.8)] font-mono">
                            {notificationClaimable.length}
                          </span>
                        </div>
                      </div>
                    )}
                                      {/* Overview Tab Button */}
                    <div className="relative group/tab">
                      <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 to-blue-500/60 blur-sm opacity-0 group-hover/tab:opacity-100 transition-opacity duration-300"
                           style={{
                             clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))'
                           }} />
                      
                      <TabsTrigger 
                        value="overview" 
                        className="relative w-full h-16 bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-slate-600/50 data-[state=active]:border-primary/70 data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-blue-600/30 text-slate-300 data-[state=active]:text-white hover:text-white hover:border-slate-500/70 transition-all duration-500 backdrop-blur-sm group overflow-hidden"
                        style={{
                          clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))'
                        }}
                      >
                        {/* Circuit Pattern Background */}
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.4)_25%,rgba(99,102,241,0.4)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.4)_75%,rgba(99,102,241,0.4)_76%,transparent_77%,transparent)] bg-[8px_8px] animate-grid-move-slow" />
                        </div>
                        
                        {/* Scan Line Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent translate-x-[-100%] group-data-[state=active]:translate-x-[100%] transition-transform duration-1000 ease-out" />
                        
                        {/* Content */}
                        <div className="relative z-10 flex flex-col items-center justify-center gap-2 p-3">
                          <BarChart3 className="w-6 h-6 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)] group-data-[state=active]:animate-pulse" />
                          <span className="text-xs font-bold font-mono tracking-wider">OVERVIEW</span>
                        </div>
                        
                        {/* Tech Corner Indicators */}
                        <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-primary/60 group-data-[state=active]:border-primary" />
                        <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-primary/60 group-data-[state=active]:border-primary" />
                      </TabsTrigger>
                    </div>
                  
                                      {/* Games Tab Button */}
                    <div className="relative group/tab">
                      <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/40 to-violet-500/60 blur-sm opacity-0 group-hover/tab:opacity-100 transition-opacity duration-300"
                           style={{
                             clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))'
                           }} />
                      
                      <TabsTrigger 
                        value="games" 
                        className="relative w-full h-16 bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-slate-600/50 data-[state=active]:border-purple-500/70 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-600/20 data-[state=active]:to-violet-600/30 text-slate-300 data-[state=active]:text-white hover:text-white hover:border-slate-500/70 transition-all duration-500 backdrop-blur-sm group overflow-hidden"
                        style={{
                          clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))'
                        }}
                      >
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(147,51,234,0.4)_25%,rgba(147,51,234,0.4)_26%,transparent_27%,transparent_74%,rgba(147,51,234,0.4)_75%,rgba(147,51,234,0.4)_76%,transparent_77%,transparent)] bg-[8px_8px] animate-grid-move-slow" />
                        </div>
                        
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/30 to-transparent translate-x-[-100%] group-data-[state=active]:translate-x-[100%] transition-transform duration-1000 ease-out" />
                        
                        <div className="relative z-10 flex flex-col items-center justify-center gap-2 p-3">
                          <Gamepad2 className="w-6 h-6 drop-shadow-[0_0_8px_rgba(147,51,234,0.6)] group-data-[state=active]:animate-pulse" />
                          <span className="text-xs font-bold font-mono tracking-wider">GAMES</span>
                        </div>
                        
                        <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-purple-500/60 group-data-[state=active]:border-purple-400" />
                        <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-purple-500/60 group-data-[state=active]:border-purple-400" />
                      </TabsTrigger>
                    </div>
                  
                                      {/* Achievements Tab Button */}
                    <div className="relative group/tab">
                      <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/40 to-orange-500/60 blur-sm opacity-0 group-hover/tab:opacity-100 transition-opacity duration-300"
                           style={{
                             clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))'
                           }} />
                      
                      <TabsTrigger 
                        value="achievements" 
                        className="relative w-full h-16 bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-slate-600/50 data-[state=active]:border-yellow-500/70 data-[state=active]:bg-gradient-to-br data-[state=active]:from-yellow-600/20 data-[state=active]:to-orange-600/30 text-slate-300 data-[state=active]:text-white hover:text-white hover:border-slate-500/70 transition-all duration-500 backdrop-blur-sm group overflow-hidden"
                        style={{
                          clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))'
                        }}
                      >
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(245,158,11,0.4)_25%,rgba(245,158,11,0.4)_26%,transparent_27%,transparent_74%,rgba(245,158,11,0.4)_75%,rgba(245,158,11,0.4)_76%,transparent_77%,transparent)] bg-[8px_8px] animate-grid-move-slow" />
                        </div>
                        
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent translate-x-[-100%] group-data-[state=active]:translate-x-[100%] transition-transform duration-1000 ease-out" />
                        
                        <div className="relative z-10 flex flex-col items-center justify-center gap-2 p-3">
                          <Award className="w-6 h-6 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] group-data-[state=active]:animate-pulse" />
                          <span className="text-xs font-bold font-mono tracking-wider">ACHIEVEMENTS</span>
                        </div>
                        
                        <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-yellow-500/60 group-data-[state=active]:border-yellow-400" />
                        <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-yellow-500/60 group-data-[state=active]:border-yellow-400" />
                      </TabsTrigger>
                    </div>
                  
                                      {/* Statistics Tab Button */}
                    <div className="relative group/tab">
                      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/40 to-teal-500/60 blur-sm opacity-0 group-hover/tab:opacity-100 transition-opacity duration-300"
                           style={{
                             clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))'
                           }} />
                      
                      <TabsTrigger 
                        value="stats" 
                        className="relative w-full h-16 bg-gradient-to-br from-slate-800/80 to-slate-900/90 border border-slate-600/50 data-[state=active]:border-emerald-500/70 data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-600/20 data-[state=active]:to-teal-600/30 text-slate-300 data-[state=active]:text-white hover:text-white hover:border-slate-500/70 transition-all duration-500 backdrop-blur-sm group overflow-hidden"
                        style={{
                          clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))'
                        }}
                      >
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(16,185,129,0.4)_25%,rgba(16,185,129,0.4)_26%,transparent_27%,transparent_74%,rgba(16,185,129,0.4)_75%,rgba(16,185,129,0.4)_76%,transparent_77%,transparent)] bg-[8px_8px] animate-grid-move-slow" />
                        </div>
                        
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent translate-x-[-100%] group-data-[state=active]:translate-x-[100%] transition-transform duration-1000 ease-out" />
                        
                        <div className="relative z-10 flex flex-col items-center justify-center gap-2 p-3">
                          <TrendingUp className="w-6 h-6 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] group-data-[state=active]:animate-pulse" />
                          <span className="text-xs font-bold font-mono tracking-wider">STATISTICS</span>
                        </div>
                        
                        <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-emerald-500/60 group-data-[state=active]:border-emerald-400" />
                        <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-emerald-500/60 group-data-[state=active]:border-emerald-400" />
                      </TabsTrigger>
                    </div>
                  </TabsList>
                </div>
              </div>

              {/* Cyberpunk Overview Tab */}
              <TabsContent value="overview" className="space-y-8">
                {/* Cyberpunk Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {/* Games Played Stat */}
                  <div className="relative group/stat">
                    {/* Outer Glow */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/40 to-blue-600/60 blur-sm animate-pulse"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                         }} />
                    
                    {/* Main Container */}
                    <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-blue-500/60 backdrop-blur-sm p-4 text-center overflow-hidden"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                         }}>
                      
                      {/* Circuit Pattern */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(59,130,246,0.4)_25%,rgba(59,130,246,0.4)_26%,transparent_27%,transparent_74%,rgba(59,130,246,0.4)_75%,rgba(59,130,246,0.4)_76%,transparent_77%,transparent)] bg-[12px_12px] animate-grid-move-slow" />
                      </div>
                      
                      <Gamepad2 className="w-8 h-8 mx-auto mb-3 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] relative z-10" />
                      <div className="text-3xl font-bold text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.6)] font-mono relative z-10">
                        {totalGames}
                      </div>
                      <div className="text-sm text-blue-300/80 font-mono tracking-wider relative z-10">GAMES PLAYED</div>
                      
                      {/* Tech Corner Indicators */}
                      <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-blue-400/80" />
                      <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-blue-400/80" />
                    </div>
                  </div>
                  
                  {/* Total Wins Stat */}
                  <div className="relative group/stat">
                    <div className="absolute -inset-1 bg-gradient-to-r from-green-500/40 to-green-600/60 blur-sm animate-pulse"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                         }} />
                    
                    <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-green-500/60 backdrop-blur-sm p-4 text-center overflow-hidden"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                         }}>
                      
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(34,197,94,0.4)_25%,rgba(34,197,94,0.4)_26%,transparent_27%,transparent_74%,rgba(34,197,94,0.4)_75%,rgba(34,197,94,0.4)_76%,transparent_77%,transparent)] bg-[12px_12px] animate-grid-move-slow" />
                      </div>
                      
                      <Trophy className="w-8 h-8 mx-auto mb-3 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)] relative z-10" />
                      <div className="text-3xl font-bold text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)] font-mono relative z-10">
                        {totalWins}
                      </div>
                      <div className="text-sm text-green-300/80 font-mono tracking-wider relative z-10">TOTAL WINS</div>
                      
                      <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-green-400/80" />
                      <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-green-400/80" />
                    </div>
                  </div>
                  
                  {/* Win Rate Stat */}
                  <div className="relative group/stat">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/40 to-purple-600/60 blur-sm animate-pulse"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                         }} />
                    
                    <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-purple-500/60 backdrop-blur-sm p-4 text-center overflow-hidden"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                         }}>
                      
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(168,85,247,0.4)_25%,rgba(168,85,247,0.4)_26%,transparent_27%,transparent_74%,rgba(168,85,247,0.4)_75%,rgba(168,85,247,0.4)_76%,transparent_77%,transparent)] bg-[12px_12px] animate-grid-move-slow" />
                      </div>
                      
                      <Target className="w-8 h-8 mx-auto mb-3 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)] relative z-10" />
                      <div className="text-3xl font-bold text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.6)] font-mono relative z-10">
                        {winRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-purple-300/80 font-mono tracking-wider relative z-10">WIN RATE</div>
                      
                      <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-purple-400/80" />
                      <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-purple-400/80" />
                    </div>
                  </div>
                  
                  {/* Profit/Loss Stat */}
                  <div className="relative group/stat">
                    <div className={`absolute -inset-1 blur-sm animate-pulse ${totalProfit >= 0 ? 'bg-gradient-to-r from-green-500/40 to-green-600/60' : 'bg-gradient-to-r from-red-500/40 to-red-600/60'}`}
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                         }} />
                    
                    <div className={`relative bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm p-4 text-center overflow-hidden ${totalProfit >= 0 ? 'border border-green-500/60' : 'border border-red-500/60'}`}
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                         }}>
                      
                      <div className="absolute inset-0 opacity-10">
                        <div className={`absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,${totalProfit >= 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}%_25%,${totalProfit >= 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}%_26%,transparent_27%,transparent_74%,${totalProfit >= 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}%_75%,${totalProfit >= 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}%_76%,transparent_77%,transparent)] bg-[12px_12px] animate-grid-move-slow`} />
                      </div>
                      
                      <DollarSign className={`w-8 h-8 mx-auto mb-3 relative z-10 ${totalProfit >= 0 ? 'text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />
                      <div className={`text-3xl font-bold font-mono relative z-10 ${totalProfit >= 0 ? 'text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]'}`}>
                        ${Math.abs(totalProfit).toFixed(2)}
                      </div>
                      <div className={`text-sm font-mono tracking-wider relative z-10 ${totalProfit >= 0 ? 'text-green-300/80' : 'text-red-300/80'}`}>
                        {totalProfit >= 0 ? 'TOTAL PROFIT' : 'TOTAL LOSS'}
                      </div>
                      
                      <div className={`absolute top-1 left-1 w-2 h-2 border-l border-t ${totalProfit >= 0 ? 'border-green-400/80' : 'border-red-400/80'}`} />
                      <div className={`absolute bottom-1 right-1 w-2 h-2 border-r border-b ${totalProfit >= 0 ? 'border-green-400/80' : 'border-red-400/80'}`} />
                    </div>
                  </div>
                </div>

                {/* Cyberpunk Player Highlights */}
                <div className="relative group/highlights">
                  {/* Multi-layered Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 rounded-2xl" />
                  
                  {/* Circuit Pattern */}
                  <div className="absolute inset-0 opacity-[0.12] rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.5)_25%,rgba(99,102,241,0.5)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.5)_75%,rgba(99,102,241,0.5)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.5)_25%,rgba(99,102,241,0.5)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.5)_75%,rgba(99,102,241,0.5)_76%,transparent_77%,transparent)] bg-[20px_20px] animate-grid-move-slow" />
                  </div>
                  
                  {/* Border Glow */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-2xl blur-sm" />
                  
                  {/* Tech Corner Details */}
                  <div className="absolute top-3 left-3 w-5 h-5 border-l-2 border-t-2 border-primary/70 rounded-tl-sm" />
                  <div className="absolute top-3 right-3 w-5 h-5 border-r-2 border-t-2 border-accent/70 rounded-tr-sm" />
                  <div className="absolute bottom-3 left-3 w-5 h-5 border-l-2 border-b-2 border-accent/70 rounded-bl-sm" />
                  <div className="absolute bottom-3 right-3 w-5 h-5 border-r-2 border-b-2 border-primary/70 rounded-br-sm" />
                  
                  <div className="relative z-10 p-8">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <Zap className="w-7 h-7 text-primary drop-shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse" />
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-mono tracking-wider">
                        PLAYER HIGHLIGHTS
                      </h3>
                      <div className="flex-1 h-px bg-gradient-to-r from-primary/50 via-accent/30 to-transparent" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Best Streak Highlight */}
                      <div className="relative group/streak">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 to-accent/60 blur-sm animate-pulse"
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                             }} />
                        
                        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-primary/60 backdrop-blur-sm p-6 overflow-hidden"
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                             }}>
                          
                          {/* Circuit Pattern */}
                          <div className="absolute inset-0 opacity-10">
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.4)_25%,rgba(99,102,241,0.4)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.4)_75%,rgba(99,102,241,0.4)_76%,transparent_77%,transparent)] bg-[16px_16px] animate-grid-move-slow" />
                          </div>
                          
                          <h4 className="font-bold mb-3 text-primary font-mono tracking-wider text-lg relative z-10">BEST STREAK</h4>
                          <p className="text-4xl font-bold font-mono text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)] relative z-10 mb-2">12</p>
                          <p className="text-sm text-primary/80 font-mono tracking-wide relative z-10">CONSECUTIVE WINS IN COINFLIP</p>
                          
                          {/* Tech corners */}
                          <div className="absolute top-2 left-2 w-3 h-3 border-l border-t border-primary/80" />
                          <div className="absolute bottom-2 right-2 w-3 h-3 border-r border-b border-primary/80" />
                        </div>
                      </div>
                      
                      {/* Biggest Win Highlight */}
                      <div className="relative group/bigwin">
                        <div className="absolute -inset-1 bg-gradient-to-r from-green-500/40 to-emerald-500/60 blur-sm animate-pulse"
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                             }} />
                        
                        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-green-500/60 backdrop-blur-sm p-6 overflow-hidden"
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                             }}>
                          
                          {/* Circuit Pattern */}
                          <div className="absolute inset-0 opacity-10">
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(34,197,94,0.4)_25%,rgba(34,197,94,0.4)_26%,transparent_27%,transparent_74%,rgba(34,197,94,0.4)_75%,rgba(34,197,94,0.4)_76%,transparent_77%,transparent)] bg-[16px_16px] animate-grid-move-slow" />
                          </div>
                          
                          <h4 className="font-bold mb-3 text-green-400 font-mono tracking-wider text-lg relative z-10">BIGGEST WIN</h4>
                          <p className="text-4xl font-bold text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)] font-mono relative z-10 mb-2">$2,450.00</p>
                          <p className="text-sm text-green-300/80 font-mono tracking-wide relative z-10">JACKPOT IN ROULETTE</p>
                          
                          {/* Tech corners */}
                          <div className="absolute top-2 left-2 w-3 h-3 border-l border-t border-green-400/80" />
                          <div className="absolute bottom-2 right-2 w-3 h-3 border-r border-b border-green-400/80" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Cyberpunk Games Tab */}
              <TabsContent value="games" className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                  {/* Coinflip Stats */}
                  <div className="relative group/game">
                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/40 to-orange-500/60 blur-sm animate-pulse"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                         }} />
                    
                    <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-amber-500/60 backdrop-blur-sm overflow-hidden"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                         }}>
                      
                      {/* Circuit Pattern */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(245,158,11,0.4)_25%,rgba(245,158,11,0.4)_26%,transparent_27%,transparent_74%,rgba(245,158,11,0.4)_75%,rgba(245,158,11,0.4)_76%,transparent_77%,transparent)] bg-[16px_16px] animate-grid-move-slow" />
                      </div>
                      
                      {/* Header */}
                      <div className="relative z-10 p-6 border-b border-amber-500/30">
                        <div className="flex items-center gap-3">
                          <Coins className="w-8 h-8 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                          <h3 className="text-2xl font-bold text-amber-400 font-mono tracking-wider">COINFLIP</h3>
                          <div className="flex-1 h-px bg-gradient-to-r from-amber-500/50 to-transparent" />
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="relative z-10 p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-white font-mono drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">
                              {(userData.gameStats.coinflip?.wins || 0) + (userData.gameStats.coinflip?.losses || 0)}
                            </div>
                            <div className="text-sm text-amber-300/80 font-mono">GAMES</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-green-400 font-mono drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]">
                              {userData.gameStats.coinflip?.wins || 0}
                            </div>
                            <div className="text-sm text-green-300/80 font-mono">WINS</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-400 font-mono drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                              {userData.gameStats.coinflip?.losses || 0}
                            </div>
                            <div className="text-sm text-red-300/80 font-mono">LOSSES</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold font-mono ${(userData.gameStats.coinflip?.profit || 0) >= 0 ? 'text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}>
                              {(userData.gameStats.coinflip?.profit || 0) >= 0 ? '+' : ''}${(userData.gameStats.coinflip?.profit || 0).toFixed(2)}
                            </div>
                            <div className={`text-sm font-mono ${(userData.gameStats.coinflip?.profit || 0) >= 0 ? 'text-green-300/80' : 'text-red-300/80'}`}>PROFIT</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Tech corners */}
                      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-amber-400/80" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-amber-400/80" />
                    </div>
                  </div>

                  {/* Roulette Stats */}
                  <div className="relative group/game">
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-500/40 to-pink-500/60 blur-sm animate-pulse"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                         }} />
                    
                    <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-red-500/60 backdrop-blur-sm overflow-hidden"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                         }}>
                      
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(239,68,68,0.4)_25%,rgba(239,68,68,0.4)_26%,transparent_27%,transparent_74%,rgba(239,68,68,0.4)_75%,rgba(239,68,68,0.4)_76%,transparent_77%,transparent)] bg-[16px_16px] animate-grid-move-slow" />
                      </div>
                      
                      <div className="relative z-10 p-6 border-b border-red-500/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-black border-2 border-white drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                          <h3 className="text-2xl font-bold text-red-400 font-mono tracking-wider">ROULETTE</h3>
                          <div className="flex-1 h-px bg-gradient-to-r from-red-500/50 to-transparent" />
                        </div>
                      </div>
                      
                      <div className="relative z-10 p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-white font-mono drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">
                              {(userData.gameStats.roulette?.wins || 0) + (userData.gameStats.roulette?.losses || 0)}
                            </div>
                            <div className="text-sm text-red-300/80 font-mono">GAMES</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-green-400 font-mono drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]">
                              {userData.gameStats.roulette?.wins || 0}
                            </div>
                            <div className="text-sm text-green-300/80 font-mono">WINS</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-400 font-mono drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                              {userData.gameStats.roulette?.losses || 0}
                            </div>
                            <div className="text-sm text-red-300/80 font-mono">LOSSES</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold font-mono ${(userData.gameStats.roulette?.profit || 0) >= 0 ? 'text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}>
                              {(userData.gameStats.roulette?.profit || 0) >= 0 ? '+' : ''}${(userData.gameStats.roulette?.profit || 0).toFixed(2)}
                            </div>
                            <div className={`text-sm font-mono ${(userData.gameStats.roulette?.profit || 0) >= 0 ? 'text-green-300/80' : 'text-red-300/80'}`}>PROFIT</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-red-400/80" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-red-400/80" />
                    </div>
                  </div>

                  {/* Tower Stats */}
                  <div className="relative group/game">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/40 to-teal-500/60 blur-sm animate-pulse"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                         }} />
                    
                    <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-emerald-500/60 backdrop-blur-sm overflow-hidden"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                         }}>
                      
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(16,185,129,0.4)_25%,rgba(16,185,129,0.4)_26%,transparent_27%,transparent_74%,rgba(16,185,129,0.4)_75%,rgba(16,185,129,0.4)_76%,transparent_77%,transparent)] bg-[16px_16px] animate-grid-move-slow" />
                      </div>
                      
                      <div className="relative z-10 p-6 border-b border-emerald-500/30">
                        <div className="flex items-center gap-3">
                          <Building className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                          <h3 className="text-2xl font-bold text-emerald-400 font-mono tracking-wider">TOWER</h3>
                          <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/50 to-transparent" />
                        </div>
                      </div>
                      
                      <div className="relative z-10 p-6 space-y-4">
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white font-mono drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">
                              {(userData.gameStats.tower?.wins || 0) + (userData.gameStats.tower?.losses || 0)}
                            </div>
                            <div className="text-xs text-emerald-300/80 font-mono">GAMES</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-400 font-mono drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]">
                              {userData.gameStats.tower?.wins || 0}
                            </div>
                            <div className="text-xs text-green-300/80 font-mono">WINS</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-400 font-mono drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]">
                              {stats?.tower_highest_level || 0}
                            </div>
                            <div className="text-xs text-emerald-300/80 font-mono">MAX LVL</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-400 font-mono drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]">
                              {stats?.tower_perfect_games || 0}
                            </div>
                            <div className="text-sm text-purple-300/80 font-mono">PERFECT</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold font-mono ${(userData.gameStats.tower?.profit || 0) >= 0 ? 'text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}>
                              {(userData.gameStats.tower?.profit || 0) >= 0 ? '+' : ''}${(userData.gameStats.tower?.profit || 0).toFixed(2)}
                            </div>
                            <div className={`text-sm font-mono ${(userData.gameStats.tower?.profit || 0) >= 0 ? 'text-green-300/80' : 'text-red-300/80'}`}>PROFIT</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-emerald-400/80" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-emerald-400/80" />
                    </div>
                  </div>

                  {/* Crash Stats */}
                  <div className="relative group/game">
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/40 to-blue-500/60 blur-sm animate-pulse"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                         }} />
                    
                    <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-cyan-500/60 backdrop-blur-sm overflow-hidden"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                         }}>
                      
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(6,182,212,0.4)_25%,rgba(6,182,212,0.4)_26%,transparent_27%,transparent_74%,rgba(6,182,212,0.4)_75%,rgba(6,182,212,0.4)_76%,transparent_77%,transparent)] bg-[16px_16px] animate-grid-move-slow" />
                      </div>
                      
                      <div className="relative z-10 p-6 border-b border-cyan-500/30">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                          <h3 className="text-2xl font-bold text-cyan-400 font-mono tracking-wider">CRASH</h3>
                          <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
                        </div>
                      </div>
                      
                      <div className="relative z-10 p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-white font-mono drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">
                              {(userData.gameStats.crash?.wins || 0) + (userData.gameStats.crash?.losses || 0)}
                            </div>
                            <div className="text-sm text-cyan-300/80 font-mono">GAMES</div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-green-400 font-mono drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]">
                              {userData.gameStats.crash?.wins || 0}
                            </div>
                            <div className="text-sm text-green-300/80 font-mono">WINS</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-400 font-mono drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                              {userData.gameStats.crash?.losses || 0}
                            </div>
                            <div className="text-sm text-red-300/80 font-mono">LOSSES</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold font-mono ${(userData.gameStats.crash?.profit || 0) >= 0 ? 'text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}>
                              {(userData.gameStats.crash?.profit || 0) >= 0 ? '+' : ''}${(userData.gameStats.crash?.profit || 0).toFixed(2)}
                            </div>
                            <div className={`text-sm font-mono ${(userData.gameStats.crash?.profit || 0) >= 0 ? 'text-green-300/80' : 'text-red-300/80'}`}>PROFIT</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-cyan-400/80" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-cyan-400/80" />
                    </div>
                  </div>
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

              {/* Cyberpunk Statistics Tab */}
              <TabsContent value="stats" className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Level Progress Chart */}
                  <div className="relative group/levelchart">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 to-accent/60 blur-sm animate-pulse"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                         }} />
                    
                    <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-primary/60 backdrop-blur-sm overflow-hidden"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                         }}>
                      
                      {/* Circuit Pattern */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.4)_25%,rgba(99,102,241,0.4)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.4)_75%,rgba(99,102,241,0.4)_76%,transparent_77%,transparent)] bg-[16px_16px] animate-grid-move-slow" />
                      </div>
                      
                      {/* Header */}
                      <div className="relative z-10 p-6 border-b border-primary/30">
                        <div className="flex items-center gap-3">
                          <BarChart3 className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                          <h3 className="text-2xl font-bold text-primary font-mono tracking-wider">LEVEL PROGRESS</h3>
                          <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent" />
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="relative z-10 p-8">
                        <div className="text-center mb-8">
                          <div className="text-6xl font-bold text-primary drop-shadow-[0_0_15px_rgba(99,102,241,0.8)] font-mono mb-3">
                            {currentLevel}
                          </div>
                          <div className="text-lg text-primary/80 font-mono tracking-wider mb-6">CURRENT LEVEL</div>
                          
                          {/* Enhanced Progress Section */}
                          <div className="space-y-4">
                            <div className="flex justify-between text-base font-mono">
                              <span className="text-primary">PROGRESS TO LEVEL {currentLevel + 1}</span>
                              <span className="text-accent">{Math.round(xpProgress)}% COMPLETE</span>
                            </div>
                            
                            {/* Cyberpunk Progress Bar */}
                            <div className="relative">
                              <div className="h-6 bg-slate-800/60 border border-slate-600/50 backdrop-blur-sm overflow-hidden"
                                   style={{
                                     clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
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
                                className="absolute top-1/2 transform -translate-y-1/2 text-sm font-mono font-bold text-white drop-shadow-[0_0_4px_rgba(0,0,0,0.8)] transition-all duration-1000 ease-out"
                                style={{ left: `${Math.max(5, Math.min(90, xpProgress))}%` }}
                              >
                                {Math.round(xpProgress)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Tech corners */}
                      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-primary/80" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-accent/80" />
                    </div>
                  </div>

                  {/* Border Tier Info */}
                  <div className="relative group/bordertier">
                    <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/40 to-orange-500/60 blur-sm animate-pulse"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                         }} />
                    
                    <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-yellow-500/60 backdrop-blur-sm overflow-hidden"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
                         }}>
                      
                      {/* Circuit Pattern */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(245,158,11,0.4)_25%,rgba(245,158,11,0.4)_26%,transparent_27%,transparent_74%,rgba(245,158,11,0.4)_75%,rgba(245,158,11,0.4)_76%,transparent_77%,transparent)] bg-[16px_16px] animate-grid-move-slow" />
                      </div>
                      
                      {/* Header */}
                      <div className="relative z-10 p-6 border-b border-yellow-500/30">
                        <div className="flex items-center gap-3">
                          <Crown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                          <h3 className="text-2xl font-bold text-yellow-400 font-mono tracking-wider">BORDER TIER</h3>
                          <div className="flex-1 h-px bg-gradient-to-r from-yellow-500/50 to-transparent" />
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="relative z-10 p-8">
                        <div className="text-center mb-8">
                          <div className="text-6xl font-bold text-yellow-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)] font-mono mb-3">
                            TIER {getBorderTier(currentLevel)}
                          </div>
                          <div className="text-lg text-yellow-300/80 font-mono tracking-wider mb-6">PROFILE BORDER</div>
                        </div>
                        
                        {/* Tier List */}
                        <div className="space-y-3">
                          <div className={`flex justify-between p-3 rounded border font-mono text-sm ${currentLevel >= 1 && currentLevel <= 9 ? 'bg-slate-700/50 border-slate-500/50 text-slate-300' : 'bg-slate-800/30 border-slate-600/30 text-slate-400'}`}>
                            <span>TIER 1: LEVEL 1-9</span>
                            <span className="text-slate-400">(BASIC)</span>
                          </div>
                          <div className={`flex justify-between p-3 rounded border font-mono text-sm ${currentLevel >= 10 && currentLevel <= 24 ? 'bg-orange-900/50 border-orange-500/50 text-orange-300' : 'bg-slate-800/30 border-slate-600/30 text-slate-400'}`}>
                            <span>TIER 2: LEVEL 10-24</span>
                            <span className="text-orange-400">(BRONZE)</span>
                          </div>
                          <div className={`flex justify-between p-3 rounded border font-mono text-sm ${currentLevel >= 25 && currentLevel <= 49 ? 'bg-slate-600/50 border-slate-400/50 text-slate-200' : 'bg-slate-800/30 border-slate-600/30 text-slate-400'}`}>
                            <span>TIER 3: LEVEL 25-49</span>
                            <span className="text-slate-300">(SILVER)</span>
                          </div>
                          <div className={`flex justify-between p-3 rounded border font-mono text-sm ${currentLevel >= 50 && currentLevel <= 74 ? 'bg-yellow-900/50 border-yellow-500/50 text-yellow-300' : 'bg-slate-800/30 border-slate-600/30 text-slate-400'}`}>
                            <span>TIER 4: LEVEL 50-74</span>
                            <span className="text-yellow-400">(GOLD)</span>
                          </div>
                          <div className={`flex justify-between p-3 rounded border font-mono text-sm ${currentLevel >= 75 && currentLevel <= 99 ? 'bg-purple-900/50 border-purple-500/50 text-purple-300' : 'bg-slate-800/30 border-slate-600/30 text-slate-400'}`}>
                            <span>TIER 5: LEVEL 75-99</span>
                            <span className="text-purple-400">(PLATINUM)</span>
                          </div>
                          <div className={`flex justify-between p-3 rounded border font-mono text-sm ${currentLevel >= 100 ? 'bg-pink-900/50 border-pink-500/50 text-pink-300' : 'bg-slate-800/30 border-slate-600/30 text-slate-400'}`}>
                            <span>TIER 6: LEVEL 100+</span>
                            <span className="text-pink-400">(DIAMOND)</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Tech corners */}
                      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-yellow-400/80" />
                      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-yellow-400/80" />
                    </div>
                  </div>
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
  const { toast } = useToast();
  const [newlyClaimed, setNewlyClaimed] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<any>(null);



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
    if (!isOwnProfile) {
      return;
    }
    
    if (!userId) {
      return;
    }
    
    setClaiming(achievement.id);
    
    try {
      const { data: claimResult, error: claimError } = await supabase.rpc('claim_achievement_manual', {
        p_user_id: userId,
        p_achievement_id: achievement.id
      });

      if (claimError) {
        console.error('❌ Error claiming achievement:', claimError);
        throw claimError;
      }
      
      // Check if the claim was successful
      if (claimResult && claimResult.success) {
        // Success - continue with UI updates
      } else if (claimResult && claimResult.error === 'Achievement already claimed') {
        // Just refresh the data to update the UI
        await fetchData();
        return; // Don't throw error, just return
      } else if (claimResult && claimResult.error) {
        throw new Error(claimResult.error);
      } else {
        throw new Error('Claim was not successful: ' + JSON.stringify(claimResult));
      }

      // Show success notification to user
      const rewardText = achievement.reward_type === 'money' 
        ? `$${achievement.reward_amount}` 
        : achievement.reward_type === 'cases' 
        ? `${achievement.reward_amount} cases` 
        : `${achievement.reward_amount} XP`;

      // Show success toast
      toast({
        title: "🎉 Achievement Claimed!",
        description: `You've claimed "${achievement.name}" and received ${rewardText}!`,
        duration: 5000,
      });

      // Track newly claimed achievement for smooth transition
      setNewlyClaimed(prev => [...prev, achievement.id]);

      // Refresh achievements data to update the UI
      await fetchData();
      
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
      // Re-throw the error so the button handler can catch it
      throw error;
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
    <div className="space-y-8">
      {/* Cyberpunk Achievement Stats */}
      <div className="relative group/achievestats">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 to-accent/60 blur-sm animate-pulse"
             style={{
               clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
             }} />
        
        <div className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-primary/60 backdrop-blur-sm overflow-hidden"
             style={{
               clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))'
             }}>
          
          {/* Circuit Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.4)_25%,rgba(99,102,241,0.4)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.4)_75%,rgba(99,102,241,0.4)_76%,transparent_77%,transparent)] bg-[16px_16px] animate-grid-move-slow" />
          </div>
          
          {/* Header */}
          <div className="relative z-10 p-6 border-b border-primary/30">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              <h3 className="text-2xl font-bold text-primary font-mono tracking-wider">ACHIEVEMENT PROGRESS</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent" />
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="relative z-10 p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary drop-shadow-[0_0_10px_rgba(99,102,241,0.6)] font-mono mb-2">
                  {unlockedAchievements.length}
                </div>
                <div className="text-sm text-primary/80 font-mono tracking-wider">UNLOCKED</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)] font-mono mb-2">
                  {achievements.length}
                </div>
                <div className="text-sm text-slate-300 font-mono tracking-wider">TOTAL</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.6)] font-mono mb-2">
                  {unlockedAchievements.filter(a => a.rarity === 'legendary').length}
                </div>
                <div className="text-sm text-orange-300/80 font-mono tracking-wider">LEGENDARY</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)] font-mono mb-2">
                  ${unlockedAchievements.reduce((sum, a) => sum + (a.reward_amount || 0), 0).toFixed(2)}
                </div>
                <div className="text-sm text-green-300/80 font-mono tracking-wider">EARNED REWARDS</div>
              </div>
            </div>
          </div>
          
          {/* Tech corners */}
          <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-primary/80" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-accent/80" />
        </div>
      </div>

      {/* Cyberpunk Claimable Achievements */}
      {isOwnProfile && claimableAchievements.length > 0 && (
        <div className="relative group/claimable">
          {/* Multi-layered Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 rounded-2xl" />
          
          {/* Circuit Pattern */}
          <div className="absolute inset-0 opacity-[0.15] rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(16,185,129,0.5)_25%,rgba(16,185,129,0.5)_26%,transparent_27%,transparent_74%,rgba(16,185,129,0.5)_75%,rgba(16,185,129,0.5)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(16,185,129,0.5)_25%,rgba(16,185,129,0.5)_26%,transparent_27%,transparent_74%,rgba(16,185,129,0.5)_75%,rgba(16,185,129,0.5)_76%,transparent_77%,transparent)] bg-[20px_20px] animate-grid-move-slow" />
          </div>
          
          {/* Border Glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/30 via-green-500/40 to-emerald-500/30 rounded-2xl blur-sm animate-pulse" />
          
          {/* Tech Corner Details */}
          <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-emerald-400/80 rounded-tl-sm" />
          <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-green-400/80 rounded-tr-sm" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-green-400/80 rounded-bl-sm" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-emerald-400/80 rounded-br-sm" />
          
          <div className="relative z-10 p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <Gift className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
              <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent font-mono tracking-wider">
                READY TO CLAIM ({claimableAchievements.length})
              </h3>
              <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/50 via-green-400/30 to-transparent" />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {claimableAchievements.map((achievement, index) => {
                const IconComponent = getIconComponent(achievement.icon);
                
                return (
                  <div key={achievement.id} className="relative group/claimcard">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/50 to-green-500/70 blur-sm animate-pulse"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                         }} />
                    
                    <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-emerald-500/70 backdrop-blur-sm overflow-hidden group-hover/claimcard:scale-105 transition-all duration-300"
                         style={{
                           clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                         }}>
                      
                      {/* Circuit Pattern */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(16,185,129,0.4)_25%,rgba(16,185,129,0.4)_26%,transparent_27%,transparent_74%,rgba(16,185,129,0.4)_75%,rgba(16,185,129,0.4)_76%,transparent_77%,transparent)] bg-[8px_8px] animate-grid-move-slow" />
                      </div>
                      
                      <div className="relative z-10 p-4 text-center">
                        <div className="mb-3">
                          <div className="w-10 h-10 mx-auto bg-emerald-500/30 border border-emerald-400/50 backdrop-blur-sm flex items-center justify-center animate-pulse"
                               style={{
                                 clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))'
                               }}>
                            <IconComponent className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                          </div>
                        </div>
                        
                        <h3 className="font-bold mb-2 text-emerald-400 text-sm font-mono tracking-wider">{achievement.name}</h3>
                        <p className="text-xs text-emerald-300/80 mb-3 line-clamp-2 font-mono">{achievement.description}</p>
                        
                        <div className="flex justify-between items-center mb-3">
                          <div className={`text-xs px-2 py-1 rounded border font-mono ${difficultyColors[achievement.difficulty]}`}>
                            {achievement.difficulty}
                          </div>
                          <div className={`text-xs px-2 py-1 rounded border font-mono ${rarityColors[achievement.rarity]} bg-white/10`}>
                            {achievement.rarity}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-1 text-emerald-400 font-bold text-sm font-mono">
                            <DollarSign className="w-4 h-4" />
                            <span>+${achievement.reward_amount}</span>
                          </div>
                          
                          <div className="relative overflow-hidden backdrop-blur-sm transition-all duration-300 group/claimBtn"
                               style={{
                                 clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))'
                               }}>
                            
                            {/* Scan Line Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent translate-x-[-100%] group-hover/claimBtn:translate-x-[100%] transition-transform duration-700 ease-out pointer-events-none" />
                            
                            <button
                              onClick={async () => {
                                try {
                                  await claimAchievement(achievement);
                                } catch (error) {
                                  console.error('❌ Failed to claim achievement:', error);
                                  
                                  // Provide specific error message
                                  let errorMessage = 'Failed to claim achievement. Please try again.';
                                  if (error?.message?.includes('Achievement already claimed')) {
                                    errorMessage = 'This achievement has already been claimed.';
                                  } else if (error?.message?.includes('Achievement not unlocked')) {
                                    errorMessage = 'This achievement is not ready to claim yet.';
                                  } else if (error?.message?.includes('not found')) {
                                    errorMessage = 'Achievement not found. Please refresh the page.';
                                  }
                                  
                                  alert(errorMessage);
                                }
                              }}
                              disabled={claiming === achievement.id}
                              className="w-full relative z-10 bg-gradient-to-br from-emerald-600/80 to-green-600/80 hover:from-emerald-500/90 hover:to-green-500/90 text-white border border-emerald-500/60 py-2 px-3 transition-all duration-300 font-mono font-bold tracking-wider text-xs hover:scale-105 active:scale-95 disabled:opacity-60"
                            >
                              {claiming === achievement.id ? (
                                <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                              ) : (
                                'CLAIM REWARD'
                              )}
                            </button>
                            
                            {/* Inner Glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 via-emerald-400/10 to-emerald-400/5 opacity-0 group-hover/claimBtn:opacity-100 transition-opacity duration-300 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Tech corners */}
                      <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-emerald-400/80" />
                      <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-emerald-400/80" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cyberpunk Unlocked Achievements */}
      {unlockedAchievements.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Star className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            <h3 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent font-mono tracking-wider">
              UNLOCKED ACHIEVEMENTS ({unlockedAchievements.length})
            </h3>
            <div className="flex-1 h-px bg-gradient-to-r from-yellow-500/50 via-orange-400/30 to-transparent" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {unlockedAchievements.map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon);
              const unlockDate = getUnlockDate(achievement.id);
              
              return (
                <div key={achievement.id} className="relative group/unlocked">
                  <div className={`absolute -inset-1 blur-sm animate-pulse ${
                    achievement.rarity === 'legendary' ? 'bg-gradient-to-r from-orange-500/50 to-yellow-500/70' :
                    achievement.rarity === 'epic' ? 'bg-gradient-to-r from-purple-500/50 to-purple-600/70' :
                    achievement.rarity === 'rare' ? 'bg-gradient-to-r from-blue-500/50 to-blue-600/70' :
                    'bg-gradient-to-r from-slate-500/30 to-slate-600/50'
                  } ${newlyClaimed.includes(achievement.id) ? 'bg-gradient-to-r from-emerald-500/60 to-green-500/80' : ''}`}
                       style={{
                         clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                       }} />
                  
                  <div className={`relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm overflow-hidden transition-all duration-500 hover:scale-105 ${
                    achievement.rarity === 'legendary' ? 'border border-orange-500/60 shadow-[0_0_15px_rgba(251,146,60,0.3)]' :
                    achievement.rarity === 'epic' ? 'border border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.3)]' :
                    achievement.rarity === 'rare' ? 'border border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.3)]' :
                    'border border-slate-500/60'
                  } ${newlyClaimed.includes(achievement.id) ? 'border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : ''}`}
                       style={{
                         clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                       }}>
                    
                    {/* Circuit Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className={`absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,${
                        achievement.rarity === 'legendary' ? 'rgba(251,146,60,0.4)' :
                        achievement.rarity === 'epic' ? 'rgba(168,85,247,0.4)' :
                        achievement.rarity === 'rare' ? 'rgba(59,130,246,0.4)' :
                        'rgba(100,116,139,0.3)'
                      }_25%,${
                        achievement.rarity === 'legendary' ? 'rgba(251,146,60,0.4)' :
                        achievement.rarity === 'epic' ? 'rgba(168,85,247,0.4)' :
                        achievement.rarity === 'rare' ? 'rgba(59,130,246,0.4)' :
                        'rgba(100,116,139,0.3)'
                      }_26%,transparent_27%,transparent_74%,${
                        achievement.rarity === 'legendary' ? 'rgba(251,146,60,0.4)' :
                        achievement.rarity === 'epic' ? 'rgba(168,85,247,0.4)' :
                        achievement.rarity === 'rare' ? 'rgba(59,130,246,0.4)' :
                        'rgba(100,116,139,0.3)'
                      }_75%,${
                        achievement.rarity === 'legendary' ? 'rgba(251,146,60,0.4)' :
                        achievement.rarity === 'epic' ? 'rgba(168,85,247,0.4)' :
                        achievement.rarity === 'rare' ? 'rgba(59,130,246,0.4)' :
                        'rgba(100,116,139,0.3)'
                      }_76%,transparent_77%,transparent)] bg-[8px_8px] animate-grid-move-slow`} />
                    </div>
                    
                    <div className="relative z-10 p-4 text-center">
                      <div className="mb-3">
                        <div className={`w-10 h-10 mx-auto border backdrop-blur-sm flex items-center justify-center ${
                          achievement.rarity === 'legendary' ? 'bg-orange-500/30 border-orange-400/50' :
                          achievement.rarity === 'epic' ? 'bg-purple-500/30 border-purple-400/50' :
                          achievement.rarity === 'rare' ? 'bg-blue-500/30 border-blue-400/50' :
                          'bg-slate-600/30 border-slate-400/50'
                        }`}
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))'
                             }}>
                          <IconComponent className={`w-5 h-5 ${
                            achievement.rarity === 'legendary' ? 'text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.8)]' :
                            achievement.rarity === 'epic' ? 'text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]' :
                            achievement.rarity === 'rare' ? 'text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.8)]' :
                            'text-slate-300'
                          }`} />
                        </div>
                      </div>
                      
                      <h3 className={`font-bold mb-2 text-sm font-mono tracking-wider ${
                        achievement.rarity === 'legendary' ? 'text-orange-400' :
                        achievement.rarity === 'epic' ? 'text-purple-400' :
                        achievement.rarity === 'rare' ? 'text-blue-400' :
                        'text-slate-300'
                      }`}>
                        {achievement.name}
                      </h3>
                      <p className={`text-xs mb-3 line-clamp-2 font-mono ${
                        achievement.rarity === 'legendary' ? 'text-orange-300/80' :
                        achievement.rarity === 'epic' ? 'text-purple-300/80' :
                        achievement.rarity === 'rare' ? 'text-blue-300/80' :
                        'text-slate-400'
                      }`}>
                        {achievement.description}
                      </p>
                      
                      <div className="flex justify-between items-center mb-3">
                        <div className={`text-xs px-2 py-1 rounded border font-mono ${difficultyColors[achievement.difficulty]}`}>
                          {achievement.difficulty}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded border font-mono ${rarityColors[achievement.rarity]} bg-white/10`}>
                          {achievement.rarity}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-1 text-green-400 font-bold text-sm font-mono">
                          <DollarSign className="w-4 h-4" />
                          <span>+${achievement.reward_amount}</span>
                        </div>
                        {unlockDate && (
                          <div className="text-xs text-slate-400 font-mono">
                            UNLOCKED: {new Date(unlockDate).toLocaleDateString()}
                          </div>
                        )}
                        {newlyClaimed.includes(achievement.id) && (
                          <div className="text-xs text-emerald-400 font-bold font-mono animate-pulse">
                            JUST CLAIMED!
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Tech corners */}
                    <div className={`absolute top-1 left-1 w-2 h-2 border-l border-t ${
                      achievement.rarity === 'legendary' ? 'border-orange-400/80' :
                      achievement.rarity === 'epic' ? 'border-purple-400/80' :
                      achievement.rarity === 'rare' ? 'border-blue-400/80' :
                      'border-slate-400/60'
                    }`} />
                    <div className={`absolute bottom-1 right-1 w-2 h-2 border-r border-b ${
                      achievement.rarity === 'legendary' ? 'border-orange-400/80' :
                      achievement.rarity === 'epic' ? 'border-purple-400/80' :
                      achievement.rarity === 'rare' ? 'border-blue-400/80' :
                      'border-slate-400/60'
                    }`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cyberpunk Locked Achievements (Only for Own Profile) */}
      {isOwnProfile && lockedAchievements.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-slate-400 drop-shadow-[0_0_8px_rgba(100,116,139,0.6)]" />
            <h3 className="text-xl font-bold bg-gradient-to-r from-slate-400 to-slate-300 bg-clip-text text-transparent font-mono tracking-wider">
              LOCKED ACHIEVEMENTS ({lockedAchievements.length})
            </h3>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-500/50 via-slate-400/30 to-transparent" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {lockedAchievements.map((achievement) => {
              const IconComponent = getIconComponent(achievement.icon);
              const progress = calculateProgress(achievement);
              const isNearlyComplete = progress >= 75;
              
              return (
                <div key={achievement.id} className="relative group/locked">
                  <div className={`absolute -inset-1 blur-sm ${
                    isNearlyComplete 
                      ? 'bg-gradient-to-r from-yellow-500/40 to-orange-500/60 animate-pulse' 
                      : 'bg-gradient-to-r from-slate-600/20 to-slate-700/30'
                  }`}
                       style={{
                         clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                       }} />
                  
                  <div className={`relative bg-gradient-to-br from-slate-800/60 to-slate-900/70 backdrop-blur-sm overflow-hidden transition-all duration-300 ${
                    isNearlyComplete 
                      ? 'border border-yellow-500/40 hover:scale-105 opacity-80 hover:opacity-100' 
                      : 'border border-slate-600/30 opacity-50 hover:opacity-70'
                  }`}
                       style={{
                         clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
                       }}>
                    
                    {/* Circuit Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className={`absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,${
                        isNearlyComplete ? 'rgba(245,158,11,0.4)' : 'rgba(100,116,139,0.3)'
                      }_25%,${
                        isNearlyComplete ? 'rgba(245,158,11,0.4)' : 'rgba(100,116,139,0.3)'
                      }_26%,transparent_27%,transparent_74%,${
                        isNearlyComplete ? 'rgba(245,158,11,0.4)' : 'rgba(100,116,139,0.3)'
                      }_75%,${
                        isNearlyComplete ? 'rgba(245,158,11,0.4)' : 'rgba(100,116,139,0.3)'
                      }_76%,transparent_77%,transparent)] bg-[8px_8px] animate-grid-move-slow`} />
                    </div>
                    
                    <div className="relative z-10 p-4 text-center">
                      <div className="mb-3">
                        <div className={`w-10 h-10 mx-auto border backdrop-blur-sm flex items-center justify-center ${
                          isNearlyComplete 
                            ? 'bg-yellow-500/20 border-yellow-400/40' 
                            : 'bg-slate-700/30 border-slate-500/40'
                        }`}
                             style={{
                               clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))'
                             }}>
                          <IconComponent className={`w-5 h-5 ${
                            isNearlyComplete ? 'text-yellow-400' : 'text-slate-400'
                          }`} />
                        </div>
                      </div>
                      
                      <h3 className={`font-bold mb-2 text-sm font-mono tracking-wider ${
                        isNearlyComplete ? 'text-yellow-300' : 'text-slate-300'
                      }`}>
                        {achievement.name}
                      </h3>
                      <p className={`text-xs mb-3 line-clamp-2 font-mono ${
                        isNearlyComplete ? 'text-yellow-300/70' : 'text-slate-400'
                      }`}>
                        {achievement.description}
                      </p>
                      
                      <div className="flex justify-between items-center mb-3">
                        <div className={`text-xs px-2 py-1 rounded border font-mono opacity-70 ${difficultyColors[achievement.difficulty]}`}>
                          {achievement.difficulty}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded border font-mono opacity-70 ${rarityColors[achievement.rarity]} bg-slate-700/30`}>
                          {achievement.rarity}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-1 text-green-400/60 font-bold text-sm font-mono">
                          <DollarSign className="w-4 h-4" />
                          <span>+${achievement.reward_amount}</span>
                        </div>
                        
                        {/* Cyberpunk Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-mono">
                            <span className={isNearlyComplete ? 'text-yellow-400' : 'text-slate-400'}>PROGRESS</span>
                            <span className={progress >= 100 ? 'text-green-400' : isNearlyComplete ? 'text-yellow-400' : 'text-slate-400'}>
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                          
                          <div className="relative">
                            <div className={`h-3 border backdrop-blur-sm overflow-hidden ${
                              isNearlyComplete 
                                ? 'bg-yellow-900/30 border-yellow-500/30' 
                                : 'bg-slate-800/40 border-slate-600/30'
                            }`}
                                 style={{
                                   clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))'
                                 }}>
                              
                              {/* Progress Fill */}
                              <div 
                                className={`h-full relative transition-all duration-1000 ease-out ${
                                  progress >= 100 
                                    ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-500' 
                                    : isNearlyComplete 
                                    ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500' 
                                    : 'bg-gradient-to-r from-slate-500 via-slate-400 to-slate-500'
                                }`}
                                style={{ width: `${Math.min(100, progress)}%` }}
                              >
                                {/* Animated Glow */}
                                <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/5 to-white/20 animate-pulse" />
                                
                                {/* Moving Scan Line */}
                                {progress > 0 && (
                                  <div className="absolute top-0 right-0 w-0.5 h-full bg-white/60 shadow-[0_0_4px_rgba(255,255,255,0.6)] animate-pulse" />
                                )}
                              </div>
                              
                              {/* Grid Pattern Overlay */}
                              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_50%,rgba(255,255,255,0.1)_51%,rgba(255,255,255,0.1)_52%,transparent_53%)] bg-[4px_4px] opacity-30" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Tech corners */}
                    <div className={`absolute top-1 left-1 w-2 h-2 border-l border-t ${
                      isNearlyComplete ? 'border-yellow-400/60' : 'border-slate-500/40'
                    }`} />
                    <div className={`absolute bottom-1 right-1 w-2 h-2 border-r border-b ${
                      isNearlyComplete ? 'border-yellow-400/60' : 'border-slate-500/40'
                    }`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cyberpunk Empty States */}
      {unlockedAchievements.length === 0 && !isOwnProfile && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-slate-800/30 rounded-2xl" />
          <div className="absolute inset-0 opacity-[0.08] rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(100,116,139,0.4)_25%,rgba(100,116,139,0.4)_26%,transparent_27%,transparent_74%,rgba(100,116,139,0.4)_75%,rgba(100,116,139,0.4)_76%,transparent_77%,transparent)] bg-[20px_20px] animate-grid-move-slow" />
          </div>
          
          <div className="relative z-10 text-center py-16 px-8">
            <Trophy className="w-20 h-20 mx-auto mb-6 text-slate-400 opacity-50 drop-shadow-[0_0_10px_rgba(100,116,139,0.3)]" />
            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-slate-400 to-slate-300 bg-clip-text text-transparent font-mono tracking-wider">
              NO ACHIEVEMENTS YET
            </h3>
            <p className="text-slate-400 font-mono">This player hasn't unlocked any achievements yet.</p>
          </div>
        </div>
      )}

      {unlockedAchievements.length === 0 && isOwnProfile && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-slate-800/30 rounded-2xl" />
          <div className="absolute inset-0 opacity-[0.08] rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.4)_25%,rgba(99,102,241,0.4)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.4)_75%,rgba(99,102,241,0.4)_76%,transparent_77%,transparent)] bg-[20px_20px] animate-grid-move-slow" />
          </div>
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-2xl blur-sm animate-pulse" />
          
          <div className="relative z-10 text-center py-16 px-8">
            <Trophy className="w-20 h-20 mx-auto mb-6 text-primary drop-shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-pulse" />
            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-mono tracking-wider">
              START YOUR JOURNEY!
            </h3>
            <p className="text-primary/80 font-mono">Play games to unlock your first achievements and earn rewards!</p>
          </div>
        </div>
      )}
    </div>
  );
}
