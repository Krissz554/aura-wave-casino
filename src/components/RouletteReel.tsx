import { useEffect, useState, useRef, useCallback } from 'react';

interface RouletteReelProps {
  isSpinning: boolean;
  winningSlot: number | null;
  showWinAnimation: boolean;
  synchronizedPosition?: number | null;
  extendedWinAnimation?: boolean;
}

// Roulette wheel configuration: 15 slots in order
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

const TILE_WIDTH = 120; // Width of each tile in pixels
const BACKEND_CONTAINER_WIDTH = 1200; // Backend's container width
const BACKEND_CENTER_OFFSET = 600; // Backend's center position

// Animation configuration
const ANIMATION_CONFIG = {
  TOTAL_DURATION: 5000, // 5 seconds total
  ACCELERATION_PHASE: 0.15, // 15% of time for acceleration
  FAST_PHASE: 0.35, // 35% of time for fast movement
  DECELERATION_PHASE: 0.5, // 50% of time for deceleration
  INITIAL_VELOCITY: 0, // Start from rest
  MAX_VELOCITY: 2000, // Maximum velocity in pixels per second
  DECELERATION_RATE: 0.98, // Deceleration factor
  BOUNCE_DAMPING: 0.3, // How much bounce is damped
  FINAL_POSITION_TOLERANCE: 2 // Tolerance for final position in pixels
};

