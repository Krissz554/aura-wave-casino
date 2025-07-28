import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Eye, Calculator, Dice6, HelpCircle, Clock, Lock, AlertTriangle, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RoundData {
  id: string;
  round_number: number;
  result_slot: number;
  result_color: string;
  result_multiplier: number;
  server_seed_hash: string;
  nonce: number;
  reel_position: number;
  created_at: string;
}

interface UserBet {
  bet_color: string;
  bet_amount: number;
  potential_payout: number;
  actual_payout: number;
  is_winner: boolean;
  profit: number;
}

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  roundData?: RoundData | null;
  showCurrentRound?: boolean;
}

// 🎰 EXACT WHEEL CONFIGURATION - Must match backend provably fair system
const WHEEL_SLOTS = [
  { slot: 0, color: 'green', multiplier: '14x' },
  { slot: 11, color: 'black', multiplier: '2x' },
  { slot: 5, color: 'red', multiplier: '2x' },
  { slot: 10, color: 'black', multiplier: '2x' },
  { slot: 6, color: 'red', multiplier: '2x' },
  { slot: 9, color: 'black', multiplier: '2x' },
  { slot: 7, color: 'red', multiplier: '2x' },
  { slot: 8, color: 'black', multiplier: '2x' },
  { slot: 1, color: 'red', multiplier: '2x' },
  { slot: 14, color: 'black', multiplier: '2x' },
  { slot: 2, color: 'red', multiplier: '2x' },
  { slot: 13, color: 'black', multiplier: '2x' },
  { slot: 3, color: 'red', multiplier: '2x' },
  { slot: 12, color: 'black', multiplier: '2x' },
  { slot: 4, color: 'red', multiplier: '2x' }
];

