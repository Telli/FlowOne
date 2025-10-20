/**
 * Latency Indicator Component
 * Displays real-time latency metrics for voice pipeline
 */

interface LatencyIndicatorProps {
  latency: number; // in milliseconds
  component?: string; // stt, llm, tts, or total
}

export function LatencyIndicator({ latency, component = "total" }: LatencyIndicatorProps) {
  // Determine status based on latency thresholds
  const getStatus = () => {
    const thresholds = {
      stt: { good: 300, warning: 500 },
      llm: { good: 800, warning: 1200 },
      tts: { good: 600, warning: 1000 },
      total: { good: 1500, warning: 2500 }
    };
    
    const threshold = thresholds[component as keyof typeof thresholds] || thresholds.total;
    
    if (latency <= threshold.good) return "good";
    if (latency <= threshold.warning) return "warning";
    return "poor";
  };
  
  const status = getStatus();
  
  const statusColors = {
    good: "text-green-600 bg-green-100",
    warning: "text-yellow-600 bg-yellow-100",
    poor: "text-red-600 bg-red-100"
  };
  
  const statusLabels = {
    good: "Excellent",
    warning: "Fair",
    poor: "Slow"
  };
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${statusColors[status]}`}>
      <div className="flex items-center gap-1">
        <span className="font-semibold">{Math.round(latency)}ms</span>
        <span className="text-xs opacity-75">{statusLabels[status]}</span>
      </div>
      
      {/* Animated indicator dot */}
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${
          status === "good" ? "bg-green-600" :
          status === "warning" ? "bg-yellow-600" :
          "bg-red-600"
        }`} />
        {latency > 0 && (
          <div className={`absolute inset-0 w-2 h-2 rounded-full animate-ping ${
            status === "good" ? "bg-green-600" :
            status === "warning" ? "bg-yellow-600" :
            "bg-red-600"
          }`} />
        )}
      </div>
    </div>
  );
}


interface MetricsDashboardProps {
  metrics: {
    stt?: number;
    llm?: number;
    tts?: number;
    total?: number;
  };
}

export function MetricsDashboard({ metrics }: MetricsDashboardProps) {
  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Pipeline Performance</h3>
      
      <div className="grid grid-cols-2 gap-3">
        {metrics.stt !== undefined && (
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Speech-to-Text</div>
            <LatencyIndicator latency={metrics.stt} component="stt" />
          </div>
        )}
        
        {metrics.llm !== undefined && (
          <div className="space-y-1">
            <div className="text-xs text-gray-500">LLM Processing</div>
            <LatencyIndicator latency={metrics.llm} component="llm" />
          </div>
        )}
        
        {metrics.tts !== undefined && (
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Text-to-Speech</div>
            <LatencyIndicator latency={metrics.tts} component="tts" />
          </div>
        )}
        
        {metrics.total !== undefined && (
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Total Pipeline</div>
            <LatencyIndicator latency={metrics.total} component="total" />
          </div>
        )}
      </div>
      
      {/* Summary */}
      {metrics.total !== undefined && (
        <div className="pt-3 border-t">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">End-to-end latency:</span>
            <span className="font-semibold">{Math.round(metrics.total)}ms</span>
          </div>
        </div>
      )}
    </div>
  );
}


