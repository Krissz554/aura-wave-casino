import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Gift, Package, Trophy, Clock, Zap, Crown, Target, Sparkles, Coins, Star, Shield, Lock, Unlock } from 'lucide-react';
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
        <div className="glass p-8 rounded-2xl text-center border border-primary/20">
          <div className="text-4xl mb-4 animate-pulse">📦</div>
          <p className="text-muted-foreground">Loading your rewards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 transition-all duration-700 ease-out ${
      isPageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
    }`}>
      {/* Header */}
      <header className={`relative mb-8 transition-all duration-500 ease-out delay-100 ${
        isPageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <div className="glass rounded-xl p-6 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="glass border border-primary/20 hover:glow-primary transition-smooth"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Games
              </Button>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Crown className="w-6 h-6 text-primary" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                </div>
                <h1 className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
                  REWARD VAULT
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">ONLINE</span>
            </div>
          </div>
        </div>
      </header>

      <div className={`max-w-7xl mx-auto px-4 space-y-8 transition-all duration-600 ease-out delay-200 ${
        isPageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass border border-primary/20 hover:glow-primary transition-smooth group">
            <CardContent className="p-6 text-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <div className="relative">
                <Package className="w-10 h-10 mx-auto mb-3 text-primary" />
                <div className="text-2xl font-bold gradient-primary bg-clip-text text-transparent mb-1">
                  {stats.totalCasesOpened}
                </div>
                <div className="text-sm text-muted-foreground">Total Cases Opened</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass border border-accent/20 hover:glow-success transition-smooth group">
            <CardContent className="p-6 text-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <div className="relative">
                <Coins className="w-10 h-10 mx-auto mb-3 text-accent" />
                <div className="text-2xl font-bold gradient-success bg-clip-text text-transparent mb-1">
                  ${stats.totalRewards.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Total Rewards</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass border border-success/20 hover:glow-success transition-smooth group">
            <CardContent className="p-6 text-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <div className="relative">
                <Trophy className="w-10 h-10 mx-auto mb-3 text-success" />
                <div className="text-2xl font-bold gradient-success bg-clip-text text-transparent mb-1">
                  {levelDailyCases.filter(c => canOpenCase(c)).length}
                </div>
                <div className="text-sm text-muted-foreground">Available Cases</div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border border-warning/20 hover:glow-warning transition-smooth group">
            <CardContent className="p-6 text-center relative">
              <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <div className="relative">
                <Star className="w-10 h-10 mx-auto mb-3 text-warning" />
                <div className="text-2xl font-bold gradient-warning bg-clip-text text-transparent mb-1">
                  {userData?.level || 0}
                </div>
                <div className="text-sm text-muted-foreground">Your Level</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Level Daily Cases */}
        <Card className="glass border border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <div className="relative">
                <Crown className="w-5 h-5 text-primary" />
                <Sparkles className="w-3 h-3 text-warning absolute -top-1 -right-1 animate-pulse" />
              </div>
              <span>Level Daily Cases</span>
              <span className="text-sm text-muted-foreground font-normal">• Reset Daily</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4">
              {levelDailyCases.map((caseData) => (
                <Card key={caseData.id} className="glass border border-primary/20 hover:glow-primary transition-smooth group">
                  <CardContent className="p-4 text-center space-y-3 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
                    <div className="relative">
                      <div className={`w-12 h-12 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg ${
                        caseData.user_level < caseData.level_required ? 'opacity-50' : ''
                      }`}>
                        {caseData.user_level < caseData.level_required ? (
                          <Lock className="w-6 h-6 text-white" />
                        ) : (
                          <Gift className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-1 py-0.5 rounded-full font-bold">
                        {caseData.level_required}
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="text-xs font-semibold">Level {caseData.level_required}</div>
                      <div className={`text-xs ${getCaseStatusColor(caseData)}`}>
                        {getCaseStatusText(caseData)}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => handleLevelCaseOpened(caseData.id)}
                      disabled={!canOpenCase(caseData) || openingCase === caseData.id}
                      variant={getCaseButtonVariant(caseData)}
                      size="sm"
                      className="w-full text-xs"
                    >
                      {openingCase === caseData.id ? (
                        <>
                          <div className="w-3 h-3 mr-1 border border-current border-t-transparent rounded-full animate-spin"></div>
                          Opening...
                        </>
                      ) : caseData.user_level < caseData.level_required ? (
                        <>
                          <Lock className="w-3 h-3 mr-1" />
                          Locked
                        </>
                      ) : !caseData.is_available ? (
                        <>
                          <Clock className="w-3 h-3 mr-1" />
                          Opened
                        </>
                      ) : (
                        <>
                          <Gift className="w-3 h-3 mr-1" />
                          Open
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Free Cases */}
        <Card className="glass border border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <div className="relative">
                <Gift className="w-5 h-5 text-accent" />
                <Sparkles className="w-3 h-3 text-warning absolute -top-1 -right-1 animate-pulse" />
              </div>
              <span>Free Cases</span>
              <span className="text-sm text-muted-foreground font-normal">• Always Available</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {caseStatuses.map((status) => (
                <Card key={status.config.type} className="glass border border-primary/20 hover:glow-primary transition-smooth group">
                  <CardContent className="p-6 text-center space-y-4 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
                    <div className="relative">
                      <div className={`w-16 h-16 mx-auto bg-gradient-to-br ${status.config.color} rounded-lg flex items-center justify-center shadow-lg`}>
                        <span className="text-2xl">{status.config.icon}</span>
                      </div>
                      <div className={`absolute -top-2 -right-2 text-xs px-2 py-1 rounded-full font-bold ${
                        status.config.type === 'common' ? 'bg-gray-500 text-white' :
                        status.config.type === 'rare' ? 'bg-blue-500 text-white' :
                        'bg-purple-500 text-white'
                      }`}>
                        {status.config.type.toUpperCase()}
                      </div>
                      {status.canClaim && (
                        <div className="absolute -top-1 -left-1 w-3 h-3 bg-success rounded-full animate-pulse"></div>
                      )}
                    </div>
                    
                    <div className="relative">
                      <h3 className="font-semibold">{status.config.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        ${status.config.minAmount.toLocaleString()} - ${status.config.maxAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {status.config.cooldownMinutes} minute cooldown
                      </p>
                    </div>
                    
                    <Button 
                      onClick={() => openFreeCaseModal(status.config.type)}
                      disabled={!status.canClaim}
                      className={`w-full relative ${
                        status.canClaim 
                          ? 'gradient-primary hover:glow-primary' 
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                      }`}
                    >
                      {status.canClaim ? (
                        <>
                          <Gift className="w-4 h-4 mr-2" />
                          Open Free Case
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
                            
                            if (timeUntil <= 0) return 'Ready!';
                            if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
                            return `${remainingSeconds}s`;
                          })()}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Case History */}
        <Card className="glass border border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <div className="relative">
                <Clock className="w-5 h-5 text-accent" />
                <Zap className="w-3 h-3 text-warning absolute -top-1 -right-1 animate-pulse" />
              </div>
              <span>Case History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  <div key={caseReward.id} className="flex items-center justify-between p-4 glass rounded-lg border border-accent/20 hover:glow-accent transition-smooth group">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
                    <div className="flex items-center space-x-4 relative">
                      <div className="relative">
                        <div className={`w-4 h-4 rounded-full ${getRarityColor(caseReward.rarity)}`} />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse"></div>
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
                    
                    <div className="text-right relative">
                      <div className="font-semibold text-success">
                        +${caseReward.reward_amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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