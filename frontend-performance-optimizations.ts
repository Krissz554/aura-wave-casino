// 🚀 Frontend Performance Optimizations
// Comprehensive React optimizations for your casino website

import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';

// ============================================================================
// 1. ENHANCED PERFORMANCE HOOKS
// ============================================================================

/**
 * Enhanced debouncing hook for expensive operations
 */
export const useDebouncedState = <T>(initialValue: T, delay: number) => {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return [debouncedValue, setValue] as const;
};

/**
 * Throttled state updates for real-time data
 */
export const useThrottledState = <T>(initialValue: T, delay: number) => {
  const [value, setValue] = useState<T>(initialValue);
  const lastUpdateRef = useRef(0);

  const setThrottledValue = useCallback((newValue: T) => {
    const now = Date.now();
    if (now - lastUpdateRef.current >= delay) {
      setValue(newValue);
      lastUpdateRef.current = now;
    }
  }, [delay]);

  return [value, setThrottledValue] as const;
};

/**
 * Optimized real-time data hook
 */
export const useOptimizedRealtime = <T>(initialData: T[]) => {
  const [data, setData] = useState<T[]>(initialData);
  const lastUpdateRef = useRef(0);
  const updateQueueRef = useRef<T[]>([]);
  
  const handleUpdate = useCallback((newData: T[]) => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 100) { // 100ms throttle
      setData(newData);
      lastUpdateRef.current = now;
    } else {
      // Queue updates for batch processing
      updateQueueRef.current.push(...newData);
    }
  }, []);

  // Process queued updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (updateQueueRef.current.length > 0) {
        setData(prev => [...prev, ...updateQueueRef.current]);
        updateQueueRef.current = [];
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return { data, handleUpdate };
};

/**
 * Memory leak prevention hook
 */
export const useCleanup = (cleanupFn: () => void) => {
  useEffect(() => {
    return cleanupFn;
  }, [cleanupFn]);
};

/**
 * Batch state updates hook
 */
export const useBatchUpdate = () => {
  const batchRef = useRef<(() => void)[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const batchUpdate = useCallback((updateFn: () => void) => {
    batchRef.current.push(updateFn);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const updates = [...batchRef.current];
      batchRef.current = [];
      
      // Execute all updates in a single batch
      updates.forEach(update => update());
    }, 0);
  }, []);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return batchUpdate;
};

/**
 * Performance monitoring hook
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(performance.now());
  
  useEffect(() => {
    renderCountRef.current++;
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    
    if (timeSinceLastRender > 16) { // More than 60fps threshold
      console.warn(
        `Performance warning: ${componentName} took ${timeSinceLastRender.toFixed(2)}ms to render (render #${renderCountRef.current})`
      );
    }
    
    lastRenderTimeRef.current = now;
  });
  
  return {
    renderCount: renderCountRef.current,
    lastRenderTime: lastRenderTimeRef.current
  };
};

/**
 * Intersection Observer for lazy loading
 */
export const useIntersectionObserver = (
  callback: (isIntersecting: boolean) => void,
  options: IntersectionObserverInit = {}
) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const observe = useCallback((element: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    if (element) {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          callback(entry.isIntersecting);
        });
      }, options);
      
      observerRef.current.observe(element);
    }
  }, [callback, options]);
  
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);
  
  return observe;
};

/**
 * Virtual scrolling helper
 */
export const useVirtualScrolling = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      itemCount
    );
    
    return {
      start: Math.max(0, start - overscan),
      end,
      offsetY: start * itemHeight,
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, itemCount]);
  
  return {
    visibleRange,
    setScrollTop,
    totalHeight: itemCount * itemHeight,
  };
};

/**
 * Optimized cookie management
 */
export const useOptimizedCookies = () => {
  const getCookie = useCallback((name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  }, []);

  const setCookie = useCallback((name: string, value: string, days: number) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  }, []);

  const deleteCookie = useCallback((name: string) => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
  }, []);

  return { getCookie, setCookie, deleteCookie };
};

/**
 * Session management optimization
 */
export const useSessionOptimization = () => {
  const sessionRef = useRef<{ [key: string]: any }>({});
  
  const getSession = useCallback((key: string) => {
    return sessionRef.current[key];
  }, []);
  
  const setSession = useCallback((key: string, value: any) => {
    sessionRef.current[key] = value;
  }, []);
  
  const clearSession = useCallback((key?: string) => {
    if (key) {
      delete sessionRef.current[key];
    } else {
      sessionRef.current = {};
    }
  }, []);
  
  return { getSession, setSession, clearSession };
};

// ============================================================================
// 2. OPTIMIZED COMPONENT WRAPPERS
// ============================================================================

/**
 * Memoized component wrapper with performance monitoring
 */
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  const OptimizedComponent = React.memo((props: P) => {
    usePerformanceMonitor(componentName);
    return <Component {...props} />;
  });
  
  OptimizedComponent.displayName = `Optimized(${componentName})`;
  return OptimizedComponent;
};

/**
 * Lazy loading wrapper with error boundary
 */
