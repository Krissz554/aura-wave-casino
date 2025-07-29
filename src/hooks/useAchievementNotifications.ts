import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLevelStats } from './useUserLevelStats';

interface ClaimableAchievement {
  id: string;
  name: string;
  description: string;
  rarity: string;
  reward_amount: number;
  reward_type: string;
}

export function useAchievementNotifications() {
  const { user } = useAuth();
  const { stats } = useUserLevelStats();
  const [claimableAchievements, setClaimableAchievements] = useState<ClaimableAchievement[]>([]);
  const [hasNewClaimable, setHasNewClaimable] = useState(false);

  const calculateProgress = (achievement: any, userStats: any): number => {
    if (!userStats) return 0;
    
    const criteria = achievement.criteria; // Use 'criteria' field from database
    const criteriaType = criteria?.type;
    const targetValue = criteria?.value || 0;

    let currentValue = 0;
    
    switch (criteriaType) {
      case 'total_games': currentValue = userStats.total_games || 0; break;
      case 'total_wins': currentValue = userStats.total_wins || 0; break;
      case 'total_profit': currentValue = userStats.total_profit || 0; break;
      case 'total_wagered': currentValue = userStats.total_wagered || 0; break;
      case 'roulette_games': currentValue = userStats.roulette_games || 0; break;
      case 'roulette_wins': currentValue = userStats.roulette_wins || 0; break;
      case 'roulette_green_wins': currentValue = userStats.roulette_green_wins || 0; break;
      case 'roulette_biggest_win': currentValue = userStats.roulette_highest_win || 0; break;
      case 'tower_games': currentValue = userStats.tower_games || 0; break;
      case 'tower_highest_level': currentValue = userStats.tower_highest_level || 0; break;
      case 'tower_perfect_games': currentValue = userStats.tower_perfect_games || 0; break;
      case 'coinflip_wins': currentValue = userStats.coinflip_wins || 0; break;
      case 'total_cases_opened': currentValue = userStats.total_cases_opened || 0; break;
      default: currentValue = 0;
    }

    return Math.min(100, (currentValue / targetValue) * 100);
  };

  const checkForClaimableAchievements = async () => {
    if (!user || !stats) return;

    try {
      // Fetch all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*');

      if (achievementsError) throw achievementsError;

      // Fetch user's unlocked achievements
      const { data: unlockedAchievements, error: userError } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);

      if (userError) throw userError;

      // Find achievements that are ready to claim
      const claimable = (allAchievements || []).filter(achievement => {
        const isAlreadyUnlocked = (unlockedAchievements || []).some(ua => ua.achievement_id === achievement.id);
        if (isAlreadyUnlocked) return false;
        
        const progress = calculateProgress(achievement, stats);
        return progress >= 100;
      });

      const previousCount = claimableAchievements.length;
      setClaimableAchievements(claimable);
      
      // Show notification if new achievements are ready
      if (claimable.length > previousCount) {
        setHasNewClaimable(true);
      }
    } catch (error) {
      console.error('Error checking claimable achievements:', error);
    }
  };

  useEffect(() => {
    checkForClaimableAchievements();
  }, [stats, user]);

  const dismissNotification = () => {
    setHasNewClaimable(false);
  };

  return {
    claimableAchievements,
    hasNewClaimable,
    dismissNotification,
    checkForClaimableAchievements
  };
}