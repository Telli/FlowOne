import { useEffect, useRef, useState } from "react";
import VoiceConsole from "./components/VoiceConsole";
import TranscriptPanel from "./components/TranscriptPanel";
import PersonaChips from "./components/PersonaChips";
import { SessionEvent } from "@flowone/agent-schema";

export default function App() {
  const [sessionId, setSessionId] = useState<string>("");
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(
      `${import.meta.env.VITE_API_WS || "ws://localhost:8000"}/sessions/${sessionId}/events`
    );
    wsRef.current = ws;

    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as SessionEvent;
        setEvents((prev) => [...prev, event]);
      } catch (err) {
        console.error("Failed to parse WS message:", err);
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">FlowOne Voice Studio</h1>
        <div className="text-sm opacity-70">
          Session: {sessionId || "—"}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VoiceConsole onSessionCreated={setSessionId} />
        <TranscriptPanel events={events} />
      </div>

      <footer className="mt-4">
        <PersonaChips events={events} />
        <div className="mt-3">
          <button
            className="px-3 py-2 rounded border hover:bg-gray-50"
            onClick={() => {
              // Export current persona as JSON
              const latestPersona = events
                .slice()
                .reverse()
                .find(e => e.persona)?.persona;
              if (latestPersona) {
                const dataStr = JSON.stringify(latestPersona, null, 2);
                navigator.clipboard.writeText(dataStr);
                alert("Persona copied to clipboard!");
              } else {
                alert("No persona data to export");
              }
            }}
          >
            Export Agent Card
          </button>
        </div>
      </footer>
    </div>
  );
}

