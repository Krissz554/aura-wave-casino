
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
import { cn } from '@/lib/utils';

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
              {/* Cyberpunk Notification System - Only show for authenticated users */}
              {user && (
                <Dialog open={notificationModalOpen} onOpenChange={setNotificationModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "relative px-3 py-2 overflow-hidden group",
                        "bg-gradient-to-r from-slate-900/80 to-slate-800/60 backdrop-blur-md",
                        "border border-primary/20 rounded-xl transition-all duration-500",
                        "hover:border-primary/50 hover:shadow-[0_0_25px_rgba(99,102,241,0.4)]",
                        unreadCount > 0 && "animate-cyber-pulse"
                      )}
                    >
                      {/* Animated background grid */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent)] bg-[12px_12px] animate-grid-move" />
                      </div>
                      
                      {/* Icon with advanced animations */}
                      <div className="relative z-10 flex items-center gap-2">
                        <div className="relative">
                          {unreadCount > 0 ? (
                            <BellDot className="w-5 h-5 transition-all duration-300 text-primary drop-shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-cyber-glow" />
                          ) : (
                            <Bell className="w-5 h-5 text-slate-400 group-hover:text-primary transition-all duration-300" />
                          )}
                          
                          {/* Notification counter with enhanced design */}
                          {unreadCount > 0 && (
                            <div className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center">
                              <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-pink-500 to-red-600 rounded-full animate-cyber-pulse" />
                              <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-400 rounded-full animate-ping opacity-40" />
                              <span className="relative text-[10px] font-bold text-white z-10">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            </div>
                          )}
                        </div>
                        

                      </div>
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent className={cn(
                    "max-w-4xl w-[95vw] h-[85vh] p-0 border-0 bg-transparent",
                    "data-[state=open]:animate-cyber-modal-in",
                    "data-[state=closed]:animate-cyber-modal-out"
                  )}>
                    {/* Main cyberpunk container */}
                    <div className="relative w-full h-full overflow-hidden">
                      {/* Animated background with multiple layers */}
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 backdrop-blur-2xl" />
                      
                      {/* Circuit board pattern */}
                      <div className="absolute inset-0 opacity-[0.15]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.3)_1px,transparent_0)] bg-[12px_12px] animate-grid-move" />
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent)] bg-[24px_24px]" />
                      </div>
                      
                      {/* Animated corner elements */}
                      <div className="absolute top-0 left-0 w-32 h-32">
                        <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-primary/60 animate-cyber-corner" />
                        <div className="absolute top-2 left-2 w-3 h-3 border-l border-t border-accent/40 animate-cyber-corner delay-150" />
                      </div>
                      <div className="absolute top-0 right-0 w-32 h-32">
                        <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-primary/60 animate-cyber-corner" />
                        <div className="absolute top-2 right-2 w-3 h-3 border-r border-t border-accent/40 animate-cyber-corner delay-150" />
                      </div>
                      <div className="absolute bottom-0 left-0 w-32 h-32">
                        <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-primary/60 animate-cyber-corner" />
                        <div className="absolute bottom-2 left-2 w-3 h-3 border-l border-b border-accent/40 animate-cyber-corner delay-150" />
                      </div>
                      <div className="absolute bottom-0 right-0 w-32 h-32">
                        <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-primary/60 animate-cyber-corner" />
                        <div className="absolute bottom-2 right-2 w-3 h-3 border-r border-b border-accent/40 animate-cyber-corner delay-150" />
                      </div>
                      
                      {/* Dynamic energy flows */}
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/30 to-transparent animate-energy-flow" />
                        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-accent/30 to-transparent animate-energy-flow delay-1000" />
                        <div className="absolute left-0 top-1/4 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-energy-flow-horizontal" />
                        <div className="absolute left-0 bottom-1/3 w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent animate-energy-flow-horizontal delay-1500" />
                      </div>
                      
                      {/* Floating orbs */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "absolute w-2 h-2 rounded-full",
                              i % 2 === 0 ? "bg-primary/30" : "bg-accent/30",
                              "animate-float-orb"
                            )}
                            style={{
                              left: `${Math.random() * 100}%`,
                              top: `${Math.random() * 100}%`,
                              animationDelay: `${Math.random() * 5}s`,
                              animationDuration: `${8 + Math.random() * 4}s`
                            }}
                          />
                        ))}
                      </div>
                      
                      {/* Main content area */}
                      <div className="relative z-10 h-full flex flex-col">
                        {/* Header section with enhanced design */}
                        <div className="p-6 border-b border-primary/20 bg-gradient-to-r from-slate-900/40 to-slate-800/40 backdrop-blur-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                              {/* Advanced status indicator */}
                              <div className="relative">
                                <div className={cn(
                                  "w-16 h-16 rounded-2xl flex items-center justify-center relative overflow-hidden",
                                  "bg-gradient-to-br from-slate-800/80 to-slate-900/80",
                                  "border-2 border-primary/30 backdrop-blur-sm animate-cyber-container"
                                )}>
                                  {/* Inner circuit pattern */}
                                  <div className="absolute inset-2 border border-primary/20 rounded-lg" />
                                  <div className="absolute inset-4 border border-accent/15 rounded-md" />
                                  
                                  <Bell className="w-8 h-8 relative z-10 transition-all duration-300 text-primary drop-shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
                                  
                                  {/* Notification count overlay */}
                                  {unreadCount > 0 && (
                                    <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] flex items-center justify-center">
                                      <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-pink-500 to-red-600 rounded-full animate-cyber-pulse" />
                                      <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-400 rounded-full animate-ping opacity-40" />
                                      <span className="relative text-xs font-bold text-white z-10">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                

                              </div>
                              
                              {/* Title and status */}
                              <div className="space-y-2">
                                <h2 className="text-2xl font-bold">
                                  <span className="bg-gradient-to-r from-white via-slate-200 to-white bg-clip-text text-transparent">
                                    NOTIFICATION CENTER
                                  </span>
                                </h2>
                                <div className="flex items-center gap-6 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400 font-mono">TOTAL:</span>
                                    <span className="text-primary font-bold">{notifications.length}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400 font-mono">UNREAD:</span>
                                    <span className="text-accent font-bold">{unreadCount}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action buttons */}
                            <div className="flex items-center gap-3">
                              {unreadCount > 0 && (
                                <Button
                                  onClick={markAllNotificationsAsRead}
                                  className={cn(
                                    "px-6 py-2 bg-gradient-to-r from-primary/20 to-accent/20",
                                    "border border-primary/30 hover:border-primary/50",
                                    "text-primary hover:text-white transition-all duration-300",
                                    "hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]",
                                    "backdrop-blur-sm hover:bg-gradient-to-r hover:from-primary/30 hover:to-accent/30"
                                  )}
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  CLEAR ALL
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Content area */}
                        <div className="flex-1 overflow-hidden">
                          <ScrollArea className="h-full">
                            {notifications.length === 0 ? (
                              <div className="flex items-center justify-center h-full min-h-[400px]">
                                <div className="text-center space-y-8 animate-fade-in-up">
                                  {/* Enhanced empty state */}
                                  <div className="relative">
                                    <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-primary/20 flex items-center justify-center relative overflow-hidden">
                                      <div className="absolute inset-4 border border-primary/10 rounded-full" />
                                      <Bell className="w-16 h-16 text-primary/40" />
                                      
                                      {/* Animated decorations */}
                                      <div className="absolute top-2 right-8">
                                        <Sparkles className="w-6 h-6 text-accent/60 animate-pulse" />
                                      </div>
                                      <div className="absolute bottom-8 left-4">
                                        <Zap className="w-4 h-4 text-primary/60 animate-pulse delay-500" />
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-4">
                                    <h3 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                      ALL SYSTEMS CLEAR
                                    </h3>
                                    <p className="text-slate-400 text-lg">No active notifications detected</p>
                                    <p className="text-slate-500 text-sm font-mono">
                                      System monitoring active • Awaiting new signals
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-6 space-y-4">
                                {notifications.map((notification, index) => {
                                  const theme = getNotificationTheme(notification.type);
                                  const isNew = newNotificationIds.has(notification.id);
                                  
                                  return (
                                    <div
                                      key={notification.id}
                                      className={cn(
                                        "group relative overflow-hidden rounded-2xl transition-all duration-500",
                                        "bg-gradient-to-r from-slate-900/60 via-slate-800/40 to-slate-900/60",
                                        "border backdrop-blur-sm cursor-pointer",
                                        notification.is_read 
                                          ? "border-slate-700/50 hover:border-slate-600/70" 
                                          : `border-primary/30 hover:border-primary/50 ${theme.glow}`,
                                        "hover:scale-[1.02] hover:shadow-2xl",
                                        isNew && "animate-cyber-notification-in",
                                        hoveredNotification === notification.id && "scale-[1.02]"
                                      )}
                                      style={{ animationDelay: `${index * 100}ms` }}
                                      onMouseEnter={() => setHoveredNotification(notification.id)}
                                      onMouseLeave={() => setHoveredNotification(null)}
                                      onClick={() => !notification.is_read && markNotificationAsRead(notification.id)}
                                    >
                                      {/* Animated background pattern */}
                                      <div className="absolute inset-0 opacity-10">
                                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent)] bg-[8px_8px] animate-grid-move-slow" />
                                      </div>
                                      
                                      {/* Corner accents */}
                                      <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-primary/40 transition-all duration-300 group-hover:border-primary/70" />
                                      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-accent/40 transition-all duration-300 group-hover:border-accent/70" />
                                      
                                      {/* New notification indicator */}
                                      {isNew && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 animate-cyber-pulse" />
                                      )}
                                      
                                      {/* Shine effect for unread */}
                                      {!notification.is_read && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent -skew-x-12 animate-cyber-shine" />
                                      )}
                                      
                                      <div className="relative z-10 p-5 flex items-start gap-4">
                                        {/* Enhanced icon container */}
                                        <div className={cn(
                                          "flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center relative overflow-hidden",
                                          "bg-gradient-to-br from-slate-800/80 to-slate-900/80",
                                          "border-2 transition-all duration-300",
                                          notification.is_read 
                                            ? "border-slate-600/30 opacity-60" 
                                            : "border-primary/30 animate-cyber-icon",
                                          theme.icon
                                        )}>
                                          {/* Inner circuit pattern */}
                                          <div className="absolute inset-2 border border-current/20 rounded-lg opacity-30" />
                                          
                                          {theme.iconComponent}
                                          
                                          {/* Type indicator */}
                                          <div className="absolute -top-1 -right-1 text-sm">
                                            {theme.emoji}
                                          </div>
                                          

                                        </div>
                                        
                                        {/* Content */}
                                        <div className="flex-1 min-w-0 space-y-3">
                                          <div className="flex items-start justify-between gap-4">
                                            <h3 className={cn(
                                              "font-bold text-lg leading-tight transition-all duration-300",
                                              notification.is_read 
                                                ? "text-slate-400" 
                                                : "text-white"
                                            )}>
                                              {notification.title}
                                            </h3>
                                            
                                            {/* Action buttons */}
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                              {!notification.is_read && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    markNotificationAsRead(notification.id);
                                                  }}
                                                  className="h-9 w-9 p-0 bg-green-500/20 border border-green-400/30 hover:bg-green-500/30 hover:border-green-400/50 text-green-400 hover:shadow-[0_0_12px_rgba(34,197,94,0.4)] transition-all duration-300"
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
                                                className="h-9 w-9 p-0 bg-red-500/20 border border-red-400/30 hover:bg-red-500/30 hover:border-red-400/50 text-red-400 hover:shadow-[0_0_12px_rgba(239,68,68,0.4)] transition-all duration-300"
                                              >
                                                <X className="w-4 h-4" />
                                              </Button>
                                            </div>
                                          </div>
                                          
                                          <p className={cn(
                                            "text-base leading-relaxed transition-all duration-300",
                                            notification.is_read ? "text-slate-500" : "text-slate-300"
                                          )}>
                                            {notification.message}
                                          </p>
                                          
                                          {/* Enhanced tip message */}
                                          {notification.data?.tip_message && (
                                            <div className="relative p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border-l-4 border-primary/50 backdrop-blur-sm">
                                              <div className="absolute top-2 right-2 text-primary/40">💬</div>
                                              <p className="text-sm italic text-primary/90 font-medium pr-8">
                                                "{notification.data.tip_message}"
                                              </p>
                                            </div>
                                          )}
                                          
                                          {/* Timestamp with enhanced design */}
                                          <div className="flex items-center gap-3 pt-2">
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 bg-accent rounded-full animate-cyber-pulse" />
                                              <Clock className="w-4 h-4 text-accent/60" />
                                              <span className="text-sm text-slate-500 font-mono">
                                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                              </span>
                                            </div>
                                            <div className="flex-1 h-px bg-gradient-to-r from-accent/20 via-primary/10 to-transparent" />
                                            <span className="text-xs text-slate-600 font-mono uppercase">
                                              {notification.type.replace('_', ' ')}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </ScrollArea>
                        </div>
                      </div>
                    </div>
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
