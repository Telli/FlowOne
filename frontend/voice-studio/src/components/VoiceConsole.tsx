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
  const [enableAvatar, setEnableAvatar] = useState(true);
  const [avatarStreamUrl, setAvatarStreamUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const dailyRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Setup WebSocket listener for avatar events
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  async function start() {
    setJoining(true);
    setAvatarLoading(enableAvatar);
    try {
      // 1) Create session with enableAvatar flag
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, enableAvatar }),
        }
      );
      const json = await res.json();
      const sessionId = json.sessionId;
      onSessionCreated(sessionId);

      // Setup WebSocket listener for avatar events
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const wsUrl = apiUrl.replace(/^http/, "ws") + `/sessions/${sessionId}/events`;
      const ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "avatar.started") {
          setAvatarStreamUrl(data.videoStreamUrl || null);
          setAvatarLoading(false);
        } else if (data.type === "avatar.error") {
          console.warn("Avatar error:", data.error);
          setAvatarLoading(false);
        }
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setAvatarLoading(false);
      };
      
      wsRef.current = ws;

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
      setAvatarLoading(false);
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
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setRoom("");
    setIsMuted(true);
    setAvatarStreamUrl(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      if (dailyRef.current) {
        dailyRef.current.leave();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="rounded-xl border p-4">
      <h2 className="font-medium mb-2">Voice Console</h2>

      {!room ? (
        <div className="space-y-3">
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="avatar-toggle"
              checked={enableAvatar}
              onChange={(e) => setEnableAvatar(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="avatar-toggle" className="text-sm">
              Enable Avatar
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm">
            <div>Room: <code className="bg-gray-100 px-1 rounded">{room}</code></div>
            <div>Status: Connected</div>
            {enableAvatar && (
              <div>Avatar: {avatarLoading ? "Loading..." : avatarStreamUrl ? "Live" : "Unavailable"}</div>
            )}
          </div>

          {/* Avatar Video or Remote Video */}
          <div className="border rounded p-2 bg-gray-50">
            <div className="text-xs text-muted-foreground mb-1">
              {enableAvatar && avatarStreamUrl ? "Avatar Stream" : "Remote Video"}
            </div>
            {enableAvatar && avatarStreamUrl ? (
              <video
                src={avatarStreamUrl}
                autoPlay
                muted
                className="w-full h-64 bg-black rounded"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-24 bg-black rounded"
              />
            )}
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

