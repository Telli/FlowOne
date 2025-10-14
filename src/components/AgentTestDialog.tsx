import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";
import { Mic, Send, MicOff, Bot, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AgentNodeData } from "./AgentNode";

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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'agent',
      content: `Hello! I'm ${agent.name}. ${agent.persona}. How can I help you today?`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset messages when agent changes
  useEffect(() => {
    if (open) {
      setMessages([
        {
          id: '1',
          role: 'agent',
          content: `Hello! I'm ${agent.name}. ${agent.persona}. How can I help you today?`,
          timestamp: new Date(),
        }
      ]);
    }
  }, [open, agent.name, agent.persona]);

  const generateAgentResponse = (userMessage: string): string => {
    // Simple mock response generation based on agent type
    const responses: Record<string, string[]> = {
      sales: [
        "I can help you close that deal. Let me check the CRM for the latest information.",
        "That's a great opportunity! I'll schedule a follow-up call right away.",
        "Based on our sales data, I'd recommend focusing on their pain points around efficiency.",
      ],
      tutor: [
        "That's a great question! Let me break it down step by step for you.",
        "Would you like me to create a practice quiz to help you understand this better?",
        "Let me show you a different approach that might make this clearer.",
      ],
      support: [
        "I understand your concern. Let me look into this issue for you right away.",
        "I've found a solution in our knowledge base that should help.",
        "I'm escalating this to ensure you get the best support possible.",
      ],
      coach: [
        "That's an excellent goal! Let's create an action plan to achieve it.",
        "I believe in your ability to make this happen. What's your first step?",
        "Remember, progress is progress no matter how small. You're doing great!",
      ],
      custom: [
        "I'm processing your request. How else can I assist you?",
        "That's interesting. Let me analyze that for you.",
        "I'm here to help. What would you like to know more about?",
      ]
    };

    const agentResponses = responses[agent.type] || responses.custom;
    return agentResponses[Math.floor(Math.random() * agentResponses.length)];
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
      
      // Simulate agent typing
      setIsTyping(true);
      
      // Generate and add agent response after a delay
      setTimeout(() => {
        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          content: generateAgentResponse(input),
          timestamp: new Date(),
        };
        setMessages((msgs) => [...msgs, agentMessage]);
        setIsTyping(false);
      }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
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
