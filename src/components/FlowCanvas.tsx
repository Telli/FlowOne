import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  NodeTypes,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AgentNode, AgentNodeData } from './AgentNode';

const nodeTypes: NodeTypes = {
  agentNode: AgentNode,
};

interface FlowCanvasProps {
  nodes: Node<AgentNodeData>[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: (connection: Connection) => void;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  activeEdgeId?: string | null;
}

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDrop,
  onDragOver,
  activeEdgeId,
}: FlowCanvasProps) {
  // Apply active styling to edges
  const styledEdges = edges.map(edge => ({
    ...edge,
    animated: edge.id === activeEdgeId || edge.animated,
    style: edge.id === activeEdgeId 
      ? { stroke: '#10B981', strokeWidth: 4, filter: 'drop-shadow(0 0 8px #10B981)' }
      : edge.style || { stroke: '#8B5CF6', strokeWidth: 2 },
  }));
  return (
    <div className="flex-1 h-full bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#8B5CF6', strokeWidth: 2 },
        }}
        fitView
        minZoom={0.2}
        maxZoom={2}
      >
        <Background color="#ddd" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as AgentNodeData;
            switch (data.status) {
              case 'ai-configured': return '#8B5CF6';
              case 'testing': return '#3B82F6';
              case 'error': return '#EF4444';
              default: return '#9CA3AF';
            }
          }}
          className="!bg-background !border !border-border"
        />
      </ReactFlow>
    </div>
  );
}
