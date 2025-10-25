import { useState, useRef, useEffect } from "react";
import type { KeyboardEvent } from 'react';

import { Mic, Send, MessageCircle, MicOff, FileText, Loader2, Lightbulb } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { AgentConfigForm } from "./AgentConfigForm";
import { nlpCommands } from "../lib/apiClient";
import { useToast } from "./ui/use-toast";
import { generateSuggestions, getSuggestionIcon, type Suggestion } from "../lib/suggestions";
import logger from "../lib/logger";

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
  sessionEvents?: import("../lib/types").SessionEvent[];
  onTraceId?: (traceId: string) => void;
  nodes?: any[];
  edges?: any[];
  selectedNodeId?: string | null;
}

export function AIAssistant({ onCommand, messages, sessionEvents = [], onTraceId, nodes = [], edges = [], selectedNodeId = null }: AIAssistantProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'chat' | 'voice' | 'form'>('chat');
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Generate suggestions based on canvas state
  useEffect(() => {
    const localSuggestions = generateSuggestions(nodes, edges, selectedNodeId);
    setSuggestions(localSuggestions);
  }, [nodes, edges, selectedNodeId]);

  useEffect(() => {
    // Initialize Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setVoiceError('Voice input not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      logger.info('Started listening', 'Voice');
      setIsListening(true);
      setVoiceError(null);
    };

    recognitionRef.current.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptText = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcriptText;
        } else {
          interim += transcriptText;
        }
      }

      setInterimTranscript(interim);
      if (final) {
        setTranscript(final);
      }
    };

    recognitionRef.current.onend = () => {
      logger.info('Stopped listening', 'Voice');
      setIsListening(false);

      // Process final transcript
      if (transcript) {
        setInput(transcript);
        setTranscript('');
        setInterimTranscript('');
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      logger.error('Voice recognition error', 'Voice', event.error);
      setIsListening(false);

      if (event.error === 'not-allowed') {
        setVoiceError('Microphone access denied. Please allow microphone access.');
      } else if (event.error === 'no-speech') {
        setVoiceError('No speech detected. Please try again.');
      } else {
        setVoiceError(`Voice error: ${event.error}`);
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [transcript]);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      toast({ title: 'Error', description: 'Voice input not available', variant: 'destructive' });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        logger.error('Voice start error', 'Voice', error);
        toast({ title: 'Error', description: 'Failed to start voice input', variant: 'destructive' });
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const text = input;
    setInput('');
    setIsProcessing(true);

    try {
      // Call backend NLP only
      const cmd = await nlpCommands(text);

      // Track trace ID
      if ((cmd as any).trace_id) {
        onTraceId?.((cmd as any).trace_id);
        logger.debug('NLP command processed', 'NLP', { trace_id: (cmd as any).trace_id });
      }

      // Execute action based on NLP response
      if (cmd.action === 'create' && cmd.config) {
        onCommand(`Creating agent: ${cmd.config.name || 'New Agent'}`);
      } else if (cmd.action === 'modify' && cmd.modification) {
        onCommand(`Modifying agent`);
      } else if (cmd.action === 'connect' && (cmd as any).connection) {
        onCommand(`Connecting agents`);
      } else {
        onCommand(text);
      }
    } catch (error) {
      logger.error('NLP processing error', 'AIAssistant', error);
      toast({ title: 'Error', description: 'Failed to process command', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const quickActions = [
    { label: "Create", command: "Create sales agent" },
    { label: "Modify", command: "Make it more professional" },
    { label: "Connect", command: "Connect agents together" }
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

      {/* Session Status - Show when session events are available */}
      {sessionEvents.length > 0 && (
        <div className="border-t border-border pt-4 space-y-3">
          {/* Persona Chips */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">Current Persona:</div>
            {(() => {
              const latestPersona = sessionEvents
                .slice()
                .reverse()
                .find(e => e.persona)?.persona;
              const chips = latestPersona ? [
                latestPersona.tone || "neutral",
                ...(latestPersona.goals || []).slice(0, 3)
              ] : [];
              return (
                <div className="flex gap-2 flex-wrap">
                  {chips.length > 0 ? chips.map((chip, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {chip}
                    </Badge>
                  )) : (
                    <span className="text-xs opacity-60">No persona data</span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Recent Transcript */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">Recent Activity:</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {sessionEvents.slice(-5).map((event, i) => (
                <div key={i} className="text-xs flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    event.type === "agent.speech" ? "bg-blue-500" :
                    event.type === "speech.final" ? "bg-green-500" :
                    event.type === "session.started" ? "bg-purple-500" : "bg-gray-400"
                  }`}></span>
                  <span>{event.type}</span>
                  {event.text && <span className="truncate opacity-70">"{event.text.slice(0, 30)}{event.text.length > 30 ? '...' : ''}"</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
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
              disabled={isProcessing}
            />
            <Button
              onClick={toggleVoice}
              size="icon"
              variant={isListening ? "default" : "outline"}
              disabled={isProcessing}
            >
              <Mic className={`w-4 h-4 ${isListening ? 'text-red-500' : ''}`} />
            </Button>
            <Button
              onClick={handleSend}
              size="icon"
              disabled={!input.trim() || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        ) : (
          <Button
            onClick={toggleVoice}
            className={`w-full gap-2 ${isListening ? 'bg-red-500 hover:bg-red-600' : ''}`}
            size="lg"
            disabled={isProcessing}
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
        {suggestions.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" />
              Suggestions:
            </div>
            <div className="space-y-1">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors flex items-center gap-2 p-1 rounded hover:bg-muted/50"
                  onClick={() => setInput(suggestion.text)}
                  title={`${suggestion.category} (priority: ${suggestion.priority})`}
                >
                  <span>{getSuggestionIcon(suggestion.category)}</span>
                  <span>{suggestion.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