export function RouletteReel({ isSpinning, winningSlot, showWinAnimation, synchronizedPosition, extendedWinAnimation }: RouletteReelProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentVelocity, setCurrentVelocity] = useState(0);
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [actualContainerWidth, setActualContainerWidth] = useState(BACKEND_CONTAINER_WIDTH);
  const [actualCenterOffset, setActualCenterOffset] = useState(BACKEND_CENTER_OFFSET);
  const animationStartTimeRef = useRef<number>(0);
  const animationStartPositionRef = useRef<number>(0);
  const targetPositionRef = useRef<number>(0);

  console.log('🎰 RouletteReel:', { isSpinning, winningSlot, translateX, synchronizedPosition });

  // Measure actual container size for responsive design
  useEffect(() => {
    const measureContainer = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width || BACKEND_CONTAINER_WIDTH;
        const centerOffset = width / 2;
        
        setActualContainerWidth(width);
        setActualCenterOffset(centerOffset);
        
        console.log('📏 Container measured:', { width, centerOffset });
      }
    };

    measureContainer();
    window.addEventListener('resize', measureContainer);
    
    return () => window.removeEventListener('resize', measureContainer);
  }, []);

  // Sync position when not animating (cross-user synchronization)
  useEffect(() => {
    if (synchronizedPosition !== null && 
        synchronizedPosition !== undefined && 
        !isAnimating) {
      
      console.log('🔄 Syncing to backend position:', synchronizedPosition);
      
      // Adjust backend position for our actual container size
      const centerDifference = actualCenterOffset - BACKEND_CENTER_OFFSET;
      const adjustedPosition = synchronizedPosition + centerDifference;
      
      console.log('📍 Position sync:', {
        backend: synchronizedPosition,
        centerDifference,
        adjusted: adjustedPosition
      });
      
      setTranslateX(adjustedPosition);
    }
  }, [synchronizedPosition, isAnimating, actualCenterOffset]);

  // Create a repeating loop of tiles (20 repetitions for smooth infinite scroll)
  const tiles = [];
  for (let repeat = 0; repeat < 20; repeat++) {
    for (let i = 0; i < WHEEL_SLOTS.length; i++) {
      tiles.push({
        ...WHEEL_SLOTS[i],
        key: `${repeat}-${i}`,
        index: repeat * WHEEL_SLOTS.length + i
      });
    }
  }

  // Enhanced easing functions for realistic animation
  const easingFunctions = {
    // Smooth acceleration curve with realistic physics
    accelerate: (t: number) => {
      // Use cubic ease-in for natural acceleration
      return t * t * t;
    },
    
    // Fast movement with realistic momentum
    fast: (t: number) => {
      // Linear movement with slight mechanical variation
      const base = t;
      const mechanicalVariation = Math.sin(t * Math.PI * 4) * 0.005; // Subtle mechanical effect
      return base + mechanicalVariation;
    },
    
    // Realistic deceleration with momentum and bounce
    decelerate: (t: number) => {
      // Exponential decay for natural deceleration
      const decay = Math.exp(-t * 2.5);
      
      // Add realistic bounce effect that diminishes over time
      const bounceFrequency = 6; // Number of bounces
      const bounceDecay = Math.exp(-t * 3); // Bounce amplitude decay
      const bounce = Math.sin(t * Math.PI * bounceFrequency) * bounceDecay * 0.08;
      
      return 1 - decay + bounce;
    },
    
    // Combined easing for the entire animation with smooth transitions
    combined: (t: number) => {
      if (t < ANIMATION_CONFIG.ACCELERATION_PHASE) {
        // Acceleration phase: 0% to 10% of total distance
        const phaseT = t / ANIMATION_CONFIG.ACCELERATION_PHASE;
        return easingFunctions.accelerate(phaseT) * 0.1;
      } else if (t < ANIMATION_CONFIG.ACCELERATION_PHASE + ANIMATION_CONFIG.FAST_PHASE) {
        // Fast phase: 10% to 80% of total distance
        const phaseT = (t - ANIMATION_CONFIG.ACCELERATION_PHASE) / ANIMATION_CONFIG.FAST_PHASE;
        return 0.1 + easingFunctions.fast(phaseT) * 0.7;
      } else {
        // Deceleration phase: 80% to 100% of total distance
        const phaseT = (t - ANIMATION_CONFIG.ACCELERATION_PHASE - ANIMATION_CONFIG.FAST_PHASE) / ANIMATION_CONFIG.DECELERATION_PHASE;
        return 0.8 + easingFunctions.decelerate(phaseT) * 0.2;
      }
    }
  };

  // Physics-based animation with momentum and realistic deceleration
  const animateWithPhysics = useCallback((startPosition: number, targetPosition: number) => {
    const startTime = Date.now();
    animationStartTimeRef.current = startTime;
    animationStartPositionRef.current = startPosition;
    targetPositionRef.current = targetPosition;
    
    console.log('🚀 Starting physics-based animation:', {
      startPosition,
      targetPosition,
      distance: Math.abs(targetPosition - startPosition)
    });

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / ANIMATION_CONFIG.TOTAL_DURATION, 1);
      
      // Use combined easing function for smooth animation
      const easedProgress = easingFunctions.combined(progress);
      
      // Calculate current position
      const currentPosition = startPosition + (targetPosition - startPosition) * easedProgress;
      
      // Calculate velocity for momentum effect
      const velocity = (targetPosition - startPosition) * (easedProgress - (progress > 0 ? easingFunctions.combined(Math.max(0, progress - 0.01)) : 0)) * 100;
      setCurrentVelocity(velocity);
      
      setTranslateX(currentPosition);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - ensure we land exactly on target
        console.log('✅ Physics animation complete');
        setTranslateX(targetPosition);
        setCurrentVelocity(0);
        setIsAnimating(false);
        
        // Verify the provably fair result landed correctly
        verifyProvablyFairLanding(winningSlot, targetPosition);
      }
    };

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setIsAnimating(true);
    animationRef.current = requestAnimationFrame(animate);
  }, [winningSlot]);

  // Enhanced animation: Use provably fair position with physics-based animation
  useEffect(() => {
    if (isSpinning && winningSlot !== null && synchronizedPosition !== null && synchronizedPosition !== undefined) {
      console.log('🚀 Starting provably fair physics animation to slot:', winningSlot, 'at position:', synchronizedPosition);
      
      // Use the EXACT position calculated by the provably fair backend
      const startPosition = translateX;
      
      // Adjust backend position for our actual container size
      const centerDifference = actualCenterOffset - BACKEND_CENTER_OFFSET;
      const exactTargetPosition = synchronizedPosition + centerDifference;
      
      console.log('🎯 Provably fair physics animation setup:', {
        winningSlot,
        startPosition,
        backendPosition: synchronizedPosition,
        centerDifference,
        exactTarget: exactTargetPosition,
        distance: Math.abs(exactTargetPosition - startPosition)
      });

      // Start physics-based animation
      animateWithPhysics(startPosition, exactTargetPosition);
    }
  }, [isSpinning, winningSlot, synchronizedPosition, translateX, actualCenterOffset, animateWithPhysics]);

  // Verify that the provably fair result landed exactly under the center line
  const verifyProvablyFairLanding = (slot: number | null, finalPosition: number) => {
    if (slot === null) return;
    
    const slotIndex = WHEEL_SLOTS.findIndex(s => s.slot === slot);
    if (slotIndex === -1) return;
    
    // Find the closest instance of the winning slot to the center
    let closestDistance = Infinity;
    let closestTileCenter = 0;
    
    for (let repeat = 0; repeat < 20; repeat++) {
      const tileGlobalIndex = repeat * WHEEL_SLOTS.length + slotIndex;
      const tileLeftEdge = finalPosition + (tileGlobalIndex * TILE_WIDTH);
      const tileCenterPosition = tileLeftEdge + (TILE_WIDTH / 2);
      const distanceFromCenter = Math.abs(tileCenterPosition - actualCenterOffset);
      
      if (distanceFromCenter < closestDistance) {
        closestDistance = distanceFromCenter;
        closestTileCenter = tileCenterPosition;
      }
    }
    
    const isAccurate = closestDistance < ANIMATION_CONFIG.FINAL_POSITION_TOLERANCE;
    
    console.log('🎯 PROVABLY FAIR VERIFICATION:', {
      expectedSlot: slot,
      expectedCenter: actualCenterOffset,
      actualTileCenter: closestTileCenter,
      distanceOff: closestDistance.toFixed(2) + 'px',
      result: isAccurate ? '✅ PERFECT PROVABLY FAIR LANDING' : '❌ PROVABLY FAIR ERROR',
      tolerance: ANIMATION_CONFIG.FINAL_POSITION_TOLERANCE + 'px'
    });
    
    if (!isAccurate) {
      console.error(`❌ PROVABLY FAIR SYSTEM ERROR: Slot ${slot} missed center by ${closestDistance.toFixed(2)}px!`);
    } else {
      console.log(`✅ PROVABLY FAIR SUCCESS: Slot ${slot} landed perfectly under center line!`);
    }
  };

  // Clean up animation when round ends
  useEffect(() => {
    if (!isSpinning && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      setIsAnimating(false);
      setCurrentVelocity(0);
    }
  }, [isSpinning]);

  // Get tile color styling
  const getTileColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300 text-white';
      case 'red':
        return 'bg-gradient-to-br from-red-400 to-red-600 border-red-300 text-white';
      case 'black':
        return 'bg-gradient-to-br from-gray-700 to-gray-900 border-gray-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto">
      {/* Reel container */}
      <div ref={containerRef} className="relative h-36 rounded-xl overflow-hidden shadow-2xl bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 border border-gray-600/50">
        
        {/* Enhanced center indicator line */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 z-30 pointer-events-none">
          {/* Top arrow with enhanced styling */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-emerald-400 drop-shadow-lg"></div>
          </div>
          
          {/* Bottom arrow with enhanced styling */}
          <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-emerald-400 drop-shadow-lg"></div>
          </div>
          
          {/* Enhanced center line with multiple layers */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-300 shadow-lg"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-200 via-emerald-300 to-emerald-200 opacity-50"></div>
          
          {/* Enhanced glow effect with animation */}
          <div className={`absolute inset-0 bg-emerald-400 shadow-emerald-400/50 shadow-2xl blur-sm ${isAnimating ? 'animate-pulse' : 'animate-pulse'}`}></div>
          
          {/* Additional sparkle effect during animation */}
          {isAnimating && (
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-300/30 to-transparent animate-pulse"></div>
          )}
        </div>

        {/* Horizontal scrolling tiles */}
        <div 
          className="flex h-full items-center"
          style={{
            transform: `translateX(${translateX}px)`,
            transition: 'none', // No CSS transitions, we control animation with JS
            willChange: 'transform'
          }}
        >
          
          {/* Animation overlay for enhanced visual feedback */}
          {isAnimating && (
            <div className="absolute inset-0 pointer-events-none z-40">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/5 to-transparent animate-pulse"></div>
            </div>
          )}
          {tiles.map((tile) => {
            // Calculate if this tile is near the center for highlighting
            const tileCenter = translateX + (tile.index * TILE_WIDTH + TILE_WIDTH / 2);
            const distanceFromCenter = Math.abs(tileCenter - actualCenterOffset);
            const isNearCenter = distanceFromCenter < TILE_WIDTH / 2;
            const isWinningTile = !isAnimating && tile.slot === winningSlot && distanceFromCenter < TILE_WIDTH / 3;
            
            // Enhanced winning tile detection with extended animation support
            const isExtendedWinningTile = extendedWinAnimation && tile.slot === winningSlot && distanceFromCenter < TILE_WIDTH / 3;

            // Add velocity-based visual effects during animation
            const velocityEffect = isAnimating ? Math.abs(currentVelocity) / 1000 : 0;
            const scaleEffect = isNearCenter && isAnimating ? 1 + (velocityEffect * 0.05) : 1;
            
            // Calculate motion blur based on velocity
            const motionBlur = isAnimating ? Math.min(velocityEffect * 0.3, 1.5) : 0;
            
            // Add subtle rotation effect during fast movement
            const rotationEffect = isAnimating && velocityEffect > 0.5 ? Math.sin(Date.now() * 0.01) * 0.5 : 0;

            return (
              <div
                key={tile.key}
                className={`
                  flex-shrink-0 h-28 flex items-center justify-center relative
                  border-2 shadow-lg transition-all duration-75
                  ${getTileColor(tile.color)}
                  ${isWinningTile ? 'scale-110 ring-4 ring-emerald-400 shadow-2xl shadow-emerald-400/50 z-20' : ''}
                  ${isExtendedWinningTile ? 'scale-125 ring-8 ring-emerald-300 shadow-2xl shadow-emerald-300/70 z-30 animate-pulse' : ''}
                  ${isNearCenter && isAnimating ? 'z-10' : ''}
                `}
                style={{ 
                  width: `${TILE_WIDTH}px`,
                  transform: `scale(${scaleEffect}) rotate(${rotationEffect}deg)`,
                  filter: isAnimating ? `blur(${motionBlur}px)` : 'blur(0px)',
                  opacity: isAnimating && velocityEffect > 1 ? 0.8 + (velocityEffect * 0.1) : 1
                }}
              >
                <div className={`text-2xl font-bold drop-shadow-lg ${
                  isWinningTile ? 'text-emerald-200 scale-125' : ''
                }`}>
                  {tile.slot}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}