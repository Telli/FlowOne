import { cache, clearCachePattern } from './cache';
import type { AgentCard, TavusPersona, CreatePersonaRequest } from './types';

// Re-export AgentCard for backward compatibility
export type { AgentCard };

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";
const API_WS = (import.meta as any).env?.VITE_API_WS || "ws://localhost:8000";


// Centralized JSON fetch with structured error handling
export interface ApiError extends Error {
  status: number;
  code?: string;
  detail?: string;
  requestId?: string;
  url?: string;
}

function buildApiError(res: Response, body: any, url: string): ApiError {
  const message = (body && (body.error || body.detail)) || `HTTP ${res.status}`;
  const err = new Error(message) as ApiError;
  err.status = res.status;
  err.code = body?.code;
  err.detail = body?.detail ?? body?.error;
  err.requestId = body?.request_id || body?.requestId || res.headers.get('x-request-id') || undefined;
  err.url = url;
  return err;
}

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw buildApiError(res, body, url);
  }
  return body;
}

// Cache TTLs (in milliseconds)
const CACHE_TTL = {
  AGENTS: 5 * 60 * 1000,      // 5 minutes
  FLOWS: 5 * 60 * 1000,       // 5 minutes
  TEMPLATES: 30 * 60 * 1000,  // 30 minutes
  SUGGESTIONS: 2 * 60 * 1000  // 2 minutes
};

export async function createAgent(input: {
  name: string;
  role: string;
  goals: string[];
  tone: string;
}): Promise<AgentCard> {
  const data = await fetchJson(`${API_URL}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return data.agent as AgentCard;
}

export async function createSession(agentId: string, enableAvatar: boolean = false): Promise<string> {
  const data = await fetchJson(`${API_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, enableAvatar }),
  });
  return data.sessionId as string;
}

export function openSessionEvents(sessionId: string): WebSocket {
  return new WebSocket(`${API_WS}/sessions/${sessionId}/events`);
}

export async function sendSessionMessage(sessionId: string, text: string): Promise<{ ok: boolean; trace_id_user?: string; trace_id_agent?: string; error?: string }> {
  const data = await fetchJson(`${API_URL}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  return data;
}

export async function getVoiceToken(sessionId: string): Promise<{ room: string; token: string }>{
  const data = await fetchJson(`${API_URL}/voice/tokens?sessionId=${encodeURIComponent(sessionId)}`);
  return data;
}

// NLP Commands
export async function nlpCommands(text: string): Promise<{ action: string; config?: any; modification?: any; details?: string[]; trace_id?: string }>{
  const data = await fetchJson(`${API_URL}/nlp/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  return data;
}

// Flows
export async function createFlow(name: string): Promise<{ flowId: string; trace_id?: string }> {
  const json = await fetchJson(`${API_URL}/flows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  return { flowId: json.flowId as string, trace_id: json.trace_id };
}

export async function putFlow(flowId: string, graph: { nodes: any[]; edges: any[] }): Promise<string | undefined> {
  const json = await fetchJson(`${API_URL}/flows/${flowId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(graph)
  });

  // Invalidate cache for this flow and flows list
  cache.delete(`flow:${flowId}`);
  cache.delete('flows:list');

  return json.trace_id as string | undefined;
}

export async function getFlow(flowId: string): Promise<{ nodes: any[]; edges: any[]; trace_id?: string }>{
  const cacheKey = `flow:${flowId}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const data = await fetchJson(`${API_URL}/flows/${flowId}`);

  // Cache the result
  cache.set(cacheKey, data, CACHE_TTL.FLOWS);
  return data;
}

export async function listFlows(): Promise<{ id: string; name: string; updated_at: string }[]>{
  const cacheKey = 'flows:list';

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const json = await fetchJson(`${API_URL}/flows`);
  const flows = json.flows as any;

  // Cache the result
  cache.set(cacheKey, flows, CACHE_TTL.FLOWS);
  return flows;
}

// Templates
export interface TemplateItem { id: string; key: string; name: string; description?: string; color?: string; config?: any }
export async function getTemplates(): Promise<TemplateItem[]>{
  const cacheKey = 'templates:list';

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const json = await fetchJson(`${API_URL}/templates`);
  const templates = json.templates as TemplateItem[];

  // Cache the result (templates rarely change)
  cache.set(cacheKey, templates, CACHE_TTL.TEMPLATES);
  return templates;
}

// Agents
export async function patchAgent(
  agentId: string,
  patch: {
    role?: string;
    goals?: string[];
    tone?: string;
    style?: any;
    avatar?: {
      replicaId?: string;
      thumbnailUrl?: string;
      tavusPersonaId?: string;
    };
  }
): Promise<string | undefined> {
  const json = await fetchJson(`${API_URL}/agents/${agentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });

  // Invalidate cache for this agent
  cache.delete(`agent:${agentId}`);
  clearCachePattern(`flow:.*`);

  return json.trace_id as string | undefined;
}

/**
 * Clear all API caches
 */
export function clearAllCaches(): void {
  cache.clear();
}

// ============================================================================
// Tavus Persona Management
// ============================================================================

/**
 * Create a new Tavus persona
 */
export async function createPersona(request: CreatePersonaRequest): Promise<TavusPersona> {
  const data = await fetchJson(`${API_URL}/personas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  // Invalidate persona cache
  cache.delete('personas:list');

  return data as TavusPersona;
}

/**
 * Get a specific persona by ID
 */
export async function getPersona(personaId: string): Promise<TavusPersona> {
  const cacheKey = `persona:${personaId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const data = await fetchJson(`${API_URL}/personas/${personaId}`);
  cache.set(cacheKey, data, CACHE_TTL.AGENTS);

  return data as TavusPersona;
}

/**
 * List all personas
 */
export async function listPersonas(): Promise<TavusPersona[]> {
  const cacheKey = 'personas:list';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const data = await fetchJson(`${API_URL}/personas`);
  const personas = data.personas || [];
  cache.set(cacheKey, personas, CACHE_TTL.AGENTS);

  return personas as TavusPersona[];
}

/**
 * Delete a persona
 */
export async function deletePersona(personaId: string): Promise<void> {
  await fetchJson(`${API_URL}/personas/${personaId}`, {
    method: "DELETE",
  });

  // Invalidate caches
  cache.delete(`persona:${personaId}`);
  cache.delete('personas:list');
}



