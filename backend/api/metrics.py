"""
Metrics Dashboard API
Provides real-time metrics for monitoring production pipeline performance.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any

from observability.langfuse import get_metrics_collector, trace_event
from services.pipecat_production import ProductionPipelineComponents
from services.multi_agent import MultiAgentCoordinator

router = APIRouter()


@router.get("/pipeline")
async def get_pipeline_metrics(component: Optional[str] = None):
    """
    Get aggregated metrics for production pipeline components.
    
    Query params:
    - component: Optional filter for specific component (stt, llm, tts, pipeline)
    
    Returns aggregated metrics including:
    - Average, min, max latency
    - Percentiles (p50, p95, p99)
    - Request count
    - Token usage (for LLM)
    - Cost estimates
    """
    try:
        collector = get_metrics_collector()
        summary = collector.get_summary(component)
        
        trace_event(
            "metrics_retrieved",
            component=component,
            summary=summary
        )
        
        return {
            "status": "success",
            "metrics": summary
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard")
async def get_dashboard_metrics():
    """
    Get comprehensive dashboard metrics for all components.
    
    Returns:
    - STT metrics (latency, accuracy)
    - LLM metrics (latency, tokens, cost)
    - TTS metrics (latency, quality)
    - Pipeline metrics (end-to-end latency)
    - Multi-agent metrics (routing, handoffs)
    """
    try:
        collector = get_metrics_collector()
        
        dashboard = {
            "stt": collector.get_summary("stt"),
            "llm": collector.get_summary("llm"),
            "tts": collector.get_summary("tts"),
            "pipeline": collector.get_summary("pipeline"),
            "timestamp": trace_event(
                "dashboard_metrics_retrieved",
                components=["stt", "llm", "tts", "pipeline"]
            )
        }
        
        return {
            "status": "success",
            "dashboard": dashboard
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/realtime")
async def get_realtime_metrics():
    """
    Get real-time streaming metrics (last 100 data points).
    Useful for live monitoring dashboards.
    """
    try:
        collector = get_metrics_collector()
        
        # Get recent metrics for each component
        realtime = {}
        for component in ["stt", "llm", "tts", "pipeline"]:
            metrics = collector.metrics.get(component, [])
            # Get last 100 data points
            recent = metrics[-100:] if len(metrics) > 100 else metrics
            realtime[component] = {
                "recent_data": recent,
                "count": len(recent)
            }
        
        return {
            "status": "success",
            "realtime": realtime
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset")
async def reset_metrics():
    """
    Reset all collected metrics.
    Useful for starting fresh monitoring sessions.
    """
    try:
        collector = get_metrics_collector()
        collector.reset()
        
        trace_event("metrics_reset")
        
        return {
            "status": "success",
            "message": "All metrics have been reset"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/costs")
async def get_cost_metrics():
    """
    Get cost breakdown for LLM usage.
    
    Returns:
    - Total tokens (input/output)
    - Cost per component
    - Cost trends over time
    """
    try:
        collector = get_metrics_collector()
        llm_metrics = collector.metrics.get("llm", [])
        
        # Calculate total costs
        total_cost = 0.0
        total_input_tokens = 0
        total_output_tokens = 0
        
        for metric in llm_metrics:
            metadata = metric.get("metadata", {})
            total_cost += metadata.get("cost_usd", 0.0)
            total_input_tokens += metadata.get("input_tokens", 0)
            total_output_tokens += metadata.get("output_tokens", 0)
        
        # Calculate cost trends (last 10 requests)
        recent_costs = [
            {
                "timestamp": m["timestamp"],
                "cost_usd": m.get("metadata", {}).get("cost_usd", 0.0),
                "tokens": m.get("metadata", {}).get("input_tokens", 0) + 
                         m.get("metadata", {}).get("output_tokens", 0)
            }
            for m in llm_metrics[-10:]
        ]
        
        return {
            "status": "success",
            "costs": {
                "total_cost_usd": round(total_cost, 4),
                "total_input_tokens": total_input_tokens,
                "total_output_tokens": total_output_tokens,
                "total_tokens": total_input_tokens + total_output_tokens,
                "avg_cost_per_request": round(total_cost / len(llm_metrics), 4) if llm_metrics else 0,
                "request_count": len(llm_metrics),
                "recent_costs": recent_costs
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def get_health_metrics():
    """
    Get health metrics for production pipeline.
    
    Returns:
    - Component availability
    - Error rates
    - Latency thresholds
    - Overall system health
    """
    try:
        collector = get_metrics_collector()
        
        # Define health thresholds
        thresholds = {
            "stt": {"max_latency_ms": 500},
            "llm": {"max_latency_ms": 1000},
            "tts": {"max_latency_ms": 800},
            "pipeline": {"max_latency_ms": 2000}
        }
        
        health = {}
        overall_healthy = True
        
        for component, threshold in thresholds.items():
            summary = collector.get_summary(component)
            
            if summary["count"] == 0:
                status = "unknown"
                overall_healthy = False
            elif summary["avg_latency_ms"] > threshold["max_latency_ms"]:
                status = "degraded"
                overall_healthy = False
            else:
                status = "healthy"
            
            health[component] = {
                "status": status,
                "avg_latency_ms": summary["avg_latency_ms"],
                "threshold_ms": threshold["max_latency_ms"],
                "request_count": summary["count"]
            }
        
        return {
            "status": "success",
            "health": {
                "overall": "healthy" if overall_healthy else "degraded",
                "components": health
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/multi-agent/{flow_id}")
async def get_multi_agent_metrics(flow_id: str):
    """
    Get metrics for multi-agent coordination.
    
    Returns:
    - Agent routing statistics
    - Handoff counts
    - Agent utilization
    - Conversation flow metrics
    """
    try:
        # This would fetch metrics for a specific multi-agent session
        # Placeholder implementation
        
        trace_event(
            "multi_agent_metrics_retrieved",
            flow_id=flow_id
        )
        
        return {
            "status": "success",
            "flow_id": flow_id,
            "metrics": {
                "agent_count": 0,
                "handoff_count": 0,
                "message_count": 0,
                "routing_strategy": "conditional"
            },
            "message": "Multi-agent metrics endpoint (implementation pending)"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


