import { useEffect, useRef, useState } from "react";
import { AppShell } from "@flowone/ui";
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
    <AppShell
      appId="voice"
      headerActions={
        <div className="text-sm text-muted-foreground">
          Session: {sessionId || "—"}
        </div>
      }
    >
      <div className="p-6 max-w-6xl mx-auto h-full overflow-auto">
        {/* Legacy Notice */}
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-amber-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900">Legacy Application</h3>
              <p className="text-sm text-amber-800 mt-1">
                Voice Studio is now in legacy mode. Please use <strong>Main Studio</strong> (port 5173) for the latest features including persona management, avatar configuration, and visual flow design.
              </p>
              <a
                href="http://localhost:5173"
                className="inline-block mt-2 text-sm font-medium text-amber-900 underline hover:text-amber-700"
              >
                Open Main Studio →
              </a>
            </div>
          </div>
        </div>

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
    </AppShell>
  );
}

