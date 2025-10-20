"""
Multi-Agent Coordination API
Enables complex agent workflows and routing strategies.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

from services.multi_agent import create_multi_agent_coordinator, AgentRoutingStrategy
from observability.langfuse import trace_event
from settings import get_settings

router = APIRouter()

# Store active coordinators (in production, use Redis or similar)
_active_coordinators: Dict[str, Any] = {}


class StartMultiAgentRequest(BaseModel):
    flow_id: str
    strategy: Optional[str] = "conditional"


class MultiAgentMessageRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None


@router.post("/start")
async def start_multi_agent_session(req: StartMultiAgentRequest):
    """
    Start a multi-agent coordination session for a flow.
    
    Request:
    - flow_id: ID of the flow to coordinate
    - strategy: Routing strategy (conditional, sequential, round_robin, parallel)
    
    Returns:
    - session_id: Unique session identifier
    - agent_count: Number of agents in flow
    - strategy: Selected routing strategy
    """
    settings = get_settings()
    
    if not settings.ENABLE_MULTI_AGENT:
        raise HTTPException(
            status_code=403,
            detail="Multi-agent feature is disabled. Set ENABLE_MULTI_AGENT=true"
        )
    
    try:
        # Create coordinator
        coordinator = await create_multi_agent_coordinator(req.flow_id)
        
        # Set strategy if provided
        if req.strategy:
            try:
                coordinator.strategy = AgentRoutingStrategy(req.strategy)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid strategy: {req.strategy}"
                )
        
        # Generate session ID
        session_id = f"ma_{req.flow_id}_{len(_active_coordinators)}"
        
        # Store coordinator
        _active_coordinators[session_id] = coordinator
        
        trace_event(
            "multi_agent_session_started",
            session_id=session_id,
            flow_id=req.flow_id,
            strategy=coordinator.strategy.value
        )
        
        return {
            "status": "success",
            "session_id": session_id,
            "flow_id": req.flow_id,
            "agent_count": len(coordinator.agents),
            "strategy": coordinator.strategy.value,
            "agents": [
                {
                    "id": agent_id,
                    "label": agent["label"]
                }
                for agent_id, agent in coordinator.agents.items()
            ]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/message")
async def send_multi_agent_message(session_id: str, req: MultiAgentMessageRequest):
    """
    Send a message to multi-agent session.
    
    The coordinator will:
    1. Select appropriate agent based on strategy
    2. Process message with that agent
    3. Return response with routing information
    
    Request:
    - message: User message
    - context: Optional context for routing
    
    Returns:
    - agent_id: Selected agent
    - response: Agent response
    - routing: Next possible agents
    """
    coordinator = _active_coordinators.get(session_id)
    
    if not coordinator:
        raise HTTPException(
            status_code=404,
            detail=f"Multi-agent session {session_id} not found"
        )
    
    try:
        response = await coordinator.process_message(req.message, req.context)
        
        return {
            "status": "success",
            "session_id": session_id,
            **response
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/parallel")
async def send_parallel_message(session_id: str, req: MultiAgentMessageRequest):
    """
    Send message to all agents in parallel.
    Returns responses from all agents.
    
    Useful for:
    - Getting multiple perspectives
    - Consensus building
    - Parallel processing
    """
    coordinator = _active_coordinators.get(session_id)
    
    if not coordinator:
        raise HTTPException(
            status_code=404,
            detail=f"Multi-agent session {session_id} not found"
        )
    
    try:
        responses = await coordinator.process_parallel(req.message)
        
        return {
            "status": "success",
            "session_id": session_id,
            "message": req.message,
            "responses": responses,
            "agent_count": len(responses)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}/history")
async def get_conversation_history(session_id: str):
    """
    Get conversation history for multi-agent session.
    
    Returns full history including:
    - User messages
    - Agent responses
    - Routing decisions
    """
    coordinator = _active_coordinators.get(session_id)
    
    if not coordinator:
        raise HTTPException(
            status_code=404,
            detail=f"Multi-agent session {session_id} not found"
        )
    
    try:
        history = coordinator.get_conversation_history()
        
        return {
            "status": "success",
            "session_id": session_id,
            "history": history,
            "message_count": len(history)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}/metrics")
async def get_session_metrics(session_id: str):
    """
    Get metrics for multi-agent session.
    
    Returns:
    - Agent utilization
    - Routing statistics
    - Message counts
    - Strategy effectiveness
    """
    coordinator = _active_coordinators.get(session_id)
    
    if not coordinator:
        raise HTTPException(
            status_code=404,
            detail=f"Multi-agent session {session_id} not found"
        )
    
    try:
        metrics = coordinator.get_agent_metrics()
        
        return {
            "status": "success",
            "session_id": session_id,
            **metrics
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{session_id}")
async def stop_multi_agent_session(session_id: str):
    """
    Stop and clean up multi-agent session.
    """
    if session_id not in _active_coordinators:
        raise HTTPException(
            status_code=404,
            detail=f"Multi-agent session {session_id} not found"
        )
    
    try:
        coordinator = _active_coordinators.pop(session_id)
        
        trace_event(
            "multi_agent_session_stopped",
            session_id=session_id,
            message_count=len(coordinator.conversation_history)
        )
        
        return {
            "status": "success",
            "message": f"Session {session_id} stopped",
            "final_metrics": coordinator.get_agent_metrics()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions")
async def list_active_sessions():
    """
    List all active multi-agent sessions.
    """
    sessions = [
        {
            "session_id": session_id,
            "flow_id": coord.flow_id,
            "agent_count": len(coord.agents),
            "message_count": len(coord.conversation_history),
            "strategy": coord.strategy.value
        }
        for session_id, coord in _active_coordinators.items()
    ]
    
    return {
        "status": "success",
        "sessions": sessions,
        "count": len(sessions)
    }