export function ProvablyFairModal({ isOpen, onClose, roundData, showCurrentRound = false }: ProvablyFairModalProps) {
  const { user } = useAuth();
  const [verificationData, setVerificationData] = useState<any>(null);
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [clientSeed, setClientSeed] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Smooth modal entrance animation
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsModalVisible(true), 50);
    } else {
      setIsModalVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && roundData) {
      console.log('🔍 Modal opened with round data:', roundData);
      fetchRoundDetails();
    }
  }, [isOpen, roundData]);

  const fetchRoundDetails = async () => {
    if (!roundData) return;
    if (!user) {
      // For guest users, just show the round result without fetching verification data
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Fetching round details for:', roundData.id);
      
      // Fetch verification data
      const { data: verification, error: verificationError } = await supabase.functions.invoke('roulette-engine', {
        body: {
          action: 'verify_round',
          roundId: roundData.id
        }
      });

      if (verificationError) {
        console.error('❌ Verification error:', verificationError);
        throw verificationError;
      }

      console.log('✅ Verification data received:', verification);

      if (verification) {
        setVerificationData(verification);
        setClientSeed(verification.client_seed || 'default_client_seed');
      }

      // Fetch user's bets for this round
      const { data: bets, error: betsError } = await supabase
        .from('roulette_bets')
        .select('bet_color, bet_amount, potential_payout, actual_payout, is_winner, profit')
        .eq('round_id', roundData.id)
        .eq('user_id', user.id);

      if (betsError) {
        console.error('❌ Bets error:', betsError);
      } else {
        console.log('✅ User bets:', bets);
        setUserBets(bets || []);
      }

    } catch (error: any) {
      console.error('❌ Error fetching round details:', error);
      // Set a basic verification data even on error
      setVerificationData({
        round_id: roundData.id,
        round_number: roundData.round_number,
        error: error.message || 'Failed to load round details'
      });
    }
    setLoading(false);
  };

  const verifyFairness = async () => {
    if (!verificationData) return;

    setIsVerifying(true);
    try {
      console.log('🔍 Calculating provably fair verification');
      
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: {
          action: 'verify_round',
          roundId: roundData?.id
        }
      });

      if (error) {
        console.error('❌ Verification API error:', error);
        throw error;
      }

      console.log('✅ Verification result:', data);

      if (data) {
        setVerificationData(data);
      }
    } catch (error) {
      console.error('❌ Error verifying fairness:', error);
    }
    setIsVerifying(false);
  };

  const getTileColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white';
      case 'red': return 'bg-gradient-to-br from-red-500 to-red-700 text-white';
      case 'black': return 'bg-gradient-to-br from-gray-800 to-gray-900 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const renderReelVisualization = () => {
    if (!roundData) return null;

    const winningSlotIndex = WHEEL_SLOTS.findIndex(slot => slot.slot === roundData.result_slot);
    const visibleSlots = [];
    
    // Show 5 slots centered around the winning slot
    for (let i = -2; i <= 2; i++) {
      const index = (winningSlotIndex + i + WHEEL_SLOTS.length) % WHEEL_SLOTS.length;
      visibleSlots.push({ ...WHEEL_SLOTS[index], position: i });
    }

    return (
      <div className="relative">
        <div className="flex items-center justify-center space-x-1 p-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-lg">
          {visibleSlots.map((slot, index) => (
            <div
              key={index}
              className={`w-20 h-16 flex flex-col items-center justify-center border-2 border-gray-600 rounded-lg transition-all duration-300 ${
                slot.position === 0 
                  ? `${getTileColorClass(slot.color)} scale-110 ring-4 ring-yellow-400 shadow-2xl shadow-yellow-400/50 z-10`
                  : `${getTileColorClass(slot.color)} opacity-70`
              }`}
            >
              <span className="text-lg font-bold">{slot.slot}</span>
              <span className="text-xs">{slot.multiplier}</span>
            </div>
          ))}
        </div>
        
        {/* Center line indicator */}
        <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-yellow-500 transform -translate-x-1/2 pointer-events-none">
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-yellow-500"></div>
          </div>
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-yellow-500"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 border-0 bg-transparent overflow-hidden">
        {/* Main Cyberpunk Container */}
        <div className="relative">
          {/* Multi-layer Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl" />
          
          {/* Circuit Pattern Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.08)_25%,rgba(99,102,241,0.08)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.08)_75%,rgba(99,102,241,0.08)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(99,102,241,0.08)_25%,rgba(99,102,241,0.08)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.08)_75%,rgba(99,102,241,0.08)_76%,transparent_77%,transparent)] bg-[length:12px_12px] opacity-50" />
          
          {/* Angular Clipping */}
          <div className="relative clip-path-[polygon(0_0,calc(100%-16px)_0,100%_16px,100%_100%,16px_100%,0_calc(100%-16px))] border border-indigo-500/30 shadow-2xl shadow-indigo-500/20">
            
            {/* Scan Line Animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent translate-x-[-100%] animate-[cyber-scan_3s_ease-in-out_infinite] clip-path-[polygon(0_0,calc(100%-16px)_0,100%_16px,100%_100%,16px_100%,0_calc(100%-16px))]" />
            
            {/* Tech Corners */}
            <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-indigo-400/60" />
            <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-cyan-400/60" />
            <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-purple-400/60" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-indigo-400/60" />
            
            {/* Content */}
            <div className="relative z-10 p-8 max-h-[90vh] overflow-y-auto cyberpunk-scrollbar">
              {/* Cyberpunk Header */}
              <DialogHeader className="text-center mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="relative">
                    <Shield className="w-12 h-12 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                    <div className="absolute inset-0 border border-indigo-400/30 rounded-full animate-pulse" />
                  </div>
                </div>
                <DialogTitle className="text-2xl font-bold font-mono tracking-wider text-white drop-shadow-sm">
                  <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    {showCurrentRound ? 'CURRENT_ROUND_VERIFICATION' : `ROUND_${roundData?.round_number || 'UNKNOWN'}_ANALYSIS`}
                  </span>
                </DialogTitle>
                <p className="text-slate-400 text-sm font-mono tracking-wider mt-2">
                  // CRYPTOGRAPHIC_PROOF_VALIDATION
                </p>
              </DialogHeader>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-indigo-400 border-r-purple-400"></div>
                    <div className="absolute inset-0 border border-indigo-400/20 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-xs text-slate-400 font-mono tracking-wider mt-3">ANALYZING_ROUND_DATA</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cyberpunk Round Result Visualization */}
                  {roundData && (
                    <div className="relative">
                      {/* Background Effects */}
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/15 to-cyan-500/20 rounded-lg" />
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(99,102,241,0.1)_25%,rgba(99,102,241,0.1)_26%,transparent_27%,transparent_74%,rgba(99,102,241,0.1)_75%,rgba(99,102,241,0.1)_76%,transparent_77%,transparent)] bg-[length:8px_8px] opacity-40" />
                      
                      <div className="relative border border-indigo-500/30 rounded-lg p-6 clip-path-[polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,12px_100%,0_calc(100%-12px))]">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="relative">
                            <Eye className="w-5 h-5 text-indigo-400 drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]" />
                            <div className="absolute inset-0 border border-indigo-400/20 rounded animate-pulse" />
                          </div>
                          <h3 className="text-lg font-bold font-mono tracking-wider text-white">ROUND_RESULT_ANALYSIS</h3>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="text-center">
                            <Badge className="mb-3 text-xs font-mono bg-indigo-500/20 text-indigo-300 border-indigo-500/40">
                              ROUND #{roundData.round_number}
                            </Badge>
                            <div className="text-2xl font-bold font-mono tracking-wider">
                              RESULT: <span className={`${roundData.result_color === 'green' ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]' : roundData.result_color === 'red' ? 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'text-slate-300 drop-shadow-[0_0_8px_rgba(148,163,184,0.6)]'}`}>
                                {roundData.result_color.toUpperCase()} {roundData.result_slot}
                              </span>
                            </div>
                          </div>
                          
                          {renderReelVisualization()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Guest User Notification */}
                  {!user && (
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
                            Access to provably fair verification records requires system authentication.
                          </p>
                          
                          {/* Features grid */}
                          <div className="bg-gradient-to-r from-slate-800/80 via-slate-700/60 to-slate-800/80 rounded-lg p-4 space-y-3 border border-indigo-500/30 mx-auto max-w-md">
                            <div className="text-sm text-indigo-300 font-mono tracking-wider">VERIFICATION_FEATURES:</div>
                            <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                              <div className="text-cyan-300 flex items-center justify-center gap-2">
                                <Eye className="w-3 h-3" />
                                » ROUND_HISTORY_ACCESS
                              </div>
                              <div className="text-cyan-300 flex items-center justify-center gap-2">
                                <Calculator className="w-3 h-3" />
                                » PERSONAL_BET_VERIFICATION
                              </div>
                              <div className="text-cyan-300 flex items-center justify-center gap-2">
                                <Dice6 className="w-3 h-3" />
                                » CRYPTOGRAPHIC_VALIDATION
                              </div>
                              <div className="text-cyan-300 flex items-center justify-center gap-2">
                                <Shield className="w-3 h-3" />
                                » FAIRNESS_TRANSPARENCY
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
                  )}

                  {/* Cyberpunk User's Bets */}
                  {user && userBets.length > 0 && (
                    <div className="relative">
                      {/* Background Effects */}
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-green-500/15 to-emerald-500/20 rounded-lg" />
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(34,197,94,0.1)_25%,rgba(34,197,94,0.1)_26%,transparent_27%,transparent_74%,rgba(34,197,94,0.1)_75%,rgba(34,197,94,0.1)_76%,transparent_77%,transparent)] bg-[length:8px_8px] opacity-40" />
                      
                      <div className="relative border border-emerald-500/30 rounded-lg p-6 clip-path-[polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,12px_100%,0_calc(100%-12px))]">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="relative">
                            <Dice6 className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                            <div className="absolute inset-0 border border-emerald-400/20 rounded animate-pulse" />
                          </div>
                          <h3 className="text-lg font-bold font-mono tracking-wider text-white">USER_BET_ANALYSIS</h3>
                        </div>
                        
                        <div className="space-y-3">
                          {userBets.map((bet, index) => (
                            <div key={index} className="relative group">
                              {/* Bet Item Background */}
                              <div className="absolute inset-0 bg-gradient-to-r from-slate-800/60 via-slate-700/40 to-slate-800/60 rounded-lg" />
                              
                              <div className="relative border border-slate-600/40 group-hover:border-emerald-500/50 rounded-lg p-3 transition-all duration-300 clip-path-[polygon(0_0,calc(100%-6px)_0,100%_6px,100%_100%,6px_100%,0_calc(100%-6px))]">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Badge className={`text-xs font-mono ${bet.bet_color === 'green' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : bet.bet_color === 'red' ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-slate-500/20 text-slate-300 border-slate-500/40'}`}>
                                      {bet.bet_color.toUpperCase()}
                                    </Badge>
                                    <span className="text-slate-300 font-mono text-sm">BET: ${bet.bet_amount}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Badge className={`text-xs font-mono ${bet.is_winner ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-red-500/20 text-red-300 border-red-500/40'}`}>
                                      {bet.is_winner ? 'VICTORY' : 'DEFEAT'}
                                    </Badge>
                                    <span className={`font-mono text-sm font-bold ${bet.profit >= 0 ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]'}`}>
                                      {bet.profit >= 0 ? '+' : ''}${bet.profit.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cyberpunk Error Display */}
                  {user && verificationData?.error && (
                    <div className="relative">
                      {/* Background Effects */}
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-red-400/15 to-red-500/20 rounded-lg" />
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(239,68,68,0.1)_25%,rgba(239,68,68,0.1)_26%,transparent_27%,transparent_74%,rgba(239,68,68,0.1)_75%,rgba(239,68,68,0.1)_76%,transparent_77%,transparent)] bg-[length:8px_8px] opacity-40" />
                      
                      <div className="relative border border-red-500/30 rounded-lg p-6 clip-path-[polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,12px_100%,0_calc(100%-12px))]">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="relative">
                              <AlertTriangle className="w-6 h-6 text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                              <div className="absolute inset-0 border border-red-400/30 rounded animate-pulse" />
                            </div>
                            <h4 className="text-lg font-bold font-mono tracking-wider text-red-300">SYSTEM_ERROR_DETECTED</h4>
                          </div>
                          <p className="text-sm font-mono text-slate-300">{verificationData.error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cyberpunk Provably Fair Verification */}
                  {user && verificationData && !verificationData.error && (
                    <div className="relative">
                      {/* Background Effects */}
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-cyan-500/20 rounded-lg" />
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(6,182,212,0.1)_25%,rgba(6,182,212,0.1)_26%,transparent_27%,transparent_74%,rgba(6,182,212,0.1)_75%,rgba(6,182,212,0.1)_76%,transparent_77%,transparent)] bg-[length:8px_8px] opacity-40" />
                      
                      <div className="relative border border-cyan-500/30 rounded-lg p-6 clip-path-[polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,12px_100%,0_calc(100%-12px))]">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-6">
                          <div className="relative">
                            <Calculator className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
                            <div className="absolute inset-0 border border-cyan-400/20 rounded animate-pulse" />
                          </div>
                          <h3 className="text-lg font-bold font-mono tracking-wider text-white">CRYPTOGRAPHIC_VERIFICATION</h3>
                        </div>
                        
                        <div className="space-y-4">
                  {verificationData.is_completed === false && (
                    <div className="p-4 rounded-lg border bg-yellow-50">
                      <p className="text-sm text-yellow-800">
                        🕐 This round is still ongoing. Server seed will be revealed when the round completes.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Server Seed Hash</Label>
                      <Input value={verificationData.server_seed_hash || 'N/A'} readOnly className="font-mono text-xs" />
                    </div>
                    <div>
                      <Label>Server Seed (Revealed)</Label>
                      {verificationData.server_seed?.includes('[HIDDEN') ? (
                        <div className="relative">
                          <Input 
                            value="••••••••••••••••••••••••••••••••" 
                            readOnly 
                            className="font-mono text-xs bg-gradient-to-r from-muted/30 to-muted/20 text-muted-foreground border-dashed border-emerald-500/30"
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center">
                            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                              <span>Protected</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Input 
                          value={verificationData.server_seed || 'Not revealed yet'} 
                          readOnly 
                          className="font-mono text-xs"
                        />
                      )}
                      {verificationData.server_seed?.includes('[HIDDEN') && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-400/80">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span>Hidden until day ends for security</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Lotto Hash</Label>
                      <Input value={verificationData.lotto_hash || 'Not available (Legacy round)'} readOnly className="font-mono text-xs" />
                    </div>
                    <div>
                      <Label>Lotto (Revealed)</Label>
                      {verificationData.lotto?.includes('[HIDDEN') ? (
                        <div className="relative">
                          <Input 
                            value="••••••••••" 
                            readOnly 
                            className="font-mono text-xs bg-gradient-to-r from-muted/30 to-muted/20 text-muted-foreground border-dashed border-emerald-500/30"
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center">
                            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                              <span>Protected</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <Input 
                          value={verificationData.lotto || 'Not available (Legacy round)'} 
                          readOnly 
                          className="font-mono text-xs"
                        />
                      )}
                      {verificationData.lotto?.includes('[HIDDEN') && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-400/80">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span>Hidden until day ends for security</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Round ID (Nonce)</Label>
                      <Input value={verificationData.nonce_id || verificationData.nonce || 'N/A'} readOnly className="font-mono text-xs" />
                    </div>
                    <div>
                      <Label>Daily Date</Label>
                      <Input value={verificationData.daily_date || 'Not available (Legacy round)'} readOnly className="font-mono text-xs" />
                    </div>
                  </div>

                  {/* Security Status Message */}
                  {verificationData.verification_message && (
                    <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-foreground">Security Status</p>
                          <p className="text-sm text-muted-foreground mt-1">{verificationData.verification_message}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {verificationData.is_completed && !verificationData.verification_result && verificationData.is_revealed && (
                    <Button onClick={verifyFairness} disabled={isVerifying} className="w-full">
                      {isVerifying ? 'Calculating...' : 'Calculate Provably Fair Verification'}
                    </Button>
                  )}

                  {verificationData.verification_result && (
                    <div className="p-4 rounded-lg border bg-muted">
                      <h4 className="font-semibold mb-2">Provably Fair Verification Result:</h4>
                      <p className="text-sm mb-2">
                        <strong>Formula:</strong> <code className="bg-background px-1 rounded">{verificationData.provably_fair_formula}</code>
                      </p>
                      <p className="text-sm">
                        Hash Input: <code className="bg-background px-1 rounded">{verificationData.hash_input}</code>
                      </p>
                      <p className="text-sm">
                        SHA-256 Hash: <code className="bg-background px-1 rounded">{verificationData.hash_result}</code>
                      </p>
                      <p className="text-sm">
                        Result Calculation: {verificationData.hash_number} % 15 = {verificationData.calculated_slot}
                      </p>
                      <p className="text-sm">
                        Wheel Position {verificationData.calculated_slot} → Slot {verificationData.actual_calculated_slot || verificationData.calculated_slot}
                      </p>
                      <p className={`text-sm font-semibold ${verificationData.verification_result === 'VALID' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {verificationData.verification_result === 'VALID' ? '✅' : '❌'} Result: Slot {verificationData.result_slot} ({verificationData.result_color}) - {verificationData.verification_result}
                      </p>
                      <div className="mt-3 text-xs text-slate-400 font-mono space-y-1">
                        <p className="flex items-center gap-2">
                          <Shield className="w-3 h-3 text-emerald-400" />
                          Enhanced provably fair cryptographic verification system
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          Daily seeds generated every 24 hours and auto-revealed for transparency
                        </p>
                        <p className="flex items-center gap-2">
                          <Lock className="w-3 h-3 text-indigo-400" />
                          Results are predetermined and cannot be manipulated
                        </p>
                        <p className="flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3 text-orange-400" />
                          Client seeds cannot be changed during active rounds for security
                        </p>
                        <p className="flex items-center gap-2">
                          <Zap className="w-3 h-3 text-purple-400" />
                          Legacy fallback systems disabled - only secure verification allowed
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Cyberpunk Footer */}
          <div className="flex justify-center pt-6 mt-6 border-t border-indigo-500/20">
            <Link 
              to="/provably-fair" 
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-400 transition-colors font-mono tracking-wider"
              onClick={() => onClose()}
            >
              <div className="relative">
                <HelpCircle className="w-4 h-4" />
                <div className="absolute inset-0 border border-indigo-400/20 rounded-full animate-pulse" />
              </div>
              How does Provably Fair work?
            </Link>
          </div>
        </div>
      </div>
    </div>
  </DialogContent>
</Dialog>
  );
}