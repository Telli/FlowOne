"""Persona management API endpoints for Tavus integration."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from services.tavus_client import get_tavus_client
from observability.langfuse import trace_event

router = APIRouter()
tavus = get_tavus_client()


class CreatePersonaRequest(BaseModel):
    """Request model for creating a persona."""
    persona_name: str
    system_prompt: str
    context: Optional[str] = None
    default_replica_id: Optional[str] = None
    layers: Optional[Dict[str, Any]] = None


class PersonaResponse(BaseModel):
    """Response model for persona operations."""
    persona_id: Optional[str] = None
    persona_name: Optional[str] = None
    error: Optional[str] = None
    status: Optional[str] = None


@router.post("/personas", response_model=PersonaResponse)
async def create_persona(request: CreatePersonaRequest):
    """
    Create a new Tavus persona.
    
    Request body:
    {
        "persona_name": "Customer Support Agent",
        "system_prompt": "You are a helpful customer support agent...",
        "context": "Additional context about the persona",
        "default_replica_id": "r123456789",
        "layers": {
            "llm": {"model": "tavus-gpt-4o"},
            "tts": {"tts_engine": "cartesia"}
        }
    }
    """
    trace_event("personas.create", persona_name=request.persona_name)
    
    result = await tavus.create_persona(
        persona_name=request.persona_name,
        system_prompt=request.system_prompt,
        context=request.context,
        default_replica_id=request.default_replica_id,
        layers=request.layers
    )
    
    if result.get("error"):
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create persona: {result.get('error')}"
        )
    
    trace_event("personas.created", persona_id=result.get("persona_id"))
    
    return PersonaResponse(
        persona_id=result.get("persona_id"),
        persona_name=result.get("persona_name"),
        status=result.get("status"),
        error=None
    )


@router.get("/personas")
async def list_personas():
    """Get list of all Tavus personas."""
    trace_event("personas.list")
    
    result = await tavus.list_personas()
    
    if result.get("error"):
        return {
            "personas": [],
            "warning": result.get("error"),
            "note": "Tavus API unavailable; no personas available"
        }
    
    return {
        "personas": result.get("personas", []),
        "error": None
    }


@router.get("/personas/{persona_id}")
async def get_persona(persona_id: str):
    """Get a specific Tavus persona by ID."""
    trace_event("personas.get", persona_id=persona_id)
    
    result = await tavus.get_persona(persona_id)
    
    if result.get("error"):
        raise HTTPException(
            status_code=404,
            detail=f"Persona not found: {result.get('error')}"
        )
    
    return {
        "persona": result.get("persona"),
        "error": None
    }


@router.delete("/personas/{persona_id}")
async def delete_persona(persona_id: str):
    """Delete a Tavus persona."""
    trace_event("personas.delete", persona_id=persona_id)
    
    result = await tavus.delete_persona(persona_id)
    
    if result.get("error"):
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete persona: {result.get('error')}"
        )
    
    trace_event("personas.deleted", persona_id=persona_id)
    
    return {
        "success": result.get("success"),
        "error": None
    }

