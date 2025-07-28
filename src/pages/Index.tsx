
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Wallet, Gamepad2, LogOut, TrendingUp, Target, Building, Gift, LogIn, Bell, BellDot, Shield, Star, Award, Megaphone, Clock, Sparkles, Zap, Users, DollarSign, AlertTriangle, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import AuthModal from '@/components/AuthModal';
import UserProfile from '@/components/UserProfile';
import AdminPanel from '@/components/AdminPanel';

import CoinflipGame from '@/components/CoinflipGame';
import { RealtimeChat } from '@/components/RealtimeChat';
import { RouletteGame } from '@/components/RouletteGame';
import { Footer } from '@/components/Footer';
import { TowerGame } from '@/components/TowerGame';
import { UserLevelDisplay } from '@/components/UserLevelDisplay';
import { LiveLevelUpNotification } from '@/components/LiveLevelUpNotification';
import { ProfileBorder } from '@/components/ProfileBorder';
import { useLevelSync } from '@/contexts/LevelSyncContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBalanceAnimation } from '@/hooks/useBalanceAnimation';
import { FloatingBalanceIncrease } from '@/components/FloatingBalanceIncrease';
import { AnimatedBalance } from '@/components/AnimatedBalance';
import { MaintenanceAwareGame } from '@/components/MaintenanceAwareGame';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  user_id: string;
  type: 'tip_sent' | 'tip_received' | 'achievement_unlocked' | 'level_up' | 'level_reward_case' | 'admin_broadcast';
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

interface IndexProps {
  initialGame?: string;
}

