import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar, Shield, Eye, X, ChevronLeft, ChevronRight, HelpCircle, Terminal, Calculator, Dice6 } from 'lucide-react';
import { ProvablyFairModal } from './ProvablyFairModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

interface ProvablyFairHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RoundHistory {
  id: string;
  round_number: number;
  result_slot: number;
  result_color: string;
  server_seed_hash: string;
  nonce: number;
  created_at: string;
  status: string;
  daily_seed_id?: string;
  nonce_id?: number;
}

interface DailySeed {
  id: string;
  date: string;
  server_seed_hash: string;
  lotto_hash: string;
  is_revealed: boolean;
}

export function ProvablyFairHistoryModal({ isOpen, onClose }: ProvablyFairHistoryModalProps) {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<RoundHistory[]>([]);
  const [totalRounds, setTotalRounds] = useState<number>(0);
  const [dailySeeds, setDailySeeds] = useState<DailySeed[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [selectedRound, setSelectedRound] = useState<RoundHistory | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const ROUNDS_PER_PAGE = 100;

  useEffect(() => {
    if (isOpen) {
      fetchDailySeeds();
      setCurrentPage(1); // Reset to first page when date changes
      fetchRoundsForDate(selectedDate);
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    if (isOpen && selectedDate) {
      fetchRoundsForDate(selectedDate);
    }
  }, [currentPage]);

  const fetchDailySeeds = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_seeds')
        .select('id, date, server_seed_hash, lotto_hash, is_revealed')
        .order('date', { ascending: false })
        .limit(30); // Last 30 days

      if (error) {
        console.error('Error fetching daily seeds:', error);
        return;
      }

      setDailySeeds(data || []);
    } catch (error) {
      console.error('Error fetching daily seeds:', error);
    }
  };

  const fetchRoundsForDate = async (date: string) => {
    setLoading(true);
    try {
      // Find the daily seed for this date
      const { data: dailySeedData, error: seedError } = await supabase
        .from('daily_seeds')
        .select('id')
        .eq('date', date)
        .single();

      if (seedError || !dailySeedData) {
        console.log(`No daily seed found for ${date}`);
        setRounds([]);
        setTotalRounds(0);
        setLoading(false);
        return;
      }

      // First, get total count for pagination
      const { count, error: countError } = await supabase
        .from('roulette_rounds')
        .select('*', { count: 'exact', head: true })
        .eq('daily_seed_id', dailySeedData.id)
        .eq('status', 'completed');

      if (countError) {
        console.error('Error fetching total count:', countError);
      } else {
        setTotalRounds(count || 0);
      }

      // Fetch rounds for this daily seed with pagination
      const { data, error } = await supabase
        .from('roulette_rounds')
        .select('id, round_number, result_slot, result_color, server_seed_hash, nonce, created_at, status, daily_seed_id, nonce_id')
        .eq('daily_seed_id', dailySeedData.id)
        .eq('status', 'completed')
        .order('nonce_id', { ascending: false })
        .range((currentPage - 1) * ROUNDS_PER_PAGE, currentPage * ROUNDS_PER_PAGE - 1);

      if (error) {
        console.error('Error fetching round history:', error);
        setRounds([]);
      } else {
        setRounds(data || []);
      }
    } catch (error) {
      console.error('Error fetching rounds for date:', error);
      setRounds([]);
      setTotalRounds(0);
    }
    setLoading(false);
  };

  const openRoundDetails = (round: RoundHistory) => {
    setSelectedRound(round);
    setDetailModalOpen(true);
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-emerald-500';
      case 'red': return 'bg-red-500';
      case 'black': return 'bg-gray-800';
      default: return 'bg-gray-500';
    }
  };

  const getSystemType = (round: RoundHistory) => {
    return round.daily_seed_id ? 'Advanced' : 'Legacy';
  };

  const changeDate = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    const newDate = new Date(currentDate);
    
    if (direction === 'prev') {
      newDate.setDate(currentDate.getDate() - 1);
    } else {
      newDate.setDate(currentDate.getDate() + 1);
    }
    
    // Don't go beyond today
    const today = new Date();
    if (newDate <= today) {
      setSelectedDate(newDate.toISOString().split('T')[0]);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const selectedDailySeed = dailySeeds.find(seed => seed.date === selectedDate);
  const totalPages = Math.ceil(totalRounds / ROUNDS_PER_PAGE);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="glass border-0 max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-5 h-5 text-emerald-400" />
              Provably Fair History
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Date Selection */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-4 rounded-lg border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  <div>
                    <Label className="text-sm font-medium text-foreground">Select Date</Label>
                    <p className="text-xs text-muted-foreground">View games and verify results from any day</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => changeDate('prev')}
                    className="h-8 w-8 p-0 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:shadow-md hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="h-8 text-sm bg-background/50 border-emerald-500/30"
                    />
                    <div className="text-sm font-medium text-foreground min-w-0">
                      {formatDateDisplay(selectedDate)}
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => changeDate('next')}
                    disabled={selectedDate >= new Date().toISOString().split('T')[0]}
                    className="h-8 w-8 p-0 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:shadow-md hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Daily Seed Info */}
              {selectedDailySeed && (
                <div className="mt-3 pt-3 border-t border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-foreground">Daily Seed Status</span>
                      <Badge variant={selectedDailySeed.is_revealed ? "default" : "secondary"} className="text-xs">
                        {selectedDailySeed.is_revealed ? 'Revealed' : 'Hidden'}
                      </Badge>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">
                      Hash: {selectedDailySeed.server_seed_hash.slice(0, 16)}...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Games List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">
                  Games for {formatDateDisplay(selectedDate)}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {totalRounds} total rounds
                  </Badge>
                  {totalPages > 1 && (
                    <Badge variant="outline" className="text-xs">
                      Page {currentPage} of {totalPages}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="h-8 px-2 text-xs"
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="h-8 w-8 p-0 text-xs"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-8 px-2 text-xs"
                  >
                    Last
                  </Button>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : !user ? (
                /* Cyberpunk Guest Authentication Notification */
                <div className="relative overflow-hidden my-6">
                  {/* Multi-layer cyberpunk background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95" />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.08)_25%,rgba(99,102,241,0.08)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.08)_75%,rgba(99,102,241,0.08)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.08)_25%,rgba(99,102,241,0.08)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.08)_75%,rgba(99,102,241,0.08)_76%,transparent_77%,transparent)] bg-[length:12px_12px] opacity-50" />
                  
                  {/* Angular clipping */}
                  <div className="relative border border-indigo-500/30 rounded-lg">
                    {/* Scan line animation */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent translate-x-[-100%] animate-[cyber-scan_3s_ease-in-out_infinite] rounded-lg" />
                    
                    {/* Tech corners */}
                    <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-indigo-400/60" />
                    <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-cyan-400/60" />
                    <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-purple-400/60" />
                    <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-indigo-400/60" />
                    
                    <div className="relative z-10 text-center py-8 px-6 space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="relative">
                          <Shield className="w-8 h-8 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                          <div className="absolute inset-0 border border-indigo-400/30 rounded-full animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold font-mono tracking-wider bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                          AUTHENTICATION_REQUIRED
                        </h3>
                      </div>
                      
                      {/* Description */}
                      <p className="text-slate-300 font-mono text-sm leading-relaxed max-w-md mx-auto">
                        Access to provably fair verification history requires system authentication.
                        View detailed round data and cryptographic proofs.
                      </p>
                      
                      {/* Features grid */}
                      <div className="bg-gradient-to-r from-slate-800/80 via-slate-700/60 to-slate-800/80 rounded-lg p-4 space-y-3 border border-indigo-500/30 mx-auto max-w-md">
                        <div className="text-sm text-indigo-300 font-mono tracking-wider">HISTORY_FEATURES:</div>
                        <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                          <div className="text-cyan-300 flex items-center justify-center gap-2">
                            <Calendar className="w-3 h-3" />
                            » COMPLETE_ROUND_HISTORY
                          </div>
                          <div className="text-cyan-300 flex items-center justify-center gap-2">
                            <Eye className="w-3 h-3" />
                            » DETAILED_VERIFICATION_DATA
                          </div>
                          <div className="text-cyan-300 flex items-center justify-center gap-2">
                            <Calculator className="w-3 h-3" />
                            » CRYPTOGRAPHIC_VALIDATION
                          </div>
                          <div className="text-cyan-300 flex items-center justify-center gap-2">
                            <Dice6 className="w-3 h-3" />
                            » PERSONAL_BET_TRACKING
                          </div>
                        </div>
                      </div>
                      
                      {/* Call to action */}
                      <p className="text-xs text-slate-400 font-mono tracking-wide">
                        ENGAGE_SYSTEM_TO_ACCESS_VERIFICATION_PROTOCOL
                      </p>
                    </div>
                  </div>
                </div>
              ) : rounds.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No games found for {formatDateDisplay(selectedDate)}</p>
                  <p className="text-sm">Try selecting a different date</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">{rounds.map((round) => (
                    <div
                      key={round.id}
                      className="glass border-0 p-4 rounded-lg hover:bg-white/5 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Round Number */}
                          <div className="text-lg font-bold text-emerald-400">
                            #{round.round_number}
                          </div>

                          {/* Result */}
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${getColorClass(round.result_color)}`}>
                              {round.result_slot}
                            </div>
                            <span className="text-sm text-muted-foreground capitalize">
                              {round.result_color}
                            </span>
                          </div>

                          {/* System Type */}
                          <Badge variant={getSystemType(round) === 'Advanced' ? 'default' : 'secondary'} className="text-xs">
                            {getSystemType(round)}
                          </Badge>

                          {/* Hash Preview */}
                          <div className="text-xs font-mono text-muted-foreground">
                            {round.server_seed_hash.slice(0, 12)}...
                          </div>

                          {/* Date */}
                          <div className="text-xs text-muted-foreground">
                            {new Date(round.created_at).toLocaleString()}
                          </div>
                        </div>

                        {/* Actions */}
                        <Button
                          onClick={() => openRoundDetails(round)}
                          variant="outline"
                          size="sm"
                          className="glass border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-400 text-emerald-400 hover:text-emerald-300 hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <Link 
                to="/provably-fair" 
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-emerald-400 transition-colors"
                onClick={() => onClose()}
              >
                <HelpCircle className="w-4 h-4" />
                How does Provably Fair work?
              </Link>
              
              <Button onClick={onClose} variant="outline" className="glass">
                <X className="w-4 h-4 mr-1" />
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Round Details Modal */}
      <ProvablyFairModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        roundData={selectedRound}
        showCurrentRound={false}
      />
    </>
  );
}