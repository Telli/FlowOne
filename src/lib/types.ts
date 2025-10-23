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

export interface AvatarConfig {
  replicaId: string;
  thumbnailUrl?: string;
  tavusPersonaId?: string;
}

export interface AgentCard {
  id: string;
  name: string;
  persona: AgentPersona;
  tools: any[];
  memory: { summaries: string[]; vectors: any[] };
  routing?: { policies: AgentRoutingPolicy[] };
  avatar?: AvatarConfig;
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

// Tavus Persona Management Types
export interface TavusPersonaLayer {
  perception?: Record<string, any>;
  stt?: Record<string, any>;
  llm?: Record<string, any>;
  tts?: Record<string, any>;
}

export interface TavusPersona {
  persona_id: string;
  persona_name: string;
  system_prompt: string;
  context?: string;
  default_replica_id?: string;
  layers?: TavusPersonaLayer;
  created_at?: string;
}

export interface CreatePersonaRequest {
  persona_name: string;
  system_prompt: string;
  context?: string;
  default_replica_id?: string;
  layers?: TavusPersonaLayer;
}

