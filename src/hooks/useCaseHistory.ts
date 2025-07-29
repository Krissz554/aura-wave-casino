import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface CaseHistory {
  id: string;
  level_unlocked: number;
  reward_amount: number;
  rarity: string;
  case_type: string;
  opened_at: string;
  created_at: string;
}

interface CaseStats {
  totalCasesOpened: number;
  totalRewards: number;
  availableCases: number;
  levelDailyCases: number;
  freeCases: number;
}

export function useCaseHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<CaseHistory[]>([]);
  const [stats, setStats] = useState<CaseStats>({
    totalCasesOpened: 0,
    totalRewards: 0,
    availableCases: 0,
    levelDailyCases: 0,
    freeCases: 0
  });
  const [loading, setLoading] = useState(true);

  // Fetch case history
  const fetchHistory = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('case_rewards')
        .select('*')
        .eq('user_id', user.id)
        .order('opened_at', { ascending: false });

      if (error) {
        console.error('Error fetching case history:', error);
        return;
      }

      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching case history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from history
  const calculateStats = (historyData: CaseHistory[]) => {
    const totalCasesOpened = historyData.length;
    const totalRewards = historyData.reduce((sum, case_) => sum + case_.reward_amount, 0);
    const levelDailyCases = historyData.filter(case_ => case_.case_type === 'level_daily').length;
    const freeCases = historyData.filter(case_ => case_.case_type === 'free').length;

    setStats({
      totalCasesOpened,
      totalRewards,
      availableCases: 0, // This will be updated by other hooks
      levelDailyCases,
      freeCases
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get rarity color
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500';
      case 'rare': return 'bg-blue-500';
      case 'epic': return 'bg-purple-500';
      case 'legendary': return 'bg-orange-500';
      case 'level': return 'bg-primary';
      default: return 'bg-gray-400';
    }
  };

  // Get case type display name
  const getCaseTypeDisplayName = (caseType: string, levelUnlocked: number) => {
    switch (caseType) {
      case 'level_daily':
        return `Level ${levelUnlocked} Daily Case`;
      case 'free':
        return 'Free Case';
      default:
        return `Level ${levelUnlocked} Case`;
    }
  };

  // Initialize and set up real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchHistory();

    // Set up real-time subscription for case history updates
    const channel = supabase
      .channel('case_history')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'case_rewards',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Recalculate stats when history changes
  useEffect(() => {
    calculateStats(history);
  }, [history]);

  return {
    history,
    stats,
    loading,
    formatDate,
    getRarityColor,
    getCaseTypeDisplayName,
    refreshHistory: fetchHistory
  };
}