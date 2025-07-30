import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MaintenanceToggle from './MaintenanceToggle';
import { Shield, Settings, Users, Activity, Bell, AlertTriangle, Cpu, Database, Server, Terminal, Zap, Lock, Eye, EyeOff } from 'lucide-react';
import { PushNotificationForm } from './PushNotificationForm';

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

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPushNotification, setShowPushNotification] = useState(false);
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

  // Check system status
  const checkSystemStatus = async () => {
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
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking admin status:', error);
        }

        setIsAdmin(!!data);
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Check system status when admin panel opens
  useEffect(() => {
    if (isOpen && isAdmin) {
      checkSystemStatus();
      
      // Set up periodic health checks
      const interval = setInterval(checkSystemStatus, 10000); // Check every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [isOpen, isAdmin]);

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

  return (
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
                    {/* Add user count here */}
                    -
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
              <CardTitle className="flex items-center space-x-2 text-white">
                <Server className="h-5 w-5 text-green-400" />
                <span className="font-mono">SYSTEM STATUS</span>
              </CardTitle>
              <CardDescription className="text-slate-400 font-mono">
                Real-time system health and performance
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
                <Button variant="outline" className="h-auto p-4 flex items-center justify-between bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50 text-white font-mono">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-blue-400" />
                    <span>USER MANAGEMENT</span>
                  </div>
                  <span className="text-xs text-slate-500">COMING SOON</span>
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
  );
}