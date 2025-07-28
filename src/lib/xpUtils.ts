/**
 * XP Utilities - REBUILT FOR SINGLE XP SYSTEM
 * All functions now work with the single total_xp column
 * Provides consistent formatting and calculations across the site
 */

/**
 * Formats XP value with appropriate decimal places
 * Shows 3 decimals for precision but only when needed
 */
export function formatXP(xp: number): string {
  if (xp < 0.001) {
    return '0.000';
  } else if (xp < 1) {
    // Show 3 decimal places for small values (0.001-0.999)
    return xp.toFixed(3);
  } else if (xp < 10) {
    // Show 2 decimal places for medium-small values (1.00-9.99)
    return xp.toFixed(2);
  } else if (xp < 100) {
    // Show 1 decimal place for medium values (10.0-99.9)
    return xp.toFixed(1);
  } else {
    // Show no decimals for large values, but use toLocaleString for thousands
    return Math.floor(xp).toLocaleString();
  }
}

/**
 * Formats XP display with "XP" suffix
 */
export function formatXPWithSuffix(xp: number): string {
  return `${formatXP(xp)} XP`;
}

/**
 * Calculates level info from total XP using the same logic as database
 */
export function calculateLevelFromTotalXP(totalXP: number) {
  // Level requirements (same as database)
  const levelRequirements = [
    { level: 1, totalXPRequired: 0, xpForLevel: 0 },
    { level: 2, totalXPRequired: 100, xpForLevel: 100 },
    { level: 3, totalXPRequired: 250, xpForLevel: 150 },
    { level: 4, totalXPRequired: 450, xpForLevel: 200 },
    { level: 5, totalXPRequired: 700, xpForLevel: 250 },
    { level: 6, totalXPRequired: 1000, xpForLevel: 300 },
    { level: 7, totalXPRequired: 1350, xpForLevel: 350 },
    { level: 8, totalXPRequired: 1750, xpForLevel: 400 },
    { level: 9, totalXPRequired: 2200, xpForLevel: 450 },
    { level: 10, totalXPRequired: 2700, xpForLevel: 500 },
    { level: 11, totalXPRequired: 3250, xpForLevel: 550 },
    { level: 12, totalXPRequired: 3850, xpForLevel: 600 },
    { level: 13, totalXPRequired: 4500, xpForLevel: 650 },
    { level: 14, totalXPRequired: 5200, xpForLevel: 700 },
    { level: 15, totalXPRequired: 5950, xpForLevel: 750 },
    { level: 16, totalXPRequired: 6750, xpForLevel: 800 },
    { level: 17, totalXPRequired: 7600, xpForLevel: 850 },
    { level: 18, totalXPRequired: 8500, xpForLevel: 900 },
    { level: 19, totalXPRequired: 9450, xpForLevel: 950 },
    { level: 20, totalXPRequired: 10450, xpForLevel: 1000 },
    { level: 21, totalXPRequired: 11500, xpForLevel: 1050 },
    { level: 22, totalXPRequired: 12600, xpForLevel: 1100 },
    { level: 23, totalXPRequired: 13750, xpForLevel: 1150 },
    { level: 24, totalXPRequired: 14950, xpForLevel: 1200 },
    { level: 25, totalXPRequired: 16200, xpForLevel: 1250 },
    { level: 26, totalXPRequired: 17500, xpForLevel: 1300 },
    { level: 27, totalXPRequired: 18850, xpForLevel: 1350 },
    { level: 28, totalXPRequired: 20250, xpForLevel: 1400 },
    { level: 29, totalXPRequired: 21700, xpForLevel: 1450 },
    { level: 30, totalXPRequired: 23200, xpForLevel: 1500 },
  ];

  // Generate remaining levels 31-100 if needed
  let extendedRequirements = [...levelRequirements];
  let currentLevel = 31;
  let currentTotalXP = 23200;
  let currentLevelXP = 1500;

  while (currentLevel <= 100 && totalXP >= currentTotalXP) {
    currentLevelXP += 50;
    currentTotalXP += currentLevelXP;
    extendedRequirements.push({
      level: currentLevel,
      totalXPRequired: currentTotalXP,
      xpForLevel: currentLevelXP
    });
    currentLevel++;
  }

  // Find current level
  let userLevel = 1;
  let levelStartXP = 0;
  let levelEndXP = 100;

  for (let i = extendedRequirements.length - 1; i >= 0; i--) {
    const req = extendedRequirements[i];
    if (req.totalXPRequired <= totalXP) {
      userLevel = req.level;
      levelStartXP = req.totalXPRequired;
      
      // Find next level requirement
      const nextReq = extendedRequirements[i + 1];
      if (nextReq) {
        levelEndXP = nextReq.totalXPRequired;
      } else {
        // Max level or beyond
        levelEndXP = levelStartXP + 5000; // Default
      }
      break;
    }
  }

  // Calculate progress within current level
  const xpInLevel = Math.max(totalXP - levelStartXP, 0);
  const xpNeeded = Math.max(levelEndXP - totalXP, 0);
  const progressPercentage = levelEndXP > levelStartXP 
    ? Math.min(Math.max((xpInLevel / (levelEndXP - levelStartXP)) * 100, 0), 100)
    : 100;

  return {
    currentLevel: userLevel,
    currentLevelXP: xpInLevel,
    xpToNextLevel: xpNeeded,
    nextLevelTotalXP: levelEndXP,
    progressPercentage: Math.round(progressPercentage * 100) / 100, // Round to 2 decimals
    totalXP: totalXP
  };
}

