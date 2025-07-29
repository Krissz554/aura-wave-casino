import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Gift, Package, Trophy, Clock, Zap, Star, Crown, Target, Coins, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCaseRewards } from '@/hooks/useCaseRewards';
import { useFreeCases } from '@/hooks/useFreeCases';
import { EnhancedCaseOpeningModal } from '@/components/EnhancedCaseOpeningModal';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function Rewards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userData, updateUserProfile } = useUserProfile();
  const { availableCases, openedCases, loading, openCase } = useCaseRewards();
  const { caseStatuses, selectedFreeCase, openFreeCaseModal, handleFreeCaseOpened, closeFreeCaseModal } = useFreeCases();
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [isPageVisible, setIsPageVisible] = useState(false);
  const { toast } = useToast();

  // Smooth page entrance animation
  useEffect(() => {
    setIsPageVisible(true);
  }, []);

  const handleOpenCase = (caseId: string, level: number) => {
    setSelectedCase(caseId);
    setSelectedLevel(level);
  };

  const handleCaseOpened = async (reward: any) => {
    toast({
      title: `${reward.rarity.toUpperCase()} Reward!`,
      description: `You won $${reward.amount}!`,
    });
    setSelectedCase(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500';
      case 'rare': return 'bg-blue-500';
      case 'epic': return 'bg-purple-500';
      case 'legendary': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="glass p-8 rounded-2xl text-center animate-cyber-pulse">
          <div className="text-4xl mb-4 animate-pulse-glow">📦</div>
          <p className="text-muted-foreground animate-cyber-typing">Loading your rewards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 transition-all duration-700 ease-out ${
      isPageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
    }`}>
      {/* Animated Background Grid */}
      <div className="fixed inset-0 opacity-10 animate-grid-move-slow">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_50%,rgba(255,255,255,0.1)_50%),linear-gradient(0deg,transparent_50%,rgba(255,255,255,0.1)_50%)] bg-[length:20px_20px]"></div>
      </div>

      {/* Header */}
      <header className={`relative mb-8 transition-all duration-500 ease-out delay-100 ${
        isPageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <div className="glass rounded-xl p-6 border border-primary/20 shadow-glow">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="glass border border-primary/20 hover:glow-primary transition-smooth group"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                Back to Games
              </Button>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Crown className="w-8 h-8 text-primary animate-pulse-glow" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                </div>
                <h1 className="text-3xl font-bold gradient-primary bg-clip-text text-transparent animate-cyber-logo-shine">
                  REWARD VAULT
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-sm text-muted-foreground">SYSTEM ONLINE</span>
            </div>
          </div>
        </div>
      </header>

      <div className={`max-w-7xl mx-auto px-4 space-y-8 transition-all duration-600 ease-out delay-200 ${
        isPageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}>
        


        {/* Stats Overview - Cyberpunk Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass border border-primary/20 hover:glow-primary transition-smooth group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="p-6 text-center relative">
              <div className="relative mb-4">
                <Package className="w-12 h-12 mx-auto text-primary group-hover:animate-pulse-glow transition-all" />
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-accent rounded-full animate-pulse"></div>
              </div>
              <div className="text-3xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
                {availableCases.length}
              </div>
              <div className="text-sm text-muted-foreground font-medium">AVAILABLE CASES</div>
            </CardContent>
          </Card>
          
          <Card className="glass border border-accent/20 hover:glow-success transition-smooth group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="p-6 text-center relative">
              <div className="relative mb-4">
                <Gift className="w-12 h-12 mx-auto text-accent group-hover:animate-pulse-glow transition-all" />
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-success rounded-full animate-pulse"></div>
              </div>
              <div className="text-3xl font-bold gradient-success bg-clip-text text-transparent mb-2">
                {openedCases.length}
              </div>
              <div className="text-sm text-muted-foreground font-medium">CASES OPENED</div>
            </CardContent>
          </Card>
          
          <Card className="glass border border-success/20 hover:glow-success transition-smooth group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-success/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="p-6 text-center relative">
              <div className="relative mb-4">
                <Trophy className="w-12 h-12 mx-auto text-success group-hover:animate-pulse-glow transition-all" />
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-warning rounded-full animate-pulse"></div>
              </div>
              <div className="text-3xl font-bold gradient-success bg-clip-text text-transparent mb-2">
                ${openedCases.reduce((sum, c) => sum + c.reward_amount, 0).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground font-medium">TOTAL EARNED</div>
            </CardContent>
          </Card>
        </div>

        {/* Free Cases - Enhanced Cyberpunk */}
        <Card className="glass border border-accent/20 shadow-glow overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center space-x-3 text-xl">
              <div className="relative">
                <Gift className="w-6 h-6 text-accent animate-pulse-glow" />
                <Sparkles className="w-3 h-3 text-warning absolute -top-1 -right-1 animate-pulse" />
              </div>
              <span className="gradient-accent bg-clip-text text-transparent">FREE CASES</span>
              <span className="text-sm text-muted-foreground font-normal">• ALWAYS AVAILABLE</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {caseStatuses.map((status, index) => (
                <Card key={status.config.type} className="glass border border-primary/20 hover:glow-primary transition-smooth group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
                        <div className="absolute -top-1 -left-1 w-3 h-3 bg-success rounded-full animate-pulse"></div>
                      )}
                    </div>
                    
                    <div>
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
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Available Cases - Enhanced Cyberpunk */}
        <Card className="glass border border-primary/20 shadow-glow overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center space-x-3 text-xl">
              <div className="relative">
                <Package className="w-6 h-6 text-primary animate-pulse-glow" />
                <Target className="w-3 h-3 text-accent absolute -top-1 -right-1 animate-pulse" />
              </div>
              <span className="gradient-primary bg-clip-text text-transparent">AVAILABLE CASES</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {availableCases.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative mb-6">
                  <Package className="w-20 h-20 mx-auto text-muted-foreground opacity-50 animate-float" />
                  <div className="absolute inset-0 w-20 h-20 mx-auto border-2 border-primary/20 rounded-full animate-pulse"></div>
                </div>
                <h3 className="text-xl font-bold mb-3 gradient-primary bg-clip-text text-transparent">NO CASES AVAILABLE</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Level up to earn reward cases! You get a case every 25 levels.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCases.map((caseReward, index) => (
                  <Card key={caseReward.id} className="glass border border-primary/20 hover:glow-primary transition-smooth cursor-pointer group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <CardContent className="p-6 text-center space-y-4 relative">
                      <div className="relative">
                        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-glow transition-all">
                          <Gift className="w-12 h-12 text-white group-hover:animate-pulse-glow transition-all" />
                        </div>
                        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-bold border border-primary/50">
                          LV {caseReward.level_unlocked}
                        </div>
                        <div className="absolute -top-1 -left-1 w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-lg mb-2">Level {caseReward.level_unlocked} Case</h3>
                        <p className="text-sm text-muted-foreground">
                          Earned on {formatDate(caseReward.created_at)}
                        </p>
                      </div>
                      
                      <Button 
                        onClick={() => handleOpenCase(caseReward.id, caseReward.level_unlocked)}
                        className="w-full gradient-primary hover:glow-primary border border-primary/20 group-hover:animate-cyber-button-press"
                      >
                        <Gift className="w-4 h-4 mr-2 animate-pulse" />
                        OPEN CASE
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Case History - Enhanced Cyberpunk */}
        <Card className="glass border border-accent/20 shadow-glow overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent"></div>
          <CardHeader className="relative">
            <CardTitle className="flex items-center space-x-3 text-xl">
              <div className="relative">
                <Clock className="w-6 h-6 text-accent animate-pulse-glow" />
                <Zap className="w-3 h-3 text-warning absolute -top-1 -right-1 animate-pulse" />
              </div>
              <span className="gradient-accent bg-clip-text text-transparent">CASE HISTORY</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {openedCases.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative mb-6">
                  <Clock className="w-20 h-20 mx-auto text-muted-foreground opacity-50 animate-float" />
                  <div className="absolute inset-0 w-20 h-20 mx-auto border-2 border-accent/20 rounded-full animate-pulse"></div>
                </div>
                <h3 className="text-xl font-bold mb-3 gradient-accent bg-clip-text text-transparent">NO CASES OPENED YET</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Your opened cases will appear here with detailed statistics.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {openedCases.map((caseReward, index) => (
                  <div key={caseReward.id} className="glass border border-accent/20 rounded-xl p-4 hover:glow-accent transition-smooth group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className={`w-4 h-4 rounded-full ${getRarityColor(caseReward.rarity)} group-hover:animate-pulse-glow transition-all`} />
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                        </div>
                        <div>
                          <div className="font-bold text-lg">
                            {caseReward.level_unlocked === 0 
                              ? `${caseReward.rarity.charAt(0).toUpperCase() + caseReward.rarity.slice(1)} Free Case`
                              : `Level ${caseReward.level_unlocked} Case`
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {caseReward.rarity.charAt(0).toUpperCase() + caseReward.rarity.slice(1)} • 
                            Opened {formatDate(caseReward.opened_at || caseReward.created_at)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-2xl text-success group-hover:animate-cyber-balance-glow transition-all">
                          +${caseReward.reward_amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">REWARD</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Case Opening Modal for Level Rewards */}
      {selectedCase && (
        <EnhancedCaseOpeningModal
          isOpen={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          caseId={selectedCase}
          level={selectedLevel}
          onCaseOpened={handleCaseOpened}
        />
      )}

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