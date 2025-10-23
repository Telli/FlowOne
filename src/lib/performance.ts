/**
 * Performance monitoring and metrics collection
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  tags?: Record<string, string>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks = new Map<string, number>();
  private enabled = true;

  /**
   * Start measuring a metric
   */
  mark(name: string): void {
    if (!this.enabled) return;
    this.marks.set(name, performance.now());
  }

  /**
   * End measuring and record metric
   */
  measure(name: string, tags?: Record<string, string>): number {
    if (!this.enabled) return 0;

    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`No mark found for ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
      tags
    });

    this.marks.delete(name);

    // Log slow operations
    if (duration > 1000) {
      console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Measure async operation
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    this.mark(name);
    try {
      return await fn();
    } finally {
      this.measure(name, tags);
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    const summary: Record<string, { count: number; avg: number; max: number; min: number }> = {};

    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = { count: 0, avg: 0, max: 0, min: Infinity };
      }

      const s = summary[metric.name];
      s.count++;
      s.avg = (s.avg * (s.count - 1) + metric.duration) / s.count;
      s.max = Math.max(s.max, metric.duration);
      s.min = Math.min(s.min, metric.duration);
    });

    return summary;
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify({
      metrics: this.metrics,
      summary: this.getSummary()
    }, null, 2);
  }
}

// Global performance monitor instance
export const perfMonitor = new PerformanceMonitor();

/**
 * React hook for measuring component render time
 */
export function useRenderTime(componentName: string) {
  React.useEffect(() => {
    perfMonitor.mark(`render:${componentName}`);
    return () => {
      perfMonitor.measure(`render:${componentName}`);
    };
  }, [componentName]);
}

/**
 * Measure function execution time
 */
export function measureTime<T>(
  name: string,
  fn: () => T,
  tags?: Record<string, string>
): T {
  perfMonitor.mark(name);
  try {
    return fn();
  } finally {
    perfMonitor.measure(name, tags);
  }
}

/**
 * Get performance report
 */
export function getPerformanceReport() {
  const summary = perfMonitor.getSummary();
  const report: string[] = ['=== Performance Report ==='];

  Object.entries(summary).forEach(([name, stats]) => {
    report.push(`${name}:`);
    report.push(`  Count: ${stats.count}`);
    report.push(`  Avg: ${stats.avg.toFixed(2)}ms`);
    report.push(`  Min: ${stats.min.toFixed(2)}ms`);
    report.push(`  Max: ${stats.max.toFixed(2)}ms`);
  });

  return report.join('\n');
}

/**
 * Log performance metrics to console
 */
export function logPerformanceMetrics(): void {
  console.log(getPerformanceReport());
}

/**
 * Send metrics to backend for analysis
 */
export async function sendMetricsToBackend(endpoint: string): Promise<void> {
  try {
    const metrics = perfMonitor.getMetrics();
    const summary = perfMonitor.getSummary();

    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metrics, summary })
    });
  } catch (error) {
    console.error('Failed to send metrics:', error);
  }
}

