// Multi-agent conversation handler
// Manages conversations between connected agents

export interface ConversationMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  content: string;
  timestamp: Date;
}

export interface AgentConversationState {
  agentId: string;
  messages: ConversationMessage[];
  isActive: boolean;
}

export class MultiAgentConversationManager {
  private conversations: Map<string, ConversationMessage[]> = new Map();

  // Create a conversation key from two agent IDs
  private getConversationKey(agentId1: string, agentId2: string): string {
    return [agentId1, agentId2].sort().join('-');
  }

  // Send a message from one agent to another
  sendMessage(fromAgentId: string, toAgentId: string, content: string): ConversationMessage {
    const message: ConversationMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      fromAgentId,
      toAgentId,
      content,
      timestamp: new Date(),
    };

    const key = this.getConversationKey(fromAgentId, toAgentId);
    const messages = this.conversations.get(key) || [];
    messages.push(message);
    this.conversations.set(key, messages);

    return message;
  }

  // Get conversation history between two agents
  getConversation(agentId1: string, agentId2: string): ConversationMessage[] {
    const key = this.getConversationKey(agentId1, agentId2);
    return this.conversations.get(key) || [];
  }

  // Simulate agent response based on connections and context
  simulateAgentResponse(
    fromAgentId: string,
    toAgentId: string,
    message: string,
    toAgentType: string
  ): string {
    // In production, this would call an AI API to generate context-aware responses
    // For now, return a simple mock response based on agent type
    
    const responses: Record<string, string[]> = {
      sales: [
        "I can help convert that lead into a customer.",
        "Let me schedule a follow-up for that prospect.",
        "I'll update the CRM with this information."
      ],
      tutor: [
        "I can help explain that concept step by step.",
        "Would you like me to create a quiz to test understanding?",
        "Let me break down that problem into simpler parts."
      ],
      support: [
        "I'll look into that issue right away.",
        "Let me check our knowledge base for solutions.",
        "I can escalate this if needed."
      ],
      coach: [
        "That's a great goal! Let's create an action plan.",
        "I believe you can achieve this with the right steps.",
        "Let me help you track your progress."
      ],
      custom: [
        "I'll process that information.",
        "Understood, working on it.",
        "I can assist with that task."
      ]
    };

    const agentResponses = responses[toAgentType] || responses.custom;
    return agentResponses[Math.floor(Math.random() * agentResponses.length)];
  }

  // Clear all conversations
  clearAll(): void {
    this.conversations.clear();
  }

  // Get all active conversations for an agent
  getAgentConversations(agentId: string): ConversationMessage[] {
    const allMessages: ConversationMessage[] = [];
    
    this.conversations.forEach((messages) => {
      const relevantMessages = messages.filter(
        (msg) => msg.fromAgentId === agentId || msg.toAgentId === agentId
      );
      allMessages.push(...relevantMessages);
    });

    return allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

export const conversationManager = new MultiAgentConversationManager();
