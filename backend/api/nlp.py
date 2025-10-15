from fastapi import APIRouter
from pydantic import BaseModel
from typing import Literal, List, Dict, Any
from backend.services.gemini_flash import parse_nlp_command
from backend.observability.langfuse import trace_event


router = APIRouter()


class NLPRequest(BaseModel):
    text: str


class NLPResponse(BaseModel):
    action: Literal['create', 'modify', 'connect', 'query', 'unknown']
    config: Dict[str, Any] | None = None
    modification: Dict[str, Any] | None = None
    details: List[str] = []


@router.post("", response_model=NLPResponse)
def nlp_commands(body: NLPRequest):
    cmd = parse_nlp_command(body.text)
    trace_id = trace_event("nlp.command", text=body.text, action=cmd.get("action"))
    out = NLPResponse(**cmd)
    # not part of schema; attach trace for clients via model's dict
    data = out.dict()
    data["trace_id"] = trace_id
    return data


