import { useEffect, useState, useRef } from 'react';

interface RouletteReelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
  extendedWinAnimation?: boolean;
  serverReelPosition?: number | null; // 🎯 NEW: Server-calculated position for synchronization
}

// 🎰 EXACT WHEEL CONFIGURATION - Must match backend provably fair system
const WHEEL_SLOTS = [
  { slot: 0, color: 'green' },
  { slot: 11, color: 'black' },
  { slot: 5, color: 'red' },
  { slot: 10, color: 'black' },
  { slot: 6, color: 'red' },
  { slot: 9, color: 'black' },
  { slot: 7, color: 'red' },
  { slot: 8, color: 'black' },
  { slot: 1, color: 'red' },
  { slot: 14, color: 'black' },
  { slot: 2, color: 'red' },
  { slot: 13, color: 'black' },
  { slot: 3, color: 'red' },
  { slot: 12, color: 'black' },
  { slot: 4, color: 'red' }
];

// 🎯 FIXED DIMENSIONS - PIXEL PERFECT (Match backend calculations EXACTLY)
const TILE_SIZE_PX = 100;                              // Each tile is exactly 100px × 100px  
const VISIBLE_TILES = 15;                              // Always show exactly 15 tiles
const REEL_WIDTH_PX = VISIBLE_TILES * TILE_SIZE_PX;    // 1500px viewport width
const REEL_HEIGHT_PX = TILE_SIZE_PX;                   // Match tile height exactly - no gray area
const CENTER_MARKER_PX = REEL_WIDTH_PX / 2;            // 750px - fixed center marker

// 🔄 INFINITE LOOPING SYSTEM - Duplicated sequences for seamless scrolling
const TILE_REPEATS = 200;                              // Generate 200 copies (was 100) - more safety margin
const TOTAL_TILES = WHEEL_SLOTS.length * TILE_REPEATS; // 3000 total tiles  
const TOTAL_REEL_WIDTH_PX = TOTAL_TILES * TILE_SIZE_PX; // 300,000px total width

// 🛡️ TILE SAFETY BOUNDS - Prevent disappearing tiles
const WHEEL_CYCLE_PX = WHEEL_SLOTS.length * TILE_SIZE_PX; // 1500px per full wheel cycle
const SAFE_ZONE_CYCLES = 20; // Keep position within 20 cycles of center for extra safety
const MIN_SAFE_POSITION = -SAFE_ZONE_CYCLES * WHEEL_CYCLE_PX; // -30,000px
const MAX_SAFE_POSITION = SAFE_ZONE_CYCLES * WHEEL_CYCLE_PX;  // +30,000px

// 🔄 POSITION NORMALIZATION - Keep reel within safe bounds while maintaining alignment
const normalizePosition = (position: number): number => {
  // Use modular arithmetic to keep position within one wheel cycle
  // This maintains perfect alignment while preventing tile disappearance
  let normalized = position % WHEEL_CYCLE_PX;
  
  // Ensure we stay within our safe tile generation bounds
  while (normalized < MIN_SAFE_POSITION) {
    normalized += WHEEL_CYCLE_PX;
  }
  while (normalized > MAX_SAFE_POSITION) {
    normalized -= WHEEL_CYCLE_PX;
  }
  
  return normalized;
};

