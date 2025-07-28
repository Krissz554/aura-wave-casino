import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building, Trophy, Zap, AlertTriangle, Coins, Sword, Shield, Crown } from 'lucide-react';
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
    name: 'Novice Explorer', 
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: '🛡️',
    character: '🧝‍♂️',
    description: '4 tiles, 3 safe, 75% chance',
    maxMultiplier: '11.95x',
    tilesPerRow: 4,
    safeCount: 3,
    mineCount: 1,
    maxLevel: 9,
    theme: 'Safe forests with friendly creatures'
  },
  medium: { 
    name: 'Brave Adventurer', 
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: '⚔️',
    character: '🧙‍♂️',
    description: '3 tiles, 2 safe, 66.6% chance',
    maxMultiplier: '33.99x',
    tilesPerRow: 3,
    safeCount: 2,
    mineCount: 1,
    maxLevel: 9,
    theme: 'Mystical dungeons with magical traps'
  },
  hard: { 
    name: 'Elite Warrior', 
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    icon: '⚡',
    character: '👑',
    description: '2 tiles, 1 safe, 50% chance',
    maxMultiplier: '475.40x',
    tilesPerRow: 2,
    safeCount: 1,
    mineCount: 1,
    maxLevel: 9,
    theme: 'Ancient ruins with deadly guardians'
  },
  extreme: { 
    name: 'Legendary Hero', 
    color: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    icon: '🔥',
    character: '🐉',
    description: '3 tiles, 1 safe, 33.3% chance',
    maxMultiplier: '643.10x',
    tilesPerRow: 3,
    safeCount: 1,
    mineCount: 2,
    maxLevel: 6,
    theme: 'Dragon\'s lair with molten perils'
  }
};

const PAYOUT_MULTIPLIERS = {
  easy: [1.32, 1.74, 2.28, 3.00, 3.94, 5.19, 6.83, 9.01, 11.95],
  medium: [1.48, 2.20, 3.26, 4.82, 7.12, 10.52, 15.56, 23.00, 33.99],
  hard: [1.98, 3.92, 7.78, 15.44, 30.64, 60.80, 120.80, 239.66, 475.40],
  extreme: [2.94, 8.64, 25.37, 74.51, 218.82, 643.10]
};

const SAFE_TILES = ['💎', '🏆', '⭐', '✨', '🌟', '💰', '🎯', '🔮'];
const TRAP_TILES = ['💣', '🕳️', '⚡', '🔥', '💀', '🗡️', '⚔️', '🌋'];

