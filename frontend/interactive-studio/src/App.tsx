import { useState } from "react";
import { AgentCard } from "@flowone/agent-schema";

export default function App() {
  const [tab, setTab] = useState<"configure" | "test">("configure");
  const [agentCard, setAgentCard] = useState<AgentCard | null>(null);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">FlowOne Interactive Studio</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("configure")}
            className={`px-3 py-1 rounded ${
              tab === "configure" ? "bg-black text-white" : "border"
            }`}
          >
            Configure
          </button>
          <button
            onClick={() => setTab("test")}
            className={`px-3 py-1 rounded ${
              tab === "test" ? "bg-black text-white" : "border"
            }`}
          >
            Test
          </button>
        </div>
      </header>

      {tab === "configure" ? (
        <ConfigureTab onAgentCreated={setAgentCard} />
      ) : (
        <TestTab agentCard={agentCard} />
      )}
    </div>
  );
}

function ConfigureTab({ onAgentCreated }: { onAgentCreated: (card: AgentCard) => void }) {
  const [name, setName] = useState("Fitness Coach");
  const [role, setRole] = useState("You are a concise fitness coach that tailors workouts.");
  const [goals, setGoals] = useState("motivate,10k-steps,weekly-plan");
  const [tone, setTone] = useState("friendly");
  const [loading, setLoading] = useState(false);

  async function createAgent() {
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/agents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            role,
            goals: goals.split(",").map(s => s.trim()),
            tone,
          }),
        }
      );
      const json = await res.json();
      onAgentCreated(json.agent);
    } catch (error) {
      console.error("Failed to create agent:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-xl border p-4">
        <h2 className="font-medium mb-2">Agent Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              className="w-full border rounded p-2 mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Role</label>
            <textarea
              className="w-full border rounded p-2 mt-1"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Goals (comma-separated)</label>
            <input
              className="w-full border rounded p-2 mt-1"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Tone</label>
            <select
              className="w-full border rounded p-2 mt-1"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              <option value="friendly">Friendly</option>
              <option value="professional">Professional</option>
              <option value="expert">Expert</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>

          <button
            onClick={createAgent}
            disabled={loading}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate Agent"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="font-medium mb-2">Persona Preview</h2>
        <div className="h-80 overflow-auto">
          <pre className="text-xs">
            {agentCard ? JSON.stringify(agentCard, null, 2) : "—"}
          </pre>
        </div>
      </div>
    </div>
  );
}

function TestTab({ agentCard }: { agentCard: AgentCard | null }) {
  const [sessionId, setSessionId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function startSession() {
    if (!agentCard) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: agentCard.id }),
        }
      );
      const json = await res.json();
      setSessionId(json.sessionId);
    } catch (error) {
      console.error("Failed to start session:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border p-4">
      <h2 className="font-medium mb-2">Test Session</h2>

      <div className="flex gap-2 items-end mb-4">
        <div className="flex-1">
          <label className="text-sm">Agent ID</label>
          <input
            value={agentCard?.id || ""}
            readOnly
            className="w-full border rounded p-2 bg-gray-50"
            placeholder="Create an agent first"
          />
        </div>
        <button
          onClick={startSession}
          disabled={loading || !agentCard}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? "Starting…" : "Start Session"}
        </button>
      </div>

      <div className="text-sm opacity-70">
        Session: {sessionId || "—"}
      </div>

      {sessionId && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <div className="text-sm text-green-800">
            Session started! You can now test this agent in Voice Studio.
          </div>
        </div>
      )}
    </div>
  );
}

