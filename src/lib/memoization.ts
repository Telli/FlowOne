/**
 * Memoization utilities for optimizing React components and functions
 */

import React from 'react';

/**
 * Deep equality check for props
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Custom hook for memoizing expensive computations
 */
export function useMemoDeep<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  const ref = React.useRef<{ value: T; deps: React.DependencyList }>({
    value: factory(),
    deps
  });

  if (!deepEqual(ref.current.deps, deps)) {
    ref.current = {
      value: factory(),
      deps
    };
  }

  return ref.current.value;
}

/**
 * Custom hook for memoizing callbacks with deep equality
 */
export function useCallbackDeep<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const ref = React.useRef<{ callback: T; deps: React.DependencyList }>({
    callback,
    deps
  });

  if (!deepEqual(ref.current.deps, deps)) {
    ref.current = {
      callback,
      deps
    };
  }

  return ref.current.callback;
}

/**
 * Memoize a function with LRU cache
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  maxSize: number = 10
): T {
  const cache = new Map<string, any>();

  return ((...args: any[]) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);

    // Implement LRU eviction
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): T {
  let timeoutId: NodeJS.Timeout | null = null;

  return ((...args: any[]) => {
    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  }) as T;
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): T {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return ((...args: any[]) => {
    const now = Date.now();

    if (now - lastCall >= delayMs) {
      fn(...args);
      lastCall = now;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn(...args);
        lastCall = Date.now();
      }, delayMs - (now - lastCall));
    }
  }) as T;
}

/**
 * React hook for debounced values
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(handler);
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * React hook for throttled values
 */
export function useThrottledValue<T>(value: T, delayMs: number): T {
  const [throttledValue, setThrottledValue] = React.useState(value);
  const lastUpdateRef = React.useRef(Date.now());

  React.useEffect(() => {
    const now = Date.now();

    if (now - lastUpdateRef.current >= delayMs) {
      setThrottledValue(value);
      lastUpdateRef.current = now;
    } else {
      const handler = setTimeout(() => {
        setThrottledValue(value);
        lastUpdateRef.current = Date.now();
      }, delayMs - (now - lastUpdateRef.current));

      return () => clearTimeout(handler);
    }
  }, [value, delayMs]);

  return throttledValue;
}

/**
 * Memoize component with custom comparison
 */
export function memoizeComponent<P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
): React.MemoExoticComponent<React.ComponentType<P>> {
  return React.memo(Component, propsAreEqual || deepEqual);
}

