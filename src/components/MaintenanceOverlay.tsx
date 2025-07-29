import React, { useState } from 'react';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Wrench, Clock, Shield, Settings, RefreshCw, AlertTriangle, Zap, Terminal, Cpu, Database, Server, Wifi, WifiOff, Activity, BarChart3, TrendingUp, TrendingDown, DollarSign, Percent, Users, Award, Medal, Badge, ShieldCheck, ZapOff, Power, PowerOff, Settings2, Cog, Wrench2, Hammer, Screwdriver, Tool, Palette, Brush, Layers, Grid, Layout, Columns, Rows, Square, Circle, Triangle, Diamond, Pentagon, Hexagon2, Octagon, Star2, Heart, Lightning, Fire, Ice, Water, Earth, Air, Wind, Cloud, Sun, Moon, Planet, Galaxy, Universe, Atom, Dna, Brain, Eye, Ear, Nose, Mouth, Hand, Foot, Arm, Leg, Head, Body, Skull, Bone, Muscle, Vein, Blood, Heart2, Lungs, Stomach, Liver, Kidney, Brain2, Spine, Rib, Pelvis, Femur, Tibia, Fibula, Humerus, Radius, Ulna, Clavicle, Scapula, Sternum, Vertebra, Cartilage, Tendon, Ligament, Nerve, Synapse, Neuron, Axon, Dendrite, Receptor, Transmitter, Hormone, Enzyme, Protein, Amino, Vitamin, Mineral, Oxygen, Carbon, Hydrogen, Nitrogen, Phosphorus, Sulfur, Chlorine, Sodium, Potassium, Calcium, Magnesium, Iron, Zinc, Copper, Manganese, Selenium, Iodine, Chromium, Molybdenum, Cobalt, Nickel, Vanadium, Tungsten, Titanium, Aluminum, Silicon, Boron, Fluorine, Bromine, Iodine2, Astatine, Radon, Xenon, Krypton, Argon, Neon, Helium, Hydrogen2, Lithium, Beryllium, Boron2, Carbon2, Nitrogen2, Oxygen2, Fluorine2, Neon2, Sodium2, Magnesium2, Aluminum2, Silicon2, Phosphorus2, Sulfur2, Chlorine2, Potassium2, Calcium2, Scandium, Titanium2, Vanadium2, Chromium2, Manganese2, Iron2, Cobalt2, Nickel2, Copper2, Zinc2, Gallium, Germanium, Arsenic, Selenium2, Bromine2, Krypton2, Rubidium, Strontium, Yttrium, Zirconium, Niobium, Molybdenum2, Technetium, Ruthenium, Rhodium, Palladium, Silver, Cadmium, Indium, Tin, Antimony, Tellurium, Iodine3, Xenon2, Cesium, Barium, Lanthanum, Cerium, Praseodymium, Neodymium, Promethium, Samarium, Europium, Gadolinium, Terbium, Dysprosium, Holmium, Erbium, Thulium, Ytterbium, Lutetium, Hafnium, Tantalum, Tungsten2, Rhenium, Osmium, Iridium, Platinum, Gold, Mercury, Thallium, Lead, Bismuth, Polonium, Astatine2, Radon2, Francium, Radium, Actinium, Thorium, Protactinium, Uranium, Neptunium, Plutonium, Americium, Curium, Berkelium, Californium, Einsteinium, Fermium, Mendelevium, Nobelium, Lawrencium, Rutherfordium, Dubnium, Seaborgium, Bohrium, Hassium, Meitnerium, Darmstadtium, Roentgenium, Copernicium, Nihonium, Flerovium, Moscovium, Livermorium, Tennessine, Oganesson } from 'lucide-react';
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
        {/* Stunning Loading Environment */}
        <div className="relative">
          {/* Animated Circuit Board Background */}
          <div className="absolute inset-0 w-96 h-96">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.3)_1px,transparent_0)] bg-[20px_20px] animate-pulse"></div>
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.2)_25%,rgba(99,102,241,0.2)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.2)_75%,rgba(99,102,241,0.2)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.2)_25%,rgba(99,102,241,0.2)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.2)_75%,rgba(99,102,241,0.2)_76%,transparent_77%,transparent)] bg-[40px_40px]"></div>
          </div>
          
          {/* Central Holographic Core */}
          <div className="relative z-10">
            {/* Outer Energy Ring */}
            <div className="absolute inset-0 w-32 h-32 border-2 border-primary/40 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-32 h-32 border-2 border-accent/40 rounded-full animate-spin-reverse" style={{ animationDuration: '3s' }}></div>
            
            {/* Inner Core */}
            <div className="relative w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-primary/30">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center animate-pulse shadow-lg">
                <Wrench className="h-10 w-10 text-white" />
              </div>
            </div>
            
            {/* Floating Energy Orbs */}
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-full animate-ping"></div>
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-accent rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
          </div>
          
          {/* Loading Text */}
          <div className="mt-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3 tracking-wider">INITIALIZING</h2>
            <div className="flex justify-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
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
      <div className="max-w-2xl w-full">
        {/* Stunning Main Container */}
        <div className="relative overflow-hidden group">
          {/* Advanced Background System */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
          
          {/* Animated Circuit Pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.4)_1px,transparent_0)] bg-[25px_25px] animate-pulse"></div>
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent)] bg-[50px_50px]"></div>
          </div>
          
          {/* Dynamic Energy Lines */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/30 to-transparent animate-pulse"></div>
            <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-accent/30 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute left-0 top-1/3 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute left-0 bottom-1/3 w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent animate-pulse" style={{ animationDelay: '1.5s' }}></div>
          </div>
          
          {/* Floating Tech Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "absolute rounded-full opacity-40",
                  i % 3 === 0 ? "w-1 h-1 bg-primary" : 
                  i % 3 === 1 ? "w-1.5 h-1.5 bg-accent" : "w-1 h-1 bg-purple-400",
                  "animate-float-orb"
                )}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${4 + Math.random() * 4}s`
                }}
              />
            ))}
          </div>
          
          {/* Corner Tech Details */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-primary/50"></div>
            <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-accent/50"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-purple-400/50"></div>
            <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-primary/50"></div>
          </div>
          
          {/* Main Content */}
          <div className="relative z-10 p-8">
            {/* Admin Access Button */}
            {user && !adminLoading && isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="absolute top-6 right-6 p-3 bg-gradient-to-r from-primary to-accent text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 transform hover:scale-105 z-10 border border-primary/30"
              >
                <Shield className="h-5 w-5" />
              </button>
            )}
            
            {/* Stunning Icon System */}
            <div className="flex justify-center mb-8">
              <div className="relative group/icon">
                {/* Holographic Rings */}
                <div className="absolute inset-0 w-24 h-24 border-2 border-transparent border-t-primary border-r-accent rounded-full animate-spin opacity-60"></div>
                <div className="absolute inset-0 w-24 h-24 border-2 border-transparent border-t-accent border-r-purple-400 rounded-full animate-spin-reverse opacity-40" style={{ animationDuration: '4s' }}></div>
                
                {/* Central Icon */}
                <div className="relative bg-gradient-to-br from-primary to-accent p-6 rounded-2xl shadow-2xl border border-primary/30 group-hover/icon:border-primary/50 transition-all duration-300">
                  <Wrench className="h-12 w-12 text-white" />
                </div>
                
                {/* Floating Tech Icons */}
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-accent/30 rounded-full flex items-center justify-center border border-accent/50">
                  <Cpu className="h-4 w-4 text-accent" />
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-purple-400/30 rounded-full flex items-center justify-center border border-purple-400/50">
                  <Database className="h-4 w-4 text-purple-400" />
                </div>
                <div className="absolute -bottom-3 -left-3 w-8 h-8 bg-primary/30 rounded-full flex items-center justify-center border border-primary/50">
                  <Server className="h-4 w-4 text-primary" />
                </div>
                <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-accent/30 rounded-full flex items-center justify-center border border-accent/50">
                  <Terminal className="h-4 w-4 text-accent" />
                </div>
              </div>
            </div>

            {/* Title with Stunning Effect */}
            <div className="text-center mb-6">
              <h1 className="text-4xl font-black text-white mb-2 tracking-wider">
                {maintenanceStatus?.maintenance_title || 'SYSTEM MAINTENANCE'}
              </h1>
              <div className="w-48 h-1 bg-gradient-to-r from-primary via-accent to-purple-400 mx-auto rounded-full animate-pulse"></div>
            </div>

            {/* Message */}
            <p className="text-slate-200 text-center mb-8 leading-relaxed text-lg">
              {maintenanceStatus?.maintenance_message || 'Our systems are currently undergoing scheduled maintenance to enhance performance and security. We appreciate your patience and will be back online shortly.'}
            </p>

            {/* Status Display */}
            {maintenanceStatus?.started_at && (
              <div className="bg-slate-800/50 rounded-xl p-6 mb-8 border border-slate-700/50 backdrop-blur-sm">
                <div className="flex items-center justify-center space-x-3">
                  <div className="relative">
                    <Clock className="h-6 w-6 text-accent" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-300 font-medium">MAINTENANCE STARTED</p>
                    <p className="text-xs text-slate-400">{new Date(maintenanceStatus.started_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Indicators */}
            <div className="flex justify-center space-x-4 mb-8">
              <div className="relative">
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
                <div className="absolute -inset-2 border border-primary/30 rounded-full animate-ping"></div>
              </div>
              <div className="relative">
                <div className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="absolute -inset-2 border border-accent/30 rounded-full animate-ping"></div>
              </div>
              <div className="relative">
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="absolute -inset-2 border border-purple-400/30 rounded-full animate-ping"></div>
              </div>
            </div>

            {/* Auto-refresh Notice */}
            <div className="flex items-center justify-center space-x-3 text-sm text-slate-400">
              <div className="relative">
                <RefreshCw className="h-4 w-4 animate-spin text-accent" />
                <div className="absolute -inset-1 border border-accent/30 rounded-full animate-ping"></div>
              </div>
              <span className="font-medium">Auto-refresh enabled</span>
            </div>
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