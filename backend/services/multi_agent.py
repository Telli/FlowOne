"""
Multi-Agent Coordination with ParallelPipelines
Based on Pipecat best practices for complex agent workflows.

Perfect for FlowOne's visual flow designer!
"""

import asyncio
from typing import Dict, Any, List, Optional
from enum import Enum

from settings import get_settings
from observability.langfuse import trace_event, get_metrics_collector
from memory.store import get_flow, FlowNode, FlowEdge


class AgentRoutingStrategy(str, Enum):
    """Strategies for routing between multiple agents"""
    ROUND_ROBIN = "round_robin"  # Distribute evenly
    PRIORITY = "priority"  # Use priority order
    CONDITIONAL = "conditional"  # Based on context/intent
    PARALLEL = "parallel"  # All agents process simultaneously
    SEQUENTIAL = "sequential"  # One after another


class MultiAgentCoordinator:
    """
    Coordinate multiple agents in a single conversation.
    Implements various routing strategies for agent handoffs.
    
    Use Cases:
    - Agent escalation (support → specialist → manager)
    - Collaborative problem solving (researcher + analyst + writer)
    - Parallel processing (multiple specialists working together)
    - Sequential workflows (intake → processing → followup)
    """
    
    def __init__(self, flow_id: str):
        self.settings = get_settings()
        self.flow_id = flow_id
        self.flow = None
        self.agents = {}
        self.strategy = AgentRoutingStrategy.CONDITIONAL
        self.current_agent_id = None
        self.conversation_history = []
        self.metrics = get_metrics_collector()
        
    async def initialize(self):
        """Load flow and initialize agents"""
        # Load flow from database
        self.flow = self._load_flow()
        
        if not self.flow:
            raise ValueError(f"Flow {self.flow_id} not found")
        
        # Initialize agents from flow nodes
        await self._init_agents_from_flow()
        
        trace_event(
            "multi_agent_initialized",
            flow_id=self.flow_id,
            agent_count=len(self.agents),
            strategy=self.strategy.value
        )
    
    def _load_flow(self) -> Optional[Dict]:
        """Load flow from database"""
        try:
            flow = get_flow(self.flow_id)
            return flow
        except Exception as e:
            print(f"Error loading flow: {e}")
            return None
    
    async def _init_agents_from_flow(self):
        """Initialize agents from flow nodes"""
        if not self.flow:
            return
        
        nodes = self.flow.get("nodes", [])
        edges = self.flow.get("edges", [])
        
        for node in nodes:
            agent_id = node.get("agent_id")
            if agent_id:
                # Create agent configuration
                self.agents[agent_id] = {
                    "id": agent_id,
                    "label": node.get("label", agent_id),
                    "position": node.get("position", {}),
                    "config": node.get("data", {}),
                    "connections": self._get_agent_connections(agent_id, edges)
                }
        
        # Determine strategy from flow structure
        self.strategy = self._infer_strategy_from_flow(edges)
    
    def _get_agent_connections(self, agent_id: str, edges: List[Dict]) -> Dict[str, List[str]]:
        """Get incoming and outgoing connections for an agent"""
        incoming = []
        outgoing = []
        
        for edge in edges:
            if edge.get("target") == agent_id:
                incoming.append(edge.get("source"))
            if edge.get("source") == agent_id:
                outgoing.append(edge.get("target"))
        
        return {
            "incoming": incoming,
            "outgoing": outgoing
        }
    
    def _infer_strategy_from_flow(self, edges: List[Dict]) -> AgentRoutingStrategy:
        """Infer routing strategy from flow structure"""
        if not edges:
            return AgentRoutingStrategy.ROUND_ROBIN
        
        # Check if agents are in sequence (each has max 1 outgoing)
        max_outgoing = max([
            len(self._get_agent_connections(agent_id, edges)["outgoing"])
            for agent_id in self.agents.keys()
        ])
        
        if max_outgoing <= 1:
            return AgentRoutingStrategy.SEQUENTIAL
        
        # Default to conditional routing
        return AgentRoutingStrategy.CONDITIONAL
    
    async def process_message(
        self, 
        user_message: str, 
        context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Process user message through multi-agent system.
        Returns agent response and routing information.
        """
        trace_event(
            "multi_agent_message",
            flow_id=self.flow_id,
            message=user_message,
            current_agent=self.current_agent_id
        )
        
        # Add to conversation history
        self.conversation_history.append({
            "role": "user",
            "content": user_message,
            "context": context or {}
        })
        
        # Select agent based on strategy
        agent_id = await self._select_agent(user_message, context)
        
        if not agent_id or agent_id not in self.agents:
            return {
                "error": "No suitable agent found",
                "agent_id": None,
                "response": "I'm sorry, I couldn't route your request to an appropriate agent."
            }
        
        # Process with selected agent
        response = await self._process_with_agent(agent_id, user_message, context)
        
        # Update current agent
        self.current_agent_id = agent_id
        
        # Add to conversation history
        self.conversation_history.append({
            "role": "agent",
            "agent_id": agent_id,
            "content": response["response"]
        })
        
        return response
    
    async def _select_agent(
        self, 
        user_message: str, 
        context: Optional[Dict]
    ) -> Optional[str]:
        """
        Select appropriate agent based on routing strategy.
        """
        if self.strategy == AgentRoutingStrategy.ROUND_ROBIN:
            return self._select_round_robin()
        
        elif self.strategy == AgentRoutingStrategy.SEQUENTIAL:
            return self._select_sequential()
        
        elif self.strategy == AgentRoutingStrategy.CONDITIONAL:
            return await self._select_conditional(user_message, context)
        
        elif self.strategy == AgentRoutingStrategy.PRIORITY:
            return self._select_priority()
        
        else:
            # Default to first agent
            return list(self.agents.keys())[0] if self.agents else None
    
    def _select_round_robin(self) -> Optional[str]:
        """Round-robin agent selection"""
        if not self.agents:
            return None
        
        agent_ids = list(self.agents.keys())
        
        if not self.current_agent_id:
            return agent_ids[0]
        
        # Find next agent
        try:
            current_idx = agent_ids.index(self.current_agent_id)
            next_idx = (current_idx + 1) % len(agent_ids)
            return agent_ids[next_idx]
        except ValueError:
            return agent_ids[0]
    
    def _select_sequential(self) -> Optional[str]:
        """Sequential agent selection (follow flow connections)"""
        if not self.current_agent_id:
            # Start with agent that has no incoming connections
            for agent_id, agent in self.agents.items():
                if not agent["connections"]["incoming"]:
                    return agent_id
            # Fallback to first agent
            return list(self.agents.keys())[0] if self.agents else None
        
        # Move to next agent in sequence
        current_agent = self.agents.get(self.current_agent_id)
        if current_agent and current_agent["connections"]["outgoing"]:
            return current_agent["connections"]["outgoing"][0]
        
        # End of sequence, stay with current
        return self.current_agent_id
    
    async def _select_conditional(
        self, 
        user_message: str, 
        context: Optional[Dict]
    ) -> Optional[str]:
        """
        Conditional agent selection based on message intent and context.
        Uses simple keyword matching (can be enhanced with LLM).
        """
        if not self.agents:
            return None
        
        # Analyze message intent (simple keyword matching for now)
        message_lower = user_message.lower()
        
        # Score each agent based on relevance
        scores = {}
        for agent_id, agent in self.agents.items():
            score = 0
            agent_label = agent["label"].lower()
            agent_config = agent["config"]
            
            # Score based on agent label
            if agent_label in message_lower:
                score += 10
            
            # Score based on agent role/goals
            agent_role = agent_config.get("role", "").lower()
            if agent_role and any(word in message_lower for word in agent_role.split()):
                score += 5
            
            # Score based on connections (prefer current agent's next steps)
            if self.current_agent_id:
                current_agent = self.agents.get(self.current_agent_id)
                if current_agent and agent_id in current_agent["connections"]["outgoing"]:
                    score += 3
            
            scores[agent_id] = score
        
        # Select agent with highest score
        if scores:
            selected_agent_id = max(scores, key=scores.get)
            # Only switch if score > 0, otherwise stay with current
            if scores[selected_agent_id] > 0:
                return selected_agent_id
        
        # Fallback to current or first agent
        return self.current_agent_id or list(self.agents.keys())[0]
    
    def _select_priority(self) -> Optional[str]:
        """Priority-based agent selection (use first agent in list)"""
        return list(self.agents.keys())[0] if self.agents else None
    
    async def _process_with_agent(
        self, 
        agent_id: str, 
        user_message: str,
        context: Optional[Dict]
    ) -> Dict[str, Any]:
        """
        Process message with specific agent.
        This is a placeholder - in real implementation, would use actual agent pipeline.
        """
        agent = self.agents.get(agent_id)
        
        if not agent:
            return {
                "error": "Agent not found",
                "agent_id": agent_id,
                "response": "Agent not available"
            }
        
        # Simulate agent processing (replace with actual pipeline call)
        # In production, this would use the agent's LLM/pipeline
        response_text = f"[{agent['label']}] Response to: {user_message}"
        
        trace_event(
            "multi_agent_response",
            flow_id=self.flow_id,
            agent_id=agent_id,
            agent_label=agent["label"],
            message=user_message,
            response=response_text
        )
        
        return {
            "agent_id": agent_id,
            "agent_label": agent["label"],
            "response": response_text,
            "routing": {
                "strategy": self.strategy.value,
                "next_agents": agent["connections"]["outgoing"]
            }
        }
    
    async def process_parallel(self, user_message: str) -> List[Dict[str, Any]]:
        """
        Process message through all agents in parallel.
        Returns responses from all agents.
        """
        if not self.agents:
            return []
        
        trace_event(
            "multi_agent_parallel_start",
            flow_id=self.flow_id,
            agent_count=len(self.agents)
        )
        
        # Process with all agents concurrently
        tasks = [
            self._process_with_agent(agent_id, user_message, {})
            for agent_id in self.agents.keys()
        ]
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out errors
        valid_responses = [
            resp for resp in responses 
            if isinstance(resp, dict) and "error" not in resp
        ]
        
        trace_event(
            "multi_agent_parallel_complete",
            flow_id=self.flow_id,
            response_count=len(valid_responses)
        )
        
        return valid_responses
    
    def get_conversation_history(self) -> List[Dict[str, Any]]:
        """Get full conversation history"""
        return self.conversation_history
    
    def get_agent_metrics(self) -> Dict[str, Any]:
        """Get metrics for all agents"""
        return {
            "flow_id": self.flow_id,
            "agent_count": len(self.agents),
            "strategy": self.strategy.value,
            "current_agent": self.current_agent_id,
            "message_count": len(self.conversation_history),
            "agents": {
                agent_id: {
                    "label": agent["label"],
                    "connections": agent["connections"]
                }
                for agent_id, agent in self.agents.items()
            }
        }


async def create_multi_agent_coordinator(flow_id: str) -> MultiAgentCoordinator:
    """
    Factory function to create and initialize multi-agent coordinator.
    """
    coordinator = MultiAgentCoordinator(flow_id)
    await coordinator.initialize()
    return coordinator


