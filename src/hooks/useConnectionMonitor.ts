import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConnectionStatus {
  isOnline: boolean;
  isSupabaseConnected: boolean;
  lastError: string | null;
  reconnectAttempts: number;
}

export const useConnectionMonitor = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: navigator.onLine,
    isSupabaseConnected: true,
    lastError: null,
    reconnectAttempts: 0
  });
  
  const { toast } = useToast();
  const healthCheckIntervalRef = useRef<NodeJS.Timeout>();
  const hasShownOfflineToast = useRef(false);
  const hasShownOnlineToast = useRef(false);

  // Monitor browser online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus(prev => ({ ...prev, isOnline: true }));
      
      if (hasShownOfflineToast.current && !hasShownOnlineToast.current) {
        toast({
          title: "🌐 Connection Restored",
          description: "You're back online! Games are now available.",
          duration: 3000,
        });
        hasShownOnlineToast.current = true;
        hasShownOfflineToast.current = false;
      }
    };

    const handleOffline = () => {
      setConnectionStatus(prev => ({ 
        ...prev, 
        isOnline: false,
        lastError: 'No internet connection'
      }));
      
      if (!hasShownOfflineToast.current) {
        toast({
          title: "⚠️ Connection Lost",
          description: "Check your internet connection. Games may not work properly.",
          variant: "destructive",
          duration: 5000,
        });
        hasShownOfflineToast.current = true;
        hasShownOnlineToast.current = false;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Monitor Supabase connection health
  useEffect(() => {
    const checkSupabaseHealth = async () => {
      try {
        // Simple health check - try to fetch maintenance status
        const { data, error } = await supabase.rpc('get_maintenance_status');
        
        if (error) {
          throw new Error(`Supabase error: ${error.message}`);
        }
        
        // If we get here, connection is healthy
        setConnectionStatus(prev => {
          if (!prev.isSupabaseConnected) {
            toast({
              title: "🎮 Game Server Connected",
              description: "Connection to game server restored.",
              duration: 3000,
            });
          }
          
          return {
            ...prev,
            isSupabaseConnected: true,
            lastError: null,
            reconnectAttempts: 0
          };
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
        
        setConnectionStatus(prev => {
          const newAttempts = prev.reconnectAttempts + 1;
          
          // Only show error toast on first failure or every 5th attempt
          if (!prev.lastError || newAttempts % 5 === 0) {
            toast({
              title: "⚠️ Game Server Connection Issue",
              description: "Having trouble connecting to game servers. Retrying...",
              variant: "destructive",
              duration: 4000,
            });
          }
          
          return {
            ...prev,
            isSupabaseConnected: false,
            lastError: errorMessage,
            reconnectAttempts: newAttempts
          };
        });
      }
    };

    // Initial health check
    checkSupabaseHealth();

    // Set up periodic health checks every 30 seconds
    healthCheckIntervalRef.current = setInterval(() => {
      // Only check if browser is online
      if (navigator.onLine) {
        checkSupabaseHealth();
      }
    }, 30000);

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [toast]);

  // Enhanced error handler for game operations
  const handleGameError = (error: Error, context: string) => {
    // Check if it's a connection-related error
    const isConnectionError = error.message.toLowerCase().includes('fetch') ||
                            error.message.toLowerCase().includes('network') ||
                            error.message.toLowerCase().includes('timeout') ||
                            error.message.toLowerCase().includes('connection');
    
    // Check if it's a subscription error (often normal during cleanup)
    const isSubscriptionError = error.message.toLowerCase().includes('subscription') &&
                               (error.message.toLowerCase().includes('closed') ||
                                error.message.toLowerCase().includes('channel_error'));
    
    if (isSubscriptionError) {
      // For subscription errors, just update status without showing user notification
      setConnectionStatus(prev => ({
        ...prev,
        lastError: `${context}: ${error.message}`,
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
    } else if (isConnectionError) {
      toast({
        title: "🎮 Connection Error",
        description: `Failed to connect to game server. Please try again.`,
        variant: "destructive",
        duration: 5000,
      });
      
      setConnectionStatus(prev => ({
        ...prev,
        lastError: `${context}: ${error.message}`,
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
    } else {
      toast({
        title: "❌ Game Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  return {
    connectionStatus,
    handleGameError,
    isHealthy: connectionStatus.isOnline && connectionStatus.isSupabaseConnected
  };
};