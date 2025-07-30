import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Clock, LogOut, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface AccountDeletionHandlerProps {
  isOpen: boolean;
  onClose: () => void;
  deletionTime: string;
}

export default function AccountDeletionHandler({ isOpen, onClose, deletionTime }: AccountDeletionHandlerProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [isDeleting, setIsDeleting] = useState(false);
  const { signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    const targetTime = new Date(deletionTime).getTime();
    const now = Date.now();
    const initialTimeLeft = Math.max(0, Math.floor((targetTime - now) / 1000));
    
    setTimeLeft(initialTimeLeft);

    const timer = setInterval(() => {
      const currentTime = Date.now();
      const remaining = Math.max(0, Math.floor((targetTime - currentTime) / 1000));
      
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(timer);
        performAccountDeletion();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, deletionTime]);

  const performAccountDeletion = async () => {
    setIsDeleting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        signOut();
        return;
      }

      const userId = user.id;
      console.log('=== PERFORMING ACCOUNT DELETION ===');
      console.log('User ID:', userId);

      // Call the database function to handle complete account deletion
      console.log('Calling delete_user_account_complete database function...');
      
      const { data, error } = await supabase.rpc('delete_user_account_complete', {
        user_id_to_delete: userId
      });

      if (error) {
        console.error('Error calling delete_user_account_complete function:', error);
        toast({
          title: "Deletion Error",
          description: "Failed to delete account data. You will be logged out.",
          variant: "destructive",
        });
      } else {
        console.log('Account deletion completed successfully:', data);
        
        // Now try to delete from Supabase Auth
        console.log('Attempting to delete from Supabase Auth...');
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);
        
        if (authError) {
          console.error('Error deleting from Supabase Auth:', authError);
          toast({
            title: "Partial Deletion",
            description: "Account data deleted but authentication removal failed. You will be logged out.",
            variant: "destructive",
          });
        } else {
          console.log('User deleted from Supabase Auth successfully');
          toast({
            title: "Account Deleted",
            description: "Your account has been completely removed from the system.",
          });
        }
      }

      // Logout the user regardless of deletion success/failure
      signOut();
      
    } catch (error) {
      console.error('Error during account deletion:', error);
      toast({
        title: "Deletion Error",
        description: "An error occurred during account deletion. You will be logged out.",
        variant: "destructive",
      });
      // Still logout even if deletion fails
      signOut();
    }
  };

  const handleLogoutNow = () => {
    signOut();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md bg-slate-900/95 backdrop-blur-xl border border-red-500/50">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-white">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="font-mono">ACCOUNT DELETION</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-red-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white font-mono">Account Deletion Initiated</h3>
            <p className="text-slate-400 text-sm font-mono">
              Your account has been marked for deletion by an administrator.
            </p>
            <p className="text-slate-500 text-xs font-mono">
              All your data will be permanently deleted in {timeLeft} seconds.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="h-4 w-4 text-orange-400" />
              <span className="text-orange-400 font-mono font-semibold">
                {timeLeft} seconds remaining
              </span>
            </div>
            
            <div className="w-full bg-slate-700/30 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${((30 - timeLeft) / 30) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="pt-2">
            <button
              onClick={handleLogoutNow}
              disabled={isDeleting}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border-0 font-mono rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="h-4 w-4 mr-2 inline" />
              {isDeleting ? 'Deleting...' : 'Logout Now'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}