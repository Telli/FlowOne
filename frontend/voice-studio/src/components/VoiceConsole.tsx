import { useState, useRef, useEffect } from "react";
import Daily from "@daily-co/daily-js";

export default function VoiceConsole({
  onSessionCreated,
}: {
  onSessionCreated: (id: string) => void;
}) {
  const [agentId, setAgentId] = useState("agent_fitness_coach");
  const [joining, setJoining] = useState(false);
  const [room, setRoom] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const dailyRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  async function start() {
    setJoining(true);
    try {
      // 1) Create session
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId }),
        }
      );
      const json = await res.json();
      const sessionId = json.sessionId;
      onSessionCreated(sessionId);

      // 2) Get voice tokens
      const tokenRes = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:8000"
        }/voice/tokens?sessionId=${sessionId}`
      );
      const { room: roomName, token } = await tokenRes.json();
      setRoom(roomName);

      // 3) Join Daily room
      const callObject = Daily.createCallObject();
      dailyRef.current = callObject;

      // Set up event handlers
      callObject.on("track-started", (e: any) => {
        if (e.track.kind === "video" && videoRef.current) {
          videoRef.current.srcObject = new MediaStream([e.track]);
        }
      });

      callObject.on("track-stopped", () => {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      });

      // Join room
      await callObject.join({
        url: `https://flowone.daily.co/${roomName}`,
        token,
      });

      // Start muted
      callObject.setLocalAudio(false);
    } catch (error) {
      console.error("Failed to start session:", error);
    } finally {
      setJoining(false);
    }
  }

  const toggleMic = () => {
    if (dailyRef.current) {
      const newMuted = !isMuted;
      dailyRef.current.setLocalAudio(!newMuted);
      setIsMuted(newMuted);
    }
  };

  const stopSession = () => {
    if (dailyRef.current) {
      dailyRef.current.leave();
      dailyRef.current = null;
    }
    setRoom("");
    setIsMuted(true);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      if (dailyRef.current) {
        dailyRef.current.leave();
      }
    };
  }, []);

  return (
    <div className="rounded-xl border p-4">
      <h2 className="font-medium mb-2">Voice Console</h2>

      {!room ? (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-sm">Agent ID</label>
            <input
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>
          <button
            onClick={start}
            disabled={joining}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {joining ? "Starting…" : "Start Session"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm">
            <div>Room: <code className="bg-gray-100 px-1 rounded">{room}</code></div>
            <div>Status: Connected</div>
          </div>

          {/* Remote Video */}
          <div className="border rounded p-2 bg-gray-50">
            <div className="text-xs text-muted-foreground mb-1">Remote Video</div>
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full h-24 bg-black rounded"
            />
          </div>

          {/* Push-to-Talk */}
          <div className="flex gap-2">
            <button
              onClick={toggleMic}
              className={`flex-1 px-4 py-2 rounded font-medium ${
                isMuted
                  ? "bg-gray-200 text-gray-700"
                  : "bg-red-500 text-white"
              }`}
            >
              {isMuted ? "Push to Talk" : "Talking..."}
            </button>
            <button
              onClick={stopSession}
              className="px-4 py-2 rounded border border-red-500 text-red-500 hover:bg-red-50"
            >
              Stop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

