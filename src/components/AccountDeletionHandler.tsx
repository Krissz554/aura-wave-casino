import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Clock, LogOut, Trash2, Shield, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Supabase configuration for Edge Function calls
const SUPABASE_URL = "https://hqdbdczxottbupwbupdu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZGJkY3p4b3R0YnVwd2J1cGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTU2MjQsImV4cCI6MjA2ODY5MTYyNH0.HVC17e9vmf0qV5Qn2qdf7t1U9T0Im8v7jf7cpZZqmNQ";

interface AccountDeletionHandlerProps {
  isOpen: boolean;
  onClose: () => void;
  deletionTime: string;
}

export default function AccountDeletionHandler({ isOpen, onClose, deletionTime }: AccountDeletionHandlerProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionCompleted, setDeletionCompleted] = useState(false);
  const [deletionCancelled, setDeletionCancelled] = useState(false);
  const { signOut, user } = useAuth();
  const { toast } = useToast();

  // Listen for deletion cancellation
  useEffect(() => {
    if (!isOpen || !user) return;

    // Set up real-time listener for cancellation events
    const channel = supabase.channel(`user-${user.id}`);
    
    channel.on('broadcast', { event: 'deletion_cancelled' }, (payload) => {
      console.log('Deletion cancellation received:', payload);
      setDeletionCancelled(true);
      toast({
        title: "Deletion Cancelled",
        description: "Your account deletion has been cancelled by an administrator.",
      });
      
      // Close the deletion handler after a short delay
      setTimeout(() => {
        onClose();
      }, 3000);
    });

    channel.subscribe();

    // Also check for cancellation notifications
    const checkCancellationStatus = async () => {
      try {
        const { data: notifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'admin_message')
          .like('title', '%Deletion Cancelled%')
          .order('created_at', { ascending: false })
          .limit(1);

        if (notifications && notifications.length > 0) {
          console.log('Found cancellation notification:', notifications[0]);
          setDeletionCancelled(true);
          toast({
            title: "Deletion Cancelled",
            description: "Your account deletion has been cancelled by an administrator.",
          });
          
          setTimeout(() => {
            onClose();
          }, 3000);
        }
      } catch (error) {
        console.error('Error checking cancellation status:', error);
      }
    };

    // Check immediately and then periodically
    checkCancellationStatus();
    const cancellationCheckInterval = setInterval(checkCancellationStatus, 5000);

    return () => {
      channel.unsubscribe();
      clearInterval(cancellationCheckInterval);
    };
  }, [isOpen, user, onClose, toast]);

  useEffect(() => {
    if (!isOpen || deletionCancelled) return;

    const targetTime = new Date(deletionTime).getTime();
    const now = Date.now();
    const initialTimeLeft = Math.max(0, Math.floor((targetTime - now) / 1000));
    
    setTimeLeft(initialTimeLeft);

    const timer = setInterval(() => {
      const currentTime = Date.now();
      const remaining = Math.max(0, Math.floor((targetTime - currentTime) / 1000));
      
      setTimeLeft(remaining);
      
      if (remaining <= 0 && !deletionCancelled) {
        clearInterval(timer);
        setIsDeleting(true);
        // Trigger the deletion immediately when countdown reaches zero
        performAccountDeletion();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, deletionTime, deletionCancelled]);

  const performAccountDeletion = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // User already deleted somehow
        setDeletionCompleted(true);
        setTimeout(() => {
          signOut();
        }, 3000);
        return;
      }

      const userId = user.id;
      console.log('=== PERFORMING CLIENT-SIDE ACCOUNT DELETION ===');
      console.log('User ID:', userId);
      console.log('Deletion time:', deletionTime);

      // Try to use the new process-pending-deletions function first
      console.log('Attempting to trigger server-side deletion...');
      try {
                          const processingResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-pending-deletions`, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
           }
         });

        if (processingResponse.ok) {
          const processingResult = await processingResponse.json();
          console.log('Server processing result:', processingResult);
          
          if (processingResult.processed_count > 0) {
            console.log('✅ Deletion processed by server');
            setDeletionCompleted(true);
            setTimeout(() => {
              signOut();
            }, 3000);
            return;
          }
        }
      } catch (error) {
        console.log('Server processing not available, falling back to direct deletion:', error);
      }

      // Fallback to direct Edge Function call
      console.log('Calling delete-user-account Edge Function...');
      const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-user-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          user_id: userId,
          deletion_time: deletionTime
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const deletionResult = await response.json();
      console.log('Deletion result:', deletionResult);

      if (deletionResult.success) {
        console.log('✅ Account deletion completed successfully');
        setDeletionCompleted(true);
        
        toast({
          title: "Account Deleted",
          description: "Your account has been completely removed from the system.",
        });
        
        setTimeout(() => {
          signOut();
        }, 3000);
      } else {
        console.error('❌ Account deletion failed');
        console.error('Errors:', deletionResult.errors || 'Unknown error');
        
        toast({
          title: "Deletion Error",
          description: "Failed to delete account completely. You will be logged out.",
          variant: "destructive",
        });
        
        setTimeout(() => {
          signOut();
        }, 5000);
      }

    } catch (error) {
      console.error('Error during account deletion:', error);
      toast({
        title: "Deletion Error",
        description: "An error occurred during account deletion. You will be logged out.",
        variant: "destructive",
      });
      
      // Still logout even if deletion fails
      setTimeout(() => {
        signOut();
      }, 5000);
    }
  };

  const checkDeletionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // User has been deleted successfully
        setDeletionCompleted(true);
        setTimeout(() => {
          signOut();
        }, 3000);
        return;
      }

      // Check for completion notification
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'admin_message')
        .like('title', '%Account Deletion%')
        .order('created_at', { ascending: false })
        .limit(5);

      const completionNotification = notifications?.find(n => 
        n.title.includes('Completed') || n.data?.deletion_completed
      );

      if (completionNotification) {
        setDeletionCompleted(true);
        setTimeout(() => {
          signOut();
        }, 3000);
      } else {
        // Keep checking
        setTimeout(() => {
          checkDeletionStatus();
        }, 2000);
      }
    } catch (error) {
      console.error('Error checking deletion status:', error);
      // If we can't check, assume deletion completed
      setDeletionCompleted(true);
      setTimeout(() => {
        signOut();
      }, 3000);
    }
  };

  const handleLogoutNow = () => {
    signOut();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Full Screen Overlay */}
      <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-lg">
        {/* Animated Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-red-600/10 rounded-full blur-3xl animate-pulse delay-2000" />
        </div>

        {/* Animated Circuit Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(239,68,68,0.3)_25%,rgba(239,68,68,0.3)_26%,transparent_27%,transparent_74%,rgba(239,68,68,0.3)_75%,rgba(239,68,68,0.3)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(239,68,68,0.3)_25%,rgba(239,68,68,0.3)_26%,transparent_27%,transparent_74%,rgba(239,68,68,0.3)_75%,rgba(239,68,68,0.3)_76%,transparent_77%,transparent)] bg-[20px_20px] animate-pulse" />
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="max-w-lg w-full">
            {/* Lock Icon and Alert */}
            <div className="text-center mb-8">
              <div className="relative mx-auto w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full border border-red-500/30 animate-pulse" />
                <div className="absolute inset-2 bg-gradient-to-br from-red-600/30 to-red-700/30 rounded-full flex items-center justify-center">
                  <Lock className="w-8 h-8 text-red-400" />
                </div>
                <div className="absolute -inset-1 border border-red-500/20 rounded-full animate-ping" />
              </div>
              
              <h1 className="text-3xl font-bold text-white font-mono mb-2">SITE LOCKED</h1>
              <p className="text-red-400 font-mono text-lg mb-1">ACCOUNT DELETION IN PROGRESS</p>
              <p className="text-slate-400 font-mono text-sm">Administrator has initiated account deletion</p>
            </div>

            {/* Countdown Display */}
            <div className={`bg-slate-900/80 border rounded-2xl p-8 backdrop-blur-xl ${
              deletionCancelled ? 'border-green-500/30' : 'border-red-500/30'
            }`}>
              <div className="text-center space-y-6">
                {deletionCancelled ? (
                  <>
                    <div className="flex items-center justify-center space-x-3">
                      <Shield className="h-6 w-6 text-green-400" />
                      <span className="text-xl font-bold text-green-400 font-mono">
                        DELETION CANCELLED
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-green-400 font-mono">Your account is now safe!</p>
                      <p className="text-slate-400 font-mono text-sm">
                        An administrator has cancelled your account deletion.
                      </p>
                      <p className="text-slate-500 font-mono text-xs">
                        This window will close automatically.
                      </p>
                    </div>
                  </>
                ) : !isDeleting ? (
                  <>
                    <div className="flex items-center justify-center space-x-3">
                      <Clock className="h-6 w-6 text-orange-400 animate-pulse" />
                      <span className="text-2xl font-bold text-orange-400 font-mono">
                        {timeLeft}
                      </span>
                      <span className="text-orange-400 font-mono">
                        {timeLeft === 1 ? 'SECOND' : 'SECONDS'}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-white font-mono">Deletion will commence in:</p>
                      <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-red-500 to-orange-500 h-3 rounded-full transition-all duration-1000 animate-pulse"
                          style={{ width: `${((30 - timeLeft) / 30) * 100}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : !deletionCompleted ? (
                  <>
                    <div className="flex items-center justify-center space-x-3">
                      <Trash2 className="h-6 w-6 text-red-400 animate-pulse" />
                      <span className="text-xl font-bold text-red-400 font-mono">
                        DELETING ACCOUNT...
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-slate-400 font-mono text-sm">
                        Server is processing account deletion
                      </p>
                      <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full animate-pulse w-full" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center space-x-3">
                      <Shield className="h-6 w-6 text-green-400" />
                      <span className="text-xl font-bold text-green-400 font-mono">
                        DELETION COMPLETED
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-slate-400 font-mono text-sm">
                        Account has been permanently deleted
                      </p>
                      <p className="text-slate-500 font-mono text-xs">
                        You will be logged out automatically
                      </p>
                    </div>
                  </>
                )}

                {/* Warning Message */}
                <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <p className="text-red-400 font-mono text-sm font-semibold mb-1">
                        WARNING: This action is irreversible
                      </p>
                      <p className="text-slate-400 font-mono text-xs">
                        All your data, progress, and account information will be permanently deleted.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                {!deletionCompleted && !deletionCancelled && (
                  <div className="pt-4">
                    <button
                      onClick={handleLogoutNow}
                      disabled={isDeleting}
                      className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border-0 font-mono rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LogOut className="h-4 w-4 mr-2 inline" />
                      {isDeleting ? 'Processing...' : 'Logout Immediately'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 text-center">
              <p className="text-slate-500 font-mono text-xs">
                This deletion process will continue even if you close your browser
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}