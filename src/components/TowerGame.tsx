import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Zap, AlertTriangle, Coins, Cpu, Shield, Crown, TrendingUp, Target, Gamepad2 } from 'lucide-react';
import { useRealtimeFeeds } from '@/hooks/useRealtimeFeeds';
import { useGameHistory } from '@/hooks/useGameHistory';
import { UserProfile } from '@/hooks/useUserProfile';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { useLevelSync } from '@/contexts/LevelSyncContext';
import { useXPSync } from '@/contexts/XPSyncContext';
import ClickableUsername from './ClickableUsername';

interface TowerGameProps {
  userData: UserProfile | null;
  onUpdateUser: (updatedData: Partial<UserProfile>) => Promise<void>;
}

interface TowerGameState {
  id: string;
  difficulty: string;
  bet_amount: number;
  current_level: number;
  max_level: number;
  status: 'active' | 'cashed_out' | 'lost';
  current_multiplier: number;
  final_payout?: number;
  mine_positions: number[][];
}

interface DifficultyConfig {
  tilesPerRow: number;
  maxLevel: number;
}

const DIFFICULTY_INFO = {
  easy: { 
    name: 'NEURAL ROOKIE', 
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    glowColor: 'emerald',
    icon: <Shield className="w-4 h-4" />,
    character: '🤖',
    description: '4 DATA NODES | 3 SAFE | 75% SUCCESS RATE',
    maxMultiplier: '11.95x',
    tilesPerRow: 4,
    safeCount: 3,
    mineCount: 1,
    maxLevel: 9,
    theme: 'Secure data networks with basic firewalls'
  },
  medium: { 
    name: 'CYBER OPERATOR', 
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    glowColor: 'amber',
    icon: <Cpu className="w-4 h-4" />,
    character: '🔷',
    description: '3 DATA NODES | 2 SAFE | 66.6% SUCCESS RATE',
    maxMultiplier: '33.99x',
    tilesPerRow: 3,
    safeCount: 2,
    mineCount: 1,
    maxLevel: 9,
    theme: 'Advanced systems with quantum encryption'
  },
  hard: { 
    name: 'ELITE HACKER', 
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    glowColor: 'rose',
    icon: <Zap className="w-4 h-4" />,
    character: '⚡',
    description: '2 DATA NODES | 1 SAFE | 50% SUCCESS RATE',
    maxMultiplier: '475.40x',
    tilesPerRow: 2,
    safeCount: 1,
    mineCount: 1,
    maxLevel: 9,
    theme: 'Military-grade systems with lethal countermeasures'
  },
  extreme: { 
    name: 'MATRIX LEGEND', 
    color: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    glowColor: 'violet',
    icon: <Target className="w-4 h-4" />,
    character: '🔥',
    description: '3 DATA NODES | 1 SAFE | 33.3% SUCCESS RATE',
    maxMultiplier: '643.10x',
    tilesPerRow: 3,
    safeCount: 1,
    mineCount: 2,
    maxLevel: 6,
    theme: 'AI-controlled networks with autonomous defense protocols'
  }
};

const PAYOUT_MULTIPLIERS = {
  easy: [1.32, 1.74, 2.28, 3.00, 3.94, 5.19, 6.83, 9.01, 11.95],
  medium: [1.48, 2.20, 3.26, 4.82, 7.12, 10.52, 15.56, 23.00, 33.99],
  hard: [1.98, 3.92, 7.78, 15.44, 30.64, 60.80, 120.80, 239.66, 475.40],
  extreme: [2.94, 8.64, 25.37, 74.51, 218.82, 643.10]
};

const SAFE_TILES = ['✓', '💎', '🔒', '🛡️', '⭐'];
const TRAP_TILES = ['💥', '⚡', '🔥', '💀', '⚠️'];

