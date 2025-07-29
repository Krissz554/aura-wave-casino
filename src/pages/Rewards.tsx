import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Gift, Package, Trophy, Clock, Zap, Crown, Target, Sparkles, Coins, Star, Shield, Lock, Unlock, Hexagon, Cpu, Wifi, Battery, Activity, Terminal, Cpu, Database, Server, Network, Satellite, Radar, Signal, Waveform, Pulse, ActivitySquare, BarChart3, TrendingUp, TrendingDown, DollarSign, Percent, Users, Award, Medal, Badge, ShieldCheck, ZapOff, Power, PowerOff, Settings, Cog, Wrench, Hammer, Screwdriver, Tool, Palette, Brush, Layers, Grid, Layout, Columns, Rows, Square, Circle, Triangle, Diamond, Pentagon, Hexagon2, Octagon, Star2, Heart, Lightning, Fire, Ice, Water, Earth, Air, Wind, Cloud, Sun, Moon, Planet, Galaxy, Universe, Atom, Dna, Brain, Eye, Ear, Nose, Mouth, Hand, Foot, Arm, Leg, Head, Body, Skull, Bone, Muscle, Vein, Blood, Heart2, Lungs, Stomach, Liver, Kidney, Brain2, Spine, Rib, Pelvis, Femur, Tibia, Fibula, Humerus, Radius, Ulna, Clavicle, Scapula, Sternum, Vertebra, Cartilage, Tendon, Ligament, Nerve, Synapse, Neuron, Axon, Dendrite, Receptor, Transmitter, Hormone, Enzyme, Protein, Amino, Vitamin, Mineral, Oxygen, Carbon, Hydrogen, Nitrogen, Phosphorus, Sulfur, Chlorine, Sodium, Potassium, Calcium, Magnesium, Iron, Zinc, Copper, Manganese, Selenium, Iodine, Chromium, Molybdenum, Cobalt, Nickel, Vanadium, Tungsten, Titanium, Aluminum, Silicon, Boron, Fluorine, Bromine, Iodine2, Astatine, Radon, Xenon, Krypton, Argon, Neon, Helium, Hydrogen2, Lithium, Beryllium, Boron2, Carbon2, Nitrogen2, Oxygen2, Fluorine2, Neon2, Sodium2, Magnesium2, Aluminum2, Silicon2, Phosphorus2, Sulfur2, Chlorine2, Potassium2, Calcium2, Scandium, Titanium2, Vanadium2, Chromium2, Manganese2, Iron2, Cobalt2, Nickel2, Copper2, Zinc2, Gallium, Germanium, Arsenic, Selenium2, Bromine2, Krypton2, Rubidium, Strontium, Yttrium, Zirconium, Niobium, Molybdenum2, Technetium, Ruthenium, Rhodium, Palladium, Silver, Cadmium, Indium, Tin, Antimony, Tellurium, Iodine3, Xenon2, Cesium, Barium, Lanthanum, Cerium, Praseodymium, Neodymium, Promethium, Samarium, Europium, Gadolinium, Terbium, Dysprosium, Holmium, Erbium, Thulium, Ytterbium, Lutetium, Hafnium, Tantalum, Tungsten2, Rhenium, Osmium, Iridium, Platinum, Gold, Mercury, Thallium, Lead, Bismuth, Polonium, Astatine2, Radon2, Francium, Radium, Actinium, Thorium, Protactinium, Uranium, Neptunium, Plutonium, Americium, Curium, Berkelium, Californium, Einsteinium, Fermium, Mendelevium, Nobelium, Lawrencium, Rutherfordium, Dubnium, Seaborgium, Bohrium, Hassium, Meitnerium, Darmstadtium, Roentgenium, Copernicium, Nihonium, Flerovium, Moscovium, Livermorium, Tennessine, Oganesson } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFreeCases } from '@/hooks/useFreeCases';
import { useLevelDailyCases } from '@/hooks/useLevelDailyCases';
import { useCaseHistory } from '@/hooks/useCaseHistory';
import { EnhancedCaseOpeningModal } from '@/components/EnhancedCaseOpeningModal';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function Rewards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userData } = useUserProfile();
  const { caseStatuses, selectedFreeCase, openFreeCaseModal, handleFreeCaseOpened, closeFreeCaseModal } = useFreeCases();
  const { 
    cases: levelDailyCases, 
    loading: levelCasesLoading, 
    openingCase, 
    openCase: openLevelCase, 
    canOpenCase, 
    getCaseStatusText, 
    getCaseStatusColor, 
    getCaseButtonVariant 
  } = useLevelDailyCases();
  const { history, stats, loading: historyLoading, formatDate, getRarityColor, getCaseTypeDisplayName } = useCaseHistory();
  const [isPageVisible, setIsPageVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsPageVisible(true);
  }, []);

  const handleLevelCaseOpened = async (caseId: string) => {
    const result = await openLevelCase(caseId);
    if (result) {
      window.location.reload();
    }
  };

  if (levelCasesLoading || historyLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur-2xl animate-pulse"></div>
          <div className="relative bg-black/20 backdrop-blur-xl border border-primary/20 rounded-3xl p-12 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl animate-pulse"></div>
              <Terminal className="w-16 h-16 mx-auto text-primary relative z-10 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">INITIALIZING</div>
              <div className="text-sm text-muted-foreground font-mono">Reward systems loading...</div>
              <div className="flex justify-center space-x-1 mt-4">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 transition-all duration-1000 ease-out ${
      isPageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
    }`}>
      
      {/* Animated Cyberpunk Background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_30%,rgba(6,182,212,0.05)_50%,transparent_70%)] bg-[length:100px_100px] animate-grid-move-slow"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-accent/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-success/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        
        {/* Cyberpunk Header */}
        <header className={`mb-12 transition-all duration-700 ease-out delay-200 ${
          isPageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-success/20 rounded-3xl blur-2xl"></div>
            <div className="relative bg-black/30 backdrop-blur-xl border border-primary/20 rounded-3xl p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-8">
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/')}
                    className="relative group bg-black/20 backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:animate-pulse relative z-10" />
                    <span className="relative z-10">RETURN</span>
                  </Button>
                  
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl animate-pulse"></div>
                      <Crown className="w-10 h-10 text-primary relative z-10" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <h1 className="text-5xl font-black gradient-primary bg-clip-text text-transparent animate-cyber-logo-shine tracking-wider">
                        REWARD VAULT
                      </h1>
                      <p className="text-sm text-muted-foreground font-mono mt-1">ADVANCED CASE MANAGEMENT SYSTEM v2.0</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                      <span className="text-sm text-muted-foreground font-mono">SYSTEM ONLINE</span>
                    </div>
                    <div className="w-px h-6 bg-primary/30"></div>
                    <div className="flex items-center space-x-2">
                      <Wifi className="w-4 h-4 text-accent" />
                      <Battery className="w-4 h-4 text-success" />
                      <Activity className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className={`space-y-12 transition-all duration-800 ease-out delay-300 ${
          isPageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}>
          
          {/* Cyberpunk Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-transparent rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
              <div className="relative bg-black/40 backdrop-blur-xl border border-primary/20 rounded-3xl p-8 hover:border-primary/40 transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative text-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl animate-pulse"></div>
                    <Package className="w-16 h-16 mx-auto text-primary relative z-10 group-hover:animate-pulse-glow transition-all duration-300" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full animate-pulse flex items-center justify-center">
                      <span className="text-xs font-bold text-black">📦</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-4xl font-black gradient-primary bg-clip-text text-transparent mb-2">
                      {stats.totalCasesOpened}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono uppercase tracking-wider">Total Cases Opened</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/30 to-transparent rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
              <div className="relative bg-black/40 backdrop-blur-xl border border-accent/20 rounded-3xl p-8 hover:border-accent/40 transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative text-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent to-success rounded-full blur-xl animate-pulse"></div>
                    <Coins className="w-16 h-16 mx-auto text-accent relative z-10 group-hover:animate-pulse-glow transition-all duration-300" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-success rounded-full animate-pulse flex items-center justify-center">
                      <span className="text-xs font-bold text-black">💰</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-4xl font-black gradient-success bg-clip-text text-transparent mb-2">
                      ${stats.totalRewards.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono uppercase tracking-wider">Total Rewards Earned</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-success/30 to-transparent rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
              <div className="relative bg-black/40 backdrop-blur-xl border border-success/20 rounded-3xl p-8 hover:border-success/40 transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative text-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-success to-warning rounded-full blur-xl animate-pulse"></div>
                    <Trophy className="w-16 h-16 mx-auto text-success relative z-10 group-hover:animate-pulse-glow transition-all duration-300" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-warning rounded-full animate-pulse flex items-center justify-center">
                      <span className="text-xs font-bold text-black">🏆</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-4xl font-black gradient-success bg-clip-text text-transparent mb-2">
                      {levelDailyCases.filter(c => canOpenCase(c)).length}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono uppercase tracking-wider">Available Cases</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-warning/30 to-transparent rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
              <div className="relative bg-black/40 backdrop-blur-xl border border-warning/20 rounded-3xl p-8 hover:border-warning/40 transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-warning/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative text-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-warning to-primary rounded-full blur-xl animate-pulse"></div>
                    <Star className="w-16 h-16 mx-auto text-warning relative z-10 group-hover:animate-pulse-glow transition-all duration-300" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full animate-pulse flex items-center justify-center">
                      <span className="text-xs font-bold text-black">⭐</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-4xl font-black gradient-warning bg-clip-text text-transparent mb-2">
                      {userData?.level || 0}
                    </div>
                    <div className="text-sm text-muted-foreground font-mono uppercase tracking-wider">Current Level</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Level Daily Cases - New Cyberpunk Design */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-black/30 backdrop-blur-xl border border-primary/20 rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>
              <div className="relative p-8">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl animate-pulse"></div>
                    <Crown className="w-8 h-8 text-primary relative z-10" />
                    <Sparkles className="w-4 h-4 text-warning absolute -top-1 -right-1 animate-pulse z-20" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">LEVEL DAILY CASES</h2>
                    <p className="text-sm text-muted-foreground font-mono">• DAILY RESET • PROGRESSION SYSTEM</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4">
                  {levelDailyCases.map((caseData) => (
                    <div key={caseData.id} className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                      <div className="relative bg-black/40 backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-all duration-300 rounded-2xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="p-4 text-center space-y-4 relative">
                          <div className="relative">
                            <div className={`w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl group-hover:shadow-glow transition-all duration-300 ${
                              caseData.user_level < caseData.level_required ? 'opacity-50' : ''
                            }`}>
                              {caseData.user_level < caseData.level_required ? (
                                <Lock className="w-8 h-8 text-white" />
                              ) : (
                                <Gift className="w-8 h-8 text-white" />
                              )}
                            </div>
                            <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-bold border border-primary/50">
                              {caseData.level_required}
                            </div>
                            {caseData.user_level >= caseData.level_required && caseData.is_available && (
                              <div className="absolute -top-1 -left-1 w-4 h-4 bg-success rounded-full animate-pulse"></div>
                            )}
                          </div>
                          
                          <div>
                            <div className="text-xs font-bold font-mono">LEVEL {caseData.level_required}</div>
                            <div className={`text-xs ${getCaseStatusColor(caseData)} font-mono`}>
                              {getCaseStatusText(caseData)}
                            </div>
                          </div>
                          
                          <Button 
                            onClick={() => handleLevelCaseOpened(caseData.id)}
                            disabled={!canOpenCase(caseData) || openingCase === caseData.id}
                            variant={getCaseButtonVariant(caseData)}
                            size="sm"
                            className="w-full text-xs relative group-hover:animate-cyber-button-press"
                          >
                            {openingCase === caseData.id ? (
                              <>
                                <div className="w-3 h-3 mr-1 border border-current border-t-transparent rounded-full animate-spin"></div>
                                OPENING...
                              </>
                            ) : caseData.user_level < caseData.level_required ? (
                              <>
                                <Lock className="w-3 h-3 mr-1" />
                                LOCKED
                              </>
                            ) : !caseData.is_available ? (
                              <>
                                <Clock className="w-3 h-3 mr-1" />
                                OPENED
                              </>
                            ) : (
                              <>
                                <Gift className="w-3 h-3 mr-1" />
                                OPEN
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Free Cases - New Cyberpunk Design */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-success/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-black/30 backdrop-blur-xl border border-accent/20 rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent"></div>
              <div className="relative p-8">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent to-success rounded-full blur-xl animate-pulse"></div>
                    <Gift className="w-8 h-8 text-accent relative z-10" />
                    <Sparkles className="w-4 h-4 text-warning absolute -top-1 -right-1 animate-pulse z-20" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold gradient-accent bg-clip-text text-transparent">FREE CASES</h2>
                    <p className="text-sm text-muted-foreground font-mono">• ALWAYS AVAILABLE • NO COST</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {caseStatuses.map((status) => (
                    <div key={status.config.type} className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                      <div className="relative bg-black/40 backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-all duration-300 rounded-2xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="p-6 text-center space-y-6 relative">
                          <div className="relative">
                            <div className={`w-24 h-24 mx-auto bg-gradient-to-br ${status.config.color} rounded-2xl flex items-center justify-center shadow-2xl group-hover:shadow-glow transition-all duration-300`}>
                              <span className="text-4xl group-hover:animate-pulse-glow transition-all duration-300">{status.config.icon}</span>
                            </div>
                            <div className={`absolute -top-3 -right-3 text-xs px-3 py-1 rounded-full font-bold border ${
                              status.config.type === 'common' ? 'bg-gray-500 text-white border-gray-400' :
                              status.config.type === 'rare' ? 'bg-blue-500 text-white border-blue-400' :
                              'bg-purple-500 text-white border-purple-400'
                            }`}>
                              {status.config.type.toUpperCase()}
                            </div>
                            {status.canClaim && (
                              <div className="absolute -top-2 -left-2 w-5 h-5 bg-success rounded-full animate-pulse"></div>
                            )}
                          </div>
                          
                          <div>
                            <h3 className="font-bold text-xl mb-2">{status.config.name}</h3>
                            <p className="text-sm text-muted-foreground mb-3 font-mono">
                              ${status.config.minAmount.toLocaleString()} - ${status.config.maxAmount.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {status.config.cooldownMinutes} minute cooldown
                            </p>
                          </div>
                          
                          <Button 
                            onClick={() => openFreeCaseModal(status.config.type)}
                            disabled={!status.canClaim}
                            className={`w-full group-hover:animate-cyber-button-press ${
                              status.canClaim 
                                ? 'gradient-primary hover:glow-primary border border-primary/20' 
                                : 'bg-muted text-muted-foreground cursor-not-allowed border border-muted'
                            }`}
                          >
                            {status.canClaim ? (
                              <>
                                <Gift className="w-4 h-4 mr-2 animate-pulse" />
                                OPEN FREE CASE
                              </>
                            ) : (
                              <>
                                <Clock className="w-4 h-4 mr-2" />
                                {(() => {
                                  const now = new Date();
                                  const timeUntil = Math.max(0, (status.nextClaimTime?.getTime() || 0) - now.getTime());
                                  const seconds = Math.ceil(timeUntil / 1000);
                                  const minutes = Math.floor(seconds / 60);
                                  const remainingSeconds = seconds % 60;
                                  
                                  if (timeUntil <= 0) return 'READY!';
                                  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
                                  return `${remainingSeconds}s`;
                                })()}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Case History - New Cyberpunk Design */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-warning/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-black/30 backdrop-blur-xl border border-accent/20 rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent"></div>
              <div className="relative p-8">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent to-warning rounded-full blur-xl animate-pulse"></div>
                    <Clock className="w-8 h-8 text-accent relative z-10" />
                    <Zap className="w-4 h-4 text-warning absolute -top-1 -right-1 animate-pulse z-20" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold gradient-accent bg-clip-text text-transparent">CASE HISTORY</h2>
                    <p className="text-sm text-muted-foreground font-mono">• COMPLETE LOG • REWARD TRACKING</p>
                  </div>
                </div>
                
                {history.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-gradient-to-r from-accent/30 to-warning/30 rounded-full blur-2xl animate-pulse"></div>
                      <Clock className="w-24 h-24 mx-auto text-muted-foreground opacity-50 relative z-10" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 gradient-accent bg-clip-text text-transparent">NO CASES OPENED YET</h3>
                    <p className="text-muted-foreground max-w-md mx-auto font-mono">
                      Your opened cases will appear here with detailed statistics and reward tracking.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((caseReward) => (
                      <div key={caseReward.id} className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-accent/30 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                        <div className="relative bg-black/40 backdrop-blur-sm border border-accent/20 hover:border-accent/40 transition-all duration-300 rounded-2xl overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                          <div className="flex items-center justify-between p-6 relative">
                            <div className="flex items-center space-x-6">
                              <div className="relative">
                                <div className={`w-6 h-6 rounded-full ${getRarityColor(caseReward.rarity)} group-hover:animate-pulse-glow transition-all duration-300`} />
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                              </div>
                              <div>
                                <div className="font-bold text-xl">
                                  {getCaseTypeDisplayName(caseReward.case_type, caseReward.level_unlocked)}
                                </div>
                                <div className="text-sm text-muted-foreground font-mono">
                                  {caseReward.rarity.charAt(0).toUpperCase() + caseReward.rarity.slice(1)} • 
                                  Opened {formatDate(caseReward.opened_at || caseReward.created_at)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right relative">
                              <div className="font-bold text-3xl text-success group-hover:animate-cyber-balance-glow transition-all duration-300">
                                +${caseReward.reward_amount.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">REWARD</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Case Opening Modal for Free Cases */}
      {selectedFreeCase && (
        <EnhancedCaseOpeningModal
          isOpen={!!selectedFreeCase}
          onClose={closeFreeCaseModal}
          caseId={`free-${selectedFreeCase.type}`}
          level={1}
          onCaseOpened={handleFreeCaseOpened}
          isFreeCase={true}
          freeCaseType={selectedFreeCase.type}
        />
      )}
    </div>
  );
}