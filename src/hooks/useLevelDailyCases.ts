import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface LevelDailyCase {
  id: string;
  level_required: number;
  is_available: boolean;
  last_reset_date: string;
  user_level: number;
}

interface CaseOpeningResult {
  success: boolean;
  reward_amount: number;
  level_required: number;
  case_id: string;
}

export function useLevelDailyCases() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cases, setCases] = useState<LevelDailyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingCase, setOpeningCase] = useState<string | null>(null);

  // Fetch level daily cases
  const fetchCases = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_user_level_daily_cases', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error fetching level daily cases:', error);
        toast({
          title: "Error",
          description: "Failed to load level daily cases",
          variant: "destructive",
        });
        return;
      }

      setCases(data || []);
    } catch (error) {
      console.error('Error fetching level daily cases:', error);
      toast({
        title: "Error",
        description: "Failed to load level daily cases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Open a level daily case
  const openCase = async (caseId: string): Promise<CaseOpeningResult | null> => {
    if (!user) return null;

    try {
      setOpeningCase(caseId);
      const { data, error } = await supabase.rpc('open_level_daily_case', {
        case_id: caseId,
        user_uuid: user.id
      });

      if (error) {
        console.error('Error opening level daily case:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to open case",
          variant: "destructive",
        });
        return null;
      }

      const result = data as CaseOpeningResult;
      
      if (result.success) {
        toast({
          title: "Case Opened!",
          description: `You won $${result.reward_amount.toFixed(2)}!`,
        });

        // Refresh cases to update availability
        await fetchCases();
      }

      return result;
    } catch (error) {
      console.error('Error opening level daily case:', error);
      toast({
        title: "Error",
        description: "Failed to open case",
        variant: "destructive",
      });
      return null;
    } finally {
      setOpeningCase(null);
    }
  };

  // Check if user can open a case
  const canOpenCase = (caseData: LevelDailyCase): boolean => {
    return caseData.user_level >= caseData.level_required && caseData.is_available;
  };

  // Get case status text
  const getCaseStatusText = (caseData: LevelDailyCase): string => {
    if (caseData.user_level < caseData.level_required) {
      return `Requires Level ${caseData.level_required}`;
    }
    if (!caseData.is_available) {
      return "Opened Today";
    }
    return "Available";
  };

  // Get case status color
  const getCaseStatusColor = (caseData: LevelDailyCase): string => {
    if (caseData.user_level < caseData.level_required) {
      return "text-muted-foreground";
    }
    if (!caseData.is_available) {
      return "text-accent";
    }
    return "text-success";
  };

  // Get case button variant
  const getCaseButtonVariant = (caseData: LevelDailyCase): "default" | "secondary" | "outline" => {
    if (caseData.user_level < caseData.level_required) {
      return "outline";
    }
    if (!caseData.is_available) {
      return "secondary";
    }
    return "default";
  };

  // Initialize cases and set up real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchCases();

    // Set up real-time subscription for case updates
    const channel = supabase
      .channel('level_daily_cases')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'level_daily_cases',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchCases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    cases,
    loading,
    openingCase,
    openCase,
    canOpenCase,
    getCaseStatusText,
    getCaseStatusColor,
    getCaseButtonVariant,
    refreshCases: fetchCases
  };
}