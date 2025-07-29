import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Gift, Package, Trophy, Clock, Zap, Crown, Target, Sparkles } from 'lucide-react';
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
        <div className="glass p-8 rounded-2xl text-center">
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
                <Crown className="w-6 h-6 text-primary" />
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

      <div className={`max-w-6xl mx-auto px-4 space-y-8 transition-all duration-600 ease-out delay-200 ${
        isPageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass border border-primary/20 hover:glow-primary transition-smooth">
            <CardContent className="p-6 text-center">
              <Package className="w-10 h-10 mx-auto mb-3 text-primary" />
              <div className="text-2xl font-bold gradient-primary bg-clip-text text-transparent mb-1">
                {availableCases.length}
              </div>
              <div className="text-sm text-muted-foreground">Available Cases</div>
            </CardContent>
          </Card>
          
          <Card className="glass border border-accent/20 hover:glow-success transition-smooth">
            <CardContent className="p-6 text-center">
              <Gift className="w-10 h-10 mx-auto mb-3 text-accent" />
              <div className="text-2xl font-bold gradient-success bg-clip-text text-transparent mb-1">
                {openedCases.length}
              </div>
              <div className="text-sm text-muted-foreground">Cases Opened</div>
            </CardContent>
          </Card>
          
          <Card className="glass border border-success/20 hover:glow-success transition-smooth">
            <CardContent className="p-6 text-center">
              <Trophy className="w-10 h-10 mx-auto mb-3 text-success" />
              <div className="text-2xl font-bold gradient-success bg-clip-text text-transparent mb-1">
                ${openedCases.reduce((sum, c) => sum + c.reward_amount, 0).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Total Earned</div>
            </CardContent>
          </Card>
        </div>

        {/* Free Cases */}
        <Card className="glass border border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Gift className="w-5 h-5 text-accent" />
              <span>Free Cases</span>
              <span className="text-sm text-muted-foreground font-normal">• Always Available</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {caseStatuses.map((status) => (
                <Card key={status.config.type} className="glass border border-primary/20 hover:glow-primary transition-smooth">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="relative">
                      <div className={`w-16 h-16 mx-auto bg-gradient-to-br ${status.config.color} rounded-lg flex items-center justify-center`}>
                        <span className="text-2xl">{status.config.icon}</span>
                      </div>
                      <div className={`absolute -top-2 -right-2 text-xs px-2 py-1 rounded-full font-bold ${
                        status.config.type === 'common' ? 'bg-gray-500 text-white' :
                        status.config.type === 'rare' ? 'bg-blue-500 text-white' :
                        'bg-purple-500 text-white'
                      }`}>
                        {status.config.type.toUpperCase()}
                      </div>
                    </div>
                    
                    <div>
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
                      className={`w-full ${
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

        {/* Available Cases */}
        <Card className="glass border border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Package className="w-5 h-5 text-primary" />
              <span>Available Cases</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableCases.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Cases Available</h3>
                <p className="text-muted-foreground">
                  Level up to earn reward cases! You get a case every 25 levels.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableCases.map((caseReward) => (
                  <Card key={caseReward.id} className="glass border border-primary/20 hover:glow-primary transition-smooth cursor-pointer">
                    <CardContent className="p-6 text-center space-y-4">
                      <div className="relative">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <Gift className="w-10 h-10 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                          LV {caseReward.level_unlocked}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold">Level {caseReward.level_unlocked} Case</h3>
                        <p className="text-sm text-muted-foreground">
                          Earned on {formatDate(caseReward.created_at)}
                        </p>
                      </div>
                      
                      <Button 
                        onClick={() => handleOpenCase(caseReward.id, caseReward.level_unlocked)}
                        className="w-full gradient-primary hover:glow-primary"
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        Open Case
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Case History */}
        <Card className="glass border border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Clock className="w-5 h-5 text-accent" />
              <span>Case History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {openedCases.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Cases Opened Yet</h3>
                <p className="text-muted-foreground">
                  Your opened cases will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {openedCases.map((caseReward) => (
                  <div key={caseReward.id} className="flex items-center justify-between p-4 glass rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${getRarityColor(caseReward.rarity)}`} />
                      <div>
                        <div className="font-semibold">
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