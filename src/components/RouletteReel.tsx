import { useEffect, useState, useRef, useMemo, useCallback } from 'react';

interface RouletteReelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
  extendedWinAnimation?: boolean;
  serverReelPosition?: number | null;
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
const TILE_SIZE_PX = 100;
const VISIBLE_TILES = 15;
const REEL_WIDTH_PX = VISIBLE_TILES * TILE_SIZE_PX;
const REEL_HEIGHT_PX = TILE_SIZE_PX;
const CENTER_MARKER_PX = REEL_WIDTH_PX / 2;

// 🔄 OPTIMIZED TILE GENERATION - Reduced from 200 to 30 repeats for maximum performance
const TILE_REPEATS = 30; // Further reduced from 50
const TOTAL_TILES = WHEEL_SLOTS.length * TILE_REPEATS;
const TOTAL_REEL_WIDTH_PX = TOTAL_TILES * TILE_SIZE_PX;

// 🛡️ TILE SAFETY BOUNDS - Prevent disappearing tiles
const WHEEL_CYCLE_PX = WHEEL_SLOTS.length * TILE_SIZE_PX;
const SAFE_ZONE_CYCLES = 5; // Further reduced from 10
const MIN_SAFE_POSITION = -SAFE_ZONE_CYCLES * WHEEL_CYCLE_PX;
const MAX_SAFE_POSITION = SAFE_ZONE_CYCLES * WHEEL_CYCLE_PX;

