import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";
import { Mic, Send, MicOff, Bot, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AgentNodeData } from "./AgentNode";
import { createSession, openSessionEvents } from "../lib/apiClient";

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
  const [sessionId, setSessionId] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
        const sid = await createSession("agent_fitness_coach");
        if (closed) return;
        setSessionId(sid);
        const ws = openSessionEvents(sid);
        wsRef.current = ws;
        ws.onmessage = (msg) => {
          try {
            const ev = JSON.parse(msg.data);
            // Map events to UI messages for now
            if (ev.type === "session.started") {
              setMessages((m) => [
                ...m,
                {
                  id: Date.now().toString(),
                  role: "agent",
                  content: `Session started. Persona tone: ${ev.persona?.tone ?? "neutral"}`,
                  timestamp: new Date(),
                },
              ]);
            } else if (ev.type === "agent.speech") {
              setMessages((m) => [
                ...m,
                { id: Date.now().toString(), role: "agent", content: ev.text || "", timestamp: new Date() },
              ]);
            } else if (ev.type === "speech.final") {
              setMessages((m) => [
                ...m,
                { id: Date.now().toString(), role: "user", content: ev.text || "", timestamp: new Date() },
              ]);
            }
          } catch {}
        };
      } catch (e) {
        // no-op for demo
      }
    }
    boot();
    return () => {
      closed = true;
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
    };
  }, [open]);

  const generateAgentResponse = (_userMessage: string): string => {
    return ""; // now driven by backend events
  };

  const handleSend = () => {
    if (input.trim()) {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: input,
        timestamp: new Date(),
      };
      setMessages((msgs) => [...msgs, userMessage]);
      setInput('');
      
      // Let backend drive agent replies via WS
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoiceInput = () => {
    setIsListening(!isListening);
    // In production, this would use Web Speech API
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

        {/* Agent Info Card */}
        <Card className="p-3 bg-muted/50 border-purple-500/20">
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Persona:</span>
              <span>{agent.persona}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Voice:</span>
              <span>{agent.voice}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Tools:</span>
              <span>{agent.tools.join(', ')}</span>
            </div>
          </div>
        </Card>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-4">
          <div ref={scrollRef} className="space-y-4">
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
                      <div className="text-sm">{message.content}</div>
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
