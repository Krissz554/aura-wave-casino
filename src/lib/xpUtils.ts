/**
 * Utility functions for XP formatting and display
 * Updated for 10% wager calculation: $100 = 10 XP, $1 = 0.1 XP, $0.01 = 0.001 XP
 */

/**
 * Formats XP value to ALWAYS show 3 decimal places for consistent decimal tracking
 * Ensures all XP values display with full precision
 */
export function formatXP(xp: number): string {
  if (xp < 0.001) {
    return '0.000';
  } else if (xp < 1000) {
    // Always show 3 decimal places for values under 1000
    // This ensures $0.01 bet = 0.001 XP, $1 bet = 0.100 XP, etc. are all visible
    return xp.toFixed(3);
  } else {
    // For very large values (1000+), show 1 decimal place to save space
    return xp.toFixed(1);
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
 * Calculates XP progress percentage for progress bars
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

/**
 * Calculates XP from bet amount (exactly 10% of wager)
 * This matches the database calculation
 */
export function calculateXPFromBet(betAmount: number): number {
  return Math.round((betAmount * 0.1) * 1000) / 1000; // Round to 3 decimal places
}

/**
 * Validates that XP calculation is correct for display
 */
export function getExpectedXPFromBet(betAmount: number): string {
  const xp = calculateXPFromBet(betAmount);
  return `$${betAmount.toFixed(2)} bet → ${formatXP(xp)} XP`;
}

/**
 * Helper to format XP for specific display contexts
 */
export function formatXPForContext(xp: number, context: 'header' | 'profile' | 'progress' | 'notification'): string {
  switch (context) {
    case 'header':
      // Always show some decimal precision in header for live tracking
      if (xp < 1) return xp.toFixed(3);
      if (xp < 100) return xp.toFixed(2);
      return xp.toFixed(1);
    
    case 'profile':
      // Full precision for detailed profile view
      return formatXP(xp);
    
    case 'progress':
      // Consistent formatting for progress displays
      return formatXP(xp);
    
    case 'notification':
      // Clear, readable format for notifications
      if (xp < 1) return xp.toFixed(3);
      if (xp < 10) return xp.toFixed(2);
      return xp.toFixed(1);
    
    default:
      return formatXP(xp);
  }
}