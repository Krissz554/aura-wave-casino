import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function InstantDeletionHandler() {
  const { user, signOut } = useAuth();
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!user) return;

    mountedRef.current = true;

    // Set up real-time channel for instant deletion broadcasts
    // This channel name must match the one used in AdminPanel.tsx
    const userChannel = supabase.channel(`user-${user.id}`);
    
    userChannel
      .on('broadcast', { event: 'instant_deletion_initiated' }, async (payload) => {
        if (!mountedRef.current) return;

        console.log('🚨 INSTANT DELETION: Broadcast received for user:', user.id, payload);
        
        // Show immediate notification with countdown
        toast({
          title: "⚡ Account Deletion - Immediate",
          description: "Your account deletion has been expedited by an administrator. You will be logged out in 3 seconds...",
          variant: "destructive",
          duration: 5000,
        });

        // Show a second toast after 1 second
        setTimeout(() => {
          if (!mountedRef.current) return;
          
          toast({
            title: "🚪 Logging Out...",
            description: "Your session is being terminated due to account deletion.",
            variant: "destructive",
            duration: 3000,
          });
        }, 1000);

        // Force logout after 3 seconds to give user time to see the message
        setTimeout(async () => {
          if (!mountedRef.current) return;

          console.log('🚨 INSTANT DELETION: Forcing logout for user:', user.id);
          
          try {
            await signOut();
            console.log('✅ INSTANT DELETION: User successfully logged out');
          } catch (error) {
            console.error('❌ INSTANT DELETION: Error during forced logout:', error);
            
            // Fallback: Force page redirect if signOut fails
            try {
              // Clear any stored auth tokens
              localStorage.clear();
              sessionStorage.clear();
              
              // Force redirect to home page
              window.location.href = '/';
            } catch (redirectError) {
              console.error('❌ INSTANT DELETION: Even redirect failed:', redirectError);
              // Last resort: reload the entire page
              window.location.reload();
            }
          }
        }, 3000);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`📡 Instant deletion handler subscribed for user: ${user.id}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Instant deletion channel error for user:', user.id);
        }
      });

    // Cleanup function
    return () => {
      mountedRef.current = false;
      console.log(`📡 Cleaning up instant deletion handler for user: ${user.id}`);
      userChannel.unsubscribe();
    };
  }, [user, signOut]);

  // This component doesn't render anything
  return null;
}