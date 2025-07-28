import { useLevelSync } from '@/contexts/LevelSyncContext';
import { ProfileBorder } from './ProfileBorder';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';
import { formatXPProgress } from '@/lib/xpUtils';

interface UserLevelDisplayProps {
  username: string;
  showXP?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  clickable?: boolean;
}

export function UserLevelDisplay({ username, showXP = false, size = 'sm', className = '', onClick, clickable = false }: UserLevelDisplayProps) {
  const { levelStats, loading } = useLevelSync();

  if (loading || !levelStats) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        <span className="font-semibold">{username}</span>
      </div>
    );
  }

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10', 
    lg: 'w-12 h-12'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div 
      className={`flex items-center gap-2 ${className} ${clickable ? 'cursor-pointer hover:bg-primary/10 rounded-lg p-2 -m-2 transition-all duration-200 hover:scale-[1.02]' : ''}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="relative">
        <ProfileBorder level={levelStats.current_level} size={size}>
          <div className={`${sizeClasses[size]} rounded-full overflow-hidden relative`}>
            {/* Avatar with proper sizing */}
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
              alt={`${username} avatar`}
              className="w-full h-full object-cover"
            />
            {/* Level overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
              <span className="text-white text-xs font-bold block text-center leading-none">
                {levelStats.current_level >= 100 ? <Crown className="w-3 h-3 mx-auto" /> : levelStats.current_level}
              </span>
            </div>
          </div>
        </ProfileBorder>
      </div>
      
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${textSizes[size]}`}>{username}</span>
          <Badge variant="outline" className="text-xs px-1 py-0">
            LVL {levelStats.current_level}
          </Badge>
        </div>
        
        {showXP && (
          <div className="text-xs text-muted-foreground">
            {formatXPProgress(levelStats.current_level_xp, levelStats.current_level_xp + levelStats.xp_to_next_level)}
          </div>
        )}
      </div>
    </div>
  );
}