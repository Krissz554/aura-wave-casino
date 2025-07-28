import { Badge } from '@/components/ui/badge';
import { Star, Crown, Zap } from 'lucide-react';
import { formatXPProgress, calculateXPProgress } from '@/lib/xpUtils';

interface EnhancedLevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showProgress?: boolean;
  currentXP?: number;
  xpToNext?: number;
}

export const EnhancedLevelBadge = ({ 
  level, 
  size = 'sm', 
  showIcon = true, 
  showProgress = false,
  currentXP = 0,
  xpToNext = 0
}: EnhancedLevelBadgeProps) => {
  const getLevelColor = (level: number) => {
    if (level >= 1000) return 'from-rainbow via-white to-rainbow animate-pulse'; // Ultimate
    if (level >= 900) return 'from-purple-700 to-pink-700'; // Supreme+
    if (level >= 800) return 'from-yellow-500 to-orange-600'; // Transcendent+
    if (level >= 700) return 'from-amber-500 to-red-600'; // Universal+
    if (level >= 600) return 'from-purple-500 to-cyan-500'; // Dimensional+
    if (level >= 500) return 'from-red-700 to-orange-700'; // Infernal+
    if (level >= 400) return 'from-orange-400 to-red-500'; // Phoenix+
    if (level >= 300) return 'from-indigo-300 to-violet-500'; // Mithril+
    if (level >= 200) return 'from-white to-gray-900'; // Diamond+
    if (level >= 100) return 'from-emerald-500 to-blue-500'; // Emerald+
    if (level >= 75) return 'from-yellow-400 to-orange-500'; // Gold+
    if (level >= 50) return 'from-slate-400 to-gray-500'; // Steel+
    if (level >= 25) return 'from-gray-300 to-gray-400'; // Silver
    return 'from-amber-600 to-amber-700'; // Bronze
  };

  const getIcon = (level: number) => {
    if (level >= 500) return Crown;
    if (level >= 100) return Zap;
    return Star;
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const IconComponent = getIcon(level);
  const progressPercentage = calculateXPProgress(currentXP, xpToNext);

  return (
    <div className="flex flex-col items-center gap-1">
      <Badge 
        className={`
          bg-gradient-to-r ${getLevelColor(level)} 
          text-white border-0 font-semibold relative overflow-hidden
          ${sizeClasses[size]}
          ${level >= 1000 ? 'animate-pulse shadow-2xl' : ''}
          ${level >= 500 ? 'shadow-lg' : ''}
        `}
      >
        <div className="flex items-center gap-1 relative z-10">
          {showIcon && <IconComponent className={iconSize[size]} />}
          <span>LVL {level.toLocaleString()}</span>
        </div>
        
        {/* Special effects for high levels */}
        {level >= 1000 && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        )}
        {level >= 500 && level < 1000 && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
        )}
      </Badge>
      
      {showProgress && xpToNext > 0 && (
        <div className="w-full max-w-[100px] bg-muted rounded-full h-1">
          <div 
            className={`h-1 rounded-full bg-gradient-to-r ${getLevelColor(level)} transition-all duration-300`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}
      
      {showProgress && (
        <div className="text-xs text-muted-foreground">
          {formatXPProgress(currentXP, currentXP + xpToNext)}
        </div>
      )}
    </div>
  );
};