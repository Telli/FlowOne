/**
 * Request deduplication utility
 * Prevents duplicate API calls by caching in-flight requests
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired requests every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRequests();
    }, 5 * 60 * 1000);
  }

  /**
   * Generate a cache key for a request
   */
  private generateKey(method: string, url: string, body?: any): string {
    const bodyStr = body ? JSON.stringify(body) : '';
    return `${method}:${url}:${bodyStr}`;
  }

  /**
   * Check if a request is already in progress
   */
  private isRequestPending(key: string): boolean {
    const request = this.pendingRequests.get(key);
    if (!request) return false;

    // Check if request has expired
    if (Date.now() - request.timestamp > this.REQUEST_TIMEOUT) {
      this.pendingRequests.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get the pending request promise
   */
  private getPendingRequest<T>(key: string): Promise<T> | null {
    const request = this.pendingRequests.get(key);
    if (!request) return null;

    // Check if request has expired
    if (Date.now() - request.timestamp > this.REQUEST_TIMEOUT) {
      this.pendingRequests.delete(key);
      return null;
    }

    return request.promise;
  }

  /**
   * Store a pending request
   */
  private setPendingRequest<T>(key: string, promise: Promise<T>): void {
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });
  }

  /**
   * Remove a completed request
   */
  private removePendingRequest(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Clean up expired requests
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.REQUEST_TIMEOUT) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Deduplicate a request
   */
  async deduplicate<T>(
    method: string,
    url: string,
    requestFn: () => Promise<T>,
    body?: any
  ): Promise<T> {
    const key = this.generateKey(method, url, body);

    // Check if request is already in progress
    const pendingRequest = this.getPendingRequest<T>(key);
    if (pendingRequest) {
      return pendingRequest;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      this.removePendingRequest(key);
    });

    this.setPendingRequest(key, promise);
    return promise;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get statistics about pending requests
   */
  getStats(): { pendingCount: number; oldestRequest: number | null } {
    const timestamps = Array.from(this.pendingRequests.values()).map(r => r.timestamp);
    return {
      pendingCount: this.pendingRequests.size,
      oldestRequest: timestamps.length > 0 ? Math.min(...timestamps) : null
    };
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Global instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Hook for using request deduplication in React components
 */
export function useRequestDeduplication() {
  const deduplicate = React.useCallback(
    <T>(
      method: string,
      url: string,
      requestFn: () => Promise<T>,
      body?: any
    ): Promise<T> => {
      return requestDeduplicator.deduplicate(method, url, requestFn, body);
    },
    []
  );

  return { deduplicate };
}

/**
 * Higher-order function to wrap API calls with deduplication
 */
export function withDeduplication<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator?: (...args: T) => string
) {
  return async (...args: T): Promise<R> => {
    const method = 'POST'; // Default method, could be made configurable
    const url = 'api'; // Default URL, could be made configurable
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    return requestDeduplicator.deduplicate(
      method,
      url,
      () => fn(...args),
      { args, key }
    );
  };
}

export default requestDeduplicator;