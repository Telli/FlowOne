import { useState } from "react";
import { AgentCard } from "@flowone/agent-schema";
import { AppShell, Button, Input } from "@flowone/ui";

export default function App() {
  const [tab, setTab] = useState<"configure" | "test">("configure");
  const [agentCard, setAgentCard] = useState<AgentCard | null>(null);

  return (
    <AppShell
      appId="configurator"
      headerActions={
        <div className="flex gap-2">
          <Button
            onClick={() => setTab("configure")}
            variant={tab === "configure" ? "default" : "outline"}
            size="sm"
          >
            Configure
          </Button>
          <Button
            onClick={() => setTab("test")}
            variant={tab === "test" ? "default" : "outline"}
            size="sm"
          >
            Test
          </Button>
        </div>
      }
    >
      <div className="p-6 max-w-6xl mx-auto h-full overflow-auto">
        {tab === "configure" ? (
          <ConfigureTab agentCard={agentCard} onAgentCreated={setAgentCard} />
        ) : (
          <TestTab agentCard={agentCard} />
        )}
      </div>
    </AppShell>
  );
}

function ConfigureTab({ agentCard, onAgentCreated }: { agentCard: AgentCard | null; onAgentCreated: (card: AgentCard) => void }) {
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
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Role</label>
            <textarea
              className="w-full border border-input rounded-md p-2 mt-1 bg-background text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Goals (comma-separated)</label>
            <Input
              className="mt-1"
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

          <Button
            onClick={createAgent}
            disabled={loading}
          >
            {loading ? "Generating…" : "Generate Agent"}
          </Button>
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
          <label className="text-sm font-medium">Agent ID</label>
          <Input
            value={agentCard?.id || ""}
            readOnly
            className="mt-1 bg-muted"
            placeholder="Create an agent first"
          />
        </div>
        <Button
          onClick={startSession}
          disabled={loading || !agentCard}
        >
          {loading ? "Starting…" : "Start Session"}
        </Button>
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

