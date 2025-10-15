"""Integration tests for NLP API."""
import pytest


class TestNLPAPI:
    """Test suite for /nlp/commands endpoint."""

    def test_nlp_commands(self, test_client, mock_gemini_api):
        """Test POST /nlp/commands endpoint."""
        response = test_client.post(
            "/nlp/commands",
            json={"text": "Create a sales agent"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "action" in data
        assert "trace_id" in data
        assert data["action"] in ["create", "modify", "connect", "query", "unknown"]

    def test_nlp_create_command(self, test_client, mock_gemini_api):
        """Test NLP parsing for create command."""
        response = test_client.post(
            "/nlp/commands",
            json={"text": "Create a new marketing agent"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "action" in data
        # Could be "create" from mock or fallback heuristic
        assert data["action"] in ["create", "unknown"]

    def test_nlp_modify_command(self, test_client, mock_gemini_api):
        """Test NLP parsing for modify command."""
        response = test_client.post(
            "/nlp/commands",
            json={"text": "Make the agent more friendly"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "action" in data

    def test_nlp_connect_command(self, test_client, mock_gemini_api):
        """Test NLP parsing for connect command."""
        response = test_client.post(
            "/nlp/commands",
            json={"text": "Connect agent A to agent B"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "action" in data

    def test_nlp_unknown_command(self, test_client, mock_gemini_api):
        """Test NLP parsing for ambiguous command."""
        response = test_client.post(
            "/nlp/commands",
            json={"text": "Random gibberish xyz 123"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "action" in data
        # Should return unknown or a best-guess action

    def test_nlp_response_includes_details(self, test_client, mock_gemini_api):
        """Test that NLP response includes details array."""
        response = test_client.post(
            "/nlp/commands",
            json={"text": "Create a support agent"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "details" in data
        assert isinstance(data["details"], list)

    def test_nlp_empty_text(self, test_client, mock_gemini_api):
        """Test NLP with empty text."""
        response = test_client.post(
            "/nlp/commands",
            json={"text": ""}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "action" in data

