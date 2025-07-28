import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Gift, Award, Star, Check, X, ExternalLink, Megaphone, Clock, Sparkles } from 'lucide-react';
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
  const [processedNotificationIds, setProcessedNotificationIds] = useState<Set<string>>(new Set());
  const [hoveredNotification, setHoveredNotification] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    fetchNotifications();
    
    // Set up real-time subscription for new notifications
    console.log('🔔 Setting up notifications subscription for user:', user.id);
    
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
          console.log('🔔 RECEIVED NOTIFICATION:', payload);
          const newNotification = payload.new as Notification;
          
          // Simple deduplication based on notification content and timestamp
          const isDuplicate = notifications.some(existing => 
            existing.type === newNotification.type &&
            existing.message === newNotification.message &&
            Math.abs(new Date(existing.created_at).getTime() - new Date(newNotification.created_at).getTime()) < 1000
          );
          
          if (isDuplicate) {
            console.log('🚫 DUPLICATE NOTIFICATION IGNORED');
            return;
          }
          
          console.log('✅ ADDING NEW NOTIFICATION TO UI');
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for important notifications
          if (newNotification.type === 'tip_received' || newNotification.type === 'admin_broadcast') {
            toast({
              title: newNotification.title,
              description: newNotification.message,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Notifications subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Notifications subscription active for user:', user.id);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications((data || []) as Notification[]);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
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
      console.error('Error marking notification as read:', error);
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
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
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
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'tip_sent':
      case 'tip_received':
        return <Gift className="w-5 h-5" />;
      case 'achievement_unlocked':
        return <Award className="w-5 h-5" />;
      case 'level_up':
        return <Star className="w-5 h-5" />;
      case 'level_reward_case':
        return <Gift className="w-5 h-5" />;
      case 'admin_broadcast':
        return <Megaphone className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationStyle = (type: string, isRead: boolean) => {
    const baseStyles = "relative overflow-hidden transition-all duration-300 transform";
    
    switch (type) {
      case 'tip_received':
        return cn(baseStyles, 
          isRead 
            ? "bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20" 
            : "bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-400/40 shadow-glow-green"
        );
      case 'tip_sent':
        return cn(baseStyles,
          isRead 
            ? "bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-blue-500/20" 
            : "bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-blue-400/40 glow-primary"
        );
      case 'achievement_unlocked':
        return cn(baseStyles,
          isRead 
            ? "bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20" 
            : "bg-gradient-to-br from-purple-500/20 to-pink-500/10 border-purple-400/40"
        );
      case 'level_up':
        return cn(baseStyles,
          isRead 
            ? "bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20" 
            : "bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-yellow-400/40"
        );
      case 'level_reward_case':
        return cn(baseStyles,
          isRead 
            ? "bg-gradient-to-br from-orange-500/10 to-red-500/5 border-orange-500/20" 
            : "bg-gradient-to-br from-orange-500/20 to-red-500/10 border-orange-400/40"
        );
      case 'admin_broadcast':
        return cn(baseStyles,
          isRead 
            ? "bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/20" 
            : "bg-gradient-to-br from-red-500/20 to-rose-500/10 border-red-400/40 shadow-glow-red"
        );
      default:
        return cn(baseStyles,
          isRead 
            ? "bg-card/20 border-border/50" 
            : "bg-card/40 border-primary/30 glow-primary"
        );
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'tip_received':
        return 'text-green-400';
      case 'tip_sent':
        return 'text-blue-400';
      case 'achievement_unlocked':
        return 'text-purple-400';
      case 'level_up':
        return 'text-yellow-400';
      case 'level_reward_case':
        return 'text-orange-400';
      case 'admin_broadcast':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  if (!user) return null;

  return (
    <Card className="glass border-0 relative overflow-hidden">
      {/* Animated background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-xl" />
      
      <CardHeader className="pb-3 relative z-10">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Bell className="w-5 h-5 text-primary" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-lg font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs px-2 py-1 animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs glass border-primary/30 hover:glow-primary transition-smooth"
            >
              <Check className="w-3 h-3 mr-1" />
              Clear all
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0 relative z-10">
        <ScrollArea className="h-80">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="relative">
                <div className="w-8 h-8 border-2 border-primary/30 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-8 h-8 border-t-2 border-primary rounded-full animate-spin"></div>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 px-6">
              <div className="relative mb-4">
                <Bell className="w-12 h-12 mx-auto opacity-20" />
                <Sparkles className="w-4 h-4 absolute top-0 right-1/2 transform translate-x-2 text-primary/40 animate-pulse" />
              </div>
              <p className="text-lg font-medium mb-2">All caught up!</p>
              <p className="text-sm opacity-75">No new notifications to show</p>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {notifications.map((notification) => {
                // Special handling for case notifications
                if (notification.type === 'level_reward_case') {
                  return (
                    <div
                      key={notification.id}
                      className="animate-slide-in"
                    >
                      <CaseRewardNotification
                        notification={notification}
                        onDismiss={() => markAsRead(notification.id)}
                      />
                    </div>
                  );
                }

                // Regular notification display with enhanced styling
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 rounded-xl border-2 backdrop-blur-sm animate-slide-in hover:scale-[1.02] cursor-pointer group",
                      getNotificationStyle(notification.type, notification.is_read),
                      hoveredNotification === notification.id && "scale-[1.02]"
                    )}
                    onMouseEnter={() => setHoveredNotification(notification.id)}
                    onMouseLeave={() => setHoveredNotification(null)}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    {/* Shine effect for unread notifications */}
                    {!notification.is_read && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-pulse" />
                    )}
                    
                    <div className="flex items-start gap-4 relative z-10">
                      {/* Enhanced icon with gradient background */}
                      <div className={cn(
                        "flex-shrink-0 p-2 rounded-full transition-all duration-300",
                        notification.is_read 
                          ? "bg-muted/50" 
                          : "bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse-glow"
                      )}>
                        <div className={getNotificationColor(notification.type)}>
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={cn(
                            "font-semibold text-sm leading-tight transition-colors",
                            notification.is_read ? "text-muted-foreground" : "text-foreground"
                          )}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="h-7 w-7 p-0 glass hover:glow-primary"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="h-7 w-7 p-0 glass hover:text-destructive hover:glow-destructive"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className={cn(
                          "text-sm leading-relaxed",
                          notification.is_read ? "text-muted-foreground/75" : "text-muted-foreground"
                        )}>
                          {notification.message}
                        </p>
                        
                        {/* Enhanced tip message display */}
                        {notification.data?.tip_message && (
                          <div className="p-3 glass rounded-lg border-l-4 border-primary/50 bg-gradient-to-r from-primary/5 to-transparent">
                            <p className="text-xs italic text-primary/90 font-medium">
                              "{notification.data.tip_message}"
                            </p>
                          </div>
                        )}
                        
                        {/* Enhanced clickable username sections */}
                        {(notification.type === 'tip_received' && notification.data?.from_username) && (
                          <div className="pt-2">
                            <ClickableUsername 
                              username={notification.data.from_username}
                              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 glass px-2 py-1 rounded-md w-fit transition-smooth hover:glow-primary"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View {notification.data.from_username}'s profile
                            </ClickableUsername>
                          </div>
                        )}
                        
                        {(notification.type === 'tip_sent' && notification.data?.to_username) && (
                          <div className="pt-2">
                            <ClickableUsername 
                              username={notification.data.to_username}
                              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 glass px-2 py-1 rounded-md w-fit transition-smooth hover:glow-primary"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View {notification.data.to_username}'s profile
                            </ClickableUsername>
                          </div>
                        )}
                        
                        {/* Enhanced timestamp with icon */}
                        <div className="flex items-center gap-1 pt-1">
                          <Clock className="w-3 h-3 text-muted-foreground/50" />
                          <p className="text-xs text-muted-foreground/75">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
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
  );
}