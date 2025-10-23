import { create } from 'zustand';

interface SessionEventLogItem {
  type: string;
  data: any;
  timestamp: number;
}

interface SessionState {
  sessionId: string | null;
  wsConnected: boolean;
  wsEvents: SessionEventLogItem[];
  setSessionId: (id: string | null) => void;
  setWsConnected: (connected: boolean) => void;
  addWsEvent: (evt: SessionEventLogItem) => void;
  clearWsEvents: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  wsConnected: false,
  wsEvents: [],
  setSessionId: (id) => set({ sessionId: id }),
  setWsConnected: (connected) => set({ wsConnected: connected }),
  addWsEvent: (evt) => set((s) => ({ wsEvents: [...s.wsEvents.slice(-99), evt] })),
  clearWsEvents: () => set({ wsEvents: [] }),
}));

