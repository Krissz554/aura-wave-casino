import React, { useState, useEffect } from 'react';
import { usePendingDeletion } from '@/hooks/usePendingDeletion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  Clock, 
  Shield, 
  LogOut, 
  RefreshCw, 
  Calendar,
  User,
  Trash2,
  Lock,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

export default function AccountDeletionOverlay() {
  const { pendingDeletion, loading, hasPendingDeletion, refreshPendingDeletion } = usePendingDeletion();
  const { signOut } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  // Disable scrolling and all interactions when overlay is shown
  useEffect(() => {
    if (hasPendingDeletion && !loading) {
      // Disable scrolling
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      
      // Add class to prevent any interactions with background
      document.body.classList.add('account-deletion-locked');
      document.documentElement.classList.add('account-deletion-locked');
      
      // Prevent all keyboard interactions except for our overlay
      const handleKeyDown = (e: KeyboardEvent) => {
        // Allow only Tab, Enter, Space, and Escape for accessibility
        const allowedKeys = ['Tab', 'Enter', ' ', 'Escape'];
        if (!allowedKeys.includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      // Prevent right-click context menu
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
      };

      // Prevent text selection
      const handleSelectStart = (e: Event) => {
        const target = e.target as HTMLElement;
        // Allow selection only within our overlay
        if (!target.closest('[data-account-deletion-overlay]')) {
          e.preventDefault();
        }
      };

      // Prevent mouse wheel scrolling
      const handleWheel = (e: WheelEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-account-deletion-overlay]')) {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      // Prevent touch scrolling on mobile
      const handleTouchMove = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-account-deletion-overlay]')) {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      // Prevent drag and drop
      const handleDragStart = (e: DragEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-account-deletion-overlay]')) {
          e.preventDefault();
        }
      };

      document.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener('contextmenu', handleContextMenu, true);
      document.addEventListener('selectstart', handleSelectStart, true);
      document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
      document.addEventListener('dragstart', handleDragStart, true);

      return () => {
        // Re-enable scrolling
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        
        // Remove lock class
        document.body.classList.remove('account-deletion-locked');
        document.documentElement.classList.remove('account-deletion-locked');
        
        // Remove event listeners
        document.removeEventListener('keydown', handleKeyDown, true);
        document.removeEventListener('contextmenu', handleContextMenu, true);
        document.removeEventListener('selectstart', handleSelectStart, true);
        document.removeEventListener('wheel', handleWheel);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('dragstart', handleDragStart, true);
      };
    }
  }, [hasPendingDeletion, loading]);

  // Calculate time remaining until deletion
  useEffect(() => {
    if (!pendingDeletion) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const deletionTime = new Date(pendingDeletion.scheduled_deletion_time);
      const timeDiff = deletionTime.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setTimeRemaining('Account deletion is overdue');
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`);
      } else {
        setTimeRemaining(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [pendingDeletion]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPendingDeletion();
    setRefreshing(false);
    
    if (!hasPendingDeletion) {
      toast({
        title: "Account Status Updated",
        description: "Your account deletion has been cancelled. You can now use the site normally.",
        duration: 5000,
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Don't show overlay if loading or no pending deletion
  if (loading || !hasPendingDeletion || !pendingDeletion) {
    return null;
  }

  const initiatedDate = new Date(pendingDeletion.initiated_at).toLocaleDateString();
  const scheduledDate = new Date(pendingDeletion.scheduled_deletion_time).toLocaleDateString();
  const scheduledTime = new Date(pendingDeletion.scheduled_deletion_time).toLocaleTimeString();

  return (
    <div 
      className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      data-account-deletion-overlay
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-orange-900/20 to-yellow-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,0,0,0.1),transparent_50%)]" />
      </div>

      <Card className="relative w-full max-w-2xl bg-slate-900/95 border-red-500/50 shadow-2xl shadow-red-500/20 select-text">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse" />
              <div className="relative bg-red-500/10 p-6 rounded-full border border-red-500/30">
                <AlertTriangle className="w-12 h-12 text-red-400" />
              </div>
            </div>
          </div>
          
          <CardTitle className="text-2xl font-bold text-red-400 mb-2">
            Account Scheduled for Deletion
          </CardTitle>
          
          <CardDescription className="text-slate-300 text-lg">
            Your account has been marked for deletion by an administrator
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Deletion Details */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-red-500/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-slate-400">Initiated On</p>
                  <p className="text-white font-medium">{initiatedDate}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Trash2 className="w-4 h-4 text-red-400" />
                <div>
                  <p className="text-slate-400">Scheduled Deletion</p>
                  <p className="text-red-400 font-medium">{scheduledDate} at {scheduledTime}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Time Remaining */}
          <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 rounded-lg p-4 border border-red-500/30">
            <div className="flex items-center justify-center space-x-3">
              <Clock className="w-5 h-5 text-red-400 animate-pulse" />
              <div className="text-center">
                <p className="text-slate-400 text-sm">Time Remaining</p>
                <p className="text-red-400 font-bold text-xl">{timeRemaining}</p>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-500/30">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-medium mb-2">Important Notice</p>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Your account and all associated data will be permanently deleted at the scheduled time. 
                  This action cannot be undone. If you believe this is an error, please contact support immediately.
                </p>
              </div>
            </div>
          </div>

          {/* Account Locked Message */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
            <div className="flex items-center justify-center space-x-3">
              <Lock className="w-5 h-5 text-slate-400" />
              <p className="text-slate-300 text-center">
                Your account is currently locked and cannot access the casino features
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="flex-1 bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {refreshing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Check Status
            </Button>
            
            <Button
              onClick={handleSignOut}
              variant="destructive"
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Support Contact */}
          <div className="pt-4 border-t border-slate-700">
            <p className="text-center text-slate-400 text-sm">
              Need help? Contact support or reach out to an administrator
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}