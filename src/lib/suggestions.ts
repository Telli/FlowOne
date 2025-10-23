import { Node, Edge } from '@xyflow/react';
import { AgentNodeData } from '@/components/AgentNode';

export interface Suggestion {
  id: string;
  text: string;
  category: 'create' | 'modify' | 'connect' | 'test' | 'optimize';
  priority: number;
  action?: () => void;
}

/**
 * Generate context-aware suggestions based on canvas state
 */
export function generateSuggestions(
  nodes: Node<AgentNodeData>[],
  edges: Edge[],
  selectedNodeId: string | null
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // No agents yet - suggest creating first agent
  if (nodes.length === 0) {
    suggestions.push({
      id: 'create-first',
      text: 'Create your first agent',
      category: 'create',
      priority: 10
    });
    return suggestions;
  }

  // Single agent - suggest adding more or testing
  if (nodes.length === 1) {
    suggestions.push({
      id: 'test-agent',
      text: 'Test your agent',
      category: 'test',
      priority: 9
    });
    suggestions.push({
      id: 'add-second',
      text: 'Add a second agent to create a workflow',
      category: 'create',
      priority: 8
    });
  }

  // Multiple agents but no connections - suggest connecting
  if (nodes.length >= 2 && edges.length === 0) {
    const firstAgent = nodes[0].data.name;
    const secondAgent = nodes[1].data.name;
    suggestions.push({
      id: 'connect-agents',
      text: `Connect ${firstAgent} to ${secondAgent}`,
      category: 'connect',
      priority: 9
    });
  }

  // Selected node - suggest modifications
  if (selectedNodeId) {
    const node = nodes.find(n => n.id === selectedNodeId);
    if (node) {
      suggestions.push({
        id: 'modify-persona',
        text: `Make ${node.data.name} more professional`,
        category: 'modify',
        priority: 7
      });

      if (!node.data.tools || node.data.tools.length === 0) {
        suggestions.push({
          id: 'add-tools',
          text: `Add tools to ${node.data.name}`,
          category: 'modify',
          priority: 8
        });
      }

      if (!node.data.avatarThumbnailUrl) {
        suggestions.push({
          id: 'add-avatar',
          text: `Add avatar to ${node.data.name}`,
          category: 'modify',
          priority: 6
        });
      }
    }
  }

  // Agent type-specific suggestions
  const agentTypes = nodes.map(n => n.data.type || 'custom');
  if (agentTypes.includes('sales') && !agentTypes.includes('support')) {
    suggestions.push({
      id: 'add-support',
      text: 'Add a support agent to handle customer questions',
      category: 'create',
      priority: 7
    });
  }

  if (agentTypes.includes('support') && !agentTypes.includes('sales')) {
    suggestions.push({
      id: 'add-sales',
      text: 'Add a sales agent to drive revenue',
      category: 'create',
      priority: 7
    });
  }

  // Workflow optimization suggestions
  if (nodes.length >= 3 && edges.length >= 2) {
    suggestions.push({
      id: 'optimize-flow',
      text: 'Optimize your workflow for better performance',
      category: 'optimize',
      priority: 5
    });
  }

  // Suggest testing if agents are configured but not tested
  const untested = nodes.filter(n => n.data.status === 'ai-configured');
  if (untested.length > 0) {
    suggestions.push({
      id: 'test-workflow',
      text: `Test ${untested.length} agent${untested.length > 1 ? 's' : ''} to verify configuration`,
      category: 'test',
      priority: 8
    });
  }

  // Sort by priority and return top 5
  return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

/**
 * Get suggestion text for display
 */
export function getSuggestionText(suggestion: Suggestion): string {
  return suggestion.text;
}

/**
 * Get suggestion icon based on category
 */
export function getSuggestionIcon(category: Suggestion['category']): string {
  const icons: Record<Suggestion['category'], string> = {
    create: '➕',
    modify: '✏️',
    connect: '🔗',
    test: '▶️',
    optimize: '⚡'
  };
  return icons[category];
}

