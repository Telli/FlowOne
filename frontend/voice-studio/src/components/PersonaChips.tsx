import { SessionEvent, AgentPersona } from "@flowone/agent-schema";

export default function PersonaChips({ events }: { events: SessionEvent[] }) {
  // Find the latest persona from events (reverse chronological order)
  const latestPersona = events
    .slice()
    .reverse()
    .find(event => event.type === "persona.updated" && event.persona)?.persona ||
    events
      .slice()
      .reverse()
      .find(event => event.type === "session.started" && event.persona)?.persona;

  const getChips = (persona?: AgentPersona) => {
    if (!persona) return [];

    const chips = [];

    // Add tone
    if (persona.tone) {
      chips.push(persona.tone);
    }

    // Add up to 3 goals
    if (persona.goals && persona.goals.length > 0) {
      chips.push(...persona.goals.slice(0, 3));
    }

    // Add style indicators
    if (persona.style) {
      if (persona.style.acknowledge_first) {
        chips.push("Acknowledges First");
      }
      if (persona.style.max_words) {
        chips.push(`≤${persona.style.max_words} words`);
      }
    }

    return chips;
  };

  const chips = getChips(latestPersona);

  return (
    <div className="rounded-xl border p-3">
      <h3 className="text-sm font-medium mb-2">Persona</h3>
      <div className="flex flex-wrap gap-2">
        {chips.length > 0 ? (
          chips.map((chip, i) => (
            <span
              key={i}
              className="px-2 py-1 text-xs rounded-full border bg-blue-50 text-blue-700 border-blue-200"
            >
              {chip}
            </span>
          ))
        ) : (
          <span className="text-xs opacity-60 italic">
            No persona data yet
          </span>
        )}
      </div>

      {latestPersona?.role && (
        <div className="mt-2 text-xs text-muted-foreground">
          <div className="font-medium">Role:</div>
          <div className="truncate">{latestPersona.role}</div>
        </div>
      )}
    </div>
  );
}

