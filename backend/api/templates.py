from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

from backend.memory.store import list_templates, upsert_template, delete_template, seed_default_templates
from backend.observability.langfuse import trace_event


router = APIRouter()


class TemplateBody(BaseModel):
    id: Optional[str] = None
    key: str
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    config: Dict[str, Any] = {}


@router.on_event("startup")
def startup():
    seed_default_templates()


@router.get("")
def get_templates():
    templates = list_templates()
    trace_id = trace_event("template.list", count=len(templates))
    return {"templates": templates, "trace_id": trace_id}


@router.post("")
def create_template(body: TemplateBody):
    tid = upsert_template(body.dict())
    trace_id = trace_event("template.create", templateId=tid)
    return {"id": tid, "trace_id": trace_id}


@router.put("/{template_id}")
def update_template(template_id: str, body: TemplateBody):
    payload = body.dict()
    payload["id"] = template_id
    tid = upsert_template(payload)
    if not tid:
        raise HTTPException(404, "Template not found")
    trace_id = trace_event("template.update", templateId=tid)
    return {"id": tid, "trace_id": trace_id}


@router.delete("/{template_id}")
def remove_template(template_id: str):
    ok = delete_template(template_id)
    if not ok:
        raise HTTPException(404, "Template not found")
    trace_id = trace_event("template.delete", templateId=template_id)
    return {"ok": True, "trace_id": trace_id}


