import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import type { AgentNodeData } from '../components/AgentNode';

interface AgentStoreState {
  nodes: Node<AgentNodeData>[];
  edges: Edge[];
  setNodes: (nodes: Node<AgentNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateNodes: (updater: (nodes: Node<AgentNodeData>[]) => Node<AgentNodeData>[]) => void;
  updateEdges: (updater: (edges: Edge[]) => Edge[]) => void;
  updateNodeData: (id: string, updates: Partial<AgentNodeData>) => void;
}

export const useAgentStore = create<AgentStoreState>((set) => ({
  nodes: [],
  edges: [],
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  updateNodes: (updater) => set((state) => ({ nodes: updater(state.nodes) })),
  updateEdges: (updater) => set((state) => ({ edges: updater(state.edges) })),
  updateNodeData: (id, updates) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
    })),
}));

