import { useState, useRef, useEffect } from "react";
import { Mic, Send, MessageCircle, MicOff, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { motion, AnimatePresence } from "motion/react";
import { AgentConfigForm } from "./AgentConfigForm";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  action?: {
    type: string;
    details: string[];
  };
}

interface AIAssistantProps {
  onCommand: (command: string) => void;
  messages: Message[];
}

export function AIAssistant({ onCommand, messages }: AIAssistantProps) {
  const [mode, setMode] = useState<'chat' | 'voice' | 'form'>('chat');
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        setTranscript(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (transcript) {
          onCommand(transcript);
          setTranscript('');
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [transcript, onCommand]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
      setTranscript('');
    }
  };

  const handleSend = () => {
    if (input.trim()) {
      onCommand(input);
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const quickActions = [
    { label: "Create", command: "Create sales agent" },
    { label: "Modify", command: "Make it more professional" },
    { label: "Connect", command: "Connect agents together" }
  ];

  const suggestions = [
    "Create sales agent",
    "Make it more professional",
    "Add CRM tools"
  ];

  return (
    <div className="w-[400px] border-l border-border bg-background flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            AI Configuration Assistant
          </h3>
        </div>
        
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === 'chat' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('chat')}
            className="flex-1 gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Chat
          </Button>
          <Button
            variant={mode === 'voice' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('voice')}
            className="flex-1 gap-2"
          >
            <Mic className="w-4 h-4" />
            Voice
          </Button>
          <Button
            variant={mode === 'form' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('form')}
            className="flex-1 gap-2"
          >
            <FileText className="w-4 h-4" />
            Form
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {mode === 'form' ? (
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Use this form for precise control over agent configuration. All fields are customizable.
            </div>
            <AgentConfigForm
              onSubmit={(config) => {
                // Convert form submission to a command
                const command = `Create ${config.name} with persona: ${config.persona}, voice: ${config.voice}, tools: ${config.tools.join(', ')}`;
                onCommand(command);
                setMode('chat'); // Switch back to chat to see the result
              }}
            />
          </div>
        </ScrollArea>
      ) : (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div ref={scrollRef} className="space-y-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <Card className={`max-w-[85%] p-3 ${
                      message.type === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <div className="text-sm">{message.content}</div>
                      {message.action && (
                        <div className="mt-2 space-y-1">
                          {message.action.details.map((detail, idx) => (
                            <div key={idx} className="text-xs opacity-90">• {detail}</div>
                          ))}
                        </div>
                      )}
                      <div className={`text-xs mt-1 ${
                        message.type === 'user' 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Listening indicator */}
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-2 py-4"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-3 h-3 bg-red-500 rounded-full"
                  />
                  <span className="text-sm text-muted-foreground">Listening...</span>
                </motion.div>
              )}

              {/* Transcript preview */}
              {transcript && (
                <Card className="p-3 bg-muted/50 border-dashed">
                  <div className="text-sm text-muted-foreground italic">{transcript}</div>
                </Card>
              )}
            </div>
          </ScrollArea>
        </>
      )}

      {/* Input Area - Hide when in form mode */}
      {mode !== 'form' && (
        <div className="p-4 border-t border-border space-y-3">
          {mode === 'chat' ? (
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type or speak..."
              className="flex-1"
            />
            <Button 
              onClick={toggleListening} 
              size="icon"
              variant={isListening ? "default" : "outline"}
            >
              <Mic className={`w-4 h-4 ${isListening ? 'text-red-500' : ''}`} />
            </Button>
            <Button onClick={handleSend} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={toggleListening}
            className={`w-full gap-2 ${isListening ? 'bg-red-500 hover:bg-red-600' : ''}`}
            size="lg"
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                Start Voice Input
              </>
            )}
          </Button>
        )}

        {/* Quick Actions */}
        <div>
          <div className="text-xs text-muted-foreground mb-2">Quick Actions:</div>
          <div className="flex gap-2 flex-wrap">
            {quickActions.map((action) => (
              <Badge
                key={action.label}
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                onClick={() => onCommand(action.command)}
              >
                {action.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Suggestions */}
        <div>
          <div className="text-xs text-muted-foreground mb-2">💡 Try saying:</div>
          <div className="space-y-1">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                onClick={() => mode === 'chat' ? setInput(suggestion) : onCommand(suggestion)}
              >
                "{suggestion}"
              </div>
            ))}
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
