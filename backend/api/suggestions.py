"""
AI-powered suggestions API
Generates intelligent suggestions based on canvas state using Gemini Flash
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json

from services.gemini_flash import generate_ai_suggestions
from observability.langfuse import trace_event

router = APIRouter(prefix="/suggestions", tags=["suggestions"])


class SuggestionsRequest(BaseModel):
    """Request for AI-powered suggestions"""
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    selectedNodeId: Optional[str] = None


class Suggestion(BaseModel):
    """Individual suggestion"""
    id: str
    text: str
    category: str  # 'create' | 'modify' | 'connect' | 'test' | 'optimize'
    priority: int


class SuggestionsResponse(BaseModel):
    """Response with suggestions"""
    suggestions: List[Suggestion]
    trace_id: Optional[str] = None


@router.post("", response_model=SuggestionsResponse)
async def get_suggestions(body: SuggestionsRequest):
    """
    Generate AI-powered suggestions based on canvas state.
    
    Uses Gemini Flash to analyze the current workflow and provide
    intelligent recommendations for next steps.
    """
    try:
        # Generate AI suggestions
        ai_suggestions = await generate_ai_suggestions(
            nodes=body.nodes,
            edges=body.edges,
            selected_node_id=body.selectedNodeId
        )
        
        # Trace the suggestion generation
        trace_id = trace_event(
            "suggestions.generated",
            node_count=len(body.nodes),
            edge_count=len(body.edges),
            suggestion_count=len(ai_suggestions)
        )
        
        # Convert to Suggestion objects
        suggestions = [
            Suggestion(
                id=s.get("id", f"suggestion_{i}"),
                text=s.get("text", ""),
                category=s.get("category", "unknown"),
                priority=s.get("priority", 5)
            )
            for i, s in enumerate(ai_suggestions)
        ]
        
        return SuggestionsResponse(
            suggestions=suggestions,
            trace_id=trace_id
        )
        
    except Exception as e:
        trace_event(
            "suggestions.error",
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=str(e))

