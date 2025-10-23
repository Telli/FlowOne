import { create } from 'zustand';

interface UIState {
  isAIAssistantOpen: boolean;
  selectedAgentId: string | null;
  configuringNodeId: string | null;
  traceId: string;
  setIsAIAssistantOpen: (open: boolean) => void;
  setSelectedAgentId: (id: string | null) => void;
  setConfiguringNodeId: (id: string | null) => void;
  setTraceId: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAIAssistantOpen: false,
  selectedAgentId: null,
  configuringNodeId: null,
  traceId: '',
  setIsAIAssistantOpen: (open) => set({ isAIAssistantOpen: open }),
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  setConfiguringNodeId: (id) => set({ configuringNodeId: id }),
  setTraceId: (id) => set({ traceId: id }),
}));