export default function TowerGame({ userData, onUpdateUser }: TowerGameProps) {
  const [game, setGame] = useState<TowerGameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [betAmount, setBetAmount] = useState('10');
  const [difficulty, setDifficulty] = useState('easy');
  const [animatingTiles, setAnimatingTiles] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { isMaintenanceMode } = useMaintenance();
  const { refreshLevelStats } = useLevelSync();
  const { triggerXPRefresh } = useXPSync();
  
  const { gameHistory, refreshHistory } = useGameHistory(userData?.id || '', 'tower');
  const { recentBets } = useRealtimeFeeds();

  // Reset game state
  const resetGame = () => {
    setGame(null);
    setAnimatingTiles(new Set());
  };

  // Start new game
  const startGame = async () => {
    if (!userData?.id || loading || isMaintenanceMode) return;
    
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid bet amount",
        description: "Please enter a valid bet amount",
        variant: "destructive"
      });
      return;
    }

    if (amount > userData.balance) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough balance for this bet",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const requestBody = { 
        action: 'start',
        bet_amount: amount,
        difficulty: difficulty,
        user_id: userData.id
      };
      
      console.log('🎯 TOWER: Sending request:', requestBody);
      console.log('🎯 TOWER: User data:', userData);
      console.log('🎯 TOWER: Amount:', amount, 'Type:', typeof amount);
      console.log('🎯 TOWER: Difficulty:', difficulty, 'Type:', typeof difficulty);
      
      const response = await supabase.functions.invoke('tower-engine', {
        body: requestBody
      });

      if (response.error) throw response.error;
      
      const newGame = response.data;
      setGame(newGame);
      
      // Update user balance
      const newBalance = userData.balance - amount;
      await onUpdateUser({ balance: newBalance });
      
      toast({
        title: "Game Started",
        description: `Tower climb initiated! Navigate ${DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].name} level systems.`,
      });
      
    } catch (error: any) {
      console.error('Error starting game:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        status: error.status,
        code: error.code,
        context: error.context
      });
      toast({
        title: "Error",
        description: error.message || "Failed to start game",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Select tile
  const selectTile = async (tileIndex: number) => {
    if (!game || loading || game.status !== 'active') return;
    
    const tileKey = `${game.current_level}-${tileIndex}`;
    setAnimatingTiles(prev => new Set([...prev, tileKey]));
    setLoading(true);
    
    try {
      const response = await supabase.functions.invoke('tower-engine', {
        body: { 
          action: 'select_tile',
          game_id: game.id,
          tile_index: tileIndex,
          user_id: userData?.id
        }
      });

      if (response.error) throw response.error;
      
      const updatedGame = response.data;
      setGame(updatedGame);
      
      // Handle game end
      if (updatedGame.status === 'lost') {
        toast({
          title: "SYSTEM BREACH DETECTED",
          description: `Security protocol activated on floor ${updatedGame.current_level + 1}. Access denied.`,
          variant: "destructive"
        });
      } else if (updatedGame.status === 'cashed_out') {
        const newBalance = userData!.balance + updatedGame.final_payout!;
        await onUpdateUser({ balance: newBalance });
        
        toast({
          title: "DATA EXTRACTION SUCCESSFUL",
          description: `Secured ${(updatedGame.final_payout || 0).toFixed(2)} credits from floor ${updatedGame.current_level}!`,
        });
      }
      
      refreshHistory();
      
    } catch (error: any) {
      console.error('Error selecting tile:', error);
      toast({
        title: "System Error",
        description: error.message || "Connection lost",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setTimeout(() => {
        setAnimatingTiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(tileKey);
          return newSet;
        });
      }, 1000);
    }
  };

  // Cash out
  const cashOut = async () => {
    if (!game || loading || game.status !== 'active') return;
    
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('tower-engine', {
        body: { 
          action: 'cash_out',
          game_id: game.id,
          user_id: userData?.id
        }
      });

      if (response.error) throw response.error;
      
      const updatedGame = response.data;
      setGame(updatedGame);
      
      const newBalance = userData!.balance + updatedGame.final_payout!;
      await onUpdateUser({ balance: newBalance });
      
      toast({
        title: "SECURE EXTRACTION",
        description: `Successfully extracted ${(updatedGame.final_payout || 0).toFixed(2)} credits!`,
      });
      
      refreshHistory();
      
    } catch (error: any) {
      console.error('Error cashing out:', error);
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to cash out",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Render individual tile with cyberpunk design
  const renderTile = (levelIndex: number, tileIndex: number) => {
    const tileKey = `${levelIndex}-${tileIndex}`;
    const isAnimating = animatingTiles.has(tileKey);
    const tilesPerRow = DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].tilesPerRow;
    const isCurrentLevel = game?.current_level === levelIndex;
    const isPastLevel = game && game.current_level > levelIndex;
    const revealed = game?.mine_positions[levelIndex]?.[tileIndex] !== undefined ? 
      { safe: game.mine_positions[levelIndex][tileIndex] === 1 } : null;
    
    const hasCharacter = isPastLevel && tileIndex === Math.floor(tilesPerRow / 2);
    const glowColor = DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].glowColor;

    // Base cyberpunk tile styling
    let tileClass = "group relative w-full h-14 rounded-lg border-2 transition-all duration-300 font-mono text-sm ";
    tileClass += "bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 ";
    tileClass += "border-slate-700/50 backdrop-blur-sm ";
    tileClass += "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 ";
    
    // State-based styling
    if (revealed?.safe) {
      tileClass += `bg-gradient-to-br from-${glowColor}-900/40 via-${glowColor}-800/30 to-${glowColor}-900/40 `;
      tileClass += `border-${glowColor}-500/60 shadow-lg shadow-${glowColor}-500/20 `;
    } else if (revealed && !revealed.safe) {
      tileClass += "bg-gradient-to-br from-red-900/40 via-red-800/30 to-red-900/40 ";
      tileClass += "border-red-500/60 shadow-lg shadow-red-500/20 ";
    } else if (isCurrentLevel && game?.status === 'active') {
      tileClass += "cursor-pointer hover:bg-gradient-to-br hover:from-primary/20 hover:to-primary/10 ";
      tileClass += "hover:border-primary hover:shadow-primary/30 ";
    } else {
      tileClass += "cursor-not-allowed opacity-40 ";
    }

    if (isAnimating) {
      tileClass += "animate-pulse ";
    }

    return (
      <button
        key={tileIndex}
        className={tileClass}
        onClick={() => isCurrentLevel && game?.status === 'active' ? selectTile(tileIndex) : null}
        disabled={!isCurrentLevel || game?.status !== 'active' || loading}
      >
        {/* Cyberpunk grid background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-cyan-400/10 to-transparent"></div>
          <div className="absolute top-1 left-1 w-2 h-2 border-l border-t border-cyan-400/30"></div>
          <div className="absolute top-1 right-1 w-2 h-2 border-r border-t border-cyan-400/30"></div>
          <div className="absolute bottom-1 left-1 w-2 h-2 border-l border-b border-cyan-400/30"></div>
          <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-cyan-400/30"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex items-center justify-center h-full">
          {revealed ? (
            revealed.safe ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <Shield className="w-4 h-4" />
                <span className="animate-pulse">SECURE</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="animate-pulse">BREACH</span>
              </div>
            )
          ) : hasCharacter && game ? (
            <div className="text-2xl animate-bounce">{DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].character}</div>
          ) : isCurrentLevel && game?.status === 'active' ? (
            <div className="flex items-center gap-2 text-primary opacity-70">
              <Cpu className="w-4 h-4" />
              <span className="text-xs">SCAN</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 opacity-40">
              <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
              <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
              <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
            </div>
          )}
        </div>

        {/* Scanning effect for active tiles */}
        {isCurrentLevel && game?.status === 'active' && !revealed && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-pulse"></div>
          </>
        )}
      </button>
    );
  };

  // Render tower level with cyberpunk design
  const renderLevel = (levelIndex: number) => {
    const tilesPerRow = DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].tilesPerRow;
    const multiplier = PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS][levelIndex];
    const levelNum = levelIndex + 1;
    const isCurrentLevel = game?.current_level === levelIndex;
    const isPastLevel = game && game.current_level > levelIndex;
    const glowColor = DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].glowColor;

    return (
      <div 
        key={levelIndex} 
        className={`flex items-center gap-4 p-4 rounded-xl border backdrop-blur-sm transition-all duration-500 ${
          isPastLevel 
            ? `bg-gradient-to-r from-${glowColor}-900/30 via-${glowColor}-800/20 to-${glowColor}-900/30 border-${glowColor}-500/40 shadow-lg shadow-${glowColor}-500/20` 
            : isCurrentLevel 
              ? 'bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-primary/40 shadow-lg shadow-primary/20' 
              : 'bg-gradient-to-r from-slate-900/40 via-slate-800/30 to-slate-900/40 border-slate-700/30'
        }`}
      >
        {/* Level info */}
        <div className="flex flex-col items-center gap-2 min-w-[80px]">
          <Badge 
            variant="outline" 
            className={`text-sm font-bold px-3 py-1 font-mono ${
              isPastLevel 
                ? `bg-${glowColor}-500/20 text-${glowColor}-300 border-${glowColor}-400` 
                : isCurrentLevel 
                  ? 'bg-primary/20 text-primary border-primary' 
                  : 'bg-slate-800/30 text-slate-400 border-slate-600'
            }`}
          >
            L{levelNum}
          </Badge>
          <div className={`text-sm font-bold font-mono ${
            isPastLevel 
              ? `text-${glowColor}-300` 
              : isCurrentLevel 
                ? 'text-primary' 
                : 'text-slate-400'
          }`}>
            {multiplier ? multiplier.toFixed(2) : '1.00'}x
          </div>
        </div>
        
        {/* Tiles - Rectangular tower formation */}
        <div className={`grid gap-2 flex-1 ${
          tilesPerRow === 2 ? 'grid-cols-2' :
          tilesPerRow === 3 ? 'grid-cols-3' :
          tilesPerRow === 4 ? 'grid-cols-4' : 'grid-cols-3'
        }`}>
          {Array.from({ length: tilesPerRow }, (_, i) => renderTile(levelIndex, i))}
        </div>

        {/* Status indicator */}
        {isPastLevel && (
          <div className={`flex items-center gap-2 text-${glowColor}-300 font-bold text-sm`}>
            <Crown className="w-4 h-4" />
            <span className="font-mono">CLEARED</span>
          </div>
        )}
        {isCurrentLevel && game?.status === 'active' && (
          <div className="flex items-center gap-2 text-primary font-bold text-sm animate-pulse">
            <Target className="w-4 h-4" />
            <span className="font-mono">ACTIVE</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Game Controls - Cyberpunk Style */}
        <div className="xl:col-span-1 space-y-4">
          <Card className="glass border-0 bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-white">
                <Building2 className="w-6 h-6 text-primary" />
                <span className="font-mono text-lg">TOWER PROTOCOL</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!game ? (
                <>
                  {/* Bet Amount */}
                  <div className="space-y-2">
                    <label className="text-sm font-mono text-slate-300 uppercase tracking-wider">Bet Amount</label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        className="bg-slate-800/50 border-slate-600 text-white font-mono pl-8"
                        min="1"
                        max={userData?.balance || 0}
                        step="0.01"
                      />
                      <Coins className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary" />
                    </div>
                  </div>

                  {/* Difficulty Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-mono text-slate-300 uppercase tracking-wider">Protocol Level</label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {Object.entries(DIFFICULTY_INFO).map(([key, info]) => (
                          <SelectItem key={key} value={key} className="text-white font-mono">
                            <div className="flex items-center gap-2">
                              {info.icon}
                              <span>{info.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Difficulty Info */}
                  <div className={`p-3 rounded-lg border ${DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].color}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].icon}
                      <span className="font-mono text-sm font-bold">
                        {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].name}
                      </span>
                    </div>
                    <p className="text-xs font-mono opacity-90">
                      {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].description}
                    </p>
                    <p className="text-xs font-mono mt-1 opacity-70">
                      MAX: {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].maxMultiplier}
                    </p>
                  </div>

                  {/* Start Game Button */}
                  <Button 
                    onClick={startGame} 
                    disabled={loading || isMaintenanceMode}
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-mono font-bold py-3"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        INITIALIZING...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Gamepad2 className="w-4 h-4" />
                        INITIATE CLIMB
                      </div>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {/* Game Status */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-slate-300">FLOOR</span>
                      <span className="text-lg font-mono font-bold text-primary">{game.current_level + 1}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-slate-300">MULTIPLIER</span>
                      <span className="text-lg font-mono font-bold text-emerald-400">{(game.current_multiplier || 1).toFixed(2)}x</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-slate-300">POTENTIAL</span>
                      <span className="text-lg font-mono font-bold text-amber-400">
                        ${(parseFloat(betAmount) * (game.current_multiplier || 1)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {game.status === 'active' && (
                    <div className="space-y-2">
                      <Button 
                        onClick={cashOut} 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-mono font-bold"
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            EXTRACTING...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            EXTRACT ${(parseFloat(betAmount) * (game.current_multiplier || 1)).toFixed(2)}
                          </div>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Reset Game */}
                  {game.status !== 'active' && (
                    <Button 
                      onClick={resetGame} 
                      variant="outline" 
                      className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 font-mono"
                    >
                      NEW PROTOCOL
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Tower Display */}
        <div className="xl:col-span-3">
          <Card className="glass border-0 bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-white">
                  <Building2 className="w-6 h-6 text-primary" />
                  <span className="font-mono text-xl">DATA TOWER</span>
                  {game && (
                    <Badge variant="outline" className={DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].color}>
                      {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].name}
                    </Badge>
                  )}
                </CardTitle>
                
                {game && (
                  <div className="flex items-center gap-4 text-sm font-mono">
                    <div className="text-slate-300">
                      BET: <span className="text-primary">${parseFloat(betAmount).toFixed(2)}</span>
                    </div>
                    {game.status === 'active' && (
                      <div className="text-slate-300">
                        NEXT: <span className="text-amber-400">
                          {game.current_level < PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS].length - 1 
                            ? `${(PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS][game.current_level + 1] || 1).toFixed(2)}x`
                            : 'MAX'
                          }
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {game ? (
                <div className="space-y-3">
                  {/* Tower levels - displayed top to bottom (reverse order) */}
                  <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS]
                      .slice()
                      .reverse()
                      .map((_, index) => {
                        const actualLevel = PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS].length - 1 - index;
                        return renderLevel(actualLevel);
                      })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <div className="text-6xl text-slate-600 mb-4">
                    <Building2 className="w-24 h-24 mx-auto" />
                  </div>
                  <h3 className="text-xl font-mono font-bold text-slate-400">TOWER PROTOCOL STANDBY</h3>
                  <p className="text-slate-500 font-mono max-w-md mx-auto">
                    Initialize climbing protocol to access the data tower. Navigate through security layers to extract maximum value.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 max-w-2xl mx-auto">
                    {Object.entries(DIFFICULTY_INFO).map(([key, info]) => (
                      <div key={key} className={`p-4 rounded-lg border ${info.color} text-center`}>
                        <div className="flex justify-center mb-2">{info.icon}</div>
                        <div className="font-mono text-xs font-bold">{info.name}</div>
                        <div className="font-mono text-xs opacity-70 mt-1">MAX: {info.maxMultiplier}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Game End Status */}
          {game?.status !== 'active' && game?.status && (
            <Card className="glass border-0 bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl mt-4">
              <CardContent className="p-6 text-center">
                {game.status === 'lost' ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="text-4xl text-red-400 mb-4">
                      <AlertTriangle className="w-16 h-16 mx-auto" />
                    </div>
                    <h3 className="text-2xl font-mono font-bold text-red-400">SECURITY BREACH DETECTED</h3>
                    <p className="text-slate-300 font-mono">
                      Access denied on floor {game.current_level + 1}. System lockdown initiated.
                    </p>
                    <div className="text-red-400 font-mono text-sm">
                      Protocol terminated by {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].name} security systems
                    </div>
                    <Button onClick={resetGame} variant="outline" className="mt-4 font-mono border-red-500 text-red-400 hover:bg-red-500/20">
                      REINITIALIZE PROTOCOL
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    <div className="text-4xl text-emerald-400 mb-4">
                      <Crown className="w-16 h-16 mx-auto" />
                    </div>
                    <h3 className="text-2xl font-mono font-bold text-emerald-400">DATA EXTRACTION SUCCESSFUL</h3>
                    <p className="text-slate-300 font-mono">
                      Successfully extracted ${(game.final_payout || 0).toFixed(2)} from floor {game.current_level}
                    </p>
                    <div className="text-emerald-400 font-mono text-sm">
                      {(game.current_multiplier || 1).toFixed(2)}x multiplier achieved
                    </div>
                    <Button onClick={resetGame} variant="outline" className="mt-4 font-mono border-emerald-500 text-emerald-400 hover:bg-emerald-500/20">
                      NEW PROTOCOL
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}