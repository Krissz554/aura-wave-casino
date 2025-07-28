import React, { useState, useEffect, useRef } from 'react';
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
import { useConnectionMonitor } from '@/hooks/useConnectionMonitor';

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
  const { handleGameError } = useConnectionMonitor();
  const isUnmountingRef = useRef(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [hoveredNotification, setHoveredNotification] = useState<string | null>(null);
  const [newNotificationIds, setNewNotificationIds] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
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
          emoji: '',
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

  // Admin status check
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking admin status:', error);
        }

        setIsAdmin(!!data);
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
      } finally {
        setAdminLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

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
    // Reset unmounting flag when user changes
    isUnmountingRef.current = false;
    
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
              
              // Prevent duplicates with better logic
              setNotifications(prev => {
                const exists = prev.some(n => n.id === newNotification.id);
                if (exists) {
                  return prev;
                }
                
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

              // Get notification theme for enhanced toast
              const theme = getNotificationTheme(newNotification.type);
              
              // Enhanced toast notification with type-specific styling
              toast({
                title: `${theme.emoji} ${newNotification.title}`,
                description: newNotification.message,
                duration: 6000,
              });

              // Add button pulse effect for new notifications
              const notificationButton = document.querySelector('[data-notification-button]');
              if (notificationButton) {
                notificationButton.classList.add('animate-cyber-button-press');
                setTimeout(() => notificationButton.classList.remove('animate-cyber-button-press'), 300);
              }

              // Optional: Play subtle notification sound (cyberpunk beep)
              try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                // Cyberpunk-style notification beep
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
              } catch (error) {
                // Silent fail if audio context not supported
                console.log('Audio notification not available');
              }

              // Scroll to top if modal is open
              if (scrollAreaRef.current) {
                scrollAreaRef.current.scrollTop = 0;
              }
            }
            
            if (payload.eventType === 'UPDATE') {
              const updatedNotification = payload.new as Notification;
              
              setNotifications(prev => 
                prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
              );
            }
            
            if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id;
              
              setNotifications(prev => prev.filter(n => n.id !== deletedId));
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            // Only show error if not unmounting
            if (!isUnmountingRef.current) {
              handleGameError(new Error(`Notification subscription failed: ${status}`), 'Notifications');
            }
          }
        });

      return () => {
        isUnmountingRef.current = true;
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Cyberpunk Base Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Animated Circuit Board Grid */}
      <div className="fixed inset-0 opacity-[0.15]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.5)_1px,transparent_0)] bg-[20px_20px] animate-grid-move-slow" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent)] bg-[40px_40px]" />
      </div>
      
              {/* Dynamic Energy Lines */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {/* Vertical energy flows */}
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/30 to-transparent animate-energy-flow" />
          <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-accent/30 to-transparent animate-energy-flow delay-1000" />
          <div className="absolute top-0 left-2/3 w-px h-full bg-gradient-to-b from-transparent via-primary/25 to-transparent animate-energy-flow delay-2000" />
          
          {/* Horizontal energy flows */}
          <div className="absolute left-0 top-1/4 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-energy-flow-horizontal" />
          <div className="absolute left-0 bottom-1/3 w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent animate-energy-flow-horizontal delay-1500" />
          <div className="absolute left-0 top-2/3 w-full h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent animate-energy-flow-horizontal delay-3000" />
        </div>
      
      {/* Floating Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-3 h-3 rounded-full opacity-20",
              i % 3 === 0 ? "bg-primary/40" : i % 3 === 1 ? "bg-accent/40" : "bg-purple-400/40",
              "animate-float-orb"
            )}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${8 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
      
              {/* Corner Tech Details */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-64 h-64">
            <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-primary/40 animate-cyber-corner" />
            <div className="absolute top-4 left-4 w-8 h-8 border-l border-t border-accent/30 animate-cyber-corner delay-300" />
          </div>
          <div className="absolute top-0 right-0 w-64 h-64">
            <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-primary/40 animate-cyber-corner" />
            <div className="absolute top-4 right-4 w-8 h-8 border-r border-t border-accent/30 animate-cyber-corner delay-300" />
          </div>
          <div className="absolute bottom-0 left-0 w-64 h-64">
            <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-primary/40 animate-cyber-corner" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l border-b border-accent/30 animate-cyber-corner delay-300" />
          </div>
          <div className="absolute bottom-0 right-0 w-64 h-64">
            <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-primary/40 animate-cyber-corner" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r border-b border-accent/30 animate-cyber-corner delay-300" />
          </div>
        </div>
        
        {/* Ambient Glow Effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-purple-500/8 rounded-full blur-3xl animate-pulse delay-2000" />
        </div>
      
      {/* Main Content Container */}
      <div className="relative z-10 p-4 pb-32">
        {/* Header */}
        <header className="mb-6">
          <div className="relative overflow-hidden group">
            {/* Cyberpunk Background with Advanced Effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl animate-cyber-header-pulse" />
            
            {/* Animated Circuit Board Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent)] bg-[20px_20px] animate-grid-move-slow" />
            </div>
            
            {/* Animated Border Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
            
            {/* Scan Line Effects */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-cyber-scan-horizontal" />
              <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-accent/60 to-transparent animate-cyber-scan left-1/4" />
              <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-primary/60 to-transparent animate-cyber-scan right-1/3 delay-1000" />
            </div>
            
            {/* Tech Corner Details */}
            <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-primary/60" />
            <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-accent/60" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-accent/60" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-primary/60" />
            
            {/* Floating Energy Orbs */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute w-2 h-2 rounded-full",
                    i % 2 === 0 ? "bg-primary/20" : "bg-accent/20",
                    "animate-float-orb"
                  )}
                  style={{
                    left: `${15 + (i * 15)}%`,
                    top: `${20 + (i % 3) * 30}%`,
                    animationDelay: `${i * 0.8}s`,
                    animationDuration: `${6 + i}s`
                  }}
                />
              ))}
            </div>
            
            {/* Main Header Content */}
            <div className="relative z-10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  {/* Logo Section with Advanced Effects */}
                  <div className="relative group/logo">
                    <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-xl blur-md group-hover/logo:blur-lg transition-all duration-300" />
                    <div className="relative">
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-cyber-logo-shine">
                        ArcadeFinance
                      </h1>
                      <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0 animate-pulse" />
                    </div>
                  </div>
                  
                  {/* Cyberpunk Tagline with Typing Effect */}
                  <div className="hidden md:block relative">
                    <div className="text-sm text-slate-300 font-mono tracking-wider">
                      The Future of Digital Gaming
                      <span className="inline-block w-2 h-4 bg-primary/60 ml-1 animate-cyber-typing">|</span>
                    </div>
                    <div className="absolute -bottom-1 left-0 w-3/4 h-px bg-gradient-to-r from-accent/60 to-transparent" />
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
                      data-notification-button="true"
                      onClick={() => {
                        // Add button press animation class temporarily
                        const button = document.activeElement as HTMLElement;
                        if (button) {
                          button.classList.add('animate-cyber-button-press');
                          setTimeout(() => button.classList.remove('animate-cyber-button-press'), 200);
                        }
                      }}
                      className={cn(
                        "relative px-3 py-2 overflow-hidden transition-all duration-300 backdrop-blur-sm active:scale-95 group",
                        // Dynamic styling based on unread count
                        unreadCount === 0 && [
                          "border border-primary/40 bg-slate-900/30 hover:bg-slate-800/50"
                        ],
                        unreadCount > 0 && unreadCount <= 5 && [
                          "border-2 border-orange-400/60 bg-gradient-to-r from-orange-950/50 to-red-950/50"
                        ],
                        unreadCount > 5 && unreadCount <= 10 && [
                          "border-2 border-red-400/80 bg-gradient-to-r from-red-950/60 to-pink-950/60"
                        ],
                        unreadCount > 10 && [
                          "border-2 border-red-500/90 bg-gradient-to-r from-red-950/70 to-pink-950/70 shadow-[0_0_20px_rgba(239,68,68,0.6)]"
                        ]
                      )}
                    >
                      {/* Cyberpunk scan line effect */}
                      <div className={cn(
                        "absolute inset-0 bg-gradient-to-r from-transparent to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out",
                        unreadCount === 0 && "via-primary/20",
                        unreadCount > 0 && "via-orange-400/30"
                      )} />
                      
                      {/* Subtle inner glow on hover */}
                      <div className={cn(
                        "absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                        unreadCount === 0 && "from-primary/5 via-primary/10 to-primary/5",
                        unreadCount > 0 && "from-orange-400/10 via-red-400/15 to-orange-400/10"
                      )} />
                      
                      {/* Edge pulse effect */}
                      <div className={cn(
                        "absolute inset-0 border border-transparent group-hover:border-opacity-30 rounded-md transition-all duration-300",
                        unreadCount === 0 && "group-hover:border-primary/30",
                        unreadCount > 0 && "group-hover:border-red-400/40"
                      )} />
                      
                      {/* Icon with advanced animations */}
                      <div className="relative z-10 flex items-center gap-2">
                        <div className="relative">
                          {unreadCount > 0 ? (
                            <BellDot className="w-5 h-5 transition-all duration-300 text-primary drop-shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-cyber-glow" />
                          ) : (
                            <Bell className="w-5 h-5 text-slate-400 group-hover:text-primary transition-all duration-300" />
                          )}
                          
                          {/* Dynamic notification counter with epic animations */}
                          {unreadCount > 0 && (
                            <div className={cn(
                              "absolute -top-2 -right-2 flex items-center justify-center transition-all duration-300",
                              // Dynamic size and style based on count
                              unreadCount <= 5 && "min-w-[18px] h-[18px]",
                              unreadCount > 5 && unreadCount <= 10 && "min-w-[22px] h-[22px]",
                              unreadCount > 10 && "min-w-[26px] h-[26px]"
                            )}>
                              {/* Background layers with count-based intensity */}
                              <div className={cn(
                                "absolute inset-0 rounded-full transition-all duration-300",
                                unreadCount <= 5 && "bg-gradient-to-r from-red-500 via-pink-500 to-red-600 animate-cyber-counter-pulse",
                                unreadCount > 5 && unreadCount <= 10 && "bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 animate-cyber-counter-bounce animate-cyber-counter-pulse",
                                unreadCount > 10 && "bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 animate-cyber-counter-bounce animate-cyber-counter-pulse shadow-[0_0_20px_rgba(239,68,68,0.8)]"
                              )} />
                              
                              {/* Ping effect - more intense for higher counts */}
                              <div className={cn(
                                "absolute inset-0 rounded-full opacity-40 animate-ping",
                                unreadCount <= 5 && "bg-gradient-to-r from-red-400 to-pink-400",
                                unreadCount > 5 && unreadCount <= 10 && "bg-gradient-to-r from-orange-400 to-red-400 animate-pulse",
                                unreadCount > 10 && "bg-gradient-to-r from-red-500 to-purple-500 opacity-60"
                              )} />
                              
                              {/* Extra glow layer for urgent notifications */}
                              {unreadCount > 10 && (
                                <div className="absolute inset-0 bg-gradient-to-r from-red-500/60 to-pink-500/60 rounded-full animate-ping delay-150" />
                              )}
                              
                              {/* Text with dynamic sizing */}
                              <span className={cn(
                                "relative font-bold text-white z-10 transition-all duration-300",
                                unreadCount <= 5 && "text-[10px]",
                                unreadCount > 5 && unreadCount <= 10 && "text-[11px]",
                                unreadCount > 10 && "text-[12px] animate-pulse"
                              )}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 border-0 bg-transparent overflow-hidden">
                    {/* Animated backdrop with cyberpunk effects */}
                    <div className={cn(
                      "fixed inset-0 bg-black/80 backdrop-blur-lg transition-all duration-800",
                      notificationModalOpen ? "animate-cyber-backdrop-in" : "animate-cyber-backdrop-out"
                    )} />
                    
                    {/* Main cyberpunk container with epic entrance */}
                    <div className={cn(
                      "relative w-full h-full overflow-hidden transition-all duration-1200 transform-gpu",
                      notificationModalOpen ? "animate-cyber-modal-in" : "animate-cyber-modal-out"
                    )}>
                      {/* Animated background with multiple layers */}
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/95 backdrop-blur-2xl" />
                      
                      {/* Enhanced circuit board pattern with activation animation */}
                      <div className={cn(
                        "absolute inset-0 opacity-[0.15] transition-all duration-2000",
                        notificationModalOpen && "animate-cyber-circuit-in"
                      )}>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.3)_1px,transparent_0)] bg-[12px_12px] animate-grid-move" />
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent)] bg-[24px_24px]" />
                        
                        {/* Power-up circuit lines */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-cyber-energy-surge" />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/8 to-transparent animate-cyber-energy-surge delay-300" />
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
                        {/* Header section with enhanced design and scan-line entrance */}
                        <div className={cn(
                          "p-6 border-b border-primary/20 bg-gradient-to-r from-slate-900/40 to-slate-800/40 backdrop-blur-sm relative overflow-hidden",
                          notificationModalOpen && "animate-cyber-header-in"
                        )}>
                          {/* Scan-line effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent -skew-x-12 animate-cyber-energy-surge opacity-30" />
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
                            
                            {/* Enhanced action buttons */}
                            <div className="flex items-center gap-3">
                              {unreadCount > 0 && (
                                <Button
                                  onClick={markAllNotificationsAsRead}
                                  className={cn(
                                    "group relative px-8 py-3 overflow-hidden",
                                    "bg-gradient-to-r from-emerald-600/20 via-green-500/20 to-emerald-600/20",
                                    "border-2 border-emerald-400/40 rounded-xl",
                                    "text-emerald-400 font-bold text-sm tracking-wide",
                                    "hover:border-emerald-300/60 hover:text-white",
                                    "hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]",
                                    "active:scale-95 transition-all duration-300",
                                    "backdrop-blur-sm"
                                  )}
                                >
                                  {/* Animated background */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-400/20 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
                                  
                                  {/* Button content */}
                                  <div className="relative flex items-center gap-2 z-10">
                                    <Check className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                                    <span>CLEAR ALL</span>
                                    <div className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
                                  </div>
                                  
                                  {/* Cyber corners */}
                                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400/60 transition-colors duration-300 group-hover:border-emerald-300" />
                                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-400/60 transition-colors duration-300 group-hover:border-emerald-300" />
                                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-400/60 transition-colors duration-300 group-hover:border-emerald-300" />
                                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400/60 transition-colors duration-300 group-hover:border-emerald-300" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Content area with enhanced panel animations */}
                        <div className={cn(
                          "flex-1 overflow-hidden relative",
                          notificationModalOpen ? "animate-notification-panel-open" : "animate-notification-panel-close"
                        )}>
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
                              <div className={cn(
                                "p-6 space-y-4",
                                notificationModalOpen && "animate-notification-list-stagger"
                              )}>
                                {notifications.map((notification, index) => {
                                  const theme = getNotificationTheme(notification.type);
                                  const isNew = newNotificationIds.has(notification.id);
                                  
                                  return (
                                    <div
                                      key={notification.id}
                                      className={cn(
                                        "group relative overflow-hidden rounded-2xl transition-all duration-500 w-full",
                                        "bg-gradient-to-r from-slate-900/60 via-slate-800/40 to-slate-900/60",
                                        "border backdrop-blur-sm cursor-pointer",
                                        notification.is_read 
                                          ? "border-slate-700/50 hover:border-slate-600/70" 
                                          : `border-primary/30 hover:border-primary/50 ${theme.glow}`,
                                        "hover:scale-[1.02] hover:shadow-2xl",
                                        isNew && "animate-cyber-notification-in",
                                        hoveredNotification === notification.id && "scale-[1.02]",
                                        // Add staggered entrance animation
                                        notificationModalOpen && "animate-notification-item-enter"
                                      )}
                                      style={{ 
                                        animationDelay: isNew ? `${index * 80}ms` : `${index * 30 + 200}ms`
                                      }}
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
                                        
                                        {/* Content with proper text wrapping */}
                                        <div className="flex-1 min-w-0 space-y-3 overflow-hidden">
                                          <div className="flex items-start justify-between gap-4">
                                            <h3 className={cn(
                                              "font-bold text-lg leading-tight transition-all duration-300 break-words",
                                              "flex-1 min-w-0 pr-3", // Ensure proper spacing from buttons
                                              notification.is_read 
                                                ? "text-slate-400" 
                                                : "text-white"
                                            )}>
                                              {notification.title}
                                            </h3>
                                            
                                            {/* Permanent action buttons with enhanced design */}
                                            <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-all duration-300 flex-shrink-0">
                                              {!notification.is_read && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    markNotificationAsRead(notification.id);
                                                  }}
                                                  className="group relative h-8 w-8 p-0 rounded-lg overflow-hidden bg-emerald-500/15 border border-emerald-400/30 hover:bg-emerald-500/25 hover:border-emerald-400/50 text-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-300"
                                                >
                                                  <div className="absolute inset-0 bg-emerald-400/20 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-lg" />
                                                  <Check className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                                                </Button>
                                              )}
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  deleteNotification(notification.id);
                                                }}
                                                className="group relative h-8 w-8 p-0 rounded-lg overflow-hidden bg-red-500/10 border border-red-400/25 hover:bg-red-500/20 hover:border-red-400/60 text-red-400 hover:text-red-300 hover:shadow-[0_0_20px_rgba(239,68,68,0.6)] transition-all duration-300 active:scale-95"
                                              >
                                                {/* Enhanced background animation */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-400/30 to-red-500/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center rounded-lg" />
                                                
                                                {/* Subtle pulse ring */}
                                                <div className="absolute inset-0 bg-red-400/20 rounded-lg scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300" />
                                                
                                                {/* Icon with enhanced animation */}
                                                <X className="relative z-10 w-4 h-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-90" />
                                                
                                                {/* Corner accents */}
                                                <div className="absolute top-0 left-0 w-1 h-1 bg-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100" />
                                                <div className="absolute top-0 right-0 w-1 h-1 bg-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150" />
                                                <div className="absolute bottom-0 left-0 w-1 h-1 bg-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-200" />
                                                <div className="absolute bottom-0 right-0 w-1 h-1 bg-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-250" />
                                              </Button>
                                            </div>
                                          </div>
                                          
                                                                    <p className={cn(
                            "text-base leading-relaxed transition-all duration-300 break-words whitespace-pre-wrap",
                            notification.is_read ? "text-slate-500" : "text-slate-300"
                          )}>
                            {notification.message}
                          </p>
                                          
                                                                                      {/* Enhanced tip message with proper wrapping */}
                                            {notification.data?.tip_message && (
                                              <div className="relative p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border-l-4 border-primary/50 backdrop-blur-sm overflow-hidden">
                                                <div className="absolute top-2 right-2 text-primary/40">💬</div>
                                                <p className="text-sm italic text-primary/90 font-medium pr-8 break-words whitespace-pre-wrap">
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
              
              {/* Cyberpunk Balance Display - Only show for authenticated users */}
                  {user && userData && (
                    <div className="relative group/balance overflow-hidden">
                      {/* Multi-layered background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-slate-800/60 backdrop-blur-md rounded-xl" />
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/20 via-emerald-500/30 to-green-500/20 rounded-xl blur-sm group-hover/balance:blur-md transition-all duration-300 animate-cyber-balance-glow" />
                      
                      {/* Animated circuit pattern */}
                      <div className="absolute inset-0 opacity-20 rounded-xl overflow-hidden">
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(34,197,94,0.2)_50%,transparent_60%)] bg-[length:20px_20px] animate-grid-move" />
                      </div>
                      
                      {/* Content */}
                      <div className="relative flex items-center space-x-3 px-4 py-2 border border-green-500/30 rounded-xl">
                        {/* Glowing wallet icon */}
                        <div className="relative">
                          <Wallet className="w-5 h-5 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                          <div className="absolute inset-0 animate-ping">
                            <Wallet className="w-5 h-5 text-green-400/40" />
                          </div>
                        </div>
                        
                        {/* Enhanced balance text */}
                        <div className="flex items-center space-x-1">
                          <span className="text-slate-400 text-sm font-mono">$</span>
                          <AnimatedBalance
                            balance={userData.balance}
                            className="font-bold text-lg bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent"
                          />
                        </div>
                        
                        <FloatingBalanceIncrease increases={increases} />
                        
                        {/* Tech corner accents */}
                        <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-green-400/60" />
                        <div className="absolute top-1 right-1 w-2 h-2 border-r border-t border-green-400/60" />
                        <div className="absolute bottom-1 left-1 w-2 h-2 border-l border-b border-emerald-400/60" />
                        <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-emerald-400/60" />
                      </div>
                    </div>
                  )}

                  {/* Cyberpunk Rewards Button - Only show for authenticated users */}
                  {user && (
                    <div className="relative group/rewards">
                      <Button
                        variant="ghost"
                        onClick={() => navigate('/rewards')}
                        className="relative overflow-hidden border border-purple-500/40 bg-purple-950/30 hover:bg-purple-900/50 backdrop-blur-sm transition-all duration-300"
                      >
                        {/* Cyberpunk scan line effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/20 to-transparent translate-x-[-100%] group-hover/rewards:translate-x-[100%] transition-transform duration-700 ease-out" />
                        
                        {/* Subtle inner glow on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/5 via-purple-400/10 to-purple-400/5 opacity-0 group-hover/rewards:opacity-100 transition-opacity duration-300" />
                        
                        {/* Edge pulse effect */}
                        <div className="absolute inset-0 border border-purple-400/0 group-hover/rewards:border-purple-400/30 rounded-md transition-all duration-300" />
                        
                        <Gift className="w-4 h-4 mr-2 text-purple-400 drop-shadow-[0_0_6px_rgba(168,85,247,0.6)] relative z-10" />
                        <span className="relative z-10 font-semibold bg-gradient-to-r from-purple-200 to-purple-400 bg-clip-text text-transparent">
                          Rewards
                        </span>
                        
                        {/* Tech corner indicators */}
                        <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-purple-400/60 group-hover/rewards:border-purple-300" />
                        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-purple-400/60 group-hover/rewards:border-purple-300" />
                      </Button>
                    </div>
                  )}

                  {/* Cyberpunk Admin Panel Button - Only show for admin users */}
                  {user && !adminLoading && isAdmin && (
                    <div className="relative group/admin">
                      <Button
                        variant="ghost"
                        onClick={() => setShowAdminPanel(true)}
                        className="relative overflow-hidden border border-red-500/40 bg-red-950/30 hover:bg-red-900/50 backdrop-blur-sm transition-all duration-300"
                      >
                        {/* Cyberpunk scan line effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/20 to-transparent translate-x-[-100%] group-hover/admin:translate-x-[100%] transition-transform duration-700 ease-out" />
                        
                        {/* Subtle inner glow on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 via-red-400/10 to-red-400/5 opacity-0 group-hover/admin:opacity-100 transition-opacity duration-300" />
                        
                        {/* Edge pulse effect */}
                        <div className="absolute inset-0 border border-red-400/0 group-hover/admin:border-red-400/30 rounded-md transition-all duration-300" />
                        
                        <Shield className="w-4 h-4 mr-2 text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.6)] relative z-10" />
                        <span className="relative font-semibold bg-gradient-to-r from-red-200 to-red-400 bg-clip-text text-transparent">
                          Admin
                        </span>
                        
                        {/* Tech corner indicators */}
                        <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-red-400/60 group-hover/admin:border-red-300" />
                        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-red-400/60 group-hover/admin:border-red-300" />
                      </Button>
                    </div>
                  )}

                  {/* Cyberpunk Enhanced User Profile Display - Only show for authenticated users */}
                  {user && userData && (
                    <>
                      {/* Desktop Version */}
                      <div className="hidden md:block relative group/profile overflow-hidden cursor-pointer" onClick={() => setShowProfile(true)}>
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 to-slate-800/60 backdrop-blur-md rounded-xl" />
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-xl blur-sm group-hover/profile:blur-md transition-all duration-300" />
                        
                        {/* Animated scan lines */}
                        <div className="absolute inset-0 overflow-hidden rounded-xl">
                          <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-cyber-scan-horizontal opacity-0 group-hover/profile:opacity-100 transition-opacity" />
                          <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-accent/40 to-transparent animate-cyber-scan left-1/3 opacity-0 group-hover/profile:opacity-100 transition-opacity delay-200" />
                        </div>
                        
                        <div className="relative flex items-center space-x-3 px-4 py-2 border border-primary/30 rounded-xl group-hover/profile:border-primary/60 transition-all duration-300">
                          {/* Enhanced Avatar */}
                          <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur-sm animate-cyber-avatar-scan" />
                            <ProfileBorder level={levelStats?.current_level || 1} size="md">
                              <div className="w-12 h-12 rounded-full overflow-hidden relative">
                                <img 
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`}
                                  alt={`${userData.username} avatar`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-accent/20" />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1 py-0.5">
                                  <span className="text-white text-xs font-bold block text-center leading-none drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">
                                    {(levelStats?.current_level || 1) >= 100 ? '👑' : (levelStats?.current_level || 1)}
                                  </span>
                                </div>
                              </div>
                            </ProfileBorder>
                          </div>
                          
                          {/* Enhanced Username and Level */}
                          <div className="flex flex-col">
                            <span className="font-bold text-sm bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent">
                              {userData.username}
                            </span>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="text-primary/80 font-mono">LVL</span>
                              <span className="text-accent font-bold">{levelStats?.current_level || 1}</span>
                              {levelStats && (
                                <>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-slate-400 font-mono">{levelStats.current_level_xp}XP</span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Status indicator */}
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse drop-shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
                            <span className="text-xs text-green-400 font-mono">ONLINE</span>
                          </div>
                          
                          {/* Tech corner indicators */}
                          <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-primary/60 group-hover/profile:border-primary" />
                          <div className="absolute top-1 right-1 w-2 h-2 border-r border-t border-accent/60 group-hover/profile:border-accent" />
                          <div className="absolute bottom-1 left-1 w-2 h-2 border-l border-b border-accent/60 group-hover/profile:border-accent" />
                          <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-primary/60 group-hover/profile:border-primary" />
                        </div>
                      </div>
                      
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

                  {/* Cyberpunk Authentication Buttons */}
                  {user && userData ? (
                    <div className="relative group/logout">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="relative overflow-hidden border border-red-500/40 bg-red-950/30 hover:bg-red-900/50 backdrop-blur-sm transition-all duration-300"
                      >
                        {/* Cyberpunk scan line effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/20 to-transparent translate-x-[-100%] group-hover/logout:translate-x-[100%] transition-transform duration-700 ease-out" />
                        
                        {/* Subtle inner glow on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 via-red-400/10 to-red-400/5 opacity-0 group-hover/logout:opacity-100 transition-opacity duration-300" />
                        
                        {/* Edge pulse effect */}
                        <div className="absolute inset-0 border border-red-400/0 group-hover/logout:border-red-400/30 rounded-md transition-all duration-300" />
                        
                        <LogOut className="w-4 h-4 text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.6)] relative z-10" />
                        
                        {/* Tech corner indicators */}
                        <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-red-400/60 group-hover/logout:border-red-300" />
                        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-red-400/60 group-hover/logout:border-red-300" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative group/signin">
                      <Button
                        onClick={() => setShowAuthModal(true)}
                        className="relative overflow-hidden border border-primary/40 bg-slate-900/30 hover:bg-slate-800/50 backdrop-blur-sm transition-all duration-300"
                      >
                        {/* Cyberpunk scan line effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent translate-x-[-100%] group-hover/signin:translate-x-[100%] transition-transform duration-700 ease-out" />
                        
                        {/* Subtle inner glow on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover/signin:opacity-100 transition-opacity duration-300" />
                        
                        {/* Edge pulse effect */}
                        <div className="absolute inset-0 border border-primary/0 group-hover/signin:border-primary/30 rounded-md transition-all duration-300" />
                        
                        <LogIn className="w-4 h-4 mr-2 text-primary drop-shadow-[0_0_6px_rgba(99,102,241,0.6)] relative z-10" />
                        <span className="relative z-10 font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                          Sign In
                        </span>
                        
                        {/* Tech corner indicators */}
                        <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-primary/60 group-hover/signin:border-primary" />
                        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-accent/60 group-hover/signin:border-accent" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

            {/* Cyberpunk XP Progress Bar - Only show for authenticated users */}
            {user && levelStats && (
              <div className="relative mt-3 p-3 rounded-lg bg-slate-900/50 border border-primary/20">
                {/* Background effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-xl" />
                <div className="absolute inset-0 opacity-20 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_70%,rgba(99,102,241,0.1)_85%,transparent_100%)] bg-[length:50px_100%] animate-cyber-scan-horizontal" />
                </div>
                
                <div className="relative space-y-2">
                  {/* XP Header */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                      <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                        Level {levelStats.current_level} Progress
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-accent">{levelStats.current_level_xp}</span>
                      <span className="text-slate-500">/</span>
                      <span className="text-primary">{levelStats.current_level_xp + levelStats.xp_to_next_level}</span>
                      <span className="text-slate-400">XP</span>
                    </div>
                  </div>
                  
                  {/* Enhanced Progress Bar */}
                  <div className="relative">
                    {/* Background track */}
                    <div className="h-2 bg-slate-800/80 rounded-full border border-slate-700/50 overflow-hidden">
                      {/* Animated background pattern */}
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_40%,rgba(99,102,241,0.1)_50%,transparent_60%)] bg-[length:30px_100%] animate-grid-move-slow" />
                      
                      {/* Progress fill */}
                      <div 
                        className="h-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-cyber-logo-shine rounded-full transition-all duration-1000 relative overflow-hidden"
                        style={{ width: `${xpProgress}%` }}
                      >
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine" />
                      </div>
                    </div>
                    
                    {/* Progress percentage */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                      <span className="text-[10px] font-bold text-white drop-shadow-lg">
                        {Math.round(xpProgress)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Tech corners */}
                  <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-l border-t border-primary/40" />
                  <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-r border-t border-accent/40" />
                  <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-l border-b border-accent/40" />
                  <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-r border-b border-primary/40" />
                </div>
              </div>
            )}

            {/* Cyberpunk Guest Notice */}
            {!user && (
              <div className="relative mt-3 overflow-hidden group">
                {/* Background effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-800/80 to-slate-900/90 rounded-xl" />
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-xl blur-md group-hover:blur-lg transition-all duration-500" />
                
                {/* Animated circuit pattern */}
                <div className="absolute inset-0 opacity-10 rounded-xl overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(99,102,241,0.3)_50%,transparent_60%)] bg-[length:30px_30px] animate-grid-move" />
                </div>
                
                {/* Content */}
                <div className="relative p-3 border border-primary/30 rounded-xl bg-slate-900/50 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-3 h-3 bg-accent rounded-full animate-pulse" />
                    <span className="text-sm font-mono text-slate-300">
                      🎮 Browsing as Guest
                    </span>
                    <div className="w-3 h-3 bg-primary rounded-full animate-pulse delay-500" />
                  </div>
                  
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <span className="text-sm text-slate-400">Unlock the future:</span>
                    <button
                      className="text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent hover:from-accent hover:to-primary transition-all duration-300 cursor-pointer"
                      onClick={() => setShowAuthModal(true)}
                    >
                      Sign In
                    </button>
                    <span className="text-sm text-slate-400">to play & earn!</span>
                  </div>
                  
                  {/* Tech accent lines */}
                  <div className="absolute top-2 left-2 w-4 h-px bg-gradient-to-r from-primary to-transparent" />
                  <div className="absolute top-2 right-2 w-4 h-px bg-gradient-to-l from-accent to-transparent" />
                  <div className="absolute bottom-2 left-2 w-4 h-px bg-gradient-to-r from-accent to-transparent" />
                  <div className="absolute bottom-2 right-2 w-4 h-px bg-gradient-to-l from-primary to-transparent" />
                </div>
              </div>
            )}
          </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 pb-8">
        {/* Left Sidebar - Cyberpunk Games Navigation */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative overflow-hidden group">
            {/* Cyberpunk Background with Advanced Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl" />
            
            {/* Animated Circuit Board Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent)] bg-[20px_20px] animate-grid-move-slow" />
            </div>
            
            {/* Animated Border Glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-2xl blur-sm group-hover:blur-md transition-all duration-500" />
            
            {/* Scan Line Effects */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-cyber-scan-horizontal" />
              <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-accent/40 to-transparent animate-cyber-scan left-1/4" />
            </div>
            
            {/* Tech Corner Details */}
            <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-primary/60" />
            <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-accent/60" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-accent/60" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-primary/60" />
            
            {/* Main Content Container */}
            <Card className="relative z-10 bg-transparent border-0">
              <CardHeader className="pb-3 border-b border-primary/20">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="relative">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/40">
                      <Gamepad2 className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                    </div>
                    <div className="absolute inset-0 animate-ping">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <Gamepad2 className="w-5 h-5 text-primary/40" />
                      </div>
                    </div>
                  </div>
                  <span className="text-white font-bold drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]">
                    Games
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {/* Coinflip Game Button */}
                <div className="relative group/coinflip">
                  <Button
                    onClick={() => handleGameChange('coinflip')}
                    variant="ghost"
                    className={`relative w-full justify-start px-4 py-3 h-12 transition-all duration-300 overflow-hidden ${
                      currentGame === 'coinflip' 
                        ? 'border-2 border-blue-400/80 bg-gradient-to-r from-blue-950/50 to-purple-950/50 text-white shadow-[0_0_20px_rgba(59,130,246,0.6)] backdrop-blur-sm' 
                        : 'border border-slate-600/40 bg-slate-900/30 hover:border-primary/60 hover:bg-slate-800/50 backdrop-blur-sm'
                    }`}
                  >
                    {/* Cyberpunk scan line effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent translate-x-[-100%] group-hover/coinflip:translate-x-[100%] transition-transform duration-700 ease-out" />
                    
                    {/* Subtle inner glow on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 opacity-0 group-hover/coinflip:opacity-100 transition-opacity duration-300" />
                    
                    {/* Edge pulse effect */}
                    <div className="absolute inset-0 border border-primary/0 group-hover/coinflip:border-primary/30 rounded-md transition-all duration-300" />
                    
                    <div className="flex items-center gap-3 relative z-10">
                      <div className={`p-2 rounded-md border ${
                        currentGame === 'coinflip' 
                          ? 'bg-blue-900/50 border-blue-400/60 text-blue-300' 
                          : 'bg-slate-800/50 border-primary/30 text-primary'
                      } transition-all duration-300`}>
                        <Gamepad2 className="w-4 h-4 drop-shadow-[0_0_6px_currentColor]" />
                      </div>
                      <span className={`font-bold text-sm font-mono ${
                        currentGame === 'coinflip' ? 'text-blue-200' : 'text-slate-200'
                      }`}>
                        COINFLIP
                      </span>

                    </div>
                    
                    {/* Tech corner indicators */}
                    <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-primary/40 group-hover/coinflip:border-primary" />
                    <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-accent/40 group-hover/coinflip:border-accent" />
                  </Button>
                </div>
              
                {/* Roulette Game Button */}
                <div className="relative group/roulette">
                  <Button
                    onClick={() => handleGameChange('roulette')}
                    variant="ghost"
                    className={`relative w-full justify-start px-4 py-3 h-12 transition-all duration-300 overflow-hidden ${
                      currentGame === 'roulette' 
                        ? 'border-2 border-red-400/80 bg-gradient-to-r from-red-950/50 to-orange-950/50 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)] backdrop-blur-sm' 
                        : 'border border-slate-600/40 bg-slate-900/30 hover:border-red-400/60 hover:bg-slate-800/50 backdrop-blur-sm'
                    }`}
                  >
                    {/* Cyberpunk scan line effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/20 to-transparent translate-x-[-100%] group-hover/roulette:translate-x-[100%] transition-transform duration-700 ease-out" />
                    
                    {/* Subtle inner glow on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 via-red-400/10 to-red-400/5 opacity-0 group-hover/roulette:opacity-100 transition-opacity duration-300" />
                    
                    {/* Edge pulse effect */}
                    <div className="absolute inset-0 border border-red-400/0 group-hover/roulette:border-red-400/30 rounded-md transition-all duration-300" />
                    
                    <div className="flex items-center gap-3 relative z-10">
                      <div className={`p-2 rounded-md border ${
                        currentGame === 'roulette' 
                          ? 'bg-red-900/50 border-red-400/60 text-red-300' 
                          : 'bg-slate-800/50 border-primary/30 text-primary'
                      } transition-all duration-300`}>
                        <Target className="w-4 h-4 drop-shadow-[0_0_6px_currentColor]" />
                      </div>
                      <span className={`font-bold text-sm font-mono ${
                        currentGame === 'roulette' ? 'text-red-200' : 'text-slate-200'
                      }`}>
                        ROULETTE
                      </span>

                    </div>
                    
                    {/* Tech corner indicators */}
                    <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-primary/40 group-hover/roulette:border-primary" />
                    <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-accent/40 group-hover/roulette:border-accent" />
                  </Button>
                </div>
              
                {/* Tower Game Button */}
                <div className="relative group/tower">
                  <Button
                    onClick={() => handleGameChange('tower')}
                    variant="ghost"
                    className={`relative w-full justify-start px-4 py-3 h-12 transition-all duration-300 overflow-hidden ${
                      currentGame === 'tower' 
                        ? 'border-2 border-emerald-400/80 bg-gradient-to-r from-emerald-950/50 to-teal-950/50 text-white shadow-[0_0_20px_rgba(16,185,129,0.6)] backdrop-blur-sm' 
                        : 'border border-slate-600/40 bg-slate-900/30 hover:border-emerald-400/60 hover:bg-slate-800/50 backdrop-blur-sm'
                    }`}
                  >
                    {/* Cyberpunk scan line effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent translate-x-[-100%] group-hover/tower:translate-x-[100%] transition-transform duration-700 ease-out" />
                    
                    {/* Subtle inner glow on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/5 via-emerald-400/10 to-emerald-400/5 opacity-0 group-hover/tower:opacity-100 transition-opacity duration-300" />
                    
                    {/* Edge pulse effect */}
                    <div className="absolute inset-0 border border-emerald-400/0 group-hover/tower:border-emerald-400/30 rounded-md transition-all duration-300" />
                    
                    <div className="flex items-center gap-3 relative z-10">
                      <div className={`p-2 rounded-md border ${
                        currentGame === 'tower' 
                          ? 'bg-emerald-900/50 border-emerald-400/60 text-emerald-300' 
                          : 'bg-slate-800/50 border-primary/30 text-primary'
                      } transition-all duration-300`}>
                        <Building className="w-4 h-4 drop-shadow-[0_0_6px_currentColor]" />
                      </div>
                      <span className={`font-bold text-sm font-mono ${
                        currentGame === 'tower' ? 'text-emerald-200' : 'text-slate-200'
                      }`}>
                        TOWER
                      </span>

                    </div>
                    
                    {/* Tech corner indicators */}
                    <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-primary/40 group-hover/tower:border-primary" />
                    <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-accent/40 group-hover/tower:border-accent" />
                  </Button>
                </div>
              
                {/* Crash Game Button - Coming Soon */}
                <div className="relative group/crash opacity-60">
                  <Button
                    disabled
                    variant="ghost"
                    className="relative w-full justify-start px-4 py-3 h-12 cursor-not-allowed overflow-hidden border border-slate-600/40 bg-slate-900/20 backdrop-blur-sm"
                  >
                    {/* Subtle disabled glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-yellow-500/10 to-amber-500/5 opacity-50" />
                                         <div className="flex items-center gap-3 relative z-10 w-full">
                       <div className="p-2 rounded-md border bg-slate-800/30 border-slate-600/30 text-slate-500">
                         <TrendingUp className="w-4 h-4" />
                       </div>
                       <div className="flex-1 min-w-0">
                         <span className="font-bold text-sm font-mono text-slate-400 block">
                           CRASH
                         </span>
                         <div className="flex items-center gap-1.5 mt-0.5">
                           <div className="w-1 h-1 bg-amber-400 rounded-full animate-pulse" />
                           <span className="text-[10px] text-slate-500 font-mono">COMING SOON</span>
                           <div className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse delay-500" />
                         </div>
                       </div>
                     </div>
                    
                    {/* Tech corner indicators - dimmed */}
                    <div className="absolute top-1 left-1 w-1.5 h-1.5 border-l border-t border-slate-600/30" />
                    <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-r border-b border-slate-600/30" />
                  </Button>
                                </div>
              </CardContent>
            </Card>
          </div>
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
