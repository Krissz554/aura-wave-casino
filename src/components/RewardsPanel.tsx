
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Gift, Clock, Coins, Zap, Crown, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/hooks/useUserProfile';

interface RewardsPanelProps {
  userData: UserProfile;
  onUpdateUser: (updatedData: Partial<UserProfile>) => Promise<void>;
}

export default function RewardsPanel({ userData, onUpdateUser }: RewardsPanelProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const CLAIM_COOLDOWN = 20000; // 20 seconds
  const CLAIM_AMOUNT = 100;

  useEffect(() => {
    const updateTimer = () => {
      if (!userData) return;

      const now = Date.now();
      const lastClaim = new Date(userData.last_claim_time).getTime();
      const timeSinceClaim = now - lastClaim;
      
      if (timeSinceClaim >= CLAIM_COOLDOWN) {
        setCanClaim(true);
        setTimeLeft(0);
      } else {
        setCanClaim(false);
        setTimeLeft(CLAIM_COOLDOWN - timeSinceClaim);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [userData]);

  const handleClaim = async () => {
    if (!canClaim || !userData || isUpdating) return;

    const bonusMessages = [
      "You've earned your coffee bonus! ☕",
      "Digital coins rain from the sky! 🌧️",
      "The casino vault opens up! 💰",
      "Your patience has been rewarded! ⏰",
      "Lucky you! Free credits incoming! 🍀"
    ];

    const randomMessage = bonusMessages[Math.floor(Math.random() * bonusMessages.length)];

    setIsUpdating(true);
    try {
      await onUpdateUser({
        balance: userData.balance + CLAIM_AMOUNT,
        last_claim_time: new Date().toISOString(),
        // XP bonus is now handled by user_level_stats table automatically
      });

      toast({
        title: "Reward Claimed!",
        description: `${randomMessage} +$${CLAIM_AMOUNT}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to claim reward. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const progressPercentage = timeLeft > 0 ? ((CLAIM_COOLDOWN - timeLeft) / CLAIM_COOLDOWN) * 100 : 100;

  return (
    <Card className="glass border border-accent/20 shadow-glow overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent"></div>
      <CardHeader className="relative pb-4">
        <CardTitle className="flex items-center space-x-3 text-xl">
          <div className="relative">
            <Gift className="w-6 h-6 text-accent animate-pulse-glow" />
            <Sparkles className="w-3 h-3 text-warning absolute -top-1 -right-1 animate-pulse" />
          </div>
          <span className="gradient-accent bg-clip-text text-transparent">DAILY REWARDS</span>
          <div className="flex items-center space-x-2 ml-auto">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground font-normal">ACTIVE</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 relative">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="text-4xl font-bold gradient-accent bg-clip-text text-transparent mb-2">
              ${CLAIM_AMOUNT}
            </div>
            <div className="text-sm text-muted-foreground font-medium">DAILY BONUS</div>
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-success rounded-full animate-pulse"></div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {canClaim ? 'READY!' : formatTime(timeLeft)}
              </span>
            </div>
            
            <div className="relative">
              <Progress 
                value={progressPercentage} 
                className="h-3 bg-muted/20 border border-accent/20"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-transparent rounded-full"></div>
              {canClaim && (
                <div className="absolute inset-0 bg-gradient-to-r from-success/20 to-accent/20 rounded-full animate-pulse"></div>
              )}
            </div>
          </div>
          
          <Button 
            onClick={handleClaim}
            disabled={!canClaim || isUpdating}
            className={`w-full group ${
              canClaim 
                ? 'gradient-accent hover:glow-accent border border-accent/20 animate-cyber-button-press' 
                : 'bg-muted text-muted-foreground cursor-not-allowed border border-muted'
            }`}
          >
            {isUpdating ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                CLAIMING...
              </>
            ) : canClaim ? (
              <>
                <Coins className="w-4 h-4 mr-2 animate-pulse" />
                CLAIM REWARD
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 mr-2" />
                WAITING...
              </>
            )}
          </Button>
        </div>
        
        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-accent/20">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">+10 XP</div>
            <div className="text-xs text-muted-foreground">BONUS XP</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-success">20s</div>
            <div className="text-xs text-muted-foreground">COOLDOWN</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