export const TowerGame = ({ userData, onUpdateUser }: TowerGameProps) => {
  const [game, setGame] = useState<TowerGameState | null>(null);
  const [config, setConfig] = useState<DifficultyConfig | null>(null);
  const [difficulty, setDifficulty] = useState('easy');
  const [betAmount, setBetAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [revealedTiles, setRevealedTiles] = useState<{ [key: string]: { safe: boolean; selected: boolean } }>({});
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [animatingLevel, setAnimatingLevel] = useState<number | null>(null);
  const [characterPosition, setCharacterPosition] = useState({ level: 0, tile: 0 });
  const { toast } = useToast();
  const { liveBetFeed, isConnected } = useRealtimeFeeds();
  const { addGameRecord } = useGameHistory('tower', 10);
  const { forceRefresh } = useLevelSync();
  const { forceFullRefresh } = useXPSync();

  // Filter tower bets from live feed
  const towerBets = liveBetFeed.filter(bet => bet.game_type === 'tower');

  // Generate mine positions for a difficulty
  const generateMinePositions = (difficulty: string): number[][] => {
    const config = DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO];
    const positions: number[][] = [];
    
    for (let level = 0; level < config.maxLevel; level++) {
      const levelMines: number[] = [];
      const availablePositions = Array.from({ length: config.tilesPerRow }, (_, i) => i);
      
      // Shuffle and pick mine positions
      for (let i = availablePositions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
      }
      
      for (let i = 0; i < config.mineCount; i++) {
        levelMines.push(availablePositions[i]);
      }
      
      positions.push(levelMines.sort((a, b) => a - b));
    }
    
    return positions;
  };

  const startGame = async () => {
    if (isMaintenanceMode) {
      toast({
        title: "Game Paused",
        description: "This game is temporarily unavailable during maintenance.",
        variant: "destructive",
      });
      return;
    }

    if (!userData) {
      toast({
        title: "AUTHENTICATION REQUIRED", 
        description: "System access needed to engage tower protocol",
        variant: "warning",
      });
      return;
    }

    if (loading) return;

    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) {
      toast({
        title: "Invalid Bet",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }

    if (bet > userData.balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance for this bet",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Generate mine positions
      const minePositions = generateMinePositions(difficulty);
      const difficultyConfig = DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO];
      
      // Create game in database
      const { data: gameData, error: gameError } = await supabase
        .from('tower_games')
        .insert({
          user_id: userData.id,
          difficulty,
          bet_amount: bet,
          max_level: difficultyConfig.maxLevel,
          mine_positions: minePositions
        })
        .select()
        .single();

      if (gameError) throw gameError;

      // Update local state
      setGame({
        ...gameData,
        mine_positions: minePositions
      } as TowerGameState);
      
      setConfig({
        tilesPerRow: difficultyConfig.tilesPerRow,
        maxLevel: difficultyConfig.maxLevel
      });
      
      setRevealedTiles({});
      setSelectedTile(null);
      setCharacterPosition({ level: 0, tile: 0 });

      // Update user balance immediately
      await onUpdateUser({
        balance: userData.balance - bet,
        total_wagered: userData.total_wagered + bet
      });

      toast({
        title: "🏰 Adventure Begins!",
        description: `${difficultyConfig.character} ${difficultyConfig.name} ${difficultyConfig.theme}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start game",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectTile = async (tileIndex: number) => {
    if (isMaintenanceMode) {
      toast({
        title: "Game Paused",
        description: "This game is temporarily unavailable during maintenance.",
        variant: "destructive",
      });
      return;
    }

    if (!game || selectedTile !== null || loading || !userData) return;

    try {
      setLoading(true);
      setSelectedTile(tileIndex);
      setAnimatingLevel(game.current_level + 1);

      // Get mine positions for current level
      const currentLevelMines = game.mine_positions[game.current_level];
      const isMine = currentLevelMines.includes(tileIndex);
      const nextLevel = game.current_level + 1;
      const difficultyConfig = DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO];
      const wasLastLevel = nextLevel >= difficultyConfig.maxLevel;

      let newStatus = game.status;
      let newMultiplier = game.current_multiplier;
      let finalPayout = 0;

      if (isMine) {
        // Hit a mine - game over
        newStatus = 'lost';
        finalPayout = 0;
      } else {
        // Safe tile - advance to next level or complete game
        newMultiplier = PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS][game.current_level];
        setCharacterPosition({ level: game.current_level, tile: tileIndex });
        
        if (wasLastLevel) {
          // Reached max level - auto cash out
          newStatus = 'cashed_out';
          finalPayout = game.bet_amount * newMultiplier;
        }
      }

      // Update revealed tiles
      const levelKey = game.current_level;
      setRevealedTiles(prev => ({
        ...prev,
        [`${levelKey}-${tileIndex}`]: { safe: !isMine, selected: true }
      }));

      // Reveal all remaining tiles when game ends (mine hit or completed)
      if (isMine || newStatus !== 'active') {
        const newRevealed = { ...revealedTiles, [`${levelKey}-${tileIndex}`]: { safe: !isMine, selected: true } };
        
        // Reveal all tiles for all levels
        for (let level = 0; level < game.max_level; level++) {
          const levelMines = game.mine_positions[level];
          const tilesPerRow = difficultyConfig.tilesPerRow;
          
          for (let tile = 0; tile < tilesPerRow; tile++) {
            const tileKey = `${level}-${tile}`;
            if (!newRevealed[tileKey]) {
              const isMinePosition = levelMines.includes(tile);
              newRevealed[tileKey] = { safe: !isMinePosition, selected: false };
            }
          }
        }
        setRevealedTiles(newRevealed);
      }

      // Update game state in database
      const updateData: any = {
        current_level: isMine ? game.current_level : nextLevel,
        current_multiplier: newMultiplier,
        status: newStatus
      };

      if (finalPayout > 0) {
        updateData.final_payout = finalPayout;
      }

      await supabase
        .from('tower_games')
        .update(updateData)
        .eq('id', game.id);

      // Update local game state
      setGame(prev => prev ? {
        ...prev,
        current_level: isMine ? game.current_level : nextLevel,
        current_multiplier: newMultiplier,
        status: newStatus,
        final_payout: finalPayout
      } : null);

      // If game ended, record it
      if (newStatus !== 'active') {
        const profit = (finalPayout || 0) - game.bet_amount;
        
        await addGameRecord({
          game_type: 'tower',
          bet_amount: game.bet_amount,
          result: newStatus === 'cashed_out' ? 'win' : 'lose',
          profit,
          game_data: {
            difficulty: game.difficulty,
            level_reached: isMine ? game.current_level + 1 : nextLevel,
            multiplier: newMultiplier,
            hit_mine: isMine
          }
        });

        // Force refresh XP data after tower game completion
        console.log('🎯 TOWER GAME COMPLETED: Forcing comprehensive XP refresh after $' + game.bet_amount + ' bet');
        setTimeout(() => {
          forceFullRefresh().catch(console.error);
        }, 500);

        // Get current balance from database for accurate updates
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('balance, total_profit')
          .eq('id', userData.id)
          .single();

        if (profileError) throw profileError;

        // Update user balance if won
        if (finalPayout > 0) {
          await onUpdateUser({
            balance: profileData.balance + finalPayout,
            total_profit: profileData.total_profit + profit
          });
        } else {
          await onUpdateUser({
            total_profit: profileData.total_profit + profit
          });
        }
      }

      // Show result with character reactions
      setTimeout(() => {
        if (isMine) {
          toast({
            title: `💥 ${difficultyConfig.character} Oh No!`,
            description: "Your hero has fallen to a trap! The adventure ends here.",
            variant: "destructive",
          });
        } else if (newStatus === 'cashed_out') {
          toast({
            title: `🏆 ${difficultyConfig.character} Victory!`,
            description: `Legendary! Your hero conquered the tower and won $${finalPayout.toFixed(2)}!`,
          });
        } else {
          toast({
            title: `✨ ${difficultyConfig.character} Safe Passage!`,
            description: `Level ${nextLevel} conquered! Multiplier: ${newMultiplier.toFixed(2)}x`,
          });
        }
        setAnimatingLevel(null);
      }, 1500);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to select tile",
        variant: "destructive",
      });
      setAnimatingLevel(null);
    } finally {
      setLoading(false);
      setSelectedTile(null);
    }
  };

  const cashOut = async () => {
    if (!game || loading || game.current_level === 0 || !userData) return;

    try {
      setLoading(true);
      
      const difficultyConfig = DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO];
      const multiplier = PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS][game.current_level - 1];
      const payout = game.bet_amount * multiplier;

      // Get current balance from database
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('balance, total_profit')
        .eq('id', userData.id)
        .single();

      if (profileError) throw profileError;

      // Update game status in database
      await supabase
        .from('tower_games')
        .update({
          status: 'cashed_out',
          final_payout: payout
        })
        .eq('id', game.id);

      // Update local state
      setGame(prev => prev ? {
        ...prev,
        status: 'cashed_out',
        final_payout: payout
      } : null);

      // Reveal all remaining tiles when cashing out
      const newRevealed = { ...revealedTiles };
      for (let level = 0; level < game.max_level; level++) {
        const levelMines = game.mine_positions[level];
        const tilesPerRow = difficultyConfig.tilesPerRow;
        
        for (let tile = 0; tile < tilesPerRow; tile++) {
          const tileKey = `${level}-${tile}`;
          if (!newRevealed[tileKey]) {
            const isMinePosition = levelMines.includes(tile);
            newRevealed[tileKey] = { safe: !isMinePosition, selected: false };
          }
        }
      }
      setRevealedTiles(newRevealed);

      const profit = payout - game.bet_amount;

      await addGameRecord({
        game_type: 'tower',
        bet_amount: game.bet_amount,
        result: 'win',
        profit,
        game_data: {
          difficulty: game.difficulty,
          level_reached: game.current_level,
          multiplier,
          cashed_out: true
        }
      });

      // Force refresh XP data after tower cash out
      console.log('🎯 TOWER CASH OUT: Forcing comprehensive XP refresh after $' + game.bet_amount + ' bet');
      setTimeout(() => {
        forceFullRefresh().catch(console.error);
      }, 500);

      // Update user balance
      await onUpdateUser({
        balance: profileData.balance + payout,
        total_profit: profileData.total_profit + profit
      });

      toast({
        title: `💰 ${DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].character} Wise Escape!`,
        description: `Your hero retreated with wisdom and won $${payout.toFixed(2)} at ${multiplier.toFixed(2)}x!`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cash out",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetGame = () => {
    setGame(null);
    setConfig(null);
    setRevealedTiles({});
    setSelectedTile(null);
    setAnimatingLevel(null);
    setCharacterPosition({ level: 0, tile: 0 });
  };

  const changeDifficulty = (newDifficulty: string) => {
    if (game?.status === 'active') {
      toast({
        title: "Adventure in Progress",
        description: "Complete your current quest before choosing a new path",
        variant: "destructive",
      });
      return;
    }
    setDifficulty(newDifficulty);
    resetGame();
  };

  const renderTile = (levelIndex: number, tileIndex: number) => {
    const tileKey = `${levelIndex}-${tileIndex}`;
    const revealed = revealedTiles[tileKey];
    const isSelected = selectedTile === tileIndex && levelIndex === game?.current_level;
    const isCurrentLevel = levelIndex === game?.current_level;
    const isAnimating = animatingLevel === levelIndex + 1;
    const hasCharacter = characterPosition.level === levelIndex && characterPosition.tile === tileIndex && !revealed;

    let tileClass = "relative w-10 h-10 rounded-lg border-2 transition-all duration-500 cursor-pointer flex items-center justify-center text-lg font-bold overflow-hidden ";
    
    if (revealed) {
      if (revealed.safe) {
        tileClass += "bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-400/30 animate-pulse ";
      } else {
        tileClass += "bg-gradient-to-br from-red-500/30 to-orange-600/30 border-red-400 text-red-300 shadow-lg shadow-red-400/50 animate-bounce ";
      }
    } else if (isSelected) {
      tileClass += "bg-gradient-to-br from-primary/40 to-primary/60 border-primary scale-110 shadow-lg shadow-primary/50 ";
    } else if (isCurrentLevel && game?.status === 'active') {
      tileClass += "bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-slate-600 hover:border-primary hover:from-primary/20 hover:to-primary/30 hover:scale-105 hover:shadow-lg hover:shadow-primary/30 ";
    } else {
      tileClass += "bg-gradient-to-br from-slate-800/30 to-slate-900/30 border-slate-700/50 cursor-not-allowed opacity-60 ";
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
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent"></div>
        
        {/* Content */}
        <div className="relative z-10 flex items-center justify-center">
          {revealed ? (
            revealed.safe ? (
              <span className="animate-bounce">{SAFE_TILES[Math.floor(Math.random() * SAFE_TILES.length)]}</span>
            ) : (
              <span className="animate-pulse">{TRAP_TILES[Math.floor(Math.random() * TRAP_TILES.length)]}</span>
            )
          ) : hasCharacter && game ? (
            <span className="animate-bounce text-3xl">{DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].character}</span>
          ) : isCurrentLevel && game?.status === 'active' ? (
            <span className="opacity-70 text-slate-400">?</span>
          ) : (
            <span className="opacity-40 text-slate-500">?</span>
          )}
        </div>

        {/* Hover effect */}
        {isCurrentLevel && game?.status === 'active' && !revealed && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
        )}
      </button>
    );
  };

  const renderLevel = (levelIndex: number) => {
    const isPastLevel = game && levelIndex < game.current_level;
    const isCurrentLevel = game && levelIndex === game.current_level;
    const levelNum = levelIndex + 1;
    const multiplier = PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS][levelIndex];
    const tilesPerRow = DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].tilesPerRow;

    return (
      <div key={levelIndex} className={`relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-500 ${
        isPastLevel ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border-emerald-500/40 shadow-lg shadow-emerald-400/20' :
        isCurrentLevel ? 'bg-gradient-to-r from-primary/15 to-primary/25 border-primary shadow-lg shadow-primary/30 animate-pulse' :
        'bg-gradient-to-r from-slate-800/20 to-slate-900/20 border-slate-700/30'
      }`}>
        {/* Level indicator */}
        <div className="flex flex-col items-center gap-1 min-w-[60px]">
          <Badge variant={isPastLevel ? "default" : isCurrentLevel ? "secondary" : "outline"} 
                 className={`text-sm font-bold px-2 py-1 ${
                   isPastLevel ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400' :
                   isCurrentLevel ? 'bg-primary/20 text-primary border-primary' : ''
                 }`}>
            {levelNum}
          </Badge>
          <div className={`text-sm font-bold ${
            isPastLevel ? 'text-emerald-300' : isCurrentLevel ? 'text-primary' : 'text-slate-400'
          }`}>
            {multiplier.toFixed(2)}x
          </div>
        </div>
        
        {/* Tiles */}
        <div className="flex gap-2">
          {Array.from({ length: tilesPerRow }, (_, i) => renderTile(levelIndex, i))}
        </div>

        {/* Status indicator */}
        {isPastLevel && (
          <div className="flex items-center gap-1 text-emerald-300 font-bold text-xs">
            <Crown className="w-3 h-3" />
            <span>✓</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-3 space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Main Game Area */}
        <div className="lg:col-span-2 space-y-3">
          {/* Game Settings */}
          <Card className="glass border-0 bg-gradient-to-br from-slate-900/50 to-slate-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-5 w-5 text-primary" />
                <span className="gradient-primary bg-clip-text text-transparent">
                  Mystic Tower Quest
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Difficulty and Bet Controls */}
              {userData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300 truncate block">Choose Hero</label>
                    <Select value={difficulty} onValueChange={changeDifficulty}>
                      <SelectTrigger className="glass border-0 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DIFFICULTY_INFO).map(([key, info]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <span>{info.character}</span>
                              <span className="truncate">{info.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Wager</label>
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      min="1"
                      disabled={game?.status === 'active'}
                      className="glass border-0 h-9"
                    />
                  </div>
                  <div className="flex items-end">
                    {!game || game.status !== 'active' ? (
                      <Button 
                        onClick={startGame} 
                        disabled={loading}
                        className="w-full gradient-primary hover:glow-primary transition-smooth h-9"
                        size="sm"
                      >
                        {loading ? "Starting..." : "Begin"}
                      </Button>
                    ) : (
                      <div className="w-full">
                        {game.current_level > 0 && (
                          <Button 
                            onClick={cashOut} 
                            disabled={loading} 
                            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold shadow-lg shadow-emerald-400/30 hover:shadow-xl hover:shadow-emerald-400/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out h-9"
                            size="sm"
                          >
                            <Coins className="mr-1 h-3 w-3" />
                            Cash ${(game.bet_amount * (PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS][game.current_level - 1] || 1)).toFixed(2)}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="text-4xl mb-2">🏰</div>
                  <h3 className="text-lg font-semibold">Mystic Tower Quest</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Embark on an epic adventure through the mystical tower! Choose your hero and navigate deadly traps 
                    for multiplying rewards. Each level cleared increases your payout potential!
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="glass rounded-lg p-2">
                      <div className="text-lg mb-1">🛡️</div>
                      <div className="font-semibold">Novice</div>
                      <div className="text-muted-foreground">75% Safe</div>
                    </div>
                    <div className="glass rounded-lg p-2">
                      <div className="text-lg mb-1">⚔️</div>
                      <div className="font-semibold">Warrior</div>
                      <div className="text-muted-foreground">66% Safe</div>
                    </div>
                    <div className="glass rounded-lg p-2">
                      <div className="text-lg mb-1">🧙‍♂️</div>
                      <div className="font-semibold">Master</div>
                      <div className="text-muted-foreground">50% Safe</div>
                    </div>
                  </div>
                  <Button 
                    onClick={startGame}
                    className="w-full relative bg-gradient-to-r from-orange-600/80 via-red-600/80 to-orange-600/80 hover:from-orange-500 hover:via-red-500 hover:to-orange-500 border border-orange-500/30 text-white font-mono tracking-wider transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25 clip-path-[polygon(0_0,calc(100%-8px)_0,100%_8px,100%_100%,8px_100%,0_calc(100%-8px))]"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    AUTHENTICATE_TO_ENGAGE
                  </Button>
                </div>
              )}

              {/* Hero Info */}
              <div className={`p-2 rounded-lg border bg-gradient-to-r ${DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].color}`}>
                <div className="flex items-center gap-2">
                  <div className="text-2xl">
                    {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].character}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">
                      {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].name}
                    </h3>
                    <p className="text-xs opacity-75 truncate">
                      {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].description}
                    </p>
                  </div>
                  {game && (
                    <div className="text-right">
                      <div className="text-sm font-bold">
                        {game.current_level + 1}/{game.max_level}
                      </div>
                      {game.current_level > 0 && (
                        <div className="text-lg font-bold text-primary">
                          {game.current_multiplier.toFixed(2)}x
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tower */}
          <Card className="glass border-0 bg-gradient-to-b from-slate-900/50 to-slate-800/30 flex-1">
            <CardContent className="p-3">
              <div className="space-y-2">
                {game ? (
                  /* Render levels from top to bottom */
                  Array.from({ length: game.max_level }, (_, i) => game.max_level - 1 - i)
                    .map(levelIndex => renderLevel(levelIndex))
                ) : (
                  /* Show example tower for selected difficulty */
                  <div className="space-y-2">
                    <div className="text-center space-y-1 mb-4">
                      <h3 className="text-lg font-bold gradient-primary bg-clip-text text-transparent">
                        {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].character} {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].theme}
                      </p>
                    </div>
                    {PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS].slice().reverse().map((multiplier, index) => {
                      const actualLevel = PAYOUT_MULTIPLIERS[difficulty as keyof typeof PAYOUT_MULTIPLIERS].length - 1 - index;
                      const tilesPerRow = DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].tilesPerRow;
                      
                      return (
                        <div key={actualLevel} className="flex items-center gap-3 p-3 rounded-lg border bg-gradient-to-r from-slate-800/20 to-slate-900/20 border-slate-700/30">
                          <div className="flex flex-col items-center gap-1 min-w-[60px]">
                            <Badge variant="outline" className="text-sm font-bold px-2 py-1">
                              {actualLevel + 1}
                            </Badge>
                            <div className="text-sm font-bold text-slate-400">
                              {multiplier.toFixed(2)}x
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {Array.from({ length: tilesPerRow }, (_, i) => (
                              <div key={i} className="w-10 h-10 rounded-lg border bg-gradient-to-br from-slate-800/30 to-slate-900/30 border-slate-700/50 flex items-center justify-center cursor-not-allowed opacity-60">
                                <span className="opacity-40 text-slate-500 text-lg">?</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Game End Status */}
          {game?.status !== 'active' && game?.status && (
            <Card className="glass border-0 bg-gradient-to-br from-slate-900/70 to-slate-800/50">
              <CardContent className="p-4 text-center">
                {game.status === 'lost' ? (
                  <div className="space-y-2 animate-fade-in">
                    <div className="text-3xl animate-bounce">{TRAP_TILES[Math.floor(Math.random() * TRAP_TILES.length)]}</div>
                    <h3 className="text-lg font-bold text-red-400">Quest Failed!</h3>
                    <p className="text-slate-300 text-sm">
                      {DIFFICULTY_INFO[difficulty as keyof typeof DIFFICULTY_INFO].character} Hero fell on floor {game.current_level + 1}
                    </p>
                    <Button onClick={resetGame} variant="outline" size="sm" className="mt-2">
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 animate-fade-in">
                    <div className="text-3xl animate-bounce">{SAFE_TILES[Math.floor(Math.random() * SAFE_TILES.length)]}</div>
                    <h3 className="text-lg font-bold text-emerald-400">Victory!</h3>
                    <p className="text-slate-300 text-sm">
                      Won ${game.final_payout?.toFixed(2)} from floor {game.current_level}!
                    </p>
                    <Button onClick={resetGame} variant="outline" size="sm" className="mt-2">
                      New Quest
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        
        {/* Heroes' Chronicle - Compact Live Feed */}
        <Card className="glass border-0 h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <Trophy className="w-4 h-4 text-accent" />
              <span>Heroes' Chronicle</span>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 h-full">
            <div className="space-y-2 h-full">
              <div className="flex items-center justify-between p-2 rounded-lg bg-card/30 border">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className="text-xs font-medium">Live Adventures</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {towerBets.length}
                </Badge>
              </div>
              
              {!isConnected ? (
                <div className="text-center text-muted-foreground py-4">
                  <Building className="w-6 h-6 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs">Connecting...</p>
                </div>
              ) : towerBets.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Building className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No recent adventures</p>
                </div>
              ) : (
                <div className="space-y-1 h-full overflow-y-auto">
                  {towerBets.slice(0, 18).map((bet, index) => (
                    <div
                      key={index}
                      className="p-2 rounded-lg border bg-card/20 hover:bg-card/30 transition-colors animate-fade-in cursor-pointer"
                      onClick={() => {/* Will be connected to user stats modal */}}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/30 to-primary/50 flex items-center justify-center text-xs font-bold border border-primary/50">
                            {bet.username[0].toUpperCase()}
                          </div>
                           <div className="min-w-0 flex-1">
                             <ClickableUsername 
                               username={bet.username}
                               className="font-medium text-xs text-primary truncate"
                             />
                             <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                              <span>{DIFFICULTY_INFO[bet.game_data?.difficulty as keyof typeof DIFFICULTY_INFO]?.character || '🗡️'}</span>
                              <span>Lv{bet.game_data?.level_reached || 1}</span>
                              <span>${bet.bet_amount.toFixed(0)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`font-bold text-xs flex items-center gap-1 ${bet.result === 'win' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {bet.result === 'win' ? '+' : '-'}${Math.abs(bet.profit).toFixed(0)}
                          </div>
                          {bet.multiplier && (
                            <div className="text-xs text-muted-foreground">
                              {bet.multiplier.toFixed(1)}x
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};