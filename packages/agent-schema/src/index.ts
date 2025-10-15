export interface AgentStyle {
  max_words?: number;
  acknowledge_first?: boolean;
}

export interface AgentPersona {
  role: string;
  goals: string[];
  tone: "neutral" | "friendly" | "expert" | string;
  style?: AgentStyle;
}

export interface AgentRoutingPolicy {
  on: string; // e.g. "user_request"
  adapt: string[]; // e.g. ["concise", "encourage"]
}

export interface AgentCard {
  id: string;
  name: string;
  persona: AgentPersona;
  tools: any[];
  memory: { summaries: string[]; vectors: any[] };
  routing?: { policies: AgentRoutingPolicy[] };
}

export interface SessionEvent {
  type: string;
  sessionId?: string;
  persona?: AgentPersona;
  text?: string;
  from?: string;
  audioChunk?: string;
  doc_id?: string;
  score?: number;
  value_ms?: number;
}

