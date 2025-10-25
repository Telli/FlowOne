/**
 * Simple in-memory cache with TTL support
 * Used for caching API responses and expensive computations
 */

import * as React from 'react';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

class Cache {
  private store = new Map<string, CacheEntry<any>>();

  /**
   * Get value from cache if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with TTL
   */
  set<T>(key: string, value: T, ttlMs: number = 5 * 60 * 1000): void {
    this.store.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  /**
   * Clear specific cache entry
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.store.size;
  }
}

// Global cache instance
export const cache = new Cache();

/**
 * Decorator for caching async function results
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  ttlMs: number = 5 * 60 * 1000
): T {
  return (async (...args: any[]) => {
    const cacheKey = `${fn.name}:${JSON.stringify(args)}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Call function and cache result
    const result = await fn(...args);
    cache.set(cacheKey, result, ttlMs);
    return result;
  }) as T;
}

/**
 * Hook for caching API responses
 */
export function useCachedFetch<T>(
  url: string,
  ttlMs: number = 5 * 60 * 1000
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      // Check cache first
      const cached = cache.get<T>(url);
      if (cached !== null) {
        setData(cached);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        cache.set(url, result, ttlMs);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, ttlMs]);

  return { data, loading, error };
}

/**
 * Clear cache for specific pattern
 */
export function clearCachePattern(pattern: string): void {
  const regex = new RegExp(pattern);
  const keys = Array.from((cache as any).store.keys());
  keys.forEach(key => {
    if (regex.test(key)) {
      cache.delete(key);
    }
  });
}

/**
 * Cache statistics
 */
export function getCacheStats() {
  return {
    size: cache.size(),
    entries: Array.from((cache as any).store.keys())
  };
}

