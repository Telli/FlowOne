import { useEffect, useRef } from "react";
import { SessionEvent } from "@flowone/agent-schema";

export default function TranscriptPanel({ events }: { events: SessionEvent[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const formatTime = (timestamp?: Date) => {
    if (!timestamp) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "speech.partial":
        return "text-blue-600";
      case "speech.final":
        return "text-green-600";
      case "agent.speech":
        return "text-purple-600";
      case "persona.updated":
        return "text-orange-600";
      case "session.started":
        return "text-gray-600";
      default:
        return "text-gray-500";
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "speech.partial":
        return "👤";
      case "speech.final":
        return "🎤";
      case "agent.speech":
        return "🤖";
      case "persona.updated":
        return "⚙️";
      case "session.started":
        return "🚀";
      default:
        return "📝";
    }
  };

  return (
    <div className="rounded-xl border p-4">
      <h2 className="font-medium mb-2">Live Transcript</h2>
      <div
        ref={scrollRef}
        className="h-72 overflow-auto space-y-2 bg-gray-50 p-2 rounded"
      >
        {events.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No events yet. Start a session to see transcript.
          </div>
        ) : (
          events.slice(-200).map((event, i) => (
            <div
              key={i}
              className="flex gap-2 p-2 rounded bg-white border"
            >
              <div className="flex-shrink-0 text-lg">
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <code className={`text-xs font-mono ${getEventColor(event.type)}`}>
                    {event.type}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {formatTime()}
                  </span>
                </div>
                {event.text && (
                  <div className="text-sm">{event.text}</div>
                )}
                {event.from && (
                  <div className="text-xs text-muted-foreground">
                    From: {event.from}
                  </div>
                )}
                {event.persona && (
                  <div className="text-xs text-muted-foreground">
                    Persona: {event.persona.tone} • {event.persona.goals?.slice(0, 2).join(", ")}
                  </div>
                )}
                {event.value_ms && (
                  <div className="text-xs text-muted-foreground">
                    Latency: {event.value_ms}ms
                  </div>
                )}
                {event.score && (
                  <div className="text-xs text-muted-foreground">
                    Memory hit: {event.doc_id} (score: {event.score.toFixed(2)})
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