// ⏱️ ANIMATION CONFIGURATION - Exactly 4 seconds
const SPIN_DURATION_MS = 4000;

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, extendedWinAnimation, serverReelPosition }: RouletteReelProps) {
  // 🎲 Reel position state - starts from localStorage or 0, always normalized
  const [currentPosition, setCurrentPosition] = useState(() => {
    const saved = localStorage.getItem('rouletteReelPosition');
    const position = saved ? parseFloat(saved) : 0;
    return normalizePosition(position); // Always start with normalized position
  });
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [showWinGlow, setShowWinGlow] = useState(false);
  const reelRef = useRef<HTMLDivElement>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout>();
  
  // 🛡️ ANIMATION DEDUPLICATION - Prevent repeat animations
  const lastAnimationRef = useRef<{
    winningSlot: number | null;
    serverReelPosition: number | null;
    isSpinning: boolean;
  }>({
    winningSlot: null,
    serverReelPosition: null,
    isSpinning: false
  });

  // 🎨 Get cyberpunk tile styling based on color (EXACT SAME DIMENSIONS)
  const getTileStyle = (color: string): string => {
    switch (color) {
      case 'green': 
        return 'bg-gradient-to-br from-emerald-900/90 via-emerald-800/70 to-emerald-900/90 border-emerald-500/70 text-emerald-100 shadow-lg hover:border-emerald-400';
      case 'red': 
        return 'bg-gradient-to-br from-red-900/90 via-red-800/70 to-red-900/90 border-red-500/70 text-red-100 shadow-lg hover:border-red-400';
      case 'black': 
        return 'bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90 border-slate-500/70 text-slate-100 shadow-lg hover:border-slate-400';
      default: 
        return 'bg-gradient-to-br from-slate-900/90 via-slate-800/70 to-slate-900/90 border-slate-500/70 text-slate-100 shadow-lg';
    }
  };

  // 🧮 Calculate winning position using PROVABLY FAIR system algorithm
  const calculateWinningPosition = (winningNumber: number, startPosition: number): number => {
    // Find the index of the winning slot in our WHEEL_SLOTS array (PROVABLY FAIR STEP 1)
    const winningSlotIndex = WHEEL_SLOTS.findIndex(slot => slot.slot === winningNumber);
    if (winningSlotIndex === -1) {
      console.error('❌ Invalid winning slot:', winningNumber);
      return startPosition;
    }
    
    // PROVABLY FAIR CALCULATION (matches backend exactly):
    // Goal: Make winning slot center align with CENTER_MARKER_PX (750px)
    // Formula: position = CENTER_MARKER_PX - (winningSlotIndex * TILE_SIZE_PX + TILE_SIZE_PX/2)
    const idealPosition = CENTER_MARKER_PX - (winningSlotIndex * TILE_SIZE_PX + TILE_SIZE_PX / 2);
    
    // Ensure we spin left (negative direction) with sufficient distance
    const minSpinDistance = 50 * WHEEL_SLOTS.length * TILE_SIZE_PX; // 50 full wheel rotations minimum
    const minFinalPosition = startPosition - minSpinDistance;
    
    // Find the best position that satisfies both ideal alignment AND minimum spin distance
    let bestPosition = idealPosition;
    
    // If ideal position doesn't spin far enough, adjust by full wheel cycles
    while (bestPosition > minFinalPosition) {
      bestPosition -= WHEEL_SLOTS.length * TILE_SIZE_PX; // Move back by one full wheel cycle (1500px)
    }
    
    // Verification: Where will the winning slot center actually be?
    const verificationSlotCenter = bestPosition + (winningSlotIndex * TILE_SIZE_PX + TILE_SIZE_PX / 2);
    const alignmentAccuracy = Math.abs(verificationSlotCenter - CENTER_MARKER_PX);
    

    
    return bestPosition;
  };

  // 🎬 Start CSS transition animation when spinning begins
  useEffect(() => {
    if (isSpinning && winningSlot !== null && !isAnimating) {
      
      // 🛡️ DEDUPLICATION CHECK - Prevent repeat animations with same parameters
      const lastAnim = lastAnimationRef.current;
      if (lastAnim.isSpinning === isSpinning && 
          lastAnim.winningSlot === winningSlot && 
          lastAnim.serverReelPosition === serverReelPosition) {
        console.log('🚫 Skipping duplicate animation - same parameters as last animation');
        return;
      }
      
      // Update animation tracking
      lastAnimationRef.current = {
        isSpinning,
        winningSlot,
        serverReelPosition
      };
      
      const startPosition = currentPosition;
      
      // 🎯 CALCULATE WINNING POSITION
      let targetPosition: number;
      
      // Always calculate client-side first for safety
      const clientCalculatedPosition = calculateWinningPosition(winningSlot, startPosition);
      
      if (serverReelPosition !== null && serverReelPosition !== undefined) {
        // Validate server position is reasonable and has proper spin distance
        const serverDistance = Math.abs(serverReelPosition - startPosition);
        const minSpinDistance = 3 * WHEEL_SLOTS.length * TILE_SIZE_PX; // At least 3 full rotations
        const maxReasonableDistance = 100 * WHEEL_SLOTS.length * TILE_SIZE_PX; // Max 100 rotations
        
        // IMPORTANT: Also ensure server position moves LEFT (right to left)
        const movesLeft = serverReelPosition < startPosition;
        
        if (serverDistance >= minSpinDistance && serverDistance <= maxReasonableDistance && movesLeft) {
          targetPosition = serverReelPosition;
          console.log('🌐 Using validated server position (moves left):', Math.round(targetPosition));
        } else {
          targetPosition = clientCalculatedPosition;
          console.log('🖥️ Server position invalid or wrong direction, using client calculation:', Math.round(targetPosition));
        }
      } else {
        targetPosition = clientCalculatedPosition;
        console.log('🖥️ No server position, using client calculation:', Math.round(targetPosition));
      }
      
      if (!reelRef.current) return;
      
      // 🛡️ FINAL SAFEGUARD: Absolutely ensure LEFT movement (right → left)
      if (targetPosition >= startPosition) {
        console.log('🔧 Forcing left movement by adding rotations');
        targetPosition = startPosition - (5 * WHEEL_SLOTS.length * TILE_SIZE_PX); // Force 5 rotations left
        
        // Re-align to correct winning slot
        const winningSlotIndex = WHEEL_SLOTS.findIndex(slot => slot.slot === winningSlot);
        const correctAlignment = CENTER_MARKER_PX - (winningSlotIndex * TILE_SIZE_PX + TILE_SIZE_PX / 2);
        
        // Find the closest alignment position that's still left of start
        while (targetPosition + (WHEEL_SLOTS.length * TILE_SIZE_PX) < startPosition) {
          const testPosition = targetPosition + (WHEEL_SLOTS.length * TILE_SIZE_PX);
          const testAlignment = testPosition + (winningSlotIndex * TILE_SIZE_PX + TILE_SIZE_PX / 2);
          
          if (Math.abs(testAlignment - CENTER_MARKER_PX) < 1) {
            targetPosition = testPosition;
            break;
          }
          targetPosition = testPosition;
        }
      }
      
      const animationDistance = Math.abs(targetPosition - startPosition);
      const rotations = animationDistance / (WHEEL_SLOTS.length * TILE_SIZE_PX);
      
      console.log('🎯 Animation Details:', {
        startPosition: Math.round(startPosition),
        targetPosition: Math.round(targetPosition),
        distance: Math.round(animationDistance),
        rotations: Math.round(rotations * 100) / 100,
        duration: SPIN_DURATION_MS,
        winningSlot,
        direction: targetPosition < startPosition ? 'LEFT (Right → Left) ✅' : 'RIGHT (Left → Right) ❌'
      });
      
      // Set animation state
      setIsAnimating(true);
      setShowWinGlow(false);
      
      // Get reel element
      const reel = reelRef.current;
      
      // ROBUST ANIMATION SEQUENCE
      // Step 1: Ensure no transition and set starting position
      reel.style.transition = 'none';
      reel.style.transform = `translateX(${startPosition}px)`;
      
      // Step 2: Force reflow
      void reel.offsetHeight;
      
      // Step 3: Set transition
      reel.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
      
      // Step 4: Start animation after next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (reelRef.current) {
            reelRef.current.style.transform = `translateX(${targetPosition}px)`;
          }
        });
      });
      
      // Clear any existing timeout
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      
      // Complete animation after exactly 4 seconds
      animationTimeoutRef.current = setTimeout(() => {
        // 🛡️ NORMALIZE POSITION - Prevent tiles from disappearing over time
        const normalizedPosition = normalizePosition(targetPosition);
        
        // Update reel position to normalized value to prevent visual jumps
        if (reelRef.current) {
          reelRef.current.style.transform = `translateX(${normalizedPosition}px)`;
        }
        
        setCurrentPosition(normalizedPosition);
        setIsAnimating(false);
        setShowWinGlow(true);
        
        // 🔄 RESET ANIMATION TRACKING - Allow fresh animations for new rounds
        lastAnimationRef.current = {
          winningSlot: null,
          serverReelPosition: null,
          isSpinning: false
        };
        
        // Save normalized position for next round
        localStorage.setItem('rouletteReelPosition', normalizedPosition.toString());
        
        // Remove transition for instant updates
        if (reelRef.current) {
          reelRef.current.style.transition = 'none';
        }
        
        // Hide win glow after 2 seconds
        setTimeout(() => setShowWinGlow(false), 2000);
      }, SPIN_DURATION_MS);
    }
  }, [isSpinning, winningSlot, serverReelPosition]);

  // 🔄 Reset animation tracking when spinning stops (handle round changes)
  useEffect(() => {
    if (!isSpinning) {
      lastAnimationRef.current = {
        winningSlot: null,
        serverReelPosition: null,
        isSpinning: false
      };
    }
  }, [isSpinning]);

  // 🧹 Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // 🎲 Generate all tiles (duplicated sequences for infinite scrolling)
  // Center tiles around 0 for coverage in both positive and negative directions
  const allTiles = [];
  const centerOffset = Math.floor(TILE_REPEATS / 2); // Center the tile generation
  
  for (let repeat = 0; repeat < TILE_REPEATS; repeat++) {
    for (let slotIndex = 0; slotIndex < WHEEL_SLOTS.length; slotIndex++) {
      const slot = WHEEL_SLOTS[slotIndex];
      const globalIndex = repeat * WHEEL_SLOTS.length + slotIndex;
      
      // Center tiles around 0 by subtracting the center offset
      const centeredPosition = (globalIndex - centerOffset * WHEEL_SLOTS.length) * TILE_SIZE_PX;
      
      allTiles.push({
        id: `tile-${globalIndex}`,
        slot: slot.slot,
        color: slot.color,
        index: globalIndex,
        leftPosition: centeredPosition
      });
    }
  }

  return (
    <div className="flex justify-center w-full">
      {/* 🎰 ROULETTE CONTAINER - Fixed 1500px width, 100px height (matches tiles) */}
      <div 
        className="relative rounded-xl shadow-2xl overflow-hidden"
        style={{ 
          width: `${REEL_WIDTH_PX}px`,
          height: `${REEL_HEIGHT_PX}px`
        }}
      >
        {/* 🎯 FIXED CENTER MARKER - Never moves, always at 750px */}
        <div 
          className={`absolute inset-y-0 z-30 pointer-events-none transition-all duration-300 ${
            showWinGlow ? 'bg-yellow-400 shadow-yellow-400/60' : 'bg-emerald-400 shadow-emerald-400/40'
          }`}
          style={{ 
            left: `${CENTER_MARKER_PX}px`,
            width: '4px',
            transform: 'translateX(-2px)',
            boxShadow: showWinGlow ? '0 0 20px rgba(255, 255, 0, 0.8)' : '0 0 15px rgba(16, 185, 129, 0.6)'
          }}
        >
          {/* Top triangle pointer */}
          <div 
            className={`absolute -top-3 left-1/2 transform -translate-x-1/2 transition-colors duration-300`}
            style={{
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderBottom: `10px solid ${showWinGlow ? '#fbbf24' : '#10b981'}`
            }}
          />
          
          {/* Bottom triangle pointer */}
          <div 
            className={`absolute -bottom-3 left-1/2 transform -translate-x-1/2 transition-colors duration-300`}
            style={{
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: `10px solid ${showWinGlow ? '#fbbf24' : '#10b981'}`
            }}
          />
        </div>

        {/* 🎡 REEL - Horizontal scrolling tile container */}
        <div 
          ref={reelRef}
          className="flex h-full will-change-transform"
          style={{ 
            width: `${TOTAL_REEL_WIDTH_PX}px`,
            // Transform is handled by JavaScript during animation for smooth transitions
            ...(isAnimating ? {} : { transform: `translateX(${currentPosition}px)` })
          }}
        >
          {allTiles.map((tile) => {
            // Calculate if this tile is currently under the center marker
            const tileScreenLeft = tile.leftPosition + currentPosition;
            const tileScreenRight = tileScreenLeft + TILE_SIZE_PX;
            const isUnderMarker = tileScreenLeft <= CENTER_MARKER_PX && tileScreenRight >= CENTER_MARKER_PX;
            const isWinningTile = isUnderMarker && tile.slot === winningSlot && showWinGlow;
            
            return (
              <div
                key={tile.id}
                className={`
                  flex-shrink-0 flex items-center justify-center text-xl font-bold border-2 
                  relative select-none
                  ${getTileStyle(tile.color)}
                  ${isUnderMarker ? 'border-white border-opacity-90 z-20' : 'border-opacity-60 z-10'}
                  ${isWinningTile ? 'ring-4 ring-yellow-400 ring-opacity-80 scale-105' : ''}
                `}
                style={{ 
                  width: `${TILE_SIZE_PX}px`,
                  height: `${TILE_SIZE_PX}px`,
                  clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))'
                }}
              >
                <span className="relative z-10 font-mono tracking-wider">{tile.slot}</span>
                
                {/* Winning effect overlay */}
                {isWinningTile && (
                  <div className="absolute inset-0 bg-yellow-400 bg-opacity-25 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}