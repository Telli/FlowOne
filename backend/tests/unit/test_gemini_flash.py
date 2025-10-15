"""Unit tests for Gemini Flash service."""
import pytest
from unittest.mock import patch, MagicMock
import json

from backend.services.gemini_flash import (
    synthesize_agent_card,
    parse_nlp_command,
    generate_agent_reply,
    _fallback_card,
)


class TestGeminiFlash:
    """Test suite for Gemini Flash functions."""

    def test_fallback_card(self):
        """Test fallback card generation."""
        card = _fallback_card("TestAgent", "test role", ["goal1", "goal2"], "friendly")
        
        assert card["name"] == "TestAgent"
        assert card["persona"]["role"] == "test role"
        assert card["persona"]["goals"] == ["goal1", "goal2"]
        assert card["persona"]["tone"] == "friendly"
        assert "id" in card
        assert "tools" in card
        assert "memory" in card

    @patch("backend.services.gemini_flash.httpx.Client")
    def test_synthesize_agent_card_success(self, mock_client):
        """Test successful agent card synthesis."""
        # Mock successful API response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": json.dumps({
                            "id": "agent_test",
                            "name": "Test Agent",
                            "persona": {
                                "role": "You are a test agent",
                                "goals": ["test"],
                                "tone": "neutral",
                                "style": {}
                            },
                            "tools": [],
                            "memory": {"summaries": [], "vectors": []},
                            "routing": {}
                        })
                    }]
                }
            }]
        }
        mock_response.raise_for_status = MagicMock()
        mock_client.return_value.__enter__.return_value.post.return_value = mock_response

        with patch("backend.services.gemini_flash.get_settings") as mock_settings:
            mock_settings.return_value.GEMINI_API_KEY = "test_key"
            
            card = synthesize_agent_card("Test", "test role", ["goal"], "friendly")
            
            assert card["name"] == "Test Agent"
            assert "persona" in card

    @patch("backend.services.gemini_flash.httpx.Client")
    def test_synthesize_agent_card_fallback_on_error(self, mock_client):
        """Test fallback when API fails."""
        # Mock API error
        mock_client.return_value.__enter__.return_value.post.side_effect = Exception("API Error")

        with patch("backend.services.gemini_flash.get_settings") as mock_settings:
            mock_settings.return_value.GEMINI_API_KEY = "test_key"
            
            card = synthesize_agent_card("Test", "role", ["goal"], "neutral")
            
            # Should return fallback
            assert "id" in card
            assert card["name"] == "Test"

    def test_synthesize_agent_card_no_api_key(self):
        """Test fallback when no API key is set."""
        with patch("backend.services.gemini_flash.get_settings") as mock_settings:
            mock_settings.return_value.GEMINI_API_KEY = ""
            
            card = synthesize_agent_card("Test", "role", ["goal"], "neutral")
            
            # Should use fallback
            assert card["name"] == "Test"

    @patch("backend.services.gemini_flash.httpx.Client")
    def test_parse_nlp_command_success(self, mock_client):
        """Test successful NLP command parsing."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": json.dumps({
                            "action": "create",
                            "config": {"name": "Sales Agent"},
                            "details": ["parsed"]
                        })
                    }]
                }
            }]
        }
        mock_response.raise_for_status = MagicMock()
        mock_client.return_value.__enter__.return_value.post.return_value = mock_response

        with patch("backend.services.gemini_flash.get_settings") as mock_settings:
            mock_settings.return_value.GEMINI_API_KEY = "test_key"
            
            result = parse_nlp_command("Create a sales agent")
            
            assert result["action"] == "create"
            assert "config" in result

    def test_parse_nlp_command_no_api_key(self):
        """Test NLP parsing fallback without API key."""
        with patch("backend.services.gemini_flash.get_settings") as mock_settings:
            mock_settings.return_value.GEMINI_API_KEY = ""
            
            result = parse_nlp_command("test command")
            
            assert result["action"] == "unknown"
            assert result["details"] == ["fallback"]

    @patch("backend.services.gemini_flash.httpx.Client")
    def test_generate_agent_reply_success(self, mock_client):
        """Test successful agent reply generation."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": "This is a test reply from the agent."
                    }]
                }
            }]
        }
        mock_response.raise_for_status = MagicMock()
        mock_client.return_value.__enter__.return_value.post.return_value = mock_response

        with patch("backend.services.gemini_flash.get_settings") as mock_settings:
            mock_settings.return_value.GEMINI_API_KEY = "test_key"
            
            agent_card = {
                "persona": {
                    "role": "You are helpful",
                    "tone": "friendly",
                    "style": {"max_words": 60}
                }
            }
            
            reply = generate_agent_reply("Hello", agent_card)
            
            assert isinstance(reply, str)
            assert len(reply) > 0

    def test_generate_agent_reply_fallback(self):
        """Test reply generation fallback without API key."""
        with patch("backend.services.gemini_flash.get_settings") as mock_settings:
            mock_settings.return_value.GEMINI_API_KEY = ""
            
            reply = generate_agent_reply("Hello", {})
            
            assert "I heard: Hello" in reply

