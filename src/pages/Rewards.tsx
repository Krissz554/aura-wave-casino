import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Gift, Package, Trophy, Clock, Zap, Crown, Sparkles, Coins, Star, Lock, Unlock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFreeCases } from '@/hooks/useFreeCases';
import { useLevelDailyCases } from '@/hooks/useLevelDailyCases';
import { useCaseHistory } from '@/hooks/useCaseHistory';
import { EnhancedCaseOpeningModal } from '@/components/EnhancedCaseOpeningModal';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cn } from '@/lib/utils';

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
  const { toast } = useToast();

  const handleLevelCaseOpened = async (caseId: string) => {
    const result = await openLevelCase(caseId);
    if (result) {
      window.location.reload();
    }
  };

  if (levelCasesLoading || historyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl animate-cyber-header-pulse" />
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-2xl blur-lg" />
          <div className="relative z-10 p-8 text-center">
            <div className="text-4xl mb-4 animate-pulse">📦</div>
            <p className="text-muted-foreground">Loading reward systems...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Cyberpunk Base Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Animated Circuit Board Grid */}
      <div className="fixed inset-0 opacity-[0.15]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(99,102,241,0.5)_1px,transparent_0)] bg-[20px_20px] animate-grid-move-slow" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent)] bg-[40px_40px]" />
      </div>
      
      {/* Dynamic Energy Lines */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary/30 to-transparent animate-energy-flow" />
        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-accent/30 to-transparent animate-energy-flow delay-1000" />
        <div className="absolute top-0 left-2/3 w-px h-full bg-gradient-to-b from-transparent via-primary/25 to-transparent animate-energy-flow delay-2000" />
        
        <div className="absolute left-0 top-1/4 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-energy-flow-horizontal" />
        <div className="absolute left-0 bottom-1/3 w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent animate-energy-flow-horizontal delay-1500" />
        <div className="absolute left-0 top-2/3 w-full h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent animate-energy-flow-horizontal delay-3000" />
      </div>
      
      {/* Floating Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
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
      <div className="fixed inset-0 pointer-events-none">
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
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-purple-500/8 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>
      
      {/* Main Content Container */}
      <div className="relative z-10 p-4 pb-32">
        
        {/* Header */}
        <header className="mb-6">
          <div className="relative overflow-hidden group">
            {/* Cyberpunk Background with Advanced Effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl animate-cyber-header-pulse" />
            
            {/* Animated Circuit Board Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.3)_25%,rgba(99,102,241,0.3)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.3)_75%,rgba(99,102,241,0.3)_76%,transparent_77%,transparent)] bg-[20px_20px] animate-grid-move-slow" />
            </div>
            
            {/* Animated Border Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
            
            {/* Scan Line Effects */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-cyber-scan-horizontal" />
              <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-accent/60 to-transparent animate-cyber-scan left-1/4" />
              <div className="absolute w-px h-full bg-gradient-to-b from-transparent via-primary/60 to-transparent animate-cyber-scan right-1/3 delay-1000" />
            </div>
            
            {/* Tech Corner Details */}
            <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-primary/60" />
            <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-accent/60" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-accent/60" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-primary/60" />
            
            {/* Floating Energy Orbs */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute w-2 h-2 rounded-full",
                    i % 2 === 0 ? "bg-primary/20" : "bg-accent/20",
                    "animate-float-orb"
                  )}
                  style={{
                    left: `${15 + (i * 15)}%`,
                    top: `${20 + (i % 3) * 30}%`,
                    animationDelay: `${i * 0.8}s`,
                    animationDuration: `${6 + i}s`
                  }}
                />
              ))}
            </div>
            
            {/* Main Header Content */}
            <div className="relative z-10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/')}
                    className="relative overflow-hidden backdrop-blur-sm transition-all duration-300 p-2 hover:bg-primary/10"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2 relative z-10" />
                    <span className="relative z-10">Return</span>
                  </Button>
                  
                  {/* Logo Section with Advanced Effects */}
                  <div className="relative group/logo">
                    <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-xl blur-md group-hover/logo:blur-lg transition-all duration-300" />
                    <div className="relative">
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-cyber-logo-shine">
                        REWARD VAULT
                      </h1>
                      <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0 animate-pulse" />
                    </div>
                  </div>
                  
                  {/* Cyberpunk Tagline */}
                  <div className="hidden md:block relative">
                    <div className="text-sm text-slate-300 font-mono tracking-wider">
                      Advanced Case Management
                      <span className="inline-block w-2 h-4 bg-primary/60 ml-1 animate-cyber-typing">|</span>
                    </div>
                    <div className="absolute -bottom-1 left-0 w-3/4 h-px bg-gradient-to-r from-accent/60 to-transparent" />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-sm text-muted-foreground font-mono">ONLINE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { icon: Package, value: stats.totalCasesOpened, label: "Total Cases", color: "primary" },
              { icon: Coins, value: `$${stats.totalRewards.toFixed(2)}`, label: "Total Rewards", color: "success" },
              { icon: Trophy, value: levelDailyCases.filter(c => canOpenCase(c)).length, label: "Available Cases", color: "accent" },
              { icon: Star, value: userData?.level || 0, label: "Your Level", color: "warning" }
            ].map((stat, index) => (
              <div key={index} className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-xl animate-cyber-header-pulse" />
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-500" />
                
                <div className="relative z-10 p-4 text-center">
                  <div className="relative mb-3">
                    <stat.icon className={`w-8 h-8 mx-auto text-${stat.color}`} />
                  </div>
                  <div className={`text-2xl font-bold ${
                    stat.color === 'primary' ? 'text-primary' :
                    stat.color === 'success' ? 'text-green-400' :
                    stat.color === 'accent' ? 'text-accent' :
                    'text-yellow-400'
                  } mb-1`}>
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground font-mono">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Level Daily Cases */}
          <div className="relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl animate-cyber-header-pulse" />
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
            
            <div className="relative z-10 p-6">
              <div className="flex items-center space-x-3 mb-8">
                <div className="relative">
                  <Crown className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">Level Daily Cases</h2>
                <span className="text-sm text-muted-foreground font-mono">• Reset Daily</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {levelDailyCases.map((caseData) => (
                  <div key={caseData.id} className="relative overflow-hidden group/case">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-sm rounded-xl" />
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-transparent rounded-xl blur-md group-hover/case:blur-lg transition-all duration-300" />
                    
                    <div className="relative z-10 p-6 text-center space-y-4">
                      <div className="relative">
                        <div className={`w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg border border-purple-400/20 ${
                          caseData.user_level < caseData.level_required ? 'opacity-50' : 'group-hover/case:scale-105 transition-transform duration-200'
                        }`}>
                          {caseData.user_level < caseData.level_required ? (
                            <Lock className="w-10 h-10 text-white" />
                          ) : (
                            <Gift className="w-10 h-10 text-white" />
                          )}
                        </div>
                        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-primary to-accent text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg border border-primary/20">
                          {caseData.level_required}
                        </div>
                        {caseData.user_level >= caseData.level_required && caseData.is_available && (
                          <div className="absolute -top-2 -left-2 w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg border-2 border-white"></div>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="text-lg font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                          Level {caseData.level_required}
                        </div>
                        <div className={`text-sm font-medium px-3 py-1 rounded-full ${
                          caseData.user_level < caseData.level_required 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                            : !caseData.is_available 
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}>
                          {getCaseStatusText(caseData)}
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => handleLevelCaseOpened(caseData.id)}
                        disabled={!canOpenCase(caseData) || openingCase === caseData.id}
                        variant={getCaseButtonVariant(caseData)}
                        size="default"
                        className={`w-full relative overflow-hidden transition-all duration-200 font-medium ${
                          caseData.user_level < caseData.level_required 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                            : !caseData.is_available 
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
                            : 'bg-gradient-to-r from-primary to-accent text-white border border-primary/30 hover:from-primary/80 hover:to-accent/80'
                        }`}
                      >
                        <div className="relative z-10 flex items-center justify-center">
                          {openingCase === caseData.id ? (
                            <>
                              <div className="w-4 h-4 mr-2 border border-current border-t-transparent rounded-full animate-spin"></div>
                              Opening...
                            </>
                          ) : caseData.user_level < caseData.level_required ? (
                            <>
                              <Lock className="w-4 h-4 mr-2" />
                              Locked
                            </>
                          ) : !caseData.is_available ? (
                            <>
                              <Clock className="w-4 h-4 mr-2" />
                              Opened
                            </>
                          ) : (
                            <>
                              <Gift className="w-4 h-4 mr-2" />
                              Open Case
                            </>
                          )}
                        </div>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Case History */}
          <div className="relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl rounded-2xl animate-cyber-header-pulse" />
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 via-primary/30 to-accent/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500" />
            
            <div className="relative z-10 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="relative">
                  <Clock className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-xl font-bold gradient-accent bg-clip-text text-transparent">Case History</h2>
              </div>
              
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative mb-6">
                    <Clock className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
                    <div className="absolute inset-0 w-16 h-16 mx-auto border-2 border-accent/20 rounded-full animate-pulse"></div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Cases Opened Yet</h3>
                  <p className="text-muted-foreground">
                    Your opened cases will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((caseReward) => (
                    <div key={caseReward.id} className="relative overflow-hidden group/item">
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-sm rounded-lg" />
                      <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-transparent rounded-lg blur-md group-hover/item:blur-lg transition-all duration-300" />
                      
                      <div className="relative z-10 flex items-center justify-between p-4">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <div className={`w-4 h-4 rounded-full ${getRarityColor(caseReward.rarity)}`} />
                          </div>
                          <div>
                            <div className="font-semibold">
                              {getCaseTypeDisplayName(caseReward.case_type, caseReward.level_unlocked)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {caseReward.rarity.charAt(0).toUpperCase() + caseReward.rarity.slice(1)} • 
                              Opened {formatDate(caseReward.opened_at || caseReward.created_at)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-semibold text-success">
                            +${caseReward.reward_amount.toFixed(2)}
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