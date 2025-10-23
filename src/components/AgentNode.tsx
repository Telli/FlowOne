import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageCircle, Play, MoreVertical, Settings, Zap, Send, Mic, X, User, Bot, MicOff } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { getAgentIcon } from '../lib/agentIcons';

export interface AgentNodeData extends Record<string, unknown> {
  id: string;
  name: string;
  type: string;
  persona: string;
  voice: string;
  tools: string[];
  status: 'draft' | 'ai-configured' | 'testing' | 'error';
  updatedAt: string;
  isFlashing?: boolean;
  avatarThumbnailUrl?: string;
  onModify: (id: string) => void;
  onTest: (id: string) => void;
  onChat: (id: string, message: string) => void;
  onConfigure?: (id: string) => void;
}

const statusConfig = {
  draft: { color: 'border-gray-400', badge: 'Draft', badgeVariant: 'secondary' as const },
  'ai-configured': { color: 'border-purple-500', badge: 'AI-Configured', badgeVariant: 'default' as const },
  testing: { color: 'border-blue-500', badge: 'Testing', badgeVariant: 'default' as const },
  error: { color: 'border-red-500', badge: 'Error', badgeVariant: 'destructive' as const }
};

export const AgentNode = memo(({ data }: NodeProps<AgentNodeData>) => {
  const config = statusConfig[data.status];
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const IconComponent = getAgentIcon(data.type);

  // Initialize Web Speech API
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      console.log('[Voice] Started listening');
      setIsListening(true);
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
        setChatMessage(final);
      }
    };

    recognitionRef.current.onend = () => {
      console.log('[Voice] Stopped listening');
      setIsListening(false);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('[Voice] Error:', event.error);
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      data.onChat(data.id, chatMessage);
      setChatMessage('');
      setShowChat(false);
    }
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('[Voice] Start error:', error);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        boxShadow: data.isFlashing 
          ? ['0 0 0 0 rgba(139, 92, 246, 0.7)', '0 0 0 10px rgba(139, 92, 246, 0)', '0 0 0 0 rgba(139, 92, 246, 0)']
          : undefined
      }}
      transition={{ 
        duration: 0.5,
        boxShadow: { duration: 0.6, times: [0, 0.5, 1] }
      }}
      className="w-[280px] relative"
    >
      <Card className={`border-2 ${config.color} overflow-hidden`}>
        {/* Header */}
        <div className="bg-muted/50 p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="shrink-0 p-1.5 bg-primary/10 rounded-md">
              <IconComponent className="w-4 h-4 text-primary" />
            </div>
            <span className="font-medium truncate">{data.name}</span>
            {data.avatarThumbnailUrl && (
              <img
                src={data.avatarThumbnailUrl}
                alt="Avatar"
                className="w-6 h-6 rounded-full ml-auto shrink-0"
                title="Avatar"
              />
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setShowChat(!showChat)}
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            {data.onConfigure && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => data.onConfigure?.(data.id)}
                title="Configure agent"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <Badge variant={config.badgeVariant} className="text-xs">
              {config.badge}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-start gap-2 text-sm">
              <User className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{data.persona}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Mic className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{data.voice}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Zap className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{data.tools.join(', ')}</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground pt-1">
            Updated: {data.updatedAt}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-1"
              onClick={() => data.onModify(data.id)}
            >
              <MessageCircle className="w-3 h-3" />
              Modify
            </Button>
            <Button 
              size="sm" 
              className="flex-1 gap-1"
              onClick={() => data.onTest(data.id)}
            >
              <Play className="w-3 h-3" />
              Test
              <Zap className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Connection Ports */}
        <div className="flex justify-between items-center px-3 pb-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            Input
          </span>
          <span className="flex items-center gap-1">
            Output
            <div className="w-2 h-2 rounded-full bg-purple-500" />
          </span>
        </div>

        {/* Handles */}
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-purple-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-purple-500"
        />
      </Card>

      {/* Inline Chat Popup */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <Card className="border-2 border-primary shadow-lg">
              <div className="p-3 bg-primary/5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Quick Chat</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setShowChat(false)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <div className="p-3 space-y-2">
                <div className="text-xs text-muted-foreground">
                  Chat with {data.name} or modify its configuration
                </div>

                {/* Interim transcript display */}
                {interimTranscript && (
                  <div className="p-2 bg-muted/50 rounded text-xs italic text-muted-foreground">
                    {interimTranscript}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 h-9 text-sm"
                    disabled={isListening}
                  />
                  <Button
                    size="icon"
                    variant={isListening ? "destructive" : "outline"}
                    className="h-9 w-9 shrink-0"
                    onClick={handleVoiceInput}
                    title={isListening ? "Stop listening" : "Start voice input"}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

AgentNode.displayName = 'AgentNode';
