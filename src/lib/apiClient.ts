export interface AgentCard {
  id: string;
  name: string;
  persona: { role: string; goals: string[]; tone: string; style?: any };
  tools: any[];
  memory: { summaries: string[]; vectors: any[] };
}

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";
const API_WS = (import.meta as any).env?.VITE_API_WS || "ws://localhost:8000";

export async function createAgent(input: {
  name: string;
  role: string;
  goals: string[];
  tone: string;
}): Promise<AgentCard> {
  const res = await fetch(`${API_URL}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createAgent failed: ${res.status}`);
  const json = await res.json();
  return json.agent as AgentCard;
}

export async function createSession(agentId: string): Promise<string> {
  const res = await fetch(`${API_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId }),
  });
  if (!res.ok) throw new Error(`createSession failed: ${res.status}`);
  const json = await res.json();
  return json.sessionId as string;
}

export function openSessionEvents(sessionId: string): WebSocket {
  return new WebSocket(`${API_WS}/sessions/${sessionId}/events`);
}

export async function getVoiceToken(sessionId: string): Promise<{ room: string; token: string }>{
  const res = await fetch(`${API_URL}/voice/tokens?sessionId=${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(`getVoiceToken failed: ${res.status}`);
  return res.json();
}

// NLP Commands
export async function nlpCommands(text: string): Promise<{ action: string; config?: any; modification?: any; details?: string[]; trace_id?: string }>{
  const res = await fetch(`${API_URL}/nlp/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error(`nlpCommands failed: ${res.status}`);
  return res.json();
}

// Flows
export async function createFlow(name: string): Promise<{ flowId: string; trace_id?: string }> {
  const res = await fetch(`${API_URL}/flows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error(`createFlow failed: ${res.status}`);
  const json = await res.json();
  return { flowId: json.flowId as string, trace_id: json.trace_id };
}

export async function putFlow(flowId: string, graph: { nodes: any[]; edges: any[] }): Promise<string | undefined> {
  const res = await fetch(`${API_URL}/flows/${flowId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(graph)
  });
  if (!res.ok) throw new Error(`putFlow failed: ${res.status}`);
  const json = await res.json();
  return json.trace_id as string | undefined;
}

export async function getFlow(flowId: string): Promise<{ nodes: any[]; edges: any[]; trace_id?: string }>{
  const res = await fetch(`${API_URL}/flows/${flowId}`);
  if (!res.ok) throw new Error(`getFlow failed: ${res.status}`);
  return res.json();
}

export async function listFlows(): Promise<{ id: string; name: string; updated_at: string }[]>{
  const res = await fetch(`${API_URL}/flows`);
  if (!res.ok) throw new Error(`listFlows failed: ${res.status}`);
  const json = await res.json();
  return json.flows as any;
}

// Templates
export interface TemplateItem { id: string; key: string; name: string; description?: string; color?: string; config?: any }
export async function getTemplates(): Promise<TemplateItem[]>{
  const res = await fetch(`${API_URL}/templates`);
  if (!res.ok) throw new Error(`getTemplates failed: ${res.status}`);
  const json = await res.json();
  return json.templates as TemplateItem[];
}

// Agents
export async function patchAgent(agentId: string, patch: { role?: string; goals?: string[]; tone?: string; style?: any }): Promise<string | undefined> {
  const res = await fetch(`${API_URL}/agents/${agentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error(`patchAgent failed: ${res.status}`);
  const json = await res.json();
  return json.trace_id as string | undefined;
}



