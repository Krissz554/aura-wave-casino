import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Gift, Package, Trophy, Clock, Zap, Crown, Target, Sparkles, Coins, Star, Shield, Lock, Unlock, Hexagon, Cpu, Wifi, Battery, Activity } from 'lucide-react';
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

  // Smooth page entrance animation
  useEffect(() => {
    setIsPageVisible(true);
  }, []);

  const handleLevelCaseOpened = async (caseId: string) => {
    const result = await openLevelCase(caseId);
    if (result) {
      // Refresh user data to update balance
      window.location.reload();
    }
  };

  if (levelCasesLoading || historyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-xl animate-pulse"></div>
          <div className="relative glass p-8 rounded-2xl text-center border border-primary/20">
            <div className="text-4xl mb-4 animate-pulse">📦</div>
            <p className="text-muted-foreground">Initializing reward systems...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 transition-all duration-700 ease-out ${
      isPageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
    }`}>
      {/* Animated Background Grid */}
      <div className="fixed inset-0 opacity-5">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_50%,rgba(255,255,255,0.1)_50%),linear-gradient(0deg,transparent_50%,rgba(255,255,255,0.1)_50%)] bg-[length:30px_30px] animate-grid-move-slow"></div>
      </div>

      {/* Header */}
      <header className={`relative mb-8 transition-all duration-500 ease-out delay-100 ${
        isPageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-xl"></div>
          <div className="relative glass rounded-2xl p-8 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="glass border border-primary/20 hover:glow-primary transition-smooth group"
                >
                  <ArrowLeft className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                  Back to Games
                </Button>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-lg animate-pulse"></div>
                    <Crown className="w-8 h-8 text-primary relative z-10" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold gradient-primary bg-clip-text text-transparent animate-cyber-logo-shine">
                      REWARD VAULT
                    </h1>
                    <p className="text-sm text-muted-foreground">Advanced Case Management System</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground font-mono">SYSTEM ONLINE</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Wifi className="w-4 h-4 text-accent" />
                  <Battery className="w-4 h-4 text-success" />
                  <Activity className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={`max-w-7xl mx-auto px-4 space-y-8 transition-all duration-600 ease-out delay-200 ${
        isPageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}>
        
        {/* Stats Overview - Cyberpunk Style */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
            <Card className="relative glass border border-primary/20 hover:glow-primary transition-smooth overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-6 text-center relative">
                <div className="relative mb-4">
                  <Package className="w-12 h-12 mx-auto text-primary group-hover:animate-pulse-glow transition-all" />
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-accent rounded-full animate-pulse"></div>
                </div>
                <div className="text-3xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
                  {stats.totalCasesOpened}
                </div>
                <div className="text-sm text-muted-foreground font-medium">TOTAL CASES OPENED</div>
              </CardContent>
            </Card>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
            <Card className="relative glass border border-accent/20 hover:glow-success transition-smooth overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-6 text-center relative">
                <div className="relative mb-4">
                  <Coins className="w-12 h-12 mx-auto text-accent group-hover:animate-pulse-glow transition-all" />
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-success rounded-full animate-pulse"></div>
                </div>
                <div className="text-3xl font-bold gradient-success bg-clip-text text-transparent mb-2">
                  ${stats.totalRewards.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground font-medium">TOTAL REWARDS EARNED</div>
              </CardContent>
            </Card>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-success/20 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
            <Card className="relative glass border border-success/20 hover:glow-success transition-smooth overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-6 text-center relative">
                <div className="relative mb-4">
                  <Trophy className="w-12 h-12 mx-auto text-success group-hover:animate-pulse-glow transition-all" />
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-warning rounded-full animate-pulse"></div>
                </div>
                <div className="text-3xl font-bold gradient-success bg-clip-text text-transparent mb-2">
                  {levelDailyCases.filter(c => canOpenCase(c)).length}
                </div>
                <div className="text-sm text-muted-foreground font-medium">AVAILABLE CASES</div>
              </CardContent>
            </Card>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-warning/20 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
            <Card className="relative glass border border-warning/20 hover:glow-warning transition-smooth overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-warning/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-6 text-center relative">
                <div className="relative mb-4">
                  <Star className="w-12 h-12 mx-auto text-warning group-hover:animate-pulse-glow transition-all" />
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full animate-pulse"></div>
                </div>
                <div className="text-3xl font-bold gradient-warning bg-clip-text text-transparent mb-2">
                  {userData?.level || 0}
                </div>
                <div className="text-sm text-muted-foreground font-medium">CURRENT LEVEL</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Level Daily Cases - New Design */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-3xl blur-3xl"></div>
          <Card className="relative glass border border-primary/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
            <CardHeader className="relative">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-lg animate-pulse"></div>
                  <Crown className="w-6 h-6 text-primary relative z-10" />
                  <Sparkles className="w-3 h-3 text-warning absolute -top-1 -right-1 animate-pulse z-20" />
                </div>
                <span className="gradient-primary bg-clip-text text-transparent">LEVEL DAILY CASES</span>
                <span className="text-sm text-muted-foreground font-normal">• DAILY RESET</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4">
                {levelDailyCases.map((caseData) => (
                  <div key={caseData.id} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-xl blur-lg group-hover:blur-xl transition-all"></div>
                    <Card className="relative glass border border-primary/20 hover:glow-primary transition-smooth overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <CardContent className="p-4 text-center space-y-3 relative">
                        <div className="relative">
                          <div className={`w-14 h-14 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-glow transition-all ${
                            caseData.user_level < caseData.level_required ? 'opacity-50' : ''
                          }`}>
                            {caseData.user_level < caseData.level_required ? (
                              <Lock className="w-7 h-7 text-white" />
                            ) : (
                              <Gift className="w-7 h-7 text-white" />
                            )}
                          </div>
                          <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-bold border border-primary/50">
                            {caseData.level_required}
                          </div>
                          {caseData.user_level >= caseData.level_required && caseData.is_available && (
                            <div className="absolute -top-1 -left-1 w-3 h-3 bg-success rounded-full animate-pulse"></div>
                          )}
                        </div>
                        
                        <div className="relative">
                          <div className="text-xs font-bold">LEVEL {caseData.level_required}</div>
                          <div className={`text-xs ${getCaseStatusColor(caseData)}`}>
                            {getCaseStatusText(caseData)}
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => handleLevelCaseOpened(caseData.id)}
                          disabled={!canOpenCase(caseData) || openingCase === caseData.id}
                          variant={getCaseButtonVariant(caseData)}
                          size="sm"
                          className="w-full text-xs relative"
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
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Free Cases - New Design */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-success/10 rounded-3xl blur-3xl"></div>
          <Card className="relative glass border border-accent/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent"></div>
            <CardHeader className="relative">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent to-success rounded-full blur-lg animate-pulse"></div>
                  <Gift className="w-6 h-6 text-accent relative z-10" />
                  <Sparkles className="w-3 h-3 text-warning absolute -top-1 -right-1 animate-pulse z-20" />
                </div>
                <span className="gradient-accent bg-clip-text text-transparent">FREE CASES</span>
                <span className="text-sm text-muted-foreground font-normal">• ALWAYS AVAILABLE</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {caseStatuses.map((status) => (
                  <div key={status.config.type} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-xl blur-lg group-hover:blur-xl transition-all"></div>
                    <Card className="relative glass border border-primary/20 hover:glow-primary transition-smooth overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <CardContent className="p-6 text-center space-y-4 relative">
                        <div className="relative">
                          <div className={`w-20 h-20 mx-auto bg-gradient-to-br ${status.config.color} rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-glow transition-all`}>
                            <span className="text-3xl group-hover:animate-pulse-glow transition-all">{status.config.icon}</span>
                          </div>
                          <div className={`absolute -top-2 -right-2 text-xs px-3 py-1 rounded-full font-bold border ${
                            status.config.type === 'common' ? 'bg-gray-500 text-white border-gray-400' :
                            status.config.type === 'rare' ? 'bg-blue-500 text-white border-blue-400' :
                            'bg-purple-500 text-white border-purple-400'
                          }`}>
                            {status.config.type.toUpperCase()}
                          </div>
                          {status.canClaim && (
                            <div className="absolute -top-1 -left-1 w-4 h-4 bg-success rounded-full animate-pulse"></div>
                          )}
                        </div>
                        
                        <div className="relative">
                          <h3 className="font-bold text-lg mb-1">{status.config.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            ${status.config.minAmount.toLocaleString()} - ${status.config.maxAmount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
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
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Case History - New Design */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-warning/10 rounded-3xl blur-3xl"></div>
          <Card className="relative glass border border-accent/20 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent"></div>
            <CardHeader className="relative">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent to-warning rounded-full blur-lg animate-pulse"></div>
                  <Clock className="w-6 h-6 text-accent relative z-10" />
                  <Zap className="w-3 h-3 text-warning absolute -top-1 -right-1 animate-pulse z-20" />
                </div>
                <span className="gradient-accent bg-clip-text text-transparent">CASE HISTORY</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-warning/20 rounded-full blur-xl animate-pulse"></div>
                    <Clock className="w-20 h-20 mx-auto text-muted-foreground opacity-50 relative z-10" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 gradient-accent bg-clip-text text-transparent">NO CASES OPENED YET</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your opened cases will appear here with detailed statistics.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((caseReward) => (
                    <div key={caseReward.id} className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-transparent rounded-xl blur-lg group-hover:blur-xl transition-all"></div>
                      <div className="relative glass border border-accent/20 rounded-xl p-4 hover:glow-accent transition-smooth group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                        <div className="flex items-center justify-between relative">
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <div className={`w-5 h-5 rounded-full ${getRarityColor(caseReward.rarity)} group-hover:animate-pulse-glow transition-all`} />
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                            </div>
                            <div>
                              <div className="font-bold text-lg">
                                {getCaseTypeDisplayName(caseReward.case_type, caseReward.level_unlocked)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {caseReward.rarity.charAt(0).toUpperCase() + caseReward.rarity.slice(1)} • 
                                Opened {formatDate(caseReward.opened_at || caseReward.created_at)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right relative">
                            <div className="font-bold text-2xl text-success group-hover:animate-cyber-balance-glow transition-all">
                              +${caseReward.reward_amount.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">REWARD</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enhanced Case Opening Modal for Free Cases */}
      {selectedFreeCase && (
        <EnhancedCaseOpeningModal
          isOpen={!!selectedFreeCase}
          onClose={closeFreeCaseModal}
          caseId={`free-${selectedFreeCase.type}`}
          level={1} // Free cases use level 1 as base
          onCaseOpened={handleFreeCaseOpened}
          isFreeCase={true}
          freeCaseType={selectedFreeCase.type}
        />
      )}
    </div>
  );
}