export default function Index({ initialGame }: IndexProps) {
  const { user, signOut, loading: authLoading } = useAuth();
  const { userData, loading: profileLoading, updateUserProfile } = useUserProfile();
  const { toast } = useToast();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [hoveredNotification, setHoveredNotification] = useState<string | null>(null);
  const [newNotificationIds, setNewNotificationIds] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine current game from URL
  const getCurrentGame = () => {
    const path = location.pathname;
    if (path === '/roulette') return 'roulette';
    if (path === '/coinflip') return 'coinflip';
    if (path === '/tower') return 'tower';
    return initialGame || 'coinflip';
  };

  const [currentGame, setCurrentGame] = useState(getCurrentGame());
  const { increases, checkBalanceChange } = useBalanceAnimation();

  // Notification theme helper
  const getNotificationTheme = (type: string) => {
    switch (type) {
      case 'tip_received':
        return {
          gradient: 'from-green-400/20 via-emerald-500/15 to-green-600/10',
          border: 'border-green-400/40',
          glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]',
          icon: 'text-green-400',
          accent: 'bg-green-400/20',
          emoji: '💰',
          iconComponent: <DollarSign className="w-5 h-5" />
        };
      case 'tip_sent':
        return {
          gradient: 'from-blue-400/20 via-cyan-500/15 to-blue-600/10',
          border: 'border-blue-400/40',
          glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
          icon: 'text-blue-400',
          accent: 'bg-blue-400/20',
          emoji: '📤',
          iconComponent: <TrendingUp className="w-5 h-5" />
        };
      case 'achievement_unlocked':
        return {
          gradient: 'from-purple-400/20 via-pink-500/15 to-purple-600/10',
          border: 'border-purple-400/40',
          glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
          icon: 'text-purple-400',
          accent: 'bg-purple-400/20',
          emoji: '🏆',
          iconComponent: <Award className="w-5 h-5" />
        };
      case 'level_up':
        return {
          gradient: 'from-yellow-400/20 via-orange-500/15 to-yellow-600/10',
          border: 'border-yellow-400/40',
          glow: 'shadow-[0_0_20px_rgba(251,191,36,0.3)]',
          icon: 'text-yellow-400',
          accent: 'bg-yellow-400/20',
          emoji: '⭐',
          iconComponent: <Star className="w-5 h-5" />
        };
      case 'level_reward_case':
        return {
          gradient: 'from-orange-400/20 via-red-500/15 to-orange-600/10',
          border: 'border-orange-400/40',
          glow: 'shadow-[0_0_20px_rgba(251,146,60,0.3)]',
          icon: 'text-orange-400',
          accent: 'bg-orange-400/20',
          emoji: '🎁',
          iconComponent: <Gift className="w-5 h-5" />
        };
      case 'admin_broadcast':
        return {
          gradient: 'from-red-400/20 via-rose-500/15 to-red-600/10',
          border: 'border-red-400/40',
          glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
          icon: 'text-red-400',
          accent: 'bg-red-400/20',
          emoji: '📢',
          iconComponent: <AlertTriangle className="w-5 h-5" />
        };
      default:
        return {
          gradient: 'from-gray-400/20 via-slate-500/15 to-gray-600/10',
          border: 'border-gray-400/40',
          glow: 'shadow-[0_0_20px_rgba(107,114,128,0.3)]',
          icon: 'text-gray-400',
          accent: 'bg-gray-400/20',
          emoji: '🔔',
          iconComponent: <Bell className="w-5 h-5" />
        };
    }
  };

  // Notification functions
  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications((data || []) as Notification[]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      
      toast({
        title: "✅ All notifications marked as read",
        description: "Your notification center is now clear",
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      toast({
        title: "🗑️ Notification deleted",
        description: "Notification has been removed",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Fetch notifications on mount and set up real-time subscription
  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Set up real-time subscription for new notifications
      const channel = supabase
        .channel(`notifications_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newNotification = payload.new as Notification;
              console.log('🔔 REAL-TIME NOTIFICATION RECEIVED:', newNotification);
              
              // Prevent duplicates with better logic
              setNotifications(prev => {
                const exists = prev.some(n => n.id === newNotification.id);
                if (exists) {
                  console.log('🚫 Duplicate notification prevented');
                  return prev;
                }
                
                console.log('✅ Adding new notification to UI with animation');
                return [newNotification, ...prev];
              });
              
              // Mark as new for animation
              setNewNotificationIds(prev => new Set([...prev, newNotification.id]));
              
              // Remove new status after animation
              setTimeout(() => {
                setNewNotificationIds(prev => {
                  const next = new Set(prev);
                  next.delete(newNotification.id);
                  return next;
                });
              }, 3000);

              // Enhanced toast notification
              toast({
                title: `🔔 ${newNotification.title}`,
                description: newNotification.message,
                duration: 5000,
              });
            }
          }
        )
        .subscribe((status) => {
          console.log('🔔 Notifications subscription status:', status);
          setIsConnected(status === 'SUBSCRIBED');
          if (status === 'SUBSCRIBED') {
            console.log('✅ Enhanced notifications subscription active for user:', user.id);
          }
        });

      return () => {
        console.log('🔔 Cleaning up notifications subscription');
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // Update current game when URL changes
  useEffect(() => {
    setCurrentGame(getCurrentGame());
  }, [location.pathname, initialGame]);

  // Monitor balance changes for animation
  useEffect(() => {
    if (userData?.balance !== undefined) {
      checkBalanceChange(userData.balance);
    }
  }, [userData?.balance, checkBalanceChange]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleGameChange = (game: string) => {
    setCurrentGame(game);
    // Update URL without page reload
    if (game === 'coinflip' && location.pathname !== '/coinflip') {
      navigate('/coinflip', { replace: true });
    } else if (game === 'roulette' && location.pathname !== '/roulette') {
      navigate('/roulette', { replace: true });
    } else if (game === 'tower' && location.pathname !== '/tower') {
      navigate('/tower', { replace: true });
    } else if (game === 'coinflip' && location.pathname === '/') {
      navigate('/coinflip', { replace: true });
    }
  };

  const { levelStats } = useLevelSync();

  const getXpForNextLevel = (level: number) => level * 100;
  const xpProgress = levelStats ? (levelStats.current_level_xp / (levelStats.current_level_xp + levelStats.xp_to_next_level)) * 100 : 0;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass p-8 rounded-2xl text-center">
          <div className="text-2xl mb-4">🎮</div>
          <p className="text-muted-foreground">Loading ArcadeFinance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Main Content Container */}
      <div className="p-4 pb-32">
        {/* Header */}
        <header className="mb-6">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
                ArcadeFinance
              </h1>
              <div className="hidden md:block text-sm text-muted-foreground">
                The Future of Digital Gaming
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Enhanced Cyberpunk Notification Button - Only show for authenticated users */}
              {user && (
                <Dialog open={notificationModalOpen} onOpenChange={setNotificationModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "relative px-3 py-1 glass rounded-lg transition-all duration-300",
                        isConnected && unreadCount > 0 && "animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                      )}
                    >
                      {unreadCount > 0 ? (
                        <BellDot className="w-4 h-4 text-primary" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] animate-bounce">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                      {/* Connection indicator */}
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-slate-900 transition-all",
                        isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
                      )} />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass border-0 max-w-2xl bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl">
                    {/* Animated background effects */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-60 rounded-lg" />
                    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-radial from-primary/20 to-transparent blur-3xl animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-radial from-accent/20 to-transparent blur-2xl animate-pulse delay-1000" />
                    
                    {/* Scanning line effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-1 animate-pulse-scan rounded-lg" />
                    
                    <DialogHeader className="relative z-10 pb-4">
                      <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className={cn(
                              "w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center",
                              "border border-primary/30 backdrop-blur-sm transition-all duration-300",
                              isConnected ? "animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.4)]" : "opacity-60"
                            )}>
                              <Bell className="w-6 h-6 text-primary" />
                              {unreadCount > 0 && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-bounce">
                                  <span className="text-xs font-bold text-white">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                  </span>
                                </div>
                              )}
                            </div>
                            {/* Connection indicator */}
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 transition-all",
                              isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
                            )} />
                          </div>
                          
                          <div>
                            <h3 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                              Notifications
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {isConnected ? '🟢 Live updates active' : '🔴 Connecting...'}
                            </p>
                          </div>
                          
                          {unreadCount > 0 && (
                            <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 animate-pulse px-3 py-1 rounded-full text-xs font-bold">
                              {unreadCount > 99 ? '99+' : unreadCount} new
                            </div>
                          )}
                        </div>
                        
                        {unreadCount > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={markAllNotificationsAsRead}
                            className="glass border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Clear all
                          </Button>
                        )}
                      </DialogTitle>
                    </DialogHeader>
                    
                    <ScrollArea className="h-[500px] relative z-10">
                      {notifications.length === 0 ? (
                        <div className="text-center py-16 px-6">
                          <div className="relative mb-6">
                            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/30">
                              <Bell className="w-10 h-10 text-primary/60" />
                            </div>
                            <div className="absolute top-0 right-1/2 transform translate-x-8 -translate-y-2">
                              <Sparkles className="w-6 h-6 text-accent animate-pulse" />
                            </div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-8 translate-y-2">
                              <Zap className="w-4 h-4 text-primary animate-pulse delay-500" />
                            </div>
                          </div>
                          
                          <h4 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-3">
                            All Clear! 🎉
                          </h4>
                          <p className="text-muted-foreground text-lg mb-2">No new notifications</p>
                          <p className="text-sm text-muted-foreground/75">
                            You're all caught up with the latest updates
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 p-4">
                          {notifications.map((notification) => {
                            const theme = getNotificationTheme(notification.type);
                            const isNew = newNotificationIds.has(notification.id);
                            
                            return (
                              <div
                                key={notification.id}
                                className={cn(
                                  "group relative p-4 rounded-2xl border-2 backdrop-blur-md transition-all duration-500 cursor-pointer",
                                  "bg-gradient-to-br", theme.gradient,
                                  notification.is_read ? theme.border.replace('/40', '/20') : theme.border,
                                  !notification.is_read && theme.glow,
                                  "hover:scale-[1.02] hover:shadow-2xl",
                                  isNew && "animate-slide-in-cyber ring-2 ring-primary/50 ring-offset-2 ring-offset-slate-900",
                                  hoveredNotification === notification.id && "scale-[1.02] shadow-2xl"
                                )}
                                onMouseEnter={() => setHoveredNotification(notification.id)}
                                onMouseLeave={() => setHoveredNotification(null)}
                                onClick={() => !notification.is_read && markNotificationAsRead(notification.id)}
                              >
                                {/* Cyberpunk corner accents */}
                                <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-primary/60 rounded-tl-2xl" />
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-accent/60 rounded-br-2xl" />
                                
                                {/* New notification pulse effect */}
                                {isNew && (
                                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl animate-pulse-wave" />
                                )}
                                
                                {/* Shine effect for unread */}
                                {!notification.is_read && (
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-shine" />
                                )}
                                
                                <div className="flex items-start gap-4 relative z-10">
                                  {/* Enhanced icon with cyberpunk styling */}
                                  <div className={cn(
                                    "flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 relative",
                                    "bg-gradient-to-br", theme.accent, "border border-current/30",
                                    notification.is_read ? "opacity-60" : "animate-pulse-icon",
                                    theme.icon
                                  )}>
                                    {theme.iconComponent}
                                    
                                    {/* Type emoji overlay */}
                                    <div className="absolute -top-1 -right-1 text-xs">
                                      {theme.emoji}
                                    </div>
                                  </div>
                                  
                                  <div className="flex-1 min-w-0 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <h4 className={cn(
                                        "font-bold text-base leading-tight transition-colors",
                                        notification.is_read 
                                          ? "text-muted-foreground" 
                                          : "text-white bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent"
                                      )}>
                                        {notification.title}
                                      </h4>
                                      
                                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!notification.is_read && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              markNotificationAsRead(notification.id);
                                            }}
                                            className="h-8 w-8 p-0 glass hover:bg-green-500/20 hover:text-green-400 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                                          >
                                            <Check className="w-4 h-4" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNotification(notification.id);
                                          }}
                                          className="h-8 w-8 p-0 glass hover:bg-red-500/20 hover:text-red-400 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                    
                                    <p className={cn(
                                      "text-sm leading-relaxed",
                                      notification.is_read ? "text-muted-foreground/75" : "text-gray-300"
                                    )}>
                                      {notification.message}
                                    </p>
                                    
                                    {/* Enhanced tip message display */}
                                    {notification.data?.tip_message && (
                                      <div className="relative p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border-l-4 border-primary/50 backdrop-blur-sm">
                                        <div className="absolute top-1 right-1 text-primary/40">💬</div>
                                        <p className="text-sm italic text-primary/90 font-medium pr-6">
                                          "{notification.data.tip_message}"
                                        </p>
                                      </div>
                                    )}
                                    
                                    {/* Enhanced timestamp with cyberpunk styling */}
                                    <div className="flex items-center gap-2 pt-2">
                                      <div className="w-1 h-1 bg-accent rounded-full animate-pulse" />
                                      <Clock className="w-3 h-3 text-accent/60" />
                                      <p className="text-xs text-muted-foreground/75 font-mono">
                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                      </p>
                                      <div className="flex-1 h-px bg-gradient-to-r from-accent/20 to-transparent" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                    
                    {/* Floating particles for added effect */}
                    {unreadCount > 0 && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-1 h-1 bg-primary/60 rounded-full animate-float-particle"
                            style={{
                              left: `${Math.random() * 100}%`,
                              top: `${Math.random() * 100}%`,
                              animationDelay: `${Math.random() * 3}s`,
                              animationDuration: `${4 + Math.random() * 2}s`
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              )}

              {/* Balance Display - Only show for authenticated users */}
              {user && userData && (
                <div className="relative flex items-center space-x-2 glass px-3 py-1 rounded-lg">
                  <Wallet className="w-4 h-4 text-primary" />
                  <AnimatedBalance
                    balance={userData.balance}
                    className="font-semibold"
                  />
                  <FloatingBalanceIncrease increases={increases} />
                </div>
              )}

              {/* Rewards Button - Only show for authenticated users */}
              {user && (
                <Button
                  variant="ghost"
                  onClick={() => navigate('/rewards')}
                  className="glass border-0 hover:glow-primary transition-smooth"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Rewards
                </Button>
              )}

              {/* Admin Panel Button - Only show for authenticated users */}
              {user && (
                <Button
                  variant="ghost"
                  onClick={() => setShowAdminPanel(true)}
                  className="glass border-0 hover:glow-primary transition-smooth"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}

              {/* Enhanced Level Display - Only show for authenticated users */}
              {user && userData && (
                <>
                  {/* Desktop Version */}
                  <UserLevelDisplay 
                    username={userData.username}
                    showXP={true}
                    size="md"
                    className="hidden md:flex"
                    clickable={true}
                    onClick={() => setShowProfile(true)}
                  />
                  
                  {/* Mobile Version */}
                  <div 
                    className="flex md:hidden items-center gap-2 cursor-pointer hover:bg-primary/10 rounded-lg p-2 -m-2 transition-all duration-200 hover:scale-[1.02]"
                    onClick={() => setShowProfile(true)}
                  >
                    <div className="relative">
                      <ProfileBorder level={levelStats?.current_level || 1} size="sm">
                        <div className="w-8 h-8 rounded-full overflow-hidden relative">
                          <img 
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`}
                            alt={`${userData.username} avatar`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
                            <span className="text-white text-xs font-bold block text-center leading-none">
                              {(levelStats?.current_level || 1) >= 100 ? '👑' : (levelStats?.current_level || 1)}
                            </span>
                          </div>
                        </div>
                      </ProfileBorder>
                    </div>
                    <span className="font-semibold text-sm">{userData.username}</span>
                  </div>
                </>
              )}

              {/* User Menu or Sign In Button */}
              {user && userData ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="glass border-0 hover:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => setShowAuthModal(true)}
                  className="glass border-0 hover:glow-primary transition-smooth"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>

          {/* XP Progress Bar - Only show for authenticated users */}
          {user && levelStats && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Level {levelStats.current_level} Progress</span>
                <span>{levelStats.current_level_xp} / {levelStats.current_level_xp + levelStats.xp_to_next_level} XP</span>
              </div>
              <Progress value={xpProgress} className="h-2" />
            </div>
          )}

          {/* Guest Notice */}
          {!user && (
            <div className="mt-3 p-3 glass rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                🎮 Browsing as Guest - <span 
                  className="text-primary cursor-pointer hover:underline"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign in
                </span> to play games and earn rewards!
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 pb-8">
        {/* Left Sidebar - Games Navigation */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="glass border-0 bg-gradient-to-br from-card/50 to-card/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
                  <Gamepad2 className="w-4 h-4 text-primary" />
                </div>
                Games
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={() => handleGameChange('coinflip')}
                variant={currentGame === 'coinflip' ? 'default' : 'ghost'}
                className={`w-full justify-start px-3 py-2 h-10 transition-all duration-200 hover:scale-[1.02] ${
                  currentGame === 'coinflip' 
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl' 
                    : 'hover:bg-primary/10 hover:text-primary border-0'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${
                    currentGame === 'coinflip' 
                      ? 'bg-white/20' 
                      : 'bg-primary/10'
                  }`}>
                    <Gamepad2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-sm">Coinflip</span>
                </div>
              </Button>
              
              <Button
                onClick={() => handleGameChange('roulette')}
                variant={currentGame === 'roulette' ? 'default' : 'ghost'}
                className={`w-full justify-start px-3 py-2 h-10 transition-all duration-200 hover:scale-[1.02] ${
                  currentGame === 'roulette' 
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl' 
                    : 'hover:bg-primary/10 hover:text-primary border-0'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${
                    currentGame === 'roulette' 
                      ? 'bg-white/20' 
                      : 'bg-primary/10'
                  }`}>
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-sm">Roulette</span>
                </div>
              </Button>
              
              <Button
                onClick={() => handleGameChange('tower')}
                variant={currentGame === 'tower' ? 'default' : 'ghost'}
                className={`w-full justify-start px-3 py-2 h-10 transition-all duration-200 hover:scale-[1.02] ${
                  currentGame === 'tower' 
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl' 
                    : 'hover:bg-primary/10 hover:text-primary border-0'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${
                    currentGame === 'tower' 
                      ? 'bg-white/20' 
                      : 'bg-primary/10'
                  }`}>
                    <Building className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-sm">Tower</span>
                </div>
              </Button>
              
              <Button
                disabled
                variant="ghost"
                className="w-full justify-start px-3 py-2 h-10 opacity-50 cursor-not-allowed hover:bg-muted/10 border-0"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-muted/20">
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm text-muted-foreground">Crash</div>
                    <div className="text-xs text-muted-foreground/70 leading-tight">Coming Soon</div>
                  </div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Games Area */}
        <div className="lg:col-span-7">
          <div className="space-y-4">
            <div style={{ display: currentGame === 'coinflip' ? 'block' : 'none' }}>
              <MaintenanceAwareGame gameName="Coinflip">
                {user && userData ? (
                  <CoinflipGame userData={userData} onUpdateUser={updateUserProfile} />
                ) : (
                  <CoinflipGame userData={null} onUpdateUser={() => Promise.resolve()} />
                )}
              </MaintenanceAwareGame>
            </div>

            <div style={{ display: currentGame === 'roulette' ? 'block' : 'none' }}>
              <MaintenanceAwareGame gameName="Roulette">
                {user && userData ? (
                  <RouletteGame userData={userData} onUpdateUser={updateUserProfile} />
                ) : (
                  <RouletteGame userData={null} onUpdateUser={() => Promise.resolve()} />
                )}
              </MaintenanceAwareGame>
            </div>

            <div style={{ display: currentGame === 'tower' ? 'block' : 'none' }}>
              <MaintenanceAwareGame gameName="Tower">
                {user && userData ? (
                  <TowerGame userData={userData} onUpdateUser={updateUserProfile} />
                ) : (
                  <TowerGame userData={null} onUpdateUser={() => Promise.resolve()} />
                )}
              </MaintenanceAwareGame>
            </div>

            <div style={{ display: currentGame === 'crash' ? 'block' : 'none' }}>
              <MaintenanceAwareGame gameName="Crash">
                <Card className="glass border-0 p-12 text-center">
                  <div className="space-y-4">
                    <div className="text-4xl">🚀</div>
                    <h3 className="text-xl font-semibold">Crash Game Coming Soon!</h3>
                    <p className="text-muted-foreground">
                      We're working on an exciting crash game with live multipliers and real-time action.
                    </p>
                  </div>
                </Card>
              </MaintenanceAwareGame>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Real-time Chat */}
        <div className="lg:col-span-2 h-[calc(100vh-16rem)]">
          <RealtimeChat />
        </div>
      </div>

      {/* Profile Modal - Only show for authenticated users */}
      {user && (
        <UserProfile
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          userData={userData}
          onUserDataUpdate={updateUserProfile}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Admin Panel Modal */}
      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />

        {/* Live Level-Up Notifications - Only show for authenticated users */}
        {user && <LiveLevelUpNotification />}
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
