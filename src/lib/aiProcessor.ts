// Mock AI processor for natural language commands
// In production, this would call a real AI API

export interface AgentConfig {
  name: string;
  persona: string;
  voice: string;
  tools: string[];
  type: string;
}

export function processCommand(command: string): {
  action: 'create' | 'modify' | 'connect' | 'query' | 'unknown';
  config?: AgentConfig;
  modification?: Partial<AgentConfig>;
  response: string;
  details: string[];
} {
  const lowerCommand = command.toLowerCase();

  // Create agent
  if (lowerCommand.includes('create') || lowerCommand.includes('make me')) {
    if (lowerCommand.includes('sales')) {
      return {
        action: 'create',
        config: {
          name: 'Sales Agent',
          persona: 'Professional, persuasive',
          voice: 'Clear voice (1.0x)',
          tools: ['CRM', 'Calendar', 'Email'],
          type: 'sales'
        },
        response: '✓ Created Sales Agent',
        details: [
          'Professional, persuasive persona',
          'Clear voice style',
          'CRM, Calendar, and Email tools'
        ]
      };
    } else if (lowerCommand.includes('math') || lowerCommand.includes('tutor')) {
      const isFriendly = lowerCommand.includes('friendly');
      const isEncouraging = lowerCommand.includes('encouraging');
      const isWarm = lowerCommand.includes('warm');
      
      return {
        action: 'create',
        config: {
          name: 'Math Tutor',
          persona: isFriendly || isEncouraging 
            ? 'Friendly, patient, encouraging'
            : 'Patient, knowledgeable',
          voice: isWarm ? 'Warm voice (0.9x)' : 'Calm voice (0.95x)',
          tools: ['Calculator', 'Graphing', 'Quiz Maker'],
          type: 'tutor'
        },
        response: '✓ Created Math Tutor',
        details: [
          `${isFriendly || isEncouraging ? 'Friendly, encouraging' : 'Patient'} personality`,
          isWarm ? 'Warm voice' : 'Calm voice',
          'Calculator, Graphing, and Quiz tools'
        ]
      };
    } else if (lowerCommand.includes('support') || lowerCommand.includes('customer')) {
      return {
        action: 'create',
        config: {
          name: 'Support Agent',
          persona: 'Patient, empathetic, helpful',
          voice: 'Calm voice (0.95x)',
          tools: ['Email', 'Ticket System', 'Knowledge Base'],
          type: 'support'
        },
        response: '✓ Created Support Agent',
        details: [
          'Patient, empathetic persona',
          'Calm voice style',
          'Email and Ticketing tools'
        ]
      };
    } else if (lowerCommand.includes('coach') || lowerCommand.includes('life')) {
      return {
        action: 'create',
        config: {
          name: 'Life Coach',
          persona: 'Motivating, inspiring, supportive',
          voice: 'Energetic voice (1.1x)',
          tools: ['Goal Tracker', 'Journal', 'Resources'],
          type: 'coach'
        },
        response: '✓ Created Life Coach',
        details: [
          'Motivating, inspiring persona',
          'Energetic voice style',
          'Goal tracking and journaling tools'
        ]
      };
    }

    // Generic agent creation
    return {
      action: 'create',
      config: {
        name: 'Custom Agent',
        persona: 'Helpful, professional',
        voice: 'Clear voice (1.0x)',
        tools: ['Chat', 'Analysis'],
        type: 'custom'
      },
      response: '✓ Created Custom Agent',
      details: [
        'Professional persona',
        'Standard voice',
        'Basic tools included'
      ]
    };
  }

  // Modify agent
  if (lowerCommand.includes('make it') || lowerCommand.includes('add') || lowerCommand.includes('change')) {
    const modification: Partial<AgentConfig> = {};
    
    if (lowerCommand.includes('encouraging') || lowerCommand.includes('friendly')) {
      modification.persona = 'Friendly, patient, encouraging';
    }
    if (lowerCommand.includes('professional')) {
      modification.persona = 'Professional, polished';
    }
    if (lowerCommand.includes('faster') || lowerCommand.includes('quick')) {
      modification.voice = 'Fast voice (1.2x)';
    }
    if (lowerCommand.includes('slower') || lowerCommand.includes('calm')) {
      modification.voice = 'Slow voice (0.8x)';
    }
    if (lowerCommand.includes('quiz')) {
      modification.tools = ['Calculator', 'Graphing', 'Quiz Maker'];
    }
    if (lowerCommand.includes('crm')) {
      modification.tools = ['CRM', 'Calendar', 'Email', 'Analytics'];
    }

    return {
      action: 'modify',
      modification,
      response: '✓ Updated Agent',
      details: Object.entries(modification).map(([key, value]) => 
        `Updated ${key}: ${Array.isArray(value) ? value.join(', ') : value}`
      )
    };
  }

  // Connect agents
  if (lowerCommand.includes('connect')) {
    return {
      action: 'connect',
      response: '✓ Agents Connected',
      details: [
        'Connection created',
        'Flow configured'
      ]
    };
  }

  // Query
  if (lowerCommand.includes('what') || lowerCommand.includes('show') || lowerCommand.includes('list')) {
    return {
      action: 'query',
      response: 'Here are your agents',
      details: [
        'Use the canvas to view all agents',
        'Click on any agent to see details'
      ]
    };
  }

  return {
    action: 'unknown',
    response: "I'm not sure what you want me to do",
    details: [
      'Try: "Create sales agent"',
      'Or: "Make it more professional"',
      'Or: "Add CRM tools"'
    ]
  };
}
