import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trophy, Target, TrendingUp, TrendingDown, Gift, Crown } from 'lucide-react';
import { useLevelSync } from '@/contexts/LevelSyncContext';
import { formatXP, formatXPProgress, calculateXPProgress } from '@/lib/xpUtils';
import { useUserLevelStats } from '@/hooks/useUserLevelStats';
import { ProfileBorder } from './ProfileBorder';
import { EnhancedLevelBadge } from './EnhancedLevelBadge';

export function UserProgressSection() {
  const { levelStats, loading: levelLoading } = useLevelSync();
  const { stats, loading: statsLoading, getGameStats } = useUserLevelStats();

  if (levelLoading || statsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Level Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!levelStats || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Level Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No stats available</p>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = calculateXPProgress(levelStats.current_level_xp, levelStats.xp_to_next_level);

  const overallWinRate = stats.total_games > 0 ? (stats.total_wins / stats.total_games) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Level Progress Card */}
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-purple-400" />
            Level Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile with Border */}
          <div className="flex items-center gap-4">
            <ProfileBorder level={levelStats.current_level} size="lg">
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                {levelStats.current_level}
              </div>
            </ProfileBorder>
            <div className="flex-1">
              <EnhancedLevelBadge 
                level={levelStats.current_level} 
                size="lg" 
                showProgress={true}
                currentXP={levelStats.current_level_xp}
                xpToNext={levelStats.xp_to_next_level}
              />
            </div>
          </div>

          {/* XP Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>XP Progress</span>
              <span>{formatXPProgress(levelStats.current_level_xp, levelStats.current_level_xp + levelStats.xp_to_next_level)}</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Level {levelStats.current_level}</span>
              <span>{levelStats.xp_to_next_level.toLocaleString()} XP to next level</span>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-card/30 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">{formatXP(levelStats.lifetime_xp)}</div>
              <div className="text-xs text-muted-foreground">Total XP</div>
            </div>
            <div className="text-center p-3 bg-card/30 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">{levelStats.border_tier}</div>
              <div className="text-xs text-muted-foreground">Border Tier</div>
            </div>
          </div>

          {/* Cases Available */}
          {stats.available_cases > 0 && (
            <div className="p-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg border border-orange-500/30">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-orange-400" />
                <span className="font-semibold">Reward Cases Available: {stats.available_cases}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Check your notifications to open them!
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overall Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Overall Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-card/30 rounded-lg">
              <div className="text-2xl font-bold">{stats.total_games.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Games</div>
            </div>
            <div className="text-center p-3 bg-card/30 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{stats.total_wins.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Wins</div>
            </div>
            <div className="text-center p-3 bg-card/30 rounded-lg">
              <div className="text-2xl font-bold">{overallWinRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
            </div>
            <div className="text-center p-3 bg-card/30 rounded-lg">
              <div className={`text-2xl font-bold ${stats.total_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${stats.total_profit.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Total Profit</div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-card/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-bold">${stats.biggest_win.toFixed(2)}</span>
              </div>
              <div className="text-xs text-muted-foreground">Biggest Win</div>
            </div>
            <div className="text-center p-3 bg-card/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-red-400 font-bold">${stats.biggest_loss.toFixed(2)}</span>
              </div>
              <div className="text-xs text-muted-foreground">Biggest Loss</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game-Specific Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Game Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Coinflip Stats */}
            <GameStatsRow 
              title="Coinflip" 
              icon="🪙" 
              stats={getGameStats('coinflip')}
              extraInfo={
                <div className="text-sm text-muted-foreground">
                  Current Streak: {stats.current_coinflip_streak} | Best: {stats.best_coinflip_streak}
                </div>
              }
            />
            
            {/* Crash Stats */}
            <GameStatsRow title="Crash" icon="🚀" stats={getGameStats('crash')} />
            
            {/* Roulette Stats */}
            <GameStatsRow title="Roulette" icon={
              <svg 
                className="w-4 h-4 text-primary" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                <circle cx="12" cy="12" r="6" strokeWidth="2"/>
                <circle cx="12" cy="12" r="2" strokeWidth="2"/>
              </svg>
            } stats={getGameStats('roulette')} />
            
            {/* Tower Stats */}
            <GameStatsRow title="Tower" icon="🗼" stats={getGameStats('tower')} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface GameStatsRowProps {
  title: string;
  icon: string | React.ReactNode;
  stats: {
    games: number;
    wins: number;
    wagered: number;
    profit: number;
    winRate: number;
  };
  extraInfo?: React.ReactNode;
}

function GameStatsRow({ title, icon, stats, extraInfo }: GameStatsRowProps) {
  if (stats.games === 0) {
    return (
      <div className="p-3 bg-card/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg flex items-center">{icon}</span>
          <span className="font-semibold">{title}</span>
          <Badge variant="outline" className="text-xs">No games played</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-card/30 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg flex items-center">{icon}</span>
        <span className="font-semibold">{title}</span>
        <Badge 
          variant={stats.winRate >= 50 ? "default" : "destructive"} 
          className="text-xs"
        >
          {stats.winRate.toFixed(1)}% WR
        </Badge>
      </div>
      
      <div className="grid grid-cols-4 gap-2 text-sm">
        <div className="text-center">
          <div className="font-bold">{stats.games}</div>
          <div className="text-xs text-muted-foreground">Games</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-green-400">{stats.wins}</div>
          <div className="text-xs text-muted-foreground">Wins</div>
        </div>
        <div className="text-center">
          <div className="font-bold">${stats.wagered.toFixed(0)}</div>
          <div className="text-xs text-muted-foreground">Wagered</div>
        </div>
        <div className="text-center">
          <div className={`font-bold ${stats.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${stats.profit.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">Profit</div>
        </div>
      </div>
      
      {extraInfo && (
        <div className="mt-2 pt-2 border-t border-border/50">
          {extraInfo}
        </div>
      )}
    </div>
  );
}