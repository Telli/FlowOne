from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

from memory.store import (
    create_flow,
    get_flow,
    upsert_flow_graph,
    list_flow_nodes_edges,
    save_flow_version,
    list_flow_versions,
    get_flow_version,
    list_flows,
)
from observability.langfuse import trace_event


router = APIRouter()


class CreateFlowRequest(BaseModel):
    name: str


class FlowGraph(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


@router.post("")
def create_flow_ep(body: CreateFlowRequest):
    fid = create_flow(body.name)
    trace_id = trace_event("flow.create", flowId=fid, flowName=body.name)
    return {"flowId": fid, "trace_id": trace_id}


@router.get("/{flow_id}")
def get_flow_ep(flow_id: str):
    if not get_flow(flow_id):
        raise HTTPException(404, "Flow not found")
    graph = list_flow_nodes_edges(flow_id)
    trace_id = trace_event("flow.fetch", flowId=flow_id)
    graph["trace_id"] = trace_id
    return graph


@router.put("/{flow_id}")
def put_flow_graph(flow_id: str, body: FlowGraph):
    if not get_flow(flow_id):
        raise HTTPException(404, "Flow not found")
    ok = upsert_flow_graph(flow_id, body.nodes, body.edges)
    if not ok:
        raise HTTPException(500, "Failed to save flow graph")
    trace_id = trace_event("flow.save", flowId=flow_id)
    return {"ok": True, "trace_id": trace_id}


@router.post("/{flow_id}/version")
def post_flow_version(flow_id: str, body: FlowGraph):
    if not get_flow(flow_id):
        raise HTTPException(404, "Flow not found")
    version = save_flow_version(flow_id, {"nodes": body.nodes, "edges": body.edges})
    trace_id = trace_event("flow.version", flowId=flow_id, version=version)
    return {"version": version, "trace_id": trace_id}


@router.get("/{flow_id}/versions")
def get_versions(flow_id: str):
    if not get_flow(flow_id):
        raise HTTPException(404, "Flow not found")
    versions = list_flow_versions(flow_id)
    trace_id = trace_event("flow.versions", flowId=flow_id)
    return {"versions": versions, "trace_id": trace_id}


@router.get("/{flow_id}/versions/{version}")
def get_version(flow_id: str, version: int):
    data = get_flow_version(flow_id, version)
    if not data:
        raise HTTPException(404, "Version not found")
    trace_id = trace_event("flow.version.fetch", flowId=flow_id, version=version)
    data["trace_id"] = trace_id
    return data


@router.get("")
def list_flows_ep():
    items = list_flows()
    trace_id = trace_event("flow.list", count=len(items))
    return {"flows": items, "trace_id": trace_id}