/**
 * Formats XP progress display (current within level / total for next level)
 */
export function formatXPProgress(totalXP: number): string {
  const levelInfo = calculateLevelFromTotalXP(totalXP);
  return `${formatXP(levelInfo.currentLevelXP)} / ${formatXP(levelInfo.currentLevelXP + levelInfo.xpToNextLevel)} XP`;
}

/**
 * Calculates XP progress percentage for progress bars
 */
export function calculateXPProgress(totalXP: number): number {
  const levelInfo = calculateLevelFromTotalXP(totalXP);
  return levelInfo.progressPercentage;
}

/**
 * Formats large XP numbers with appropriate units (K, M, etc.)
 */
export function formatLargeXP(xp: number): string {
  if (xp < 1000) {
    return formatXP(xp);
  } else if (xp < 1000000) {
    return `${(xp / 1000).toFixed(1)}K`;
  } else {
    return `${(xp / 1000000).toFixed(1)}M`;
  }
}

/**
 * Calculates XP from bet amount (exactly 1/10 of wager)
 */
export function calculateXPFromBet(betAmount: number): number {
  return Math.round((betAmount / 10) * 1000) / 1000; // Round to 3 decimals
}

/**
 * Gets user's level from total XP (simple version)
 */
export function getLevelFromTotalXP(totalXP: number): number {
  return calculateLevelFromTotalXP(totalXP).currentLevel;
}

/**
 * Type definitions for XP system
 */
export interface LevelInfo {
  currentLevel: number;
  currentLevelXP: number;
  xpToNextLevel: number;
  nextLevelTotalXP: number;
  progressPercentage: number;
  totalXP: number;
}

/**
 * Animation helper for smooth XP counter transitions
 */
export function animateXPCounter(
  startValue: number,
  endValue: number,
  duration: number,
  updateCallback: (value: number) => void,
  completeCallback?: () => void
): void {
  const startTime = Date.now();
  const difference = endValue - startValue;
  
  function update() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out animation
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const currentValue = startValue + (difference * easeOut);
    
    updateCallback(currentValue);
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      updateCallback(endValue);
      if (completeCallback) {
        completeCallback();
      }
    }
  }
  
  requestAnimationFrame(update);
}