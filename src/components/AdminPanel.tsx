import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MaintenanceToggle from './MaintenanceToggle';
import { Shield, Settings, Users, Activity, Bell, AlertTriangle, Cpu, Database, Server, Terminal, Zap, Lock, Eye, EyeOff, RefreshCw, Trash2, User, Crown, Coins, Target, MessageSquare, Send, TrendingUp, Clock, X } from 'lucide-react';
import { PushNotificationForm } from './PushNotificationForm';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useMultipleAdminStatus, clearAdminStatusCache } from '@/hooks/useAdminStatus';

// Supabase configuration for Edge Function calls
const SUPABASE_URL = "https://hqdbdczxottbupwbupdu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZGJkY3p4b3R0YnVwd2J1cGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTU2MjQsImV4cCI6MjA2ODY5MTYyNH0.HVC17e9vmf0qV5Qn2qdf7t1U9T0Im8v7jf7cpZZqmNQ";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SystemStatus {
  database: {
    status: 'online' | 'offline' | 'checking';
    latency?: number;
  };
  authentication: {
    status: 'active' | 'inactive' | 'checking';
  };
  realtime: {
    status: 'connected' | 'disconnected' | 'checking';
    channels: {
      maintenance: boolean;
      liveBets: boolean;
      crashRounds: boolean;
      crashBets: boolean;
      notifications: boolean;
      chat: boolean;
      roulette: boolean;
      userStats: boolean;
      caseHistory: boolean;
      caseRewards: boolean;
      levelDailyCases: boolean;
      levelUp: boolean;
      balanceUpdates: boolean;
    };
  };
}

interface User {
  id: string;
  username: string;
  level: number;
  xp: number;
  balance: number;
  total_wagered: number;
  created_at: string;
}

type NotificationLevel = 'low' | 'normal' | 'urgent';

