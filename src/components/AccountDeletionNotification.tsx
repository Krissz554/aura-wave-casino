import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Clock, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AccountDeletionNotificationProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountDeletionNotification({ isOpen, onClose }: AccountDeletionNotificationProps) {
  const [timeLeft, setTimeLeft] = useState(15);
  const { signOut } = useAuth();

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Logout the user
          signOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, signOut]);

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(15);
    }
  }, [isOpen]);

  const handleLogoutNow = () => {
    signOut();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md bg-slate-900/95 backdrop-blur-xl border border-red-500/50">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-white">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="font-mono">ACCOUNT DELETED</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 flex items-center justify-center">
            <LogOut className="w-8 h-8 text-red-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white font-mono">Account Permanently Deleted</h3>
            <p className="text-slate-400 text-sm font-mono">
              Your account has been permanently deleted by an administrator.
            </p>
            <p className="text-slate-500 text-xs font-mono">
              All your data, statistics, and progress have been completely removed.
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="h-4 w-4 text-orange-400" />
              <span className="text-orange-400 font-mono font-semibold">
                Logging out in {timeLeft} seconds
              </span>
            </div>
            
            <div className="w-full bg-slate-700/30 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${((15 - timeLeft) / 15) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="pt-2">
            <button
              onClick={handleLogoutNow}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border-0 font-mono rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2 inline" />
              Logout Now
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}