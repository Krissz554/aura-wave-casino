import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Debounce utility for expensive operations
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
};

// Throttle utility for frequent operations
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRunRef = useRef<number>(0);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastRunRef.current >= delay) {
      callback(...args);
      lastRunRef.current = now;
    }
  }, [callback, delay]) as T;
};

// Memoized value with deep comparison
export const useDeepMemo = <T>(value: T, deps: any[]): T => {
  return useMemo(() => value, deps);
};

// Intersection Observer for lazy loading
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

// Virtual scrolling helper
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

// Performance monitoring
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
  };
};

// Memory leak prevention
export const useCleanup = (cleanupFn: () => void) => {
  useEffect(() => {
    return cleanupFn;
  }, [cleanupFn]);
};

// Batch state updates
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

// Resource preloading
export const usePreload = (resources: string[]) => {
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

// Component lazy loading
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