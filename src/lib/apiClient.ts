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