interface NotificationForm {
  title: string;
  message: string;
  level: NotificationLevel;
}

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const { user: currentUser } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPushNotification, setShowPushNotification] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showPrivateNotification, setShowPrivateNotification] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Get admin status for all users in the list
  const userIds = users.map(user => user.id);
  const { adminStatuses, refetch: refetchAdminStatuses } = useMultipleAdminStatus(userIds);


  const [pendingDeletions, setPendingDeletions] = useState<Record<string, any>>({});
  const [showInstantDeleteConfirm, setShowInstantDeleteConfirm] = useState(false);
  const [instantDeletingUser, setInstantDeletingUser] = useState(false);
  const [instantDeleteVerificationText, setInstantDeleteVerificationText] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resettingUser, setResettingUser] = useState(false);
  const [verificationText, setVerificationText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteVerificationText, setDeleteVerificationText] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletedUserNotification, setDeletedUserNotification] = useState<string | null>(null);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationForm, setNotificationForm] = useState<NotificationForm>({
    title: '',
    message: '',
    level: 'normal'
  });
  const [showAdminRoleModal, setShowAdminRoleModal] = useState(false);
  const [adminRoleAction, setAdminRoleAction] = useState<'add' | 'remove'>('add');
  const [adminRoleLoading, setAdminRoleLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: { status: 'checking' },
    authentication: { status: 'checking' },
    realtime: { 
      status: 'checking',
      channels: {
        maintenance: false,
        liveBets: false,
        crashRounds: false,
        crashBets: false,
        notifications: false,
        chat: false,
        roulette: false,
        userStats: false,
        caseHistory: false,
        caseRewards: false,
        levelDailyCases: false,
        levelUp: false,
        balanceUpdates: false
      }
    }
  });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check total user count
  const checkTotalUserCount = async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error checking user count:', error);
      } else {
        return count;
      }
    } catch (err) {
      console.error('Error checking user count:', err);
    }
    return null;
  };

  // Load pending deletions
  const loadPendingDeletions = async () => {
    try {
      const { data, error } = await supabase
        .from('pending_account_deletions')
        .select('*')
        .eq('status', 'pending');

      if (!error && data) {
        const pendingMap: Record<string, any> = {};
        data.forEach(deletion => {
          pendingMap[deletion.user_id] = deletion;
        });
        setPendingDeletions(pendingMap);
      }
    } catch (error) {
      console.log('Pending deletions table may not exist:', error);
    }
  };

  // Load all users
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      // Clear admin status cache to ensure fresh data
      clearAdminStatusCache();
      
      // First check total count
      const totalCount = await checkTotalUserCount();
      
      const { data, error, count } = await supabase
        .from('profiles')
        .select(`
          id, 
          username, 
          balance, 
          total_wagered, 
          created_at
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error);
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive",
        });
      } else {
        // Fetch level stats for all users
        const userIds = data?.map(user => user.id) || [];
        const { data: levelStatsData, error: levelStatsError } = await supabase
          .from('user_level_stats')
          .select('user_id, current_level, current_level_xp')
          .in('user_id', userIds);

        if (levelStatsError) {
          console.warn('Error loading level stats:', levelStatsError);
        }

        // Create a map of user_id -> level stats for easy lookup
        const levelStatsMap = new Map();
        levelStatsData?.forEach(stats => {
          levelStatsMap.set(stats.user_id, stats);
        });

        setUsers((data || []).map(user => {
          const levelStats = levelStatsMap.get(user.id);
          return {
            id: user.id,
            username: user.username || '',
            level: levelStats?.current_level || 1,
            xp: levelStats?.current_level_xp || 0,
            balance: user.balance || 0,
            total_wagered: user.total_wagered || 0,
            created_at: user.created_at || ''
          };
        }));
        
        // Show success message with count
        const message = totalCount && totalCount !== data?.length 
          ? `Loaded ${data?.length || 0} users (${totalCount} total in database)`
          : `Loaded ${data?.length || 0} users`;
          
        toast({
          title: "Success",
          description: message,
        });

        // Refresh admin statuses after loading users (cache cleared, will fetch fresh data)
        setTimeout(() => {
          refetchAdminStatuses();
        }, 500); // Delay to ensure users state is updated
      }
    } catch (err) {
      console.error('Error loading users:', err);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Send private notification
  const sendPrivateNotification = async (userId: string, notification: NotificationForm) => {
    setSendingNotification(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'admin_message',
          title: notification.title,
          message: notification.message,
          data: {
            level: notification.level,
            admin_sent: true
          },
          is_read: false,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error sending notification:', error);
        toast({
          title: "Error",
          description: "Failed to send notification",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Private notification sent successfully",
        });

        // Reset form
        setNotificationForm({
          title: '',
          message: '',
          level: 'normal'
        });
        setSelectedUser(null);
        setShowPrivateNotification(false);
      }
    } catch (err) {
      console.error('Error sending notification:', err);
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    } finally {
      setSendingNotification(false);
    }
  };

  // Reset user statistics - COMPLETE VERSION
  const resetUserStatsFinal = async (userId: string) => {
    // Double-check admin status with RPC call for extra security
    try {
      const { data: isAdminRPC, error: adminCheckError } = await supabase
        .rpc('check_admin_status_simple', { user_uuid: userId });
      
      if (isAdminRPC) {
        toast({
          title: "Access Denied",
          description: "Admin accounts cannot be reset for security reasons.",
          variant: "destructive",
        });
        return;
      }
    } catch (rpcError) {
      // RPC check failed, fall back to cached status
    }
    
    // Prevent resetting admin accounts (fallback to cached status)
    if (adminStatuses[userId]) {
      toast({
        title: "Access Denied",
        description: "Admin accounts cannot be reset for security reasons.",
        variant: "destructive",
      });
      return;
    }

    // Prevent current user from resetting themselves
    if (userId === currentUser?.id) {
      toast({
        title: "Access Denied",
        description: "You cannot reset your own account.",
        variant: "destructive",
      });
      return;
    }

    setResettingUser(true);
    try {
      console.log('=== RESET USER STATS FUNCTION v7.0 - COMPLETE ===');
      console.log('Cache buster:', Date.now());
      console.log('User ID:', userId);
      
      // 1. Reset profiles table
      console.log('Updating profiles table...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          level: 1,
          xp: 0,
          balance: 0,
          total_wagered: 0,
          total_profit: 0
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Error resetting profile stats:', profileError);
        toast({
          title: "Error",
          description: `Failed to reset profile statistics: ${profileError.message}`,
          variant: "destructive",
        });
        return;
      }
      
      console.log('Profile statistics reset successfully');
      
      // 2. Reset user_level_stats table (keep the row, just reset values)
      console.log('Resetting user_level_stats table...');
      const { error: levelStatsError } = await supabase
        .from('user_level_stats')
        .update({
          current_level: 1,
          lifetime_xp: 0,
          current_level_xp: 0,
          xp_to_next_level: 100, // Level 1 requires 100 XP
          border_tier: 1,
          available_cases: 0,
          total_cases_opened: 0,
          total_case_value: 0,
          coinflip_games: 0,
          coinflip_wins: 0,
          coinflip_wagered: 0,
          coinflip_profit: 0,
          best_coinflip_streak: 0,
          current_coinflip_streak: 0,
          crash_games: 0,
          crash_wins: 0,
          crash_wagered: 0,
          crash_profit: 0,
          roulette_games: 0,
          roulette_wins: 0,
          roulette_wagered: 0,
          roulette_profit: 0,
          roulette_highest_win: 0,
          roulette_highest_loss: 0,
          roulette_green_wins: 0,
          roulette_red_wins: 0,
          roulette_black_wins: 0,
          roulette_favorite_color: 'none',
          roulette_best_streak: 0,
          roulette_current_streak: 0,
          roulette_biggest_bet: 0,
          tower_games: 0,
          tower_wins: 0,
          tower_wagered: 0,
          tower_profit: 0,
          total_games: 0,
          total_wins: 0,
          total_wagered: 0,
          total_profit: 0,
          biggest_win: 0,
          biggest_loss: 0,
          chat_messages_count: 0,
          login_days_count: 0,
          biggest_single_bet: 0,
          current_win_streak: 0,
          best_win_streak: 0,
          tower_highest_level: 0,
          tower_biggest_win: 0,
          tower_biggest_loss: 0,
          tower_best_streak: 0,
          tower_current_streak: 0,
          tower_perfect_games: 0
          // Note: account_created is preserved (not reset)
        })
        .eq('user_id', userId);

      if (levelStatsError) {
        console.error('Error resetting level stats:', levelStatsError);
        toast({
          title: "Error",
          description: `Failed to reset level statistics: ${levelStatsError.message}`,
          variant: "destructive",
        });
        return;
      }
      
      console.log('Level statistics reset successfully');
      
      // 3. Delete related data from other tables
      console.log('Deleting game history...');
      const { error: gameHistoryError } = await supabase
        .from('game_history')
        .delete()
        .eq('user_id', userId);

      if (gameHistoryError) {
        console.error('Error deleting game history:', gameHistoryError);
      } else {
        console.log('Game history deleted successfully');
      }

      console.log('Deleting game stats...');
      const { error: gameStatsError } = await supabase
        .from('game_stats')
        .delete()
        .eq('user_id', userId);

      if (gameStatsError) {
        console.error('Error deleting game stats:', gameStatsError);
      } else {
        console.log('Game stats deleted successfully');
      }

      console.log('Deleting user achievements...');
      const { error: achievementsError } = await supabase
        .from('user_achievements')
        .delete()
        .eq('user_id', userId);

      if (achievementsError) {
        console.error('Error deleting user achievements:', achievementsError);
      } else {
        console.log('User achievements deleted successfully');
      }

      console.log('Deleting case rewards...');
      const { error: caseRewardsError } = await supabase
        .from('case_rewards')
        .delete()
        .eq('user_id', userId);

      if (caseRewardsError) {
        console.error('Error deleting case rewards:', caseRewardsError);
      } else {
        console.log('Case rewards deleted successfully');
      }

      console.log('Deleting free case claims...');
      const { error: freeCaseClaimsError } = await supabase
        .from('free_case_claims')
        .delete()
        .eq('user_id', userId);

      if (freeCaseClaimsError) {
        console.error('Error deleting free case claims:', freeCaseClaimsError);
      } else {
        console.log('Free case claims deleted successfully');
      }

      console.log('Deleting notifications...');
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (notificationsError) {
        console.error('Error deleting notifications:', notificationsError);
      } else {
        console.log('Notifications deleted successfully');
      }

      console.log('Deleting level daily cases...');
      const { error: levelDailyCasesError } = await supabase
        .from('level_daily_cases')
        .delete()
        .eq('user_id', userId);

      if (levelDailyCasesError) {
        console.error('Error deleting level daily cases:', levelDailyCasesError);
      } else {
        console.log('Level daily cases deleted successfully');
      }

      console.log('Deleting user rate limits...');
      const { error: rateLimitsError } = await supabase
        .from('user_rate_limits')
        .delete()
        .eq('user_id', userId);

      if (rateLimitsError) {
        console.error('Error deleting user rate limits:', rateLimitsError);
      } else {
        console.log('User rate limits deleted successfully');
      }
      
      // Success message
      toast({
        title: "Success",
        description: "User statistics have been completely reset",
      });
      
      setShowResetConfirm(false);
      setSelectedUser(null);
      setVerificationText('');
      loadUsers(); // Refresh the user list
      loadPendingDeletions(); // Refresh pending deletions

      console.log('Reset completed successfully');
    } catch (error) {
      console.error('Error resetting user stats:', error);
      toast({
        title: "Error",
        description: `Failed to reset user statistics: ${error}`,
        variant: "destructive",
      });
    } finally {
      setResettingUser(false);
    }
  };

  // Delete user account completely
  const deleteUserAccount = async (userId: string) => {
    // Double-check admin status with RPC call for extra security
    try {
      const { data: isAdminRPC, error: adminCheckError } = await supabase
        .rpc('check_admin_status_simple', { user_uuid: userId });
      
      if (isAdminRPC) {
        toast({
          title: "Access Denied",
          description: "Admin accounts cannot be deleted for security reasons.",
          variant: "destructive",
        });
        return;
      }
    } catch (rpcError) {
      // RPC check failed, fall back to cached status
    }
    
    // Prevent deletion of admin accounts (fallback to cached status)
    if (adminStatuses[userId]) {
      toast({
        title: "Access Denied",
        description: "Admin accounts cannot be deleted for security reasons.",
        variant: "destructive",
      });
      return;
    }

    // Prevent current user from deleting themselves
    if (userId === currentUser?.id) {
      toast({
        title: "Access Denied",
        description: "You cannot delete your own account.",
        variant: "destructive",
      });
      return;
    }

    setDeletingUser(true);
    try {
      console.log('=== INITIATE USER ACCOUNT DELETION ===');
      console.log('User ID:', userId);
      
      const deletionTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      // Try to create pending deletion record (fallback if table doesn't exist)
      console.log('Creating pending deletion record...');
      let pendingDeletion = null;
      let useFallbackMethod = false;
      
      try {
        const { data, error: pendingError } = await supabase
          .from('pending_account_deletions')
          .insert({
            user_id: userId,
            initiated_by: currentUser?.id,
            scheduled_deletion_time: deletionTime.toISOString(),
            status: 'pending'
          })
          .select()
          .single();

        if (pendingError) {
          console.error('Error creating pending deletion record:', pendingError);
          // Check if it's a table not found error
          if (pendingError.code === '42P01' || pendingError.message.includes('does not exist')) {
            console.log('Pending deletions table does not exist, using fallback method');
            useFallbackMethod = true;
          } else {
            toast({
              title: "Error",
              description: "Failed to initiate account deletion",
              variant: "destructive",
            });
            return;
          }
        } else {
          pendingDeletion = data;
        }
      } catch (error) {
        console.error('Exception creating pending deletion record:', error);
        console.log('Using fallback method');
        useFallbackMethod = true;
      }
      
      // Send pending deletion notification to the user
      console.log('Sending pending deletion notification to user...');
      const notificationData = {
        deletion_pending: true,
        deletion_time: deletionTime.toISOString(),
        initiated_at: new Date().toISOString(),
        fallback_method: useFallbackMethod
      };
      
      // Add deletion_id if we have it
      if (pendingDeletion) {
        notificationData.deletion_id = pendingDeletion.id;
      }
      
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'admin_message',
          title: 'Account Deletion Initiated',
          message: 'Your account has been marked for deletion by an administrator. Your account will be permanently deleted in 24 hours.',
          data: notificationData
        });

      if (notificationError) {
        console.error('Error sending pending deletion notification:', notificationError);
        // Don't return here, deletion record is already created (if using new method)
      } else {
        console.log('Pending deletion notification sent successfully');
      }
      
      // Success message
      const methodText = useFallbackMethod ? ' (using fallback method)' : '';
      toast({
        title: "Deletion Scheduled",
        description: `User account deletion has been scheduled. The account will be automatically deleted in 24 hours (${deletionTime.toLocaleString()})${methodText}.`,
      });
      
      // If using fallback method, start a client-side timer for deletion
      if (useFallbackMethod) {
        console.log('Starting fallback deletion timer...');
        setTimeout(async () => {
          try {
            console.log('Executing fallback deletion after 24 hours...');
            
            // Call the existing Edge Function directly
            const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-user-account`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                user_id: userId,
                deletion_time: deletionTime.toISOString()
              })
            });

            if (!response.ok) {
              console.error('Fallback deletion failed:', response.status, response.statusText);
            } else {
              const result = await response.json();
              console.log('Fallback deletion completed:', result);
            }
          } catch (error) {
            console.error('Error in fallback deletion:', error);
          }
        }, 24 * 60 * 60 * 1000); // 24 hours
      }

      setShowDeleteConfirm(false);
      setSelectedUser(null);
      setDeleteVerificationText('');
      setDeleteConfirmText('');
      loadUsers(); // Refresh the user list

      console.log('User deletion scheduled successfully');
    } catch (error) {
      console.error('Error initiating user deletion:', error);
      toast({
        title: "Error",
        description: "Failed to initiate account deletion",
        variant: "destructive",
      });
    } finally {
      setDeletingUser(false);
    }
  };

  // Instant delete user account (skips the 24-hour delay)
  const instantDeleteUserAccount = async (userId: string) => {
    // Double-check admin status with RPC call for extra security
    try {
      const { data: isAdminRPC, error: adminCheckError } = await supabase
        .rpc('check_admin_status_simple', { user_uuid: userId });
      
      if (isAdminRPC) {
        toast({
          title: "Access Denied",
          description: "Admin accounts cannot be deleted for security reasons.",
          variant: "destructive",
        });
        return;
      }
    } catch (rpcError) {
      // RPC check failed, fall back to cached status
    }
    
    // Prevent deletion of admin accounts (fallback to cached status)
    if (adminStatuses[userId]) {
      toast({
        title: "Access Denied",
        description: "Admin accounts cannot be deleted for security reasons.",
        variant: "destructive",
      });
      return;
    }

    // Prevent current user from deleting themselves
    if (userId === currentUser?.id) {
      toast({
        title: "Access Denied",
        description: "You cannot delete your own account.",
        variant: "destructive",
      });
      return;
    }

    setInstantDeletingUser(true);
    try {
      console.log('=== INSTANT USER ACCOUNT DELETION ===');
      console.log('User ID:', userId);
      
      // 1. Remove from pending deletions table first (instant deletion bypasses the waiting period)
      console.log('Removing pending deletion record for instant deletion...');
      try {
        const { error: removeError } = await supabase
          .from('pending_account_deletions')
          .delete()
          .eq('user_id', userId);
        
        if (removeError) {
          console.error('Error removing pending deletion record:', removeError);
        } else {
          console.log('Pending deletion record removed for instant deletion');
        }
      } catch (error) {
        console.error('Exception removing pending deletion record:', error);
      }
      
      // 2. Send immediate notification to user about instant deletion
      console.log('Sending instant deletion notification to user...');
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'admin_message',
          title: 'Account Deletion - Immediate',
          message: 'Your account deletion has been expedited by an administrator. You will be logged out and your account will be deleted immediately.',
          data: {
            instant_deletion: true,
            initiated_at: new Date().toISOString(),
            force_logout: true
          }
        });

      if (notificationError) {
        console.error('Error sending instant deletion notification:', notificationError);
      }

             // 3. Send real-time broadcast to user's client for immediate action
       const userChannel = supabase.channel(`user-${userId}`);
       userChannel.send({
         type: 'broadcast',
         event: 'instant_deletion_initiated',
         payload: {
           message: 'Your account deletion has been expedited. You will be logged out immediately.',
           timestamp: new Date().toISOString(),
           force_logout: true,
           instant_deletion: true
         }
       });

       // 4. Give user a moment to see the notification before deletion
       await new Promise(resolve => setTimeout(resolve, 2000));
       
       // 5. Call the existing Edge Function directly for immediate deletion
      const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-user-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          user_id: userId,
          instant_deletion: true
        })
      });

      if (!response.ok) {
        console.error('Instant deletion failed:', response.status, response.statusText);
        toast({
          title: "Error",
          description: "Failed to delete user account",
          variant: "destructive",
        });
      } else {
        const result = await response.json();
        console.log('Instant deletion completed:', result);
        
        // Remove from pending deletions table (cleanup after successful deletion)
        console.log('Cleaning up pending deletion record...');
        try {
          const { error: cleanupError } = await supabase
            .from('pending_account_deletions')
            .delete()
            .eq('user_id', userId);
          
          if (cleanupError) {
            console.error('Error cleaning up pending deletion record:', cleanupError);
          } else {
            console.log('Pending deletion record successfully cleaned up');
          }
        } catch (error) {
          console.error('Exception during pending deletion cleanup:', error);
        }
        
        toast({
          title: "User Deleted",
          description: "User account has been permanently deleted.",
        });
        
        setShowInstantDeleteConfirm(false);
        setSelectedUser(null);
        setInstantDeleteVerificationText('');
        loadUsers(); // Refresh the user list
        loadPendingDeletions(); // Refresh pending deletions
      }
    } catch (error) {
      console.error('Error in instant deletion:', error);
      toast({
        title: "Error",
        description: "Failed to delete user account",
        variant: "destructive",
      });
    } finally {
      setInstantDeletingUser(false);
    }
  };

  // Stop pending deletion (cancel the deletion process)
  const stopPendingDeletion = async (userId: string) => {
    try {
      console.log('=== STOPPING PENDING DELETION ===');
      console.log('User ID:', userId);
      
      // 1. Remove from pending deletions table
      const { error } = await supabase
        .from('pending_account_deletions')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error stopping pending deletion:', error);
        toast({
          title: "Error",
          description: "Failed to stop pending deletion",
          variant: "destructive",
        });
        return;
      }

      // 2. Clear any existing deletion-related notifications that trigger the lock screen
      console.log('Clearing existing deletion notifications...');
      
      // First, clear the specific "Account Deletion Initiated" notification that causes the lock
      const { error: clearInitiatedError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('type', 'admin_message')
        .eq('title', 'Account Deletion Initiated');

      if (clearInitiatedError) {
        console.error('Error clearing initiated deletion notification:', clearInitiatedError);
      }

      // Also clear any other deletion-related notifications
      const { error: clearOtherDeletionError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('type', 'admin_message')
        .in('title', ['Account Deletion Initiated', 'Account Deleted', 'Account Deletion Completed']);

      if (clearOtherDeletionError) {
        console.error('Error clearing other deletion notifications:', clearOtherDeletionError);
      }

      // 3. Send new cancellation notification to user
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'admin_message',
          title: 'Account Deletion Cancelled',
          message: 'Your pending account deletion has been cancelled by an administrator. Your account is now safe and fully unlocked.',
          data: {
            deletion_cancelled: true,
            cancelled_at: new Date().toISOString(),
            account_unlocked: true
          }
        });

      if (notificationError) {
        console.error('Error sending cancellation notification:', notificationError);
      }

      // 4. Ensure user profile/data is not marked for deletion anywhere
      console.log('Unlocking user account completely...');
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileUpdateError) {
        console.error('Error updating user profile:', profileUpdateError);
      }

      // 5. Send real-time update to user's client if they're online
      const channel = supabase.channel(`user-${userId}`);
      channel.send({
        type: 'broadcast',
        event: 'deletion_cancelled',
        payload: {
          message: 'Your account deletion has been cancelled. You are now fully unlocked.',
          timestamp: new Date().toISOString(),
          force_unlock: true,
          clear_deletion_state: true
        }
      });

      // Also send a general notification update to trigger UI refresh
      channel.send({
        type: 'broadcast',
        event: 'notifications_updated',
        payload: {
          action: 'deletion_cancelled',
          timestamp: new Date().toISOString()
        }
      });

      toast({
        title: "Deletion Stopped",
        description: "Pending account deletion has been cancelled. User account is now safe and fully unlocked.",
      });

      // 6. Refresh the data
      loadUsers();
      loadPendingDeletions();
      
      console.log('User account fully unlocked and deletion cancelled successfully');
      
    } catch (error) {
      console.error('Error stopping pending deletion:', error);
      toast({
        title: "Error",
        description: "Failed to stop pending deletion",
        variant: "destructive",
      });
    }
  };

  // Handle admin role changes
  const handleAdminRoleChange = async (userId: string, action: 'add' | 'remove') => {
    // Prevent admins from removing their own admin rights
    if (action === 'remove' && userId === currentUser?.id) {
      toast({
        title: "Access Denied",
        description: "You cannot remove your own admin rights.",
        variant: "destructive",
      });
      return;
    }

    setAdminRoleLoading(true);
    try {
      if (action === 'add') {
        // Add user to admin_users table
        console.log('Attempting to add admin role for user:', userId);
        
        const { data, error } = await supabase
          .from('admin_users')
          .insert({
            user_id: userId,
            permissions: ['admin'],
            created_at: new Date().toISOString()
          })
          .select();

        console.log('Admin role insert result:', { data, error });

        if (error) {
          console.error('Error adding admin role:', error);
          toast({
            title: "Error",
            description: `Failed to add admin role: ${error.message}`,
            variant: "destructive",
          });
        } else {
          console.log('Admin role added successfully:', data);
          toast({
            title: "Success",
            description: "Admin role added successfully",
          });
        }
      } else {
        // Remove user from admin_users table
        console.log('Attempting to remove admin role for user:', userId);
        
        const { data, error } = await supabase
          .from('admin_users')
          .delete()
          .eq('user_id', userId)
          .select();

        console.log('Admin role delete result:', { data, error });

        if (error) {
          console.error('Error removing admin role:', error);
          toast({
            title: "Error",
            description: `Failed to remove admin role: ${error.message}`,
            variant: "destructive",
          });
        } else {
          console.log('Admin role removed successfully:', data);
          toast({
            title: "Success",
            description: "Admin role removed successfully",
          });
        }
      }

      setShowAdminRoleModal(false);
      setSelectedUser(null);
      
              // Refresh admin statuses immediately
        refetchAdminStatuses();
      
      loadUsers(); // Refresh the user list
    } catch (error) {
      console.error('Error changing admin role:', error);
      toast({
        title: "Error",
        description: "Failed to change admin role",
        variant: "destructive",
      });
    } finally {
      setAdminRoleLoading(false);
    }
  };

  // Check system status
  const checkSystemStatus = async () => {
    setIsRefreshing(true);
    
    // Check database connectivity
    try {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      const latency = Date.now() - startTime;
      
      if (error) {
        setSystemStatus(prev => ({
          ...prev,
          database: { status: 'offline' }
        }));
      } else {
        setSystemStatus(prev => ({
          ...prev,
          database: { status: 'online', latency }
        }));
      }
    } catch (err) {
      setSystemStatus(prev => ({
        ...prev,
        database: { status: 'offline' }
      }));
    }

    // Check authentication status
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSystemStatus(prev => ({
        ...prev,
        authentication: { 
          status: session ? 'active' : 'inactive' 
        }
      }));
    } catch (err) {
      setSystemStatus(prev => ({
        ...prev,
        authentication: { status: 'inactive' }
      }));
    }

    // Check realtime connectivity with a simple test
    try {
      // Create a simple test channel to check realtime connectivity
      const testChannel = supabase.channel('admin-health-check');
      
      // Set a timeout for the test
      const testPromise = new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve('timeout');
        }, 3000);

        testChannel.subscribe((status) => {
          clearTimeout(timeout);
          resolve(status);
        });
      });

      const result = await testPromise;
      
      // Clean up the test channel
      supabase.removeChannel(testChannel);

      const isConnected = result === 'SUBSCRIBED';
      
      // Update channel statuses based on the overall realtime connectivity
      const channelStatuses = {
        maintenance: isConnected,
        liveBets: isConnected,
        crashRounds: isConnected,
        crashBets: isConnected,
        notifications: isConnected,
        chat: isConnected,
        roulette: isConnected,
        userStats: isConnected,
        caseHistory: isConnected,
        caseRewards: isConnected,
        levelDailyCases: isConnected,
        levelUp: isConnected,
        balanceUpdates: isConnected
      };

      setSystemStatus(prev => ({
        ...prev,
        realtime: { 
          status: isConnected ? 'connected' : 'disconnected',
          channels: channelStatuses
        }
      }));
    } catch (err) {
      setSystemStatus(prev => ({
        ...prev,
        realtime: { 
          status: 'disconnected',
          channels: {
            maintenance: false,
            liveBets: false,
            crashRounds: false,
            crashBets: false,
            notifications: false,
            chat: false,
            roulette: false,
            userStats: false,
            caseHistory: false,
            caseRewards: false,
            levelDailyCases: false,
            levelUp: false,
            balanceUpdates: false
          }
        }
      }));
    }

    setLastRefresh(new Date());
    setIsRefreshing(false);
  };

  // Check admin status function - using RPC to avoid 406 errors
  const checkAdminStatus = async () => {
    if (!currentUser) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('check_admin_status_simple', { user_uuid: currentUser.id });

      if (error) {
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data);
      }
    } catch (err) {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminStatus();
  }, [currentUser]);

  // Check system status when admin panel opens
  useEffect(() => {
    if (isOpen) {
      checkAdminStatus();
      checkSystemStatus();
      
      // Set up periodic system status checks
      const interval = setInterval(() => {
        checkSystemStatus();
      }, 20000); // Check every 20 seconds
      
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Load users when user management modal opens
  useEffect(() => {
    if (showUserManagement) {
      loadUsers();
      loadPendingDeletions();
    }
  }, [showUserManagement]);

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-mono">ADMIN_PANEL</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="relative">
              <div className="w-8 h-8 border-2 border-primary/30 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-8 h-8 border-2 border-accent/30 rounded-full animate-spin-reverse" style={{ animationDuration: '2s' }}></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isAdmin) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <Shield className="h-5 w-5 text-red-500" />
              <span className="font-mono">ACCESS_DENIED</span>
            </DialogTitle>
          </DialogHeader>
          <div className="text-center p-6">
            <div className="relative mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full flex items-center justify-center border border-red-500/30">
                <Shield className="h-8 w-8 text-red-500" />
              </div>
              <div className="absolute -inset-2 border border-red-500/20 rounded-full animate-ping"></div>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 font-mono">ADMIN ACCESS REQUIRED</h3>
            <p className="text-slate-400 font-mono text-sm">
              You don't have permission to access the admin panel.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
      case 'connected':
        return 'green';
      case 'offline':
      case 'inactive':
      case 'disconnected':
        return 'red';
      default:
        return 'yellow';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
      case 'connected':
        return status.toUpperCase();
      case 'offline':
      case 'inactive':
      case 'disconnected':
        return status.toUpperCase();
      default:
        return 'CHECKING...';
    }
  };

  const getConnectedChannelsCount = () => {
    const channels = systemStatus.realtime.channels;
    return Object.values(channels).filter(Boolean).length;
  };

  const getTotalChannelsCount = () => {
    return Object.keys(systemStatus.realtime.channels).length;
  };

  const getLevelColor = (level: NotificationLevel) => {
    switch (level) {
      case 'low':
        return 'green';
      case 'normal':
        return 'yellow';
      case 'urgent':
        return 'red';
      default:
        return 'yellow';
    }
  };

  const getLevelText = (level: NotificationLevel) => {
    switch (level) {
      case 'low':
        return 'LOW';
      case 'normal':
        return 'NORMAL';
      case 'urgent':
        return 'URGENT';
      default:
        return 'NORMAL';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-mono">ADMIN CONTROL CENTER</span>
              <Badge className="ml-2 bg-gradient-to-r from-primary to-accent text-white border-0">ADMIN</Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Maintenance Control */}
            <Card className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Settings className="h-5 w-5 text-primary" />
                  <span className="font-mono">SITE CONTROL</span>
                </CardTitle>
                <CardDescription className="text-slate-400 font-mono">
                  Control website maintenance mode and site-wide settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MaintenanceToggle />
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Activity className="h-5 w-5 text-accent" />
                  <span className="font-mono">SYSTEM STATS</span>
                </CardTitle>
                <CardDescription className="text-slate-400 font-mono">
                  Overview of site activity and user statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg border border-primary/30">
                    <div className="text-2xl font-bold text-primary font-mono">
                      {users.length}
                    </div>
                    <div className="text-sm text-slate-400 font-mono">TOTAL USERS</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-accent/20 to-accent/10 rounded-lg border border-accent/30">
                    <div className="text-2xl font-bold text-accent font-mono">
                      {/* Add active users here */}
                      -
                    </div>
                    <div className="text-sm text-slate-400 font-mono">ACTIVE TODAY</div>
                  </div>
                </div>
                
                <div className="text-sm text-slate-500 font-mono">
                  <p>More detailed analytics coming soon...</p>
                </div>
              </CardContent>
            </Card>

            {/* Push Notifications */}
            {showPushNotification ? (
              <div className="lg:col-span-2">
                <PushNotificationForm onClose={() => setShowPushNotification(false)} />
              </div>
            ) : (
              <Card className="lg:col-span-2 bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Bell className="h-5 w-5 text-purple-400" />
                    <span className="font-mono">BROADCAST SYSTEM</span>
                    <Badge className="ml-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">BROADCAST</Badge>
                  </CardTitle>
                  <CardDescription className="text-slate-400 font-mono">
                    Send notifications to all users on the platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/30">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm text-yellow-300 font-mono">
                        WARNING: Broadcast notifications will be sent to ALL users on the platform.
                      </span>
                    </div>
                    
                    <Button
                      onClick={() => setShowPushNotification(true)}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white border-0 font-mono transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      SEND BROADCAST NOTIFICATION
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* System Status */}
            <Card className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Server className="h-5 w-5 text-green-400" />
                    <span className="font-mono">SYSTEM STATUS</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {isRefreshing && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-blue-400 font-mono">REFRESHING</span>
                      </div>
                    )}
                    <span className="text-xs text-slate-500 font-mono">
                      Last: {lastRefresh.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <CardDescription className="text-slate-400 font-mono">
                  Real-time system health and performance (updates every 20s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className={`flex items-center justify-between p-3 bg-gradient-to-r from-${getStatusColor(systemStatus.database.status)}-500/10 to-${getStatusColor(systemStatus.database.status)}-600/10 rounded-lg border border-${getStatusColor(systemStatus.database.status)}-500/30`}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 bg-${getStatusColor(systemStatus.database.status)}-400 rounded-full ${systemStatus.database.status === 'checking' ? 'animate-pulse' : ''}`}></div>
                      <span className={`text-sm text-${getStatusColor(systemStatus.database.status)}-400 font-mono`}>DATABASE</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm text-${getStatusColor(systemStatus.database.status)}-400 font-mono`}>
                        {getStatusText(systemStatus.database.status)}
                      </span>
                      {systemStatus.database.latency && (
                        <span className="text-xs text-slate-500 font-mono">
                          ({systemStatus.database.latency}ms)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 bg-gradient-to-r from-${getStatusColor(systemStatus.authentication.status)}-500/10 to-${getStatusColor(systemStatus.authentication.status)}-600/10 rounded-lg border border-${getStatusColor(systemStatus.authentication.status)}-500/30`}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 bg-${getStatusColor(systemStatus.authentication.status)}-400 rounded-full ${systemStatus.authentication.status === 'checking' ? 'animate-pulse' : ''}`}></div>
                      <span className={`text-sm text-${getStatusColor(systemStatus.authentication.status)}-400 font-mono`}>AUTHENTICATION</span>
                    </div>
                    <span className={`text-sm text-${getStatusColor(systemStatus.authentication.status)}-400 font-mono`}>
                      {getStatusText(systemStatus.authentication.status)}
                    </span>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 bg-gradient-to-r from-${getStatusColor(systemStatus.realtime.status)}-500/10 to-${getStatusColor(systemStatus.realtime.status)}-600/10 rounded-lg border border-${getStatusColor(systemStatus.realtime.status)}-500/30`}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 bg-${getStatusColor(systemStatus.realtime.status)}-400 rounded-full ${systemStatus.realtime.status === 'checking' ? 'animate-pulse' : ''}`}></div>
                      <span className={`text-sm text-${getStatusColor(systemStatus.realtime.status)}-400 font-mono`}>REALTIME</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm text-${getStatusColor(systemStatus.realtime.status)}-400 font-mono`}>
                        {getStatusText(systemStatus.realtime.status)}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        ({getConnectedChannelsCount()}/{getTotalChannelsCount()})
                      </span>
                    </div>
                  </div>

                  {/* Channel Details */}
                  <div className="mt-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <div className="text-xs text-slate-400 font-mono mb-2">CHANNEL STATUS:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(systemStatus.realtime.channels).map(([channel, isConnected]) => (
                        <div key={channel} className="flex items-center justify-between">
                          <span className={`font-mono ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                            {channel.toUpperCase()}
                          </span>
                          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Actions */}
            <Card className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Terminal className="h-5 w-5 text-cyan-400" />
                  <span className="font-mono">ADMIN ACTIONS</span>
                </CardTitle>
                <CardDescription className="text-slate-400 font-mono">
                  Quick actions for site administration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    onClick={() => {
                      setShowUserManagement(true);
                      loadUsers();
                    }}
                    variant="outline" 
                    className="h-auto p-4 flex items-center justify-between bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white font-mono"
                  >
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span>USER MANAGEMENT</span>
                    </div>
                    <span className="text-xs text-slate-500">MANAGE USERS</span>
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      setShowPrivateNotification(true);
                      loadUsers();
                    }}
                    variant="outline" 
                    className="h-auto p-4 flex items-center justify-between bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white font-mono"
                  >
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-green-400" />
                      <span>PRIVATE NOTIFICATIONS</span>
                    </div>
                    <span className="text-xs text-slate-500">SEND MESSAGES</span>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex items-center justify-between bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white font-mono">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-green-400" />
                      <span>ANALYTICS</span>
                    </div>
                    <span className="text-xs text-slate-500">COMING SOON</span>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex items-center justify-between bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white font-mono">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4 text-purple-400" />
                      <span>SITE SETTINGS</span>
                    </div>
                    <span className="text-xs text-slate-500">COMING SOON</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Management Modal */}
      <Dialog open={showUserManagement} onOpenChange={setShowUserManagement}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <Users className="h-5 w-5 text-blue-400" />
              <span className="font-mono">USER MANAGEMENT</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm text-slate-400 font-mono">
                  Loaded Users: <span className="text-primary font-bold">{users.length}</span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={loadUsers}
                  disabled={loadingUsers}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-0 font-mono"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingUsers ? 'animate-spin' : ''}`} />
                  {loadingUsers ? 'Loading...' : 'Refresh Users'}
                </Button>
                <Button
                  onClick={checkTotalUserCount}
                  variant="outline"
                  className="bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 font-mono"
                >
                  Check Total
                </Button>

              </div>
            </div>

            {loadingUsers ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="text-slate-400 font-mono">Loading users...</p>
                </div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center p-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 flex items-center justify-center">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">No Users Found</h3>
                  <p className="text-slate-400 text-sm">Try refreshing the user list</p>
                </div>
                <Button
                  onClick={loadUsers}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-0 font-mono"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load Users
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 hover:bg-slate-700/50 transition-colors"
                  >
                    {/* Compact User Info */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-full flex items-center justify-center">
                          <User className="h-3 w-3 text-blue-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-white font-mono text-sm font-semibold">{user.username}</div>
                            {/* Admin Shield Icon */}
                            {adminStatuses[user.id] && (
                              <div className="flex items-center text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)] animate-pulse" title="Admin User">
                                <Shield className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">ID: {user.id.slice(0, 6)}...</div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {/* Compact Stats */}
                    <div className="grid grid-cols-4 gap-1 mb-3">
                      <div className="flex items-center space-x-1 p-1 bg-slate-700/30 rounded text-xs">
                        <Crown className="h-2.5 w-2.5 text-yellow-400" />
                        <span className="text-yellow-400 font-mono">Lv.{user.level}</span>
                      </div>
                      <div className="flex items-center space-x-1 p-1 bg-slate-700/30 rounded text-xs">
                        <Target className="h-2.5 w-2.5 text-green-400" />
                        <span className="text-green-400 font-mono">{user.xp} XP</span>
                      </div>
                      <div className="flex items-center space-x-1 p-1 bg-slate-700/30 rounded text-xs">
                        <Coins className="h-2.5 w-2.5 text-purple-400" />
                        <span className="text-purple-400 font-mono">${user.balance}</span>
                      </div>
                      <div className="flex items-center space-x-1 p-1 bg-slate-700/30 rounded text-xs">
                        <TrendingUp className="h-2.5 w-2.5 text-orange-400" />
                        <span className="text-orange-400 font-mono">${user.total_wagered}</span>
                      </div>
                    </div>
                    
                    {/* Pending Deletion Warning */}
                    {pendingDeletions[user.id] && (
                      <div className="mb-3 p-2 bg-red-900/30 border border-red-500/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-3 w-3 text-red-400" />
                          <span className="text-red-400 font-mono text-xs font-semibold">DELETION PENDING</span>
                        </div>
                        <div className="text-xs text-red-300 font-mono">
                          Scheduled: {new Date(pendingDeletions[user.id].scheduled_deletion_time).toLocaleString()}
                        </div>
                        <div className="text-xs text-red-300 font-mono">
                          Time remaining: {Math.max(0, Math.ceil((new Date(pendingDeletions[user.id].scheduled_deletion_time).getTime() - Date.now()) / (1000 * 60 * 60)))}h
                        </div>
                      </div>
                    )}
                    
                    {/* Compact Action Buttons */}
                    <div className={`grid gap-1 ${pendingDeletions[user.id] ? 'grid-cols-4' : 'grid-cols-3'}`}>
                      <Button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowPrivateNotification(true);
                        }}
                        size="sm"
                        variant="outline"
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white border-0 font-mono text-xs h-7"
                      >
                        <MessageSquare className="h-2.5 w-2.5 mr-1" />
                        Msg
                      </Button>
                      {/* Hide Make Admin button for users who are already admins */}
                      {adminStatuses[user.id] ? (
                        <Button
                          disabled
                          size="sm"
                          variant="outline"
                          className="bg-gradient-to-r from-green-600 to-green-700 text-green-300 border-0 font-mono text-xs h-7 cursor-not-allowed"
                          title="User is already an admin"
                        >
                          <Shield className="h-2.5 w-2.5 mr-1" />
                          Admin ✓
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            setSelectedUser(user);
                            setAdminRoleAction('add');
                            setShowAdminRoleModal(true);
                          }}
                          size="sm"
                          variant="outline"
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-0 font-mono text-xs h-7"
                        >
                          <Shield className="h-2.5 w-2.5 mr-1" />
                          Admin
                        </Button>
                      )}
                      {/* Hide Remove Admin button if current user is trying to remove their own admin status */}
                      {adminStatuses[user.id] && user.id === currentUser?.id ? (
                        <Button
                          disabled
                          size="sm"
                          variant="outline"
                          className="bg-gradient-to-r from-gray-600 to-gray-700 text-gray-400 border-0 font-mono text-xs h-7 cursor-not-allowed"
                          title="Cannot remove admin rights from admin users"
                        >
                          <Shield className="h-2.5 w-2.5 mr-1" />
                          Protected
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            setSelectedUser(user);
                            setAdminRoleAction('remove');
                            setShowAdminRoleModal(true);
                          }}
                          size="sm"
                          variant="outline"
                          className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white border-0 font-mono text-xs h-7"
                        >
                          <Shield className="h-2.5 w-2.5 mr-1" />
                          Remove
                        </Button>
                      )}
                      {/* Hide Reset button for admin users or current user */}
                      {adminStatuses[user.id] || user.id === currentUser?.id ? (
                        <Button
                          disabled
                          size="sm"
                          variant="outline"
                          className="bg-gradient-to-r from-gray-600 to-gray-700 text-gray-400 border-0 font-mono text-xs h-7 cursor-not-allowed"
                          title={adminStatuses[user.id] ? "Admin accounts cannot be reset" : "You cannot reset your own account"}
                        >
                          <Shield className="h-2.5 w-2.5 mr-1" />
                          Protected
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowResetConfirm(true);
                          }}
                          size="sm"
                          variant="outline"
                          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border-0 font-mono text-xs h-7"
                        >
                          <Trash2 className="h-2.5 w-2.5 mr-1" />
                          Reset
                        </Button>
                      )}
                      {/* Delete, Instant Delete, and Stop Deletion buttons */}
                      {adminStatuses[user.id] || user.id === currentUser?.id ? (
                        <Button
                          disabled
                          size="sm"
                          variant="outline"
                          className="bg-gradient-to-r from-gray-600 to-gray-700 text-gray-400 border-0 font-mono text-xs h-7 col-span-2 cursor-not-allowed"
                          title={adminStatuses[user.id] ? "Admin accounts cannot be deleted" : "You cannot delete your own account"}
                        >
                          <Shield className="h-2.5 w-2.5 mr-1" />
                          Protected
                        </Button>
                      ) : pendingDeletions[user.id] ? (
                        // If user has pending deletion, show both instant delete and stop deletion buttons
                        <>
                          <Button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowInstantDeleteConfirm(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="bg-gradient-to-r from-red-900 to-red-950 hover:from-red-800 hover:to-red-900 text-red-300 border border-red-500/50 font-mono text-xs h-7"
                          >
                            <Zap className="h-2.5 w-2.5 mr-1" />
                            Instant
                          </Button>
                          <Button
                            onClick={() => stopPendingDeletion(user.id)}
                            size="sm"
                            variant="outline"
                            className="bg-gradient-to-r from-green-700 to-green-800 hover:from-green-600 hover:to-green-700 text-green-300 border border-green-500/50 font-mono text-xs h-7"
                          >
                            <X className="h-2.5 w-2.5 mr-1" />
                            Stop
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteConfirm(true);
                          }}
                          size="sm"
                          variant="outline"
                          className="bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 text-white border-0 font-mono text-xs h-7 col-span-2"
                        >
                          <Trash2 className="h-2.5 w-2.5 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Private Notification Modal */}
      <Dialog open={showPrivateNotification} onOpenChange={setShowPrivateNotification}>
        <DialogContent className="max-w-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <MessageSquare className="h-5 w-5 text-green-400" />
              <span className="font-mono">PRIVATE NOTIFICATION</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedUser ? (
              <>
                <div className="text-center p-4 bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-lg border border-blue-500/30">
                  <div className="text-white font-mono mb-2">
                    Sending to user:
                  </div>
                  <div className="text-lg font-bold text-blue-400 font-mono">
                    {selectedUser.username}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    ID: {selectedUser.id}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-400 font-mono mb-2 block">
                      Priority Level:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['low', 'normal', 'urgent'] as NotificationLevel[]).map((level) => (
                        <Button
                          key={level}
                          onClick={() => setNotificationForm({ ...notificationForm, level })}
                          variant={notificationForm.level === level ? 'default' : 'outline'}
                          className={`font-mono ${
                            notificationForm.level === level
                              ? `bg-gradient-to-r from-${getLevelColor(level)}-600 to-${getLevelColor(level)}-700 text-white border-0`
                              : 'bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white'
                          }`}
                        >
                          {getLevelText(level)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 font-mono mb-2 block">
                      Title:
                    </label>
                    <input
                      type="text"
                      value={notificationForm.title}
                      onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                      placeholder="Enter notification title"
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-green-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 font-mono mb-2 block">
                      Message:
                    </label>
                    <textarea
                      value={notificationForm.message}
                      onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                      placeholder="Enter notification message"
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-green-500/50 resize-none"
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={() => {
                      setShowPrivateNotification(false);
                      setSelectedUser(null);
                      setNotificationForm({ title: '', message: '', level: 'normal' });
                    }}
                    variant="outline"
                    className="flex-1 bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white font-mono"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => selectedUser && sendPrivateNotification(selectedUser.id, notificationForm)}
                    disabled={sendingNotification || !notificationForm.title || !notificationForm.message}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white border-0 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingNotification ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Notification
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center p-8">
                <div className="text-slate-400 font-mono mb-4">
                  Select a user to send a private notification
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4 text-blue-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-white font-mono">{user.username}</div>
                            {/* Admin Shield Icon */}
                            {adminStatuses[user.id] && (
                              <div className="flex items-center text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)] animate-pulse" title="Admin User">
                                <Shield className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">ID: {user.id}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-yellow-400 font-mono">Lv.{user.level}</span>
                        <span className="text-green-400 font-mono">{user.xp} XP</span>
                        <span className="text-purple-400 font-mono">${user.balance}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Modal */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="font-mono">CONFIRM RESET</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-white font-mono mb-2">
                Reset statistics for user:
              </div>
              <div className="text-lg font-bold text-blue-400 font-mono mb-4">
                {selectedUser?.username}
              </div>
              <div className="text-sm text-slate-400 font-mono">
                This will reset ALL statistics including:
              </div>
              <div className="text-xs text-slate-500 font-mono mt-2 space-y-1">
                • Level and XP
                • Game statistics
                • Achievement progress
                • Case history
                • Daily cases
                • All achievements
              </div>
              <div className="text-sm text-green-400 font-mono mt-2">
                Balance will remain unchanged
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-sm text-slate-400 font-mono mb-2">
                  Type the username to confirm:
                </div>
                <input
                  type="text"
                  value={verificationText}
                  onChange={(e) => setVerificationText(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  setShowResetConfirm(false);
                  setVerificationText('');
                }}
                variant="outline"
                className="flex-1 bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white font-mono"
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedUser && resetUserStatsFinal(selectedUser.id)}
                disabled={resettingUser || verificationText !== selectedUser?.username}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border-0 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resettingUser ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Resetting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reset Statistics
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-mono">CONFIRM DELETION</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-white font-mono mb-2">
                Delete account for user:
              </div>
              <div className="text-lg font-bold text-red-400 font-mono mb-4">
                {selectedUser?.username}
              </div>
              <div className="text-sm text-slate-400 font-mono">
                This will PERMANENTLY DELETE:
              </div>
              <div className="text-xs text-slate-500 font-mono mt-2 space-y-1">
                • Complete user account
                • All game history and statistics
                • All achievements and progress
                • All notifications and data
                • Authentication credentials
                • Email can be reused for new registration
              </div>
              <div className="text-sm text-red-400 font-mono mt-2">
                ⚠️ This action is IRREVERSIBLE
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-sm text-slate-400 font-mono mb-2">
                  Type the username to confirm:
                </div>
                <input
                  type="text"
                  value={deleteVerificationText}
                  onChange={(e) => setDeleteVerificationText(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                />
              </div>
              
              <div className="text-center">
                <div className="text-sm text-slate-400 font-mono mb-2">
                  Type "DELETE" to confirm:
                </div>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteVerificationText('');
                  setDeleteConfirmText('');
                }}
                variant="outline"
                className="flex-1 bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white font-mono"
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedUser && deleteUserAccount(selectedUser.id)}
                disabled={deletingUser || deleteVerificationText !== selectedUser?.username || deleteConfirmText !== 'DELETE'}
                className="flex-1 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 text-white border-0 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingUser ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instant Delete Confirmation Modal */}
      <Dialog open={showInstantDeleteConfirm} onOpenChange={setShowInstantDeleteConfirm}>
        <DialogContent className="max-w-md bg-slate-900/95 backdrop-blur-xl border border-red-500/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <Zap className="h-5 w-5 text-red-600" />
              <span className="font-mono">INSTANT DELETION</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-white font-mono mb-2">
                Instantly delete account for user:
              </div>
              <div className="text-lg font-bold text-red-400 font-mono mb-4">
                {selectedUser?.username}
              </div>
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 mb-4">
                <div className="text-sm text-red-300 font-mono">
                  ⚡ This will SKIP the 24-hour waiting period
                </div>
                <div className="text-xs text-red-400 font-mono mt-1">
                  User will be deleted IMMEDIATELY
                </div>
              </div>
              <div className="text-sm text-slate-400 font-mono">
                This will PERMANENTLY DELETE:
              </div>
              <div className="text-xs text-slate-500 font-mono mt-2 space-y-1">
                • Complete user account
                • All game history and statistics
                • All achievements and progress
                • All notifications and data
                • Authentication credentials
                • Email can be reused for new registration
              </div>
              <div className="text-sm text-red-400 font-mono mt-2">
                ⚠️ This action is IRREVERSIBLE
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-sm text-slate-400 font-mono mb-2">
                  Type the username to confirm:
                </div>
                <input
                  type="text"
                  value={instantDeleteVerificationText}
                  onChange={(e) => setInstantDeleteVerificationText(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  setShowInstantDeleteConfirm(false);
                  setInstantDeleteVerificationText('');
                }}
                variant="outline"
                className="flex-1 bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white font-mono"
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedUser && instantDeleteUserAccount(selectedUser.id)}
                disabled={instantDeletingUser || instantDeleteVerificationText !== selectedUser?.username}
                className="flex-1 bg-gradient-to-r from-red-900 to-red-950 hover:from-red-800 hover:to-red-900 text-white border-0 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {instantDeletingUser ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Instant Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Role Confirmation Modal */}
      <Dialog open={showAdminRoleModal} onOpenChange={setShowAdminRoleModal}>
        <DialogContent className="max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-white">
              <Shield className="h-5 w-5 text-blue-400" />
              <span className="font-mono">
                {adminRoleAction === 'add' ? 'MAKE ADMIN' : 'REMOVE ADMIN'}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-slate-300 font-mono">
              {adminRoleAction === 'add' ? (
                <p>
                  Are you sure you want to make <span className="text-blue-400 font-bold">{selectedUser?.username}</span> an admin?
                </p>
              ) : (
                <p>
                  Are you sure you want to remove admin privileges from <span className="text-orange-400 font-bold">{selectedUser?.username}</span>?
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/30">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-yellow-300 font-mono">
                {adminRoleAction === 'add' 
                  ? 'This will give the user full admin access to the platform.'
                  : 'This will remove all admin privileges from the user.'
                }
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => {
                  if (selectedUser) {
                    handleAdminRoleChange(selectedUser.id, adminRoleAction);
                  }
                }}
                disabled={adminRoleLoading}
                className={cn(
                  "flex-1 font-mono",
                  adminRoleAction === 'add'
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white border-0"
                    : "bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white border-0"
                )}
              >
                {adminRoleLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    {adminRoleAction === 'add' ? 'Make Admin' : 'Remove Admin'}
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => {
                  setShowAdminRoleModal(false);
                  setSelectedUser(null);
                }}
                variant="outline"
                className="flex-1 bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700/50 font-mono"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}