export const withLazyLoading = <P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = lazy(importFn);
  
  return (props: P) => (
    <Suspense fallback={fallback || <div>Loading...</div>}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

/**
 * Error boundary wrapper
 */
export class OptimizedErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback = ({ error }: { error: Error }) => (
  <div className="error-boundary">
    <h2>Something went wrong</h2>
    <p>{error.message}</p>
  </div>
);

// ============================================================================
// 3. GAME-SPECIFIC OPTIMIZATIONS
// ============================================================================

/**
 * Optimized roulette animation hook
 */
export const useOptimizedRouletteAnimation = () => {
  const animationRef = useRef<number>();
  const isAnimatingRef = useRef(false);
  
  const animate = useCallback((timestamp: number) => {
    if (!isAnimatingRef.current) return;
    
    // Animation logic here
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const startAnimation = useCallback(() => {
    isAnimatingRef.current = true;
    animationRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const stopAnimation = useCallback(() => {
    isAnimatingRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return { startAnimation, stopAnimation };
};

/**
 * Throttled real-time updates for games
 */
export const useThrottledRealtime = (callback: Function, delay: number) => {
  const lastRunRef = useRef(0);
  
  return useCallback((...args: any[]) => {
    const now = Date.now();
    if (now - lastRunRef.current >= delay) {
      callback(...args);
      lastRunRef.current = now;
    }
  }, [callback, delay]);
};

/**
 * Mobile touch optimization
 */
export const useTouchOptimization = () => {
  const touchStartRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartRef.current = Date.now();
    touchStartPosRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  }, []);
  
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const touchDuration = Date.now() - touchStartRef.current;
    const touchDistance = Math.sqrt(
      Math.pow(e.changedTouches[0].clientX - touchStartPosRef.current.x, 2) +
      Math.pow(e.changedTouches[0].clientY - touchStartPosRef.current.y, 2)
    );
    
    // Prevent accidental touches (too short or too small movement)
    if (touchDuration < 100 || touchDistance < 10) {
      e.preventDefault();
    }
  }, []);

  return { handleTouchStart, handleTouchEnd };
};

/**
 * Lazy image loading hook
 */
export const useLazyImage = (src: string) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const observe = useIntersectionObserver((intersecting) => {
    if (intersecting) {
      setIsInView(true);
    }
  }, { threshold: 0.1 });
  
  useEffect(() => {
    if (imgRef.current) {
      observe(imgRef.current);
    }
  }, [observe]);
  
  useEffect(() => {
    if (isInView && imgRef.current) {
      imgRef.current.src = src;
      imgRef.current.onload = () => setIsLoaded(true);
    }
  }, [isInView, src]);
  
  return { imgRef, isLoaded, isInView };
};

// ============================================================================
// 4. CSS AND STYLE OPTIMIZATIONS
// ============================================================================

/**
 * CSS variables optimization
 */
export const useCSSVariables = () => {
  const setCSSVariable = useCallback((name: string, value: string) => {
    document.documentElement.style.setProperty(`--${name}`, value);
  }, []);

  const getCSSVariable = useCallback((name: string) => {
    return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`);
  }, []);

  return { setCSSVariable, getCSSVariable };
};

/**
 * Responsive breakpoint hook
 */
export const useResponsiveBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };
    
    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);
  
  return breakpoint;
};

// ============================================================================
// 5. BUNDLE AND LOADING OPTIMIZATIONS
// ============================================================================

/**
 * Resource preloading hook
 */
export const usePreloadResources = (resources: string[]) => {
  useEffect(() => {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.endsWith('.js') ? 'script' : 'style';
      document.head.appendChild(link);
    });
  }, [resources]);
};

/**
 * Component lazy loading with priority
 */
export const useLazyLoad = (shouldLoad: boolean, loadFn: () => void) => {
  useEffect(() => {
    if (shouldLoad) {
      // Use requestIdleCallback for non-critical loading
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => loadFn());
      } else {
        setTimeout(loadFn, 0);
      }
    }
  }, [shouldLoad, loadFn]);
};

/**
 * Network status monitoring
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  
  useEffect(() => {
    const updateNetworkStatus = () => {
      setIsOnline(navigator.onLine);
      
      // @ts-ignore - navigator.connection is not in TypeScript definitions
      if (navigator.connection) {
        // @ts-ignore
        setConnectionType(navigator.connection.effectiveType || 'unknown');
      }
    };
    
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);
  
  return { isOnline, connectionType };
};

// ============================================================================
// 6. EXPORT ALL OPTIMIZATIONS
// ============================================================================

export {
  // Enhanced hooks
  useDebouncedState,
  useThrottledState,
  useOptimizedRealtime,
  useCleanup,
  useBatchUpdate,
  usePerformanceMonitor,
  useIntersectionObserver,
  useVirtualScrolling,
  useOptimizedCookies,
  useSessionOptimization,
  
  // Component wrappers
  withPerformanceMonitoring,
  withLazyLoading,
  OptimizedErrorBoundary,
  
  // Game-specific hooks
  useOptimizedRouletteAnimation,
  useThrottledRealtime,
  useTouchOptimization,
  useLazyImage,
  
  // Style and responsive hooks
  useCSSVariables,
  useResponsiveBreakpoint,
  
  // Bundle and loading hooks
  usePreloadResources,
  useLazyLoad,
  useNetworkStatus,
};

// ============================================================================
// 7. USAGE EXAMPLES
// ============================================================================

/*
// Example usage in a component:

import { 
  useDebouncedState, 
  usePerformanceMonitor, 
  withPerformanceMonitoring 
} from './frontend-performance-optimizations';

const MyComponent = () => {
  usePerformanceMonitor('MyComponent');
  const [debouncedValue, setValue] = useDebouncedState('', 300);
  
  // Component logic...
};

export default withPerformanceMonitoring(MyComponent, 'MyComponent');

// Example usage for real-time data:

const LiveBetFeed = () => {
  const { data, handleUpdate } = useOptimizedRealtime([]);
  
  useEffect(() => {
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('live_bet_feed')
      .on('postgres_changes', { event: 'INSERT', table: 'live_bet_feed' }, 
        (payload) => handleUpdate([payload.new, ...data])
      )
      .subscribe();
      
    return () => subscription.unsubscribe();
  }, [data, handleUpdate]);
  
  return (
    <div>
      {data.map(bet => <BetItem key={bet.id} bet={bet} />)}
    </div>
  );
};
*/