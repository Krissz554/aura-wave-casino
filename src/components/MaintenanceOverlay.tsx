import React, { useState } from 'react';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Wrench, Clock, Shield, Settings, RefreshCw } from 'lucide-react';
import AdminPanel from './AdminPanel';

export default function MaintenanceOverlay() {
  const { maintenanceStatus, loading, isMaintenanceMode } = useMaintenance();
  const { user } = useAuth();
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  // Check admin status when user is authenticated
  React.useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }

      try {
        // Try the robust admin check function
        const { data: adminCheck, error: adminError } = await supabase.rpc('check_admin_status_simple', {
      user_uuid: user.id
    });
        if (!adminError && adminCheck !== null) {
          setIsAdmin(adminCheck);
        } else {
          // Fallback to direct table access
          const { data, error } = await supabase
            .from('admin_users')
            .select('user_id, permissions, created_at')
            .eq('user_id', '5b9c6d6c-1c2e-4609-91d1-6e706b93f315')
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error checking admin status:', error);
          }
          setIsAdmin(!!data);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
      } finally {
        setAdminLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-8 flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isMaintenanceMode) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 max-w-lg w-full text-center shadow-glow border border-border relative overflow-hidden">
          {/* Animated background gradient - matches site theme */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 animate-pulse-glow"></div>
          
          {/* Admin Access Button - Only show for admin users */}
          {user && !adminLoading && isAdmin && (
            <button
              onClick={() => setShowAdminPanel(true)}
              className="absolute top-4 right-4 p-3 gradient-primary text-white rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-glow hover:shadow-xl transform hover:scale-105 z-10"
            >
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Admin</span>
            </button>
          )}
          
          {/* Main content */}
          <div className="relative z-10">
            {/* Icon with animated background - matches site colors */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl opacity-40 animate-pulse-glow"></div>
                <div className="relative bg-gradient-to-r from-primary to-accent p-4 rounded-full shadow-glow">
                  <Wrench className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>

            {/* Title with gradient text - matches site theme */}
            <h1 className="text-4xl font-bold mb-4 gradient-primary bg-clip-text text-transparent">
              {maintenanceStatus?.maintenance_title || 'Under Maintenance'}
            </h1>

            {/* Message */}
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              {maintenanceStatus?.maintenance_message || 'Website is currently under maintenance. Please check back soon.'}
            </p>

            {/* Status Info - matches site colors */}
            {maintenanceStatus?.started_at && (
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground mb-6 bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
                <Clock className="h-4 w-4 text-primary" />
                <span>
                  Started: {new Date(maintenanceStatus.started_at).toLocaleString()}
                </span>
              </div>
            )}

            {/* Animated dots - matches site color scheme */}
            <div className="flex justify-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>

            {/* Auto-refresh notice */}
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground mb-4">
              <RefreshCw className="h-4 w-4 animate-spin text-accent" />
              <span>This page will automatically refresh when maintenance is complete.</span>
            </div>

            {/* Admin notice for admin users - matches site styling */}
            {user && !adminLoading && isAdmin && (
              <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                <p className="text-sm text-primary flex items-center justify-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin access available - Click the Admin button to control maintenance mode.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

    {/* Admin Panel Modal */}
    {showAdminPanel && (
      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />
    )}
  </>
  );
}