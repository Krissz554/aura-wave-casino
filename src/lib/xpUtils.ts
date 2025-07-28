/**
 * Utility functions for XP formatting and display
 */

/**
 * Formats XP value to show 2 decimal places when needed
 * - Shows decimals for values < 10 XP
 * - Shows 1 decimal for values 10-99.9 XP  
 * - Shows integers for values >= 100 XP
 * - Always shows at least 2 decimals for very small values
 */
export function formatXP(xp: number): string {
  if (xp < 0.01) {
    return '0.00';
  } else if (xp < 1) {
    // Show 2 decimal places for values less than 1
    return xp.toFixed(2);
  } else if (xp < 10) {
    // Show 2 decimal places for small values
    return xp.toFixed(2);
  } else if (xp < 100) {
    // Show 1 decimal place for medium values
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
 * Formats XP progress display (current / total)
 */
export function formatXPProgress(currentXP: number, totalXP: number): string {
  return `${formatXP(currentXP)} / ${formatXP(totalXP)} XP`;
}

/**
 * Calculates XP progress percentage
 */
export function calculateXPProgress(currentXP: number, xpToNext: number): number {
  const totalXPNeeded = currentXP + xpToNext;
  return totalXPNeeded > 0 ? (currentXP / totalXPNeeded) * 100 : 0;
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