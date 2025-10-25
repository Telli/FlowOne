import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";
import { Mic, Send, MicOff, Bot, User as UserIcon, ExternalLink, Activity, MessageSquare, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AgentNodeData } from "./AgentNode";
import { createSession, openSessionEvents, sendSessionMessage } from "../lib/apiClient";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";

import { useToast } from "./ui/use-toast";
import { useSessionStore } from "../store/sessionStore";

import DailyIframe, { DailyCall } from "@daily-co/daily-js";
import logger from "../lib/logger";


interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

interface AgentTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentNodeData;
}

export function AgentTestDialog({ open, onOpenChange, agent }: AgentTestDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);

  const [traceId, setTraceId] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentAgentMsgIdRef = useRef<string | null>(null);

  const [avatarStreamUrl, setAvatarStreamUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [enableAvatar, setEnableAvatar] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const avatarVideoRef = useRef<HTMLVideoElement | null>(null);
  const [avatarMediaStream, setAvatarMediaStream] = useState<MediaStream | null>(null);
  const dailyCallRef = useRef<DailyCall | null>(null);

  useEffect(() => {
    const el = avatarVideoRef.current;
    if (!el) return;
    try {
      if (avatarMediaStream) {
        el.srcObject = avatarMediaStream;
        el.play?.().catch(() => {});
      } else {
        el.srcObject = null;
      }
    } catch {}
  }, [avatarMediaStream]);

  const [wsEvents, setWsEvents] = useState<{type: string; data: any; timestamp: Date}[]>([]);

  // Persona controls
  const [brevity, setBrevity] = useState(50);
  const [warmth, setWarmth] = useState(50);

  // Analytics
  const [analytics, setAnalytics] = useState({
    latency: 0,
    tokens: 0,
    turns: 0
  });

  const { toast } = useToast();
  const { sessionId, setSessionId, setWsConnected, addWsEvent, clearWsEvents } = useSessionStore();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Create session and open WS when dialog opens
  useEffect(() => {
    let closed = false;
    async function boot() {
      try {
        if (!open) return;
        // Reset avatar state
        setAvatarLoading(enableAvatar);
        setAvatarError(null);
        setAvatarStreamUrl(null);

        logger.info("Creating session", "Session", { enableAvatar });
        const sid = await createSession("agent_fitness_coach", enableAvatar);
        if (closed) return;
        setSessionId(sid);
        const ws = openSessionEvents(sid);
        wsRef.current = ws;
        ws.onopen = () => {
          setWsConnected(true);
        };
        ws.onclose = () => {
          setWsConnected(false);
        };

        ws.onmessage = (msg) => {
          try {
            const ev = JSON.parse(msg.data);

            // Add to WS event logs (local + global)
            const logItem = { type: ev.type, data: ev, timestamp: new Date() };
            setWsEvents((events) => [...events.slice(-19), logItem]);
            addWsEvent({ type: ev.type, data: ev, timestamp: Date.now() });

            // Track trace_id
            if (ev.trace_id || ev.traceId) {
              setTraceId(ev.trace_id || ev.traceId);
            }

            // Update analytics
            if (ev.latency_ms) {
              setAnalytics((a) => ({ ...a, latency: ev.latency_ms }));
            }
            if (ev.tokens) {
              setAnalytics((a) => ({ ...a, tokens: a.tokens + ev.tokens }));
            }

            // Map events to UI messages
            if (ev.type === "session.started") {
              setSessionStarted(true);
              setMessages((m) => [
                ...m,
                {
                  id: Date.now().toString(),
                  role: "agent",
                  content: `Session started. Persona tone: ${ev.persona?.tone ?? "neutral"}`,
                  timestamp: new Date(),
                },
              ]);
            } else if (ev.type === "agent.speech.delta") {
              const delta: string = ev.delta || ev.text || "";
              if (!delta) return;
              setMessages((msgs) => {
                // start a new agent message if none in progress
                if (!currentAgentMsgIdRef.current) {
                  const id = Date.now().toString();
                  currentAgentMsgIdRef.current = id;
                  return [
                    ...msgs,
                    { id, role: "agent", content: delta, timestamp: new Date() },
                  ];
                }
                // append to current agent message
                return msgs.map((msg) =>
                  msg.id === currentAgentMsgIdRef.current
                    ? { ...msg, content: (msg.content || "") + delta }
                    : msg
                );
              });
            } else if (ev.type === "agent.speech") {
              // finalize agent message with full text
              const finalText: string = ev.text || "";
              if (currentAgentMsgIdRef.current) {
                const id = currentAgentMsgIdRef.current;
                setMessages((msgs) =>
                  msgs.map((m) => (m.id === id ? { ...m, content: finalText } : m))
                );
                currentAgentMsgIdRef.current = null;
              } else {
                setMessages((m) => [
                  ...m,
                  { id: Date.now().toString(), role: "agent", content: finalText, timestamp: new Date() },
                ]);
              }
              setAnalytics((a) => ({ ...a, turns: a.turns + 1 }));
            } else if (ev.type === "agent.speech.done") {
              // clear any in-progress id
              currentAgentMsgIdRef.current = null;
            } else if (ev.type === "speech.final") {
              setMessages((m) => [
                ...m,
                { id: Date.now().toString(), role: "user", content: ev.text || "", timestamp: new Date() },
              ]);
            } else if (ev.type === "avatar.started") {
              const videoUrl = ev.videoStreamUrl || ev.video_stream_url || null;
              const roomUrl = ev.dailyRoomUrl || null;
              if (videoUrl) {
                logger.info("Stream started (Phoenix)", "Avatar", { videoUrl });
                setAvatarStreamUrl(videoUrl);
                setAvatarMediaStream(null);
                setAvatarLoading(false);
                setAvatarError(null);
              } else if (roomUrl) {
                logger.info("Joining Daily room (Pipecat)", "Avatar", { roomUrl });
                setAvatarStreamUrl(null);
                setAvatarError(null);
                void joinDailyRoomAndAttachVideo(roomUrl);
              }
            } else if (ev.type === "avatar.error") {
              const errorMsg = ev.error || "Unknown avatar error";
              logger.warn("Avatar error", "Avatar", { error: errorMsg });
              setAvatarLoading(false);
              setAvatarError(errorMsg);
              setAvatarStreamUrl(null);
            } else if (ev.type === "route.auto") {
              setMessages((m) => [
                ...m,
                {
                  id: Date.now().toString(),
                  role: "agent",
                  content: `[Routed to ${ev.target_agent}]`,
                  timestamp: new Date(),
                },
              ]);
            }
          } catch {}
        };
      } catch (e) {
        setAvatarLoading(false);
        const message = (e as any)?.message || 'Failed to start session';
        toast({ title: 'Session error', description: message, variant: 'destructive' });
      }
    }
    boot();
    return () => {
      closed = true;
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
      setWsConnected(false);
      clearWsEvents();
      setSessionId(null);
      try { dailyCallRef.current?.leave?.(); } catch {}
      try { dailyCallRef.current?.destroy?.(); } catch {}
      dailyCallRef.current = null;
      setAvatarMediaStream(null);

    };
  }, [open, enableAvatar]);

  const generateAgentResponse = (_userMessage: string): string => {
    return ""; // now driven by backend events
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage = input;
    setInput('');
    setIsTyping(true);

    try {
      // Add user message to UI immediately
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      };
      setMessages((msgs) => [...msgs, userMsg]);

      // Send to backend for LLM processing
      await sendSessionMessage(sessionId, userMessage);

    } catch (error) {
      logger.error('Failed to send message', 'Session', error);
      const message = (error as any)?.message || 'Failed to send message';
      toast({ title: 'Send failed', description: message, variant: 'destructive' });
      // Add error message
      setMessages((msgs) => [...msgs, {
        id: Date.now().toString(),
        role: 'agent',
        content: 'Sorry, I encountered an error processing your message.',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };
  const joinDailyRoomAndAttachVideo = async (roomUrl: string) => {
    try {
      setAvatarLoading(true);
      setAvatarError(null);
      setAvatarMediaStream(null);
      // Clean up any existing call
      if (dailyCallRef.current) {
        try { await dailyCallRef.current.leave(); } catch {}
        try { await dailyCallRef.current.destroy(); } catch {}
        dailyCallRef.current = null;
      }
      const call = DailyIframe.createCallObject({ subscribeToTracksAutomatically: true });
      dailyCallRef.current = call;

      call.on('track-started', (ev: any) => {
        try {
          const track = ev?.track;
          if (track && track.kind === 'video') {
            const ms = new MediaStream([track]);
            setAvatarMediaStream(ms);
            setAvatarLoading(false);
          }
        } catch {}
      });
      call.on('track-stopped', (ev: any) => {
        const track = ev?.track;
        if (track && track.kind === 'video') {
          setAvatarMediaStream(null);
        }
      });

      await call.join({ url: roomUrl, audioSource: false, videoSource: false });
    } catch (e: any) {
      logger.error('Daily join failed', 'Avatar', e);
      setAvatarError(e?.message || 'Failed to join Daily room');
      setAvatarLoading(false);
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoiceInput = () => {
    if (!isListening) {
      // Start listening with Web Speech API
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      } else {
        alert('Speech recognition not supported in this browser');
      }
    } else {
      setIsListening(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Testing: {agent.name}
          </DialogTitle>
          <DialogDescription>
            Voice interaction simulation with {agent.name}
          </DialogDescription>
        </DialogHeader>

        {/* Session Controls */}
        <Card className="p-3 bg-muted/50 border-purple-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable-avatar"
                checked={enableAvatar}
                onCheckedChange={(checked) => setEnableAvatar(checked as boolean)}
                disabled={sessionStarted}
              />
              <Label htmlFor="enable-avatar" className="text-sm font-medium">Enable Avatar</Label>
            </div>
            {sessionStarted && (
              <div className="flex gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {analytics.latency}ms
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {analytics.tokens}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {analytics.turns}
                </Badge>
              </div>
            )}
          </div>

          {/* Trace ID */}
          {traceId && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Trace:</span>
              <a
                href={`${import.meta.env.VITE_LANGFUSE_URL || 'https://cloud.langfuse.com'}/trace/${traceId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                {traceId.slice(0, 8)}...
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Persona Controls */}
          {sessionStarted && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Brevity: {brevity}%</Label>
                <Slider
                  value={[brevity]}
                  onValueChange={(val) => setBrevity(val[0])}

                  min={0}
                  max={100}
                  step={10}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Warmth: {warmth}%</Label>
                <Slider
                  value={[warmth]}
                  onValueChange={(val) => setWarmth(val[0])}
                  min={0}
                  max={100}
                  step={10}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </Card>

        {/* WS Event Ribbon */}
        {wsEvents.length > 0 && (
          <Card className="p-2 bg-muted/30 border-blue-500/20">
            <ScrollArea className="h-16">
              <div className="space-y-1">
                {wsEvents.slice(-5).reverse().map((event, idx) => (
                  <div key={idx} className="text-[10px] font-mono text-muted-foreground flex items-center gap-2">
                    <span className="text-blue-500">{event.type}</span>
                    <span className="text-xs">{event.timestamp.toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div ref={scrollRef} className="space-y-4">
            {/* Avatar Stream Display */}
            {avatarStreamUrl && (
              <div className="mb-4 flex justify-center">
                <div className="w-full max-w-md">
                  <div className="text-xs text-muted-foreground mb-2 text-center flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Avatar Live</span>
                  </div>
                  <video
                    src={avatarStreamUrl}
                    autoPlay
                    playsInline
                    loop
                    muted={false}
                    controls={false}
                    className="w-full h-auto aspect-video bg-black rounded-lg shadow-lg border-2 border-purple-500/30"
                    onError={(e) => {
                      logger.error("Video element error", "Avatar", e);
                      setAvatarError("Failed to load video stream");
                      setAvatarStreamUrl(null);
                    }}
                    onLoadedData={() => {
                      logger.info("Video loaded successfully", "Avatar");

                    }}
                    onPlay={() => {
                      logger.info("Video playback started", "Avatar");
                    }}
                  />
                </div>
              </div>
            )}
            {avatarMediaStream && !avatarStreamUrl && (
              <div className="mb-4 flex justify-center">
                <div className="w-full max-w-md">
                  <div className="text-xs text-muted-foreground mb-2 text-center flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Avatar Live</span>
                  </div>
                  <video
                    ref={avatarVideoRef}
                    autoPlay
                    playsInline
                    muted={false}
                    className="w-full h-auto aspect-video bg-black rounded-lg shadow-lg border-2 border-purple-500/30"
                    onError={(e) => {
                      logger.error("Daily video element error", "Avatar", e);
                      setAvatarError("Failed to play Daily stream");
                      setAvatarMediaStream(null);
                    }}
                  />
                </div>
              </div>
            )}
            {avatarLoading && !avatarError && !avatarStreamUrl && (


              <div className="mb-4 flex justify-center">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 max-w-md">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <div>
                      <div className="text-sm font-medium text-purple-900">Initializing Avatar...</div>
                      <div className="text-xs text-purple-600 mt-1">Connecting to Tavus Phoenix API</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {avatarError && enableAvatar && !avatarStreamUrl && (
              <div className="mb-4 flex justify-center">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md">
                  <div className="flex items-start gap-3">
                    <div className="text-amber-600 mt-0.5">⚠️</div>
                    <div>
                      <div className="font-medium text-amber-900 mb-1">Avatar Unavailable</div>
                      <div className="text-xs text-amber-700">{avatarError}</div>

                      <div className="text-xs text-amber-600 mt-2">Text chat is still available below.</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' ? 'bg-primary' : 'bg-purple-500'
                    }`}>
                      {message.role === 'user' ? (
                        <UserIcon className="w-4 h-4 text-primary-foreground" />
                      ) : (
                        <Bot className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <Card className={`p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      <div className="text-sm break-words whitespace-pre-wrap">{message.content}</div>
                      <div className={`text-xs mt-1 ${
                        message.role === 'user'
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </Card>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-2 items-center"
              >
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <Card className="p-3 bg-muted">
                  <div className="flex gap-1">
                    <motion.div
                      className="w-2 h-2 bg-muted-foreground rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-muted-foreground rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-muted-foreground rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                    />
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex gap-2 pt-4 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button
            size="icon"
            variant={isListening ? "default" : "outline"}
            onClick={toggleVoiceInput}
          >
            {isListening ? (
              <MicOff className="w-4 h-4 text-red-500" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
          <Button size="icon" onClick={handleSend}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