// 🔄 POSITION NORMALIZATION - Keep reel within safe bounds while maintaining alignment
const normalizePosition = (position: number): number => {
  let normalized = position % WHEEL_CYCLE_PX;
  
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

// 🎨 OPTIMIZED tile styling - Removed all hover effects, gradients, and shadows
const getTileStyle = (color: string): string => {
  switch (color) {
    case 'green': 
      return 'bg-green-600 border-green-400 text-white';
    case 'red': 
      return 'bg-red-600 border-red-400 text-white';
    case 'black': 
      return 'bg-gray-800 border-gray-600 text-white';
    default: 
      return 'bg-gray-600 border-gray-400 text-white';
  }
};

// 🎲 OPTIMIZED tile generation
const generateTiles = () => {
  const allTiles = [];
  const centerOffset = Math.floor(TILE_REPEATS / 2);
  
  for (let repeat = 0; repeat < TILE_REPEATS; repeat++) {
    for (let slotIndex = 0; slotIndex < WHEEL_SLOTS.length; slotIndex++) {
      const slot = WHEEL_SLOTS[slotIndex];
      const globalIndex = repeat * WHEEL_SLOTS.length + slotIndex;
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
  
  return allTiles;
};

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, extendedWinAnimation, serverReelPosition }: RouletteReelProps) {
  // 🎲 Reel position state - starts from localStorage or 0, always normalized
  const [currentPosition, setCurrentPosition] = useState(() => {
    const saved = localStorage.getItem('rouletteReelPosition');
    const position = saved ? parseFloat(saved) : 0;
    return normalizePosition(position);
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

  // 🧮 Calculate winning position using PROVABLY FAIR system algorithm
  const calculateWinningPosition = useCallback((winningNumber: number, startPosition: number): number => {
    const winningSlotIndex = WHEEL_SLOTS.findIndex(slot => slot.slot === winningNumber);
    if (winningSlotIndex === -1) {
      console.error('❌ Invalid winning slot:', winningNumber);
      return startPosition;
    }
    
    const idealPosition = CENTER_MARKER_PX - (winningSlotIndex * TILE_SIZE_PX + TILE_SIZE_PX / 2);
    
    const minSpinDistance = 50 * WHEEL_SLOTS.length * TILE_SIZE_PX;
    const minFinalPosition = startPosition - minSpinDistance;
    
    let bestPosition = idealPosition;
    
    while (bestPosition > minFinalPosition) {
      bestPosition -= WHEEL_SLOTS.length * TILE_SIZE_PX;
    }
    
    return bestPosition;
  }, []);

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
      
      const clientCalculatedPosition = calculateWinningPosition(winningSlot, startPosition);
      
      if (serverReelPosition !== null && serverReelPosition !== undefined) {
        const serverDistance = Math.abs(serverReelPosition - startPosition);
        const minSpinDistance = 3 * WHEEL_SLOTS.length * TILE_SIZE_PX;
        const maxReasonableDistance = 100 * WHEEL_SLOTS.length * TILE_SIZE_PX;
        const movesLeft = serverReelPosition < startPosition;
        
        if (serverDistance >= minSpinDistance && serverDistance <= maxReasonableDistance && movesLeft) {
          targetPosition = serverReelPosition;
        } else {
          targetPosition = clientCalculatedPosition;
        }
      } else {
        targetPosition = clientCalculatedPosition;
      }
      
      if (!reelRef.current) return;
      
      // 🛡️ FINAL SAFEGUARD: Absolutely ensure LEFT movement (right → left)
      if (targetPosition >= startPosition) {
        targetPosition = startPosition - (5 * WHEEL_SLOTS.length * TILE_SIZE_PX);
        
        const winningSlotIndex = WHEEL_SLOTS.findIndex(slot => slot.slot === winningSlot);
        const correctAlignment = CENTER_MARKER_PX - (winningSlotIndex * TILE_SIZE_PX + TILE_SIZE_PX / 2);
        
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
      
      // Set animation state
      setIsAnimating(true);
      setShowWinGlow(false);
      
      // Get reel element
      const reel = reelRef.current;
      
      // OPTIMIZED ANIMATION SEQUENCE - Removed complex transitions
      reel.style.transition = 'none';
      reel.style.transform = `translateX(${startPosition}px)`;
      
      void reel.offsetHeight;
      
      reel.style.transition = `transform ${SPIN_DURATION_MS}ms ease-out`;
      
      requestAnimationFrame(() => {
        if (reelRef.current) {
          reelRef.current.style.transform = `translateX(${targetPosition}px)`;
        }
      });
      
      // Clear any existing timeout
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      
      // Complete animation after exactly 4 seconds
      animationTimeoutRef.current = setTimeout(() => {
        const normalizedPosition = normalizePosition(targetPosition);
        
        if (reelRef.current) {
          reelRef.current.style.transform = `translateX(${normalizedPosition}px)`;
        }
        
        setCurrentPosition(normalizedPosition);
        setIsAnimating(false);
        setShowWinGlow(true);
        
        lastAnimationRef.current = {
          winningSlot: null,
          serverReelPosition: null,
          isSpinning: false
        };
        
        localStorage.setItem('rouletteReelPosition', normalizedPosition.toString());
        
        if (reelRef.current) {
          reelRef.current.style.transition = 'none';
        }
        
        setTimeout(() => setShowWinGlow(false), 2000);
      }, SPIN_DURATION_MS);
    }
  }, [isSpinning, winningSlot, serverReelPosition, currentPosition, isAnimating, calculateWinningPosition]);

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

  // 🎲 Memoized tile generation for better performance
  const allTiles = useMemo(() => generateTiles(), []);

  return (
    <div className="flex justify-center w-full">
      {/* 🎰 ROULETTE CONTAINER - Simplified styling */}
      <div 
        className="relative rounded-lg overflow-hidden border-2 border-gray-300"
        style={{ 
          width: `${REEL_WIDTH_PX}px`,
          height: `${REEL_HEIGHT_PX}px`
        }}
      >
        {/* 🎯 FIXED CENTER MARKER - Simplified styling */}
        <div 
          className={`absolute inset-y-0 z-30 pointer-events-none ${
            showWinGlow ? 'bg-yellow-400' : 'bg-green-400'
          }`}
          style={{ 
            left: `${CENTER_MARKER_PX}px`,
            width: '4px',
            transform: 'translateX(-2px)'
          }}
        >
          {/* Top triangle pointer */}
          <div 
            className="absolute -top-3 left-1/2 transform -translate-x-1/2"
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
            className="absolute -bottom-3 left-1/2 transform -translate-x-1/2"
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
          className="flex h-full"
          style={{ 
            width: `${TOTAL_REEL_WIDTH_PX}px`,
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
                  ${isUnderMarker ? 'border-white z-20' : 'z-10'}
                  ${isWinningTile ? 'ring-2 ring-yellow-400' : ''}
                `}
                style={{ 
                  width: `${TILE_SIZE_PX}px`,
                  height: `${TILE_SIZE_PX}px`
                }}
              >
                <span className="relative z-10 font-mono tracking-wider">{tile.slot}</span>
                
                {/* Simplified winning effect overlay */}
                {isWinningTile && (
                  <div className="absolute inset-0 bg-yellow-400 bg-opacity-25" />
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}