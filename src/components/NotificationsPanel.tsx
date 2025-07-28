import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  Gift, 
  Award, 
  Star, 
  Check, 
  X, 
  ExternalLink, 
  Megaphone, 
  Clock, 
  Sparkles,
  Zap,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import ClickableUsername from './ClickableUsername';
import { CaseRewardNotification } from './CaseRewardNotification';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  user_id: string;
  type: 'tip_sent' | 'tip_received' | 'achievement_unlocked' | 'level_up' | 'level_reward_case' | 'admin_broadcast';
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hoveredNotification, setHoveredNotification] = useState<string | null>(null);
  const [newNotificationIds, setNewNotificationIds] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    fetchNotifications();
    
    // Enhanced real-time subscription
    console.log('🔔 Setting up enhanced notifications subscription for user:', user.id);
    
    const channel = supabase
      .channel(`notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 REAL-TIME NOTIFICATION RECEIVED:', payload);
          const newNotification = payload.new as Notification;
          
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
          
          setUnreadCount(prev => prev + 1);
          
          // Enhanced toast notification
          toast({
            title: `🔔 ${newNotification.title}`,
            description: newNotification.message,
            duration: 5000,
          });
          
          // Scroll to top to show new notification
          if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = 0;
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 NOTIFICATION UPDATED:', payload);
          const updatedNotification = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n =>
              n.id === updatedNotification.id ? updatedNotification : n
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 NOTIFICATION DELETED:', payload);
          const deletedNotification = payload.old as Notification;
          setNotifications(prev =>
            prev.filter(n => n.id !== deletedNotification.id)
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
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
  }, [user, toast]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      console.log('📥 Fetched notifications:', data?.length || 0);
      setNotifications((data || []) as Notification[]);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
      
      toast({
        title: "✅ All notifications marked as read",
        description: "Your notification center is now clear",
      });
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      toast({
        title: "🗑️ Notification deleted",
        description: "Notification has been removed",
        duration: 2000,
      });
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'tip_sent':
        return <TrendingUp className="w-5 h-5" />;
      case 'tip_received':
        return <DollarSign className="w-5 h-5" />;
      case 'achievement_unlocked':
        return <Award className="w-5 h-5" />;
      case 'level_up':
        return <Star className="w-5 h-5" />;
      case 'level_reward_case':
        return <Gift className="w-5 h-5" />;
      case 'admin_broadcast':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationTheme = (type: string) => {
    switch (type) {
      case 'tip_received':
        return {
          gradient: 'from-green-400/20 via-emerald-500/15 to-green-600/10',
          border: 'border-green-400/40',
          glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]',
          icon: 'text-green-400',
          accent: 'bg-green-400/20',
          emoji: '💰'
        };
      case 'tip_sent':
        return {
          gradient: 'from-blue-400/20 via-cyan-500/15 to-blue-600/10',
          border: 'border-blue-400/40',
          glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
          icon: 'text-blue-400',
          accent: 'bg-blue-400/20',
          emoji: '📤'
        };
      case 'achievement_unlocked':
        return {
          gradient: 'from-purple-400/20 via-pink-500/15 to-purple-600/10',
          border: 'border-purple-400/40',
          glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
          icon: 'text-purple-400',
          accent: 'bg-purple-400/20',
          emoji: '🏆'
        };
      case 'level_up':
        return {
          gradient: 'from-yellow-400/20 via-orange-500/15 to-yellow-600/10',
          border: 'border-yellow-400/40',
          glow: 'shadow-[0_0_20px_rgba(251,191,36,0.3)]',
          icon: 'text-yellow-400',
          accent: 'bg-yellow-400/20',
          emoji: '⭐'
        };
      case 'level_reward_case':
        return {
          gradient: 'from-orange-400/20 via-red-500/15 to-orange-600/10',
          border: 'border-orange-400/40',
          glow: 'shadow-[0_0_20px_rgba(251,146,60,0.3)]',
          icon: 'text-orange-400',
          accent: 'bg-orange-400/20',
          emoji: '🎁'
        };
      case 'admin_broadcast':
        return {
          gradient: 'from-red-400/20 via-rose-500/15 to-red-600/10',
          border: 'border-red-400/40',
          glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
          icon: 'text-red-400',
          accent: 'bg-red-400/20',
          emoji: '📢'
        };
      default:
        return {
          gradient: 'from-gray-400/20 via-slate-500/15 to-gray-600/10',
          border: 'border-gray-400/40',
          glow: 'shadow-[0_0_20px_rgba(107,114,128,0.3)]',
          icon: 'text-gray-400',
          accent: 'bg-gray-400/20',
          emoji: '🔔'
        };
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* Cyberpunk-style container */}
      <Card className="glass border-0 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90">
        {/* Animated background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-60" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-radial from-primary/20 to-transparent blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-radial from-accent/20 to-transparent blur-2xl animate-pulse delay-1000" />
        
        {/* Scanning line effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-1 animate-pulse-scan" />
        
        <CardHeader className="pb-4 relative z-10">
          <div className="flex items-center justify-between">
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
                <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 animate-pulse px-3 py-1">
                  {unreadCount > 99 ? '99+' : unreadCount} new
                </Badge>
              )}
            </div>
            
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="glass border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              >
                <Check className="w-4 h-4 mr-2" />
                Clear all
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-0 relative z-10">
          <ScrollArea className="h-96" ref={scrollAreaRef}>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-primary/20 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-12 h-12 border-t-4 border-primary rounded-full animate-spin"></div>
                  <div className="absolute inset-2 w-8 h-8 border-2 border-accent/40 rounded-full animate-spin-reverse"></div>
                </div>
              </div>
            ) : notifications.length === 0 ? (
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
                  // Special handling for case notifications
                  if (notification.type === 'level_reward_case') {
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "transform transition-all duration-500",
                          newNotificationIds.has(notification.id) 
                            ? "animate-slide-in-cyber scale-105" 
                            : "animate-fade-in"
                        )}
                      >
                        <CaseRewardNotification
                          notification={notification}
                          onDismiss={() => markAsRead(notification.id)}
                        />
                      </div>
                    );
                  }

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
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
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
                          {getNotificationIcon(notification.type)}
                          
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
                                    markAsRead(notification.id);
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
                          
                          {/* Enhanced clickable username sections */}
                          {(notification.type === 'tip_received' && notification.data?.from_username) && (
                            <div className="pt-2">
                              <ClickableUsername 
                                username={notification.data.from_username}
                                className="inline-flex items-center gap-2 text-xs text-primary hover:text-accent glass px-3 py-2 rounded-lg transition-all duration-300 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:scale-105"
                              >
                                <Users className="w-3 h-3" />
                                View {notification.data.from_username}'s profile
                              </ClickableUsername>
                            </div>
                          )}
                          
                          {(notification.type === 'tip_sent' && notification.data?.to_username) && (
                            <div className="pt-2">
                              <ClickableUsername 
                                username={notification.data.to_username}
                                className="inline-flex items-center gap-2 text-xs text-primary hover:text-accent glass px-3 py-2 rounded-lg transition-all duration-300 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:scale-105"
                              >
                                <Users className="w-3 h-3" />
                                View {notification.data.to_username}'s profile
                              </ClickableUsername>
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
        </CardContent>
      </Card>
      
      {/* Floating particles for added effect */}
      {unreadCount > 0 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
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
    </div>
  );
}