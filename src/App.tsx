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
import { AppShell } from '@flowone/ui';
import { Bot } from 'lucide-react';
import { Button } from './components/ui/button';
import { AgentPalette } from './components/AgentPalette';
import { FlowCanvas } from './components/FlowCanvas';
import { AIAssistant } from './components/AIAssistant';
import { AgentTestDialog } from './components/AgentTestDialog';
import { AgentNodeData } from './components/AgentNode';
import { processCommand, AgentConfig } from './lib/aiProcessor';
import { createFlow, getFlow, putFlow, patchAgent, listFlows } from './lib/apiClient';
import { toast } from 'sonner';
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
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AgentNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string>("");
  const [flows, setFlows] = useState<{id:string; name:string}[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>("");
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
  
  // Highlight edge when routing occurs
  const highlightEdge = useCallback((sourceId: string, targetId: string) => {
    const edge = edges.find(e => e.source === sourceId && e.target === targetId);
    if (edge) {
      setActiveEdgeId(edge.id);
      setTimeout(() => setActiveEdgeId(null), 2000); // Clear after 2s
    }
  }, [edges]);

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
    // send PATCH to backend for persona/tone/goals if mapped
    try {
      const personaPatch: any = {};
      if (modification.persona) personaPatch.role = modification.persona;
      if (modification.tools) personaPatch.goals = modification.tools;
      if (modification.voice) {
        const v = modification.voice.toLowerCase();
        if (v.includes('friendly') || v.includes('warm')) personaPatch.tone = 'friendly';
        else if (v.includes('energetic')) personaPatch.tone = 'expert';
        else if (v.includes('calm')) personaPatch.tone = 'neutral';
      }
      // parse style hints
      if (modification.voice) {
        const style: any = {};
        const m = modification.voice.match(/\((\d+\.?\d*)x\)/i);
        if (m) {
          const speed = parseFloat(m[1]);
          if (speed < 0.95) style.max_words = 80;
          if (speed > 1.05) style.max_words = 40;
        }
        if (Object.keys(style).length) personaPatch.style = style;
      }
      if (Object.keys(personaPatch).length > 0) {
        patchAgent(agentId, personaPatch).catch(()=>{});
      }
    } catch {}
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

  // Flow persistence demo (save/load current graph)
  const saveFlow = useCallback(async () => {
    const created = await createFlow(`Flow ${Date.now()}`);
    const traceSave = await putFlow(created.flowId, { nodes, edges });
    const t = traceSave || created.trace_id || '';
    if (t) setTraceId(t);
    toast.success('Flow saved', { description: created.flowId });
    // refresh flow list for selector
    try {
      const items = await listFlows();
      setFlows(items.map(i => ({ id: i.id, name: i.name })));
    } catch {}
  }, [nodes, edges]);

  const loadFlow = useCallback(async (flowId: string) => {
    const graph = await getFlow(flowId);
    // naive replace; assumes shapes align with ReactFlow
    setNodes(graph.nodes as any);
    setEdges(graph.edges as any);
    if (graph.trace_id) setTraceId(graph.trace_id);
    toast.success('Flow loaded', { description: flowId });
  }, [setNodes, setEdges]);

  return (
    <AppShell
      appId="studio"
      headerActions={
        <Button
          onClick={() => setIsAIAssistantOpen(!isAIAssistantOpen)}
          variant={isAIAssistantOpen ? "default" : "outline"}
          className="gap-2"
        >
          <Bot className="w-5 h-5" />
          AI Assistant
        </Button>
      }
    >
      <div className="h-full flex overflow-hidden">
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
            activeEdgeId={activeEdgeId}
          />
          <div className="p-3 flex gap-2 items-center">
            <button className="px-3 py-1 border rounded" onClick={saveFlow}>Save Flow</button>
            <select
              className="px-2 py-1 border rounded"
              value={selectedFlowId}
              onChange={(e) => setSelectedFlowId(e.target.value)}
              onFocus={async () => {
                try {
                  const items = await listFlows();
                  setFlows(items.map(i => ({ id: i.id, name: i.name })));
                } catch {}
              }}
            >
              <option value="">Select a saved flow…</option>
              {flows.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <button
              className="px-3 py-1 border rounded"
              disabled={!selectedFlowId}
              onClick={() => selectedFlowId && loadFlow(selectedFlowId)}
            >
              Load
            </button>
          </div>
        </div>

        {isAIAssistantOpen && (
          <AIAssistant
            onCommand={handleCommand}
            messages={messages}
            onTraceId={(t) => setTraceId(t)}
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
      {traceId && (
        <div className="fixed bottom-2 right-2 px-2 py-1 text-xs rounded bg-black text-white opacity-80">
          trace: {traceId}
        </div>
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowOneApp />
    </ReactFlowProvider>
  );
}
