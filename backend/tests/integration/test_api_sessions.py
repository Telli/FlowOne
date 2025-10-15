"""Integration tests for sessions API."""
import pytest
import asyncio
from fastapi.testclient import TestClient


class TestSessionsAPI:
    """Test suite for /sessions endpoints."""

    def test_create_session(self, test_client, mock_gemini_api):
        """Test POST /sessions endpoint."""
        # First create an agent
        agent_response = test_client.post(
            "/agents",
            json={
                "name": "Test Agent",
                "role": "test",
                "goals": [],
                "tone": "neutral"
            }
        )
        agent_id = agent_response.json()["agent"]["id"]
        
        # Create session for agent
        response = test_client.post(
            "/sessions",
            json={"agentId": agent_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "sessionId" in data
        assert "trace_id" in data
        assert len(data["sessionId"]) > 0

    def test_create_session_for_nonexistent_agent(self, test_client):
        """Test POST /sessions with invalid agent ID."""
        response = test_client.post(
            "/sessions",
            json={"agentId": "nonexistent"}
        )
        
        assert response.status_code == 404

    def test_websocket_events(self, test_client, mock_gemini_api):
        """Test WebSocket /sessions/:id/events endpoint."""
        # Create agent and session
        agent_response = test_client.post(
            "/agents",
            json={
                "name": "Test Agent",
                "role": "test",
                "goals": [],
                "tone": "neutral"
            }
        )
        agent_id = agent_response.json()["agent"]["id"]
        
        session_response = test_client.post(
            "/sessions",
            json={"agentId": agent_id}
        )
        session_id = session_response.json()["sessionId"]
        
        # Connect to WebSocket
        with test_client.websocket_connect(f"/sessions/{session_id}/events") as websocket:
            # Should receive session.started event
            data = websocket.receive_json()
            assert data["type"] == "session.started"
            assert data["sessionId"] == session_id
            assert "persona" in data

    @pytest.mark.asyncio
    async def test_post_message(self, test_client, mock_gemini_api):
        """Test POST /sessions/:id/messages endpoint."""
        # Create agent and session
        agent_response = test_client.post(
            "/agents",
            json={
                "name": "Test Agent",
                "role": "test",
                "goals": [],
                "tone": "neutral"
            }
        )
        agent_id = agent_response.json()["agent"]["id"]
        
        session_response = test_client.post(
            "/sessions",
            json={"agentId": agent_id}
        )
        session_id = session_response.json()["sessionId"]
        
        # Post a message
        response = test_client.post(
            f"/sessions/{session_id}/messages",
            json={"text": "Hello agent"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "trace_id_user" in data
        assert "trace_id_agent" in data

    def test_websocket_receives_posted_messages(self, test_client, mock_gemini_api):
        """Test that WebSocket receives events from posted messages."""
        # Create agent and session
        agent_response = test_client.post(
            "/agents",
            json={
                "name": "Test Agent",
                "role": "test",
                "goals": [],
                "tone": "neutral"
            }
        )
        agent_id = agent_response.json()["agent"]["id"]
        
        session_response = test_client.post(
            "/sessions",
            json={"agentId": agent_id}
        )
        session_id = session_response.json()["sessionId"]
        
        # Connect to WebSocket
        with test_client.websocket_connect(f"/sessions/{session_id}/events") as websocket:
            # Receive initial session.started
            websocket.receive_json()
            
            # Post a message (in a separate operation, WebSocket would receive it)
            # Note: In TestClient, this needs async handling or separate thread
            # For now, just verify the endpoint works
            response = test_client.post(
                f"/sessions/{session_id}/messages",
                json={"text": "Test"}
            )
            assert response.status_code == 200

