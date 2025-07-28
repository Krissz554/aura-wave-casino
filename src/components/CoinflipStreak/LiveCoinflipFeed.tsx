import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Coins, TrendingUp, TrendingDown } from 'lucide-react';
import { useRealtimeFeeds } from '@/hooks/useRealtimeFeeds';
import UserProfile from '../UserProfile';

export default function LiveCoinflipFeed() {
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [showUserStats, setShowUserStats] = useState(false);
  const { liveBetFeed } = useRealtimeFeeds();

  const handleUsernameClick = (username: string) => {
    setSelectedUsername(username);
    setShowUserStats(true);
  };

  // Filter only coinflip games and sort by recent
  const coinflipResults = liveBetFeed
    .filter(bet => bet.game_type === 'coinflip')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return (
    <Card className="glass border-0">
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <Coins className="w-5 h-5 text-primary" />
          <span>Live Coinflip Feed</span>
          <Badge variant="secondary" className="text-xs animate-fade-in">
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {coinflipResults.length === 0 ? (
          <div className="text-center py-8">
            <Coins className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No coinflip bets yet. Start flipping!
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {coinflipResults.map((bet) => {
              const choice = bet.game_data?.choice || 'unknown';
              const coinResult = bet.game_data?.coinResult || 'unknown';
              const isWin = bet.result === 'win';
              const streakLength = bet.streak_length || 0;
              
              return (
                <div 
                  key={bet.id} 
                  className="flex items-center justify-between p-3 glass rounded-lg hover:bg-card/80 transition-colors animate-new-item border border-primary/10"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${bet.username}`} />
                      <AvatarFallback className="bg-primary/20">
                        {bet.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span 
                          className="font-medium text-sm truncate cursor-pointer hover:text-primary transition-colors underline-offset-4 hover:underline"
                          onClick={() => handleUsernameClick(bet.username)}
                        >
                          {bet.username}
                        </span>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs">{choice === 'heads' ? '👑' : '⚡'}</span>
                          <span className="text-xs text-muted-foreground">→</span>
                          <span className="text-xs">{coinResult === 'heads' ? '👑' : '⚡'}</span>
                        </div>
                        {streakLength > 0 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                            {streakLength} streak
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Bet ${bet.bet_amount.toFixed(2)} • {choice} • {isWin ? 'Won' : 'Lost'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`flex items-center space-x-1 mb-1 ${isWin ? 'text-success' : 'text-destructive'}`}>
                      {isWin ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span className="font-bold text-sm">
                        {isWin ? '+' : ''}${bet.profit.toFixed(2)}
                      </span>
                    </div>
                    {bet.multiplier && bet.multiplier > 1 && (
                      <div className="text-xs text-primary font-medium">
                        {bet.multiplier.toFixed(2)}x
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <UserProfile 
        isOpen={showUserStats}
        onClose={() => setShowUserStats(false)}
        username={selectedUsername}
      />
    </Card>
  );
}