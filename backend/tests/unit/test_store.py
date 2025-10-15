"""Unit tests for database store operations."""
import pytest
from sqlmodel import Session, select

from backend.memory.store import (
    Agent,
    SessionRow,
    Flow,
    FlowNode,
    FlowEdge,
    Template,
    Message,
    upsert_agent,
    get_agent,
    create_session,
    add_message,
    create_flow,
    get_flow,
    upsert_flow_graph,
    list_flow_nodes_edges,
    save_flow_version,
    list_templates,
    upsert_template,
    seed_default_templates,
)


class TestStore:
    """Test suite for database operations."""

    def test_agent_crud(self, test_db_engine):
        """Test agent create, read, update operations."""
        # Create agent
        agent_card = {
            "id": "test_agent",
            "name": "Test Agent",
            "persona": {"role": "test", "goals": ["goal1"], "tone": "neutral"},
            "tools": [],
            "memory": {"summaries": [], "vectors": []},
        }
        agent = Agent.from_card(agent_card)
        
        with patch("backend.memory.store._engine", test_db_engine):
            upsert_agent(agent)
            
            # Read agent
            fetched = get_agent("test_agent")
            assert fetched is not None
            assert fetched.id == "test_agent"
            assert fetched.name == "Test Agent"
            
            # Update agent
            agent_card["name"] = "Updated Agent"
            updated_agent = Agent.from_card(agent_card)
            upsert_agent(updated_agent)
            
            fetched = get_agent("test_agent")
            assert fetched.name == "Updated Agent"

    def test_session_creation(self, test_db_engine):
        """Test session creation."""
        with patch("backend.memory.store._engine", test_db_engine):
            session_id = create_session("test_agent")
            
            assert session_id is not None
            assert len(session_id) > 0
            
            # Verify session exists in DB
            with Session(test_db_engine) as s:
                stmt = select(SessionRow).where(SessionRow.id == session_id)
                row = s.exec(stmt).first()
                assert row is not None
                assert row.agent_id == "test_agent"

    def test_message_storage(self, test_db_engine):
        """Test message creation and storage."""
        with patch("backend.memory.store._engine", test_db_engine):
            session_id = create_session("test_agent")
            msg_id = add_message(session_id, "user", "Hello")
            
            assert msg_id is not None
            
            # Verify message in DB
            with Session(test_db_engine) as s:
                stmt = select(Message).where(Message.id == msg_id)
                msg = s.exec(stmt).first()
                assert msg is not None
                assert msg.text == "Hello"
                assert msg.role == "user"

    def test_flow_crud(self, test_db_engine):
        """Test flow CRUD operations."""
        with patch("backend.memory.store._engine", test_db_engine):
            # Create flow
            flow_id = create_flow("Test Flow")
            assert flow_id is not None
            
            # Get flow
            flow = get_flow(flow_id)
            assert flow is not None
            assert flow.name == "Test Flow"

    def test_flow_graph_persistence(self, test_db_engine):
        """Test flow graph nodes and edges persistence."""
        with patch("backend.memory.store._engine", test_db_engine):
            flow_id = create_flow("Test Flow")
            
            nodes = [
                {"id": "node1", "label": "Node 1", "position": {"x": 0, "y": 0}, "data": {}},
                {"id": "node2", "label": "Node 2", "position": {"x": 100, "y": 100}, "data": {}},
            ]
            edges = [
                {"id": "edge1", "source": "node1", "target": "node2", "data": {}},
            ]
            
            # Save graph
            result = upsert_flow_graph(flow_id, nodes, edges)
            assert result is True
            
            # Retrieve graph
            graph = list_flow_nodes_edges(flow_id)
            assert len(graph["nodes"]) == 2
            assert len(graph["edges"]) == 1
            assert graph["nodes"][0]["id"] == "node1"

    def test_flow_versioning(self, test_db_engine):
        """Test flow version management."""
        with patch("backend.memory.store._engine", test_db_engine):
            flow_id = create_flow("Test Flow")
            
            graph = {"nodes": [], "edges": []}
            version = save_flow_version(flow_id, graph)
            
            assert version == 1
            
            # Save another version
            version2 = save_flow_version(flow_id, graph)
            assert version2 == 2

    def test_template_management(self, test_db_engine):
        """Test template CRUD operations."""
        with patch("backend.memory.store._engine", test_db_engine):
            # Seed defaults
            seed_default_templates()
            
            templates = list_templates()
            assert len(templates) > 0
            
            # Create new template
            new_template = {
                "key": "custom",
                "name": "Custom Template",
                "description": "A custom template",
                "color": "#FF0000",
                "config": {"test": "value"}
            }
            
            template_id = upsert_template(new_template)
            assert template_id is not None
            
            # Verify template exists
            templates = list_templates()
            custom_template = next((t for t in templates if t["key"] == "custom"), None)
            assert custom_template is not None
            assert custom_template["name"] == "Custom Template"


# Import patch for mocking
from unittest.mock import patch

