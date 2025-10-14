import { useState, useCallback, useRef } from 'react';
import {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from '@xyflow/react';
import { TopNav } from './components/TopNav';
import { AgentPalette } from './components/AgentPalette';
import { FlowCanvas } from './components/FlowCanvas';
import { AIAssistant } from './components/AIAssistant';
import { AgentTestDialog } from './components/AgentTestDialog';
import { AgentNodeData } from './components/AgentNode';
import { processCommand, AgentConfig } from './lib/aiProcessor';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';

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

function FlowOneApp() {
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<AgentNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: 'Hello! I can help you create and configure AI agents. Try saying "Create a sales agent" or "Make me a math tutor".',
      timestamp: new Date(),
    }
  ]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [testingAgent, setTestingAgent] = useState<AgentNodeData | null>(null);
  const nodeIdCounter = useRef(1);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
      toast.success('Agents connected ✓');
    },
    [setEdges]
  );

  const createAgent = useCallback((config: AgentConfig, position: { x: number; y: number }) => {
    const id = `agent-${nodeIdCounter.current++}`;
    
    const newNode: Node<AgentNodeData> = {
      id,
      type: 'agentNode',
      position,
      data: {
        id,
        name: config.name,
        type: config.type,
        persona: config.persona,
        voice: config.voice,
        tools: config.tools,
        status: 'ai-configured',
        updatedAt: 'Just now',
        isFlashing: true,
        onModify: (agentId: string) => {
          setSelectedAgentId(agentId);
          if (!isAIAssistantOpen) {
            setIsAIAssistantOpen(true);
          }
          toast.info('Agent selected for modification');
        },
        onTest: (agentId: string) => {
          // Use functional form to get current nodes
          setNodes((nds) => {
            const node = nds.find(n => n.id === agentId);
            if (node) {
              setTestingAgent(node.data);
            }
            // Update node to testing state
            return nds.map((n) =>
              n.id === agentId
                ? { ...n, data: { ...n.data, status: 'testing' as const } }
                : n
            );
          });
        },
        onChat: (agentId: string, message: string) => {
          // Handle inline chat - this can trigger agent responses or modifications
          handleCommand(message);
          toast.info(`Chatting with ${nodes.find(n => n.id === agentId)?.data.name}`, {
            description: message
          });
        },
      },
    };

    setNodes((nds) => [...nds, newNode]);
    
    // Remove flash after animation
    setTimeout(() => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, isFlashing: false } } : n
        )
      );
    }, 600);

    return id;
  }, [nodes, setNodes, isAIAssistantOpen]);

  const modifyAgent = useCallback((agentId: string, modification: Partial<AgentConfig>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === agentId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...modification,
              updatedAt: 'Just now',
              isFlashing: true,
            },
          };
        }
        return node;
      })
    );

    // Remove flash after animation
    setTimeout(() => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === agentId ? { ...n, data: { ...n.data, isFlashing: false } } : n
        )
      );
    }, 600);
  }, [setNodes]);

  const handleCommand = useCallback((command: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: command,
      timestamp: new Date(),
    };
    setMessages((msgs) => [...msgs, userMessage]);

    // Process command
    const result = processCommand(command);

    // Add AI response
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: result.response,
      timestamp: new Date(),
      action: {
        type: result.action,
        details: result.details,
      },
    };
    setMessages((msgs) => [...msgs, aiMessage]);

    // Execute action
    if (result.action === 'create' && result.config) {
      const position = {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      };
      createAgent(result.config, position);
      toast.success(`${result.config.name} created! ✓`, {
        description: 'Agent added to canvas'
      });
    } else if (result.action === 'modify' && result.modification) {
      if (selectedAgentId) {
        modifyAgent(selectedAgentId, result.modification);
        toast.success('Agent updated! ⚡', {
          description: 'Changes applied'
        });
      } else if (nodes.length > 0) {
        // Modify the most recently created agent
        const lastNode = nodes[nodes.length - 1];
        modifyAgent(lastNode.id, result.modification);
        toast.success('Agent updated! ⚡', {
          description: 'Changes applied'
        });
      } else {
        toast.error('No agent selected', {
          description: 'Click 💬 on an agent card first'
        });
      }
    } else if (result.action === 'unknown') {
      toast.info('Not sure what to do', {
        description: 'Try a different command'
      });
    }
  }, [createAgent, modifyAgent, selectedAgentId, nodes]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const templateData = event.dataTransfer.getData('application/reactflow');
      if (!templateData) return;

      const template = JSON.parse(templateData);
      
      const position = {
        x: event.clientX - 140,
        y: event.clientY - 120,
      };

      // Map template to config
      const configMap: Record<string, AgentConfig> = {
        sales: {
          name: 'Sales Agent',
          persona: 'Professional, persuasive',
          voice: 'Clear voice (1.0x)',
          tools: ['CRM', 'Calendar', 'Email'],
          type: 'sales'
        },
        tutor: {
          name: 'Math Tutor',
          persona: 'Friendly, patient',
          voice: 'Warm voice (0.9x)',
          tools: ['Calculator', 'Graphing', 'Quiz Maker'],
          type: 'tutor'
        },
        support: {
          name: 'Support Agent',
          persona: 'Patient, empathetic',
          voice: 'Calm voice (0.95x)',
          tools: ['Email', 'Ticket System', 'Knowledge Base'],
          type: 'support'
        },
        coach: {
          name: 'Life Coach',
          persona: 'Motivating, inspiring',
          voice: 'Energetic voice (1.1x)',
          tools: ['Goal Tracker', 'Journal', 'Resources'],
          type: 'coach'
        }
      };

      const config = configMap[template.id];
      if (config) {
        createAgent(config, position);
        toast.success(`${config.name} added! ✓`);
      }
    },
    [createAgent]
  );

  return (
    <div className="h-screen flex flex-col">
      <TopNav 
        onAIAssistantToggle={() => setIsAIAssistantOpen(!isAIAssistantOpen)}
        isAIAssistantOpen={isAIAssistantOpen}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <AgentPalette onTalkToAI={() => setIsAIAssistantOpen(true)} />
        
        <div ref={reactFlowWrapper} className="flex-1">
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
          />
        </div>

        {isAIAssistantOpen && (
          <AIAssistant
            onCommand={handleCommand}
            messages={messages}
          />
        )}
      </div>
      
      {/* Test Dialog */}
      {testingAgent && (
        <AgentTestDialog
          open={!!testingAgent}
          onOpenChange={(open) => {
            if (!open) {
              setTestingAgent(null);
              // Reset agent status
              setNodes((nds) =>
                nds.map((n) =>
                  n.data.id === testingAgent.id
                    ? { ...n, data: { ...n.data, status: 'ai-configured' as const } }
                    : n
                )
              );
            }
          }}
          agent={testingAgent}
        />
      )}
      
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowOneApp />
    </ReactFlowProvider>
  );
}
