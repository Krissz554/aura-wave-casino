import React, { useState } from 'react';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Wrench, Clock, Shield, Settings, RefreshCw, AlertTriangle, Zap, Terminal, Cpu, Database, Server, Wifi, WifiOff } from 'lucide-react';
import AdminPanel from './AdminPanel';
import { cn } from '@/lib/utils';

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
      <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center">
        {/* Cyberpunk Loading Environment */}
        <div className="absolute inset-0">
          {/* Animated Circuit Board Grid */}
          <div className="absolute inset-0 opacity-[0.15]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.5)_1px,transparent_0)] bg-[20px_20px] animate-grid-move-slow" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent)] bg-[40px_40px]" />
          </div>
          
          {/* Dynamic Energy Lines */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/30 to-transparent animate-energy-flow" />
            <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-accent/30 to-transparent animate-energy-flow delay-1000" />
            <div className="absolute top-0 left-2/3 w-px h-full bg-gradient-to-b from-transparent via-primary/25 to-transparent animate-energy-flow delay-2000" />
            
            <div className="absolute left-0 top-1/4 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-energy-flow-horizontal" />
            <div className="absolute left-0 bottom-1/3 w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent animate-energy-flow-horizontal delay-1500" />
            <div className="absolute left-0 top-2/3 w-full h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent animate-energy-flow-horizontal delay-3000" />
          </div>
          
          {/* Floating Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "absolute w-3 h-3 rounded-full opacity-20",
                  i % 3 === 0 ? "bg-primary/40" : i % 3 === 1 ? "bg-accent/40" : "bg-purple-400/40",
                  "animate-float-orb"
                )}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.8}s`,
                  animationDuration: `${8 + Math.random() * 4}s`
                }}
              />
            ))}
          </div>
          
          {/* Corner Tech Details */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-64 h-64">
              <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-primary/40 animate-cyber-corner" />
              <div className="absolute top-4 left-4 w-8 h-8 border-l border-t border-accent/30 animate-cyber-corner delay-300" />
            </div>
            <div className="absolute top-0 right-0 w-64 h-64">
              <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-primary/40 animate-cyber-corner" />
              <div className="absolute top-4 right-4 w-8 h-8 border-r border-t border-accent/30 animate-cyber-corner delay-300" />
            </div>
            <div className="absolute bottom-0 left-0 w-64 h-64">
              <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-primary/40 animate-cyber-corner" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l border-b border-accent/30 animate-cyber-corner delay-300" />
            </div>
            <div className="absolute bottom-0 right-0 w-64 h-64">
              <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-primary/40 animate-cyber-corner" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r border-b border-accent/30 animate-cyber-corner delay-300" />
            </div>
          </div>
          
          {/* Ambient Glow Effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-purple-500/8 rounded-full blur-3xl animate-pulse delay-2000" />
          </div>
        </div>
        
        <div className="relative z-10 text-center">
          {/* Central Hologram */}
          <div className="relative mb-12">
            {/* Outer Ring */}
            <div className="absolute inset-0 w-32 h-32 border border-primary/30 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-32 h-32 border border-accent/30 rounded-full animate-spin-reverse" style={{ animationDuration: '4s' }}></div>
            
            {/* Central Core */}
            <div className="relative w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-primary/40">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center animate-pulse">
                <Wrench className="h-8 w-8 text-white" />
              </div>
            </div>
            
            {/* Energy Orbs */}
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-full animate-ping"></div>
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-accent rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white tracking-wider">INITIALIZING SYSTEMS</h2>
            <div className="flex justify-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <p className="text-sm text-slate-400 font-mono">ESTABLISHING CONNECTION...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isMaintenanceMode) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Main Container */}
        <div className="relative overflow-hidden group">
          {/* Advanced Cyberpunk Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          
          {/* Animated Circuit Board Grid */}
          <div className="absolute inset-0 opacity-[0.15]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.5)_1px,transparent_0)] bg-[20px_20px] animate-grid-move-slow" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent)] bg-[40px_40px]" />
          </div>
          
          {/* Dynamic Energy Lines */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/30 to-transparent animate-energy-flow" />
            <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-accent/30 to-transparent animate-energy-flow delay-1000" />
            <div className="absolute top-0 left-2/3 w-px h-full bg-gradient-to-b from-transparent via-primary/25 to-transparent animate-energy-flow delay-2000" />
            
            <div className="absolute left-0 top-1/4 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-energy-flow-horizontal" />
            <div className="absolute left-0 bottom-1/3 w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent animate-energy-flow-horizontal delay-1500" />
            <div className="absolute left-0 top-2/3 w-full h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent animate-energy-flow-horizontal delay-3000" />
          </div>
          
          {/* Floating Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "absolute w-3 h-3 rounded-full opacity-20",
                  i % 3 === 0 ? "bg-primary/40" : i % 3 === 1 ? "bg-accent/40" : "bg-purple-400/40",
                  "animate-float-orb"
                )}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.8}s`,
                  animationDuration: `${8 + Math.random() * 4}s`
                }}
              />
            ))}
          </div>
          
          {/* Corner Tech Details */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-64 h-64">
              <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-primary/40 animate-cyber-corner" />
              <div className="absolute top-4 left-4 w-8 h-8 border-l border-t border-accent/30 animate-cyber-corner delay-300" />
            </div>
            <div className="absolute top-0 right-0 w-64 h-64">
              <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-primary/40 animate-cyber-corner" />
              <div className="absolute top-4 right-4 w-8 h-8 border-r border-t border-accent/30 animate-cyber-corner delay-300" />
            </div>
            <div className="absolute bottom-0 left-0 w-64 h-64">
              <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-primary/40 animate-cyber-corner" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l border-b border-accent/30 animate-cyber-corner delay-300" />
            </div>
            <div className="absolute bottom-0 right-0 w-64 h-64">
              <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-primary/40 animate-cyber-corner" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r border-b border-accent/30 animate-cyber-corner delay-300" />
            </div>
          </div>
          
          {/* Ambient Glow Effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-purple-500/8 rounded-full blur-3xl animate-pulse delay-2000" />
          </div>
          
          {/* Main Content */}
          <div className="relative z-10 p-8">
            {/* Admin Access Button */}
            {user && !adminLoading && isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="absolute top-6 right-6 p-4 bg-gradient-to-r from-primary to-accent text-white rounded-xl transition-all duration-300 flex items-center space-x-3 shadow-2xl hover:shadow-primary/25 transform hover:scale-105 z-10 border border-primary/20 hover:border-primary/40"
              >
                <Shield className="h-5 w-5" />
                <span className="text-sm font-bold">ADMIN ACCESS</span>
              </button>
            )}
            
            {/* Holographic Icon System */}
            <div className="flex justify-center mb-12">
              <div className="relative group/icon">
                {/* Outer Holographic Ring */}
                <div className="absolute inset-0 w-32 h-32 border-4 border-transparent border-t-primary border-r-accent rounded-full animate-spin opacity-60"></div>
                <div className="absolute inset-0 w-32 h-32 border-4 border-transparent border-t-accent border-r-purple-400 rounded-full animate-spin-reverse opacity-40"></div>
                
                {/* Inner Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl opacity-30 animate-pulse-glow"></div>
                
                {/* Central Icon */}
                <div className="relative bg-gradient-to-r from-primary to-accent p-8 rounded-full shadow-2xl border border-primary/20 group-hover/icon:border-primary/40 transition-all duration-300">
                  <Wrench className="h-20 w-20 text-white" />
                </div>
                
                {/* Floating Tech Icons */}
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center border border-accent/40">
                  <Cpu className="h-4 w-4 text-accent" />
                </div>
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-purple-400/20 rounded-full flex items-center justify-center border border-purple-400/40">
                  <Database className="h-4 w-4 text-purple-400" />
                </div>
                <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center border border-primary/40">
                  <Server className="h-4 w-4 text-primary" />
                </div>
                <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center border border-accent/40">
                  <Terminal className="h-4 w-4 text-accent" />
                </div>
              </div>
            </div>

            {/* Advanced Title with Holographic Effect */}
            <div className="mb-8">
              <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-primary via-accent via-purple-400 to-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-cyber-logo-shine">
                {maintenanceStatus?.maintenance_title || 'SYSTEM MAINTENANCE'}
              </h1>
              <div className="w-64 h-1 bg-gradient-to-r from-primary via-accent to-purple-400 mx-auto rounded-full animate-pulse"></div>
            </div>

            {/* Enhanced Message */}
            <p className="text-slate-200 text-xl mb-10 leading-relaxed max-w-2xl mx-auto font-medium">
              {maintenanceStatus?.maintenance_message || 'Our systems are currently undergoing scheduled maintenance to enhance performance and security. We appreciate your patience and will be back online shortly.'}
            </p>

            {/* Advanced Status Display */}
            {maintenanceStatus?.started_at && (
              <div className="flex items-center justify-center space-x-4 text-sm text-slate-300 mb-10 glass px-8 py-4 rounded-2xl border border-primary/20 max-w-md mx-auto">
                <div className="relative">
                  <Clock className="h-6 w-6 text-accent" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                </div>
                <div className="text-center">
                  <p className="font-mono text-lg">MAINTENANCE STARTED</p>
                  <p className="text-sm text-slate-400">{new Date(maintenanceStatus.started_at).toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Advanced Progress Indicators */}
            <div className="flex justify-center space-x-4 mb-10">
              <div className="relative">
                <div className="w-4 h-4 bg-primary rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0ms' }}></div>
                <div className="absolute -inset-2 border-2 border-primary/20 rounded-full animate-ping"></div>
              </div>
              <div className="relative">
                <div className="w-4 h-4 bg-accent rounded-full animate-bounce shadow-lg" style={{ animationDelay: '150ms' }}></div>
                <div className="absolute -inset-2 border-2 border-accent/20 rounded-full animate-ping"></div>
              </div>
              <div className="relative">
                <div className="w-4 h-4 bg-purple-400 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '300ms' }}></div>
                <div className="absolute -inset-2 border-2 border-purple-400/20 rounded-full animate-ping"></div>
              </div>
            </div>

            {/* Auto-refresh Notice */}
            <div className="flex items-center justify-center space-x-4 text-sm text-slate-400 mb-8">
              <div className="relative">
                <RefreshCw className="h-6 w-6 animate-spin text-accent" />
                <div className="absolute -inset-1 border border-accent/20 rounded-full animate-ping"></div>
              </div>
              <span className="font-mono text-lg">AUTO-REFRESH ENABLED</span>
            </div>

            {/* Admin Notice */}
            {user && !adminLoading && isAdmin && (
              <div className="mt-8 p-6 glass rounded-2xl border border-primary/20 max-w-lg mx-auto">
                <div className="flex items-center justify-center space-x-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <p className="text-sm text-primary font-bold font-mono">
                    ADMIN ACCESS AVAILABLE - CLICK ADMIN BUTTON TO CONTROL MAINTENANCE MODE
                  </p>
                </div>
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
    </div>
  );
}