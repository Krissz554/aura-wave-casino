/**
 * Utility functions for XP formatting and display
 * Updated for 10% wager calculation: $100 = 10 XP, $1 = 0.1 XP, $0.01 = 0.001 XP
 */

/**
 * Formats XP value to show appropriate decimal places based on value
 * Ensures 10% wager calculation is always visible
 */
export function formatXP(xp: number): string {
  if (xp < 0.001) {
    return '0.000';
  } else if (xp < 0.01) {
    // Show 3 decimal places for very small values (0.001-0.009)
    // This covers $0.01 bet = 0.001 XP
    return xp.toFixed(3);
  } else if (xp < 0.1) {
    // Show 3 decimal places for small values (0.01-0.099)
    // This covers $0.10 bet = 0.010 XP
    return xp.toFixed(3);
  } else if (xp < 1) {
    // Show 3 decimal places for values (0.1-0.999)
    // This covers $1 bet = 0.100 XP
    return xp.toFixed(3);
  } else if (xp < 10) {
    // Show 2 decimal places for medium-small values (1.00-9.99)
    // This covers $10 bet = 1.00 XP
    return xp.toFixed(2);
  } else if (xp < 100) {
    // Show 1 decimal place for medium values (10.0-99.9)
    // This covers $100 bet = 10.0 XP
    return xp.toFixed(1);
  } else {
    // Show no decimals for large values, but use toLocaleString for thousands
    // This covers $1000+ bets
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