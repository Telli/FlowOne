"""Integration tests for agents API."""
import pytest


class TestAgentsAPI:
    """Test suite for /agents endpoints."""

    def test_create_agent(self, test_client, mock_gemini_api):
        """Test POST /agents endpoint."""
        response = test_client.post(
            "/agents",
            json={
                "name": "Test Agent",
                "role": "test role",
                "goals": ["goal1", "goal2"],
                "tone": "friendly"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "agent" in data
        assert "trace_id" in data
        assert data["agent"]["name"] == "Test Agent"

    def test_get_agent(self, test_client, mock_gemini_api):
        """Test GET /agents/:id endpoint."""
        # First create an agent
        create_response = test_client.post(
            "/agents",
            json={
                "name": "Test Agent",
                "role": "test",
                "goals": [],
                "tone": "neutral"
            }
        )
        agent_id = create_response.json()["agent"]["id"]
        
        # Then fetch it
        response = test_client.get(f"/agents/{agent_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "agent" in data
        assert data["agent"]["id"] == agent_id

    def test_get_nonexistent_agent(self, test_client):
        """Test GET /agents/:id for non-existent agent."""
        response = test_client.get("/agents/nonexistent")
        
        assert response.status_code == 404

    def test_patch_agent(self, test_client, mock_gemini_api):
        """Test PATCH /agents/:id endpoint."""
        # Create agent first
        create_response = test_client.post(
            "/agents",
            json={
                "name": "Test Agent",
                "role": "test",
                "goals": [],
                "tone": "neutral"
            }
        )
        agent_id = create_response.json()["agent"]["id"]
        
        # Patch it
        response = test_client.patch(
            f"/agents/{agent_id}",
            json={
                "tone": "friendly",
                "goals": ["new_goal"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "agent" in data
        assert "trace_id" in data
        assert data["agent"]["persona"]["tone"] == "friendly"
        assert "new_goal" in data["agent"]["persona"]["goals"]

    def test_patch_nonexistent_agent(self, test_client):
        """Test PATCH /agents/:id for non-existent agent."""
        response = test_client.patch(
            "/agents/nonexistent",
            json={"tone": "friendly"}
        )
        
        assert response.status_code == 404

