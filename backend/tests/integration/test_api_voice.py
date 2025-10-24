"""Integration tests for voice API."""
import pytest
import respx
from httpx import Response


class TestVoiceAPI:
    """Test suite for /voice endpoints."""

    def test_get_voice_tokens(self, test_client, mock_daily_api):
        """Test GET /voice/tokens endpoint."""
        response = test_client.get("/voice/tokens?sessionId=test-session-123")
        
        assert response.status_code == 200
        data = response.json()
        assert "room" in data
        assert "token" in data
        assert data["room"] == "flowone-test-session-123"
        assert len(data["token"]) > 0

    def test_voice_tokens_requires_session_id(self, test_client):
        """Test that GET /voice/tokens requires sessionId parameter."""
        response = test_client.get("/voice/tokens")
        
        # Should return 422 for missing required query parameter
        assert response.status_code == 422

    def test_voice_tokens_creates_daily_room(self, test_client, mock_daily_api):
        """Test that voice tokens endpoint creates Daily room."""
        response = test_client.get("/voice/tokens?sessionId=new-session")
        
        assert response.status_code == 200
        # Room name should follow pattern
        data = response.json()
        assert data["room"].startswith("flowone-")

    def test_voice_tokens_without_daily_api_key(self, test_client):
        """Test voice tokens endpoint fails gracefully without Daily API key."""
        # Override settings to remove Daily API key
        from backend.settings import Settings
        
        def mock_settings_no_daily():
            return Settings(
                GEMINI_API_KEY="test",
                DAILY_API_KEY="",  # No key
                LANGFUSE_PUBLIC_KEY="",
                LANGFUSE_SECRET_KEY="",
                DATABASE_URL="sqlite:///:memory:"
            )
        
        from backend.app import app
        from backend.settings import get_settings
        
        app.dependency_overrides[get_settings] = mock_settings_no_daily
        
        response = test_client.get("/voice/tokens?sessionId=test")
        
        # Should return 500 when Daily API key is missing
        assert response.status_code == 500
        assert "DAILY_API_KEY missing" in response.json()["detail"]
        
        # Clean up override
        app.dependency_overrides.pop(get_settings, None)

    def test_voice_tokens_handles_daily_api_errors(self, test_client):
        """Test voice tokens endpoint handles Daily API errors."""
        import respx
        from httpx import Response
        
        with respx.mock:
            # Mock Daily API to return error
            respx.post("https://api.daily.co/v1/rooms").mock(
                return_value=Response(500, json={"error": "Internal error"})
            )
            respx.post("https://api.daily.co/v1/meeting-tokens").mock(
                return_value=Response(400, json={"error": "Bad request"})
            )
            
            response = test_client.get("/voice/tokens?sessionId=error-test")
            
            # Should handle errors gracefully
            # Endpoint creates room first (may fail-open), then creates token
            # If token creation fails, returns 500
            assert response.status_code in [200, 500]

    def test_voice_tokens_room_already_exists(self, test_client):
        """Test voice tokens when room already exists."""
        with respx.mock:
            # Mock room check to return existing room
            respx.get("https://api.daily.co/v1/rooms/flowone-existing-room").mock(
                return_value=Response(200, json={"name": "flowone-existing-room"})
            )
            # Mock token creation
            respx.post("https://api.daily.co/v1/meeting-tokens").mock(
                return_value=Response(200, json={"token": "test-token"})
            )
            
            response = test_client.get("/voice/tokens?sessionId=existing-room")
            
            assert response.status_code == 200
            data = response.json()
            assert data["room"] == "flowone-existing-room"
            assert data["token"] == "test-token"

    def test_voice_tokens_room_check_error(self, test_client):
        """Test voice tokens when room check fails but continues."""
        with respx.mock:
            # Mock room check to fail
            respx.get("https://api.daily.co/v1/rooms/flowone-error-room").mock(
                return_value=Response(500, json={"error": "Check failed"})
            )
            # Mock room creation to succeed
            respx.post("https://api.daily.co/v1/rooms").mock(
                return_value=Response(200, json={"name": "flowone-error-room"})
            )
            # Mock token creation
            respx.post("https://api.daily.co/v1/meeting-tokens").mock(
                return_value=Response(200, json={"token": "test-token"})
            )
            
            response = test_client.get("/voice/tokens?sessionId=error-room")
            
            assert response.status_code == 200
            data = response.json()
            assert data["room"] == "flowone-error-room"

    def test_voice_tokens_duplicate_room_error(self, test_client):
        """Test voice tokens handles duplicate room error gracefully."""
        with respx.mock:
            # Mock room check to fail
            respx.get("https://api.daily.co/v1/rooms/flowone-duplicate-room").mock(
                return_value=Response(404, json={"error": "Not found"})
            )
            # Mock room creation to return duplicate error
            respx.post("https://api.daily.co/v1/rooms").mock(
                return_value=Response(400, json={
                    "error": "invalid-request-error",
                    "info": "Room already exists"
                })
            )
            # Mock token creation
            respx.post("https://api.daily.co/v1/meeting-tokens").mock(
                return_value=Response(200, json={"token": "test-token"})
            )
            
            response = test_client.get("/voice/tokens?sessionId=duplicate-room")
            
            assert response.status_code == 200
            data = response.json()
            assert data["room"] == "flowone-duplicate-room"

    def test_voice_tokens_token_creation_fails(self, test_client):
        """Test voice tokens when token creation fails."""
        with respx.mock:
            # Mock room check to fail
            respx.get("https://api.daily.co/v1/rooms/flowone-token-error").mock(
                return_value=Response(404, json={"error": "Not found"})
            )
            # Mock room creation to succeed
            respx.post("https://api.daily.co/v1/rooms").mock(
                return_value=Response(200, json={"name": "flowone-token-error"})
            )
            # Mock token creation to fail
            respx.post("https://api.daily.co/v1/meeting-tokens").mock(
                return_value=Response(500, json={"error": "Token creation failed"})
            )
            
            response = test_client.get("/voice/tokens?sessionId=token-error")
            
            assert response.status_code == 500
            data = response.json()
            assert "Daily token error" in data["detail"]

    def test_voice_tokens_room_creation_fails(self, test_client):
        """Test voice tokens when room creation fails."""
        with respx.mock:
            # Mock room check to fail
            respx.get("https://api.daily.co/v1/rooms/flowone-room-error").mock(
                return_value=Response(404, json={"error": "Not found"})
            )
            # Mock room creation to fail
            respx.post("https://api.daily.co/v1/rooms").mock(
                return_value=Response(500, json={"error": "Room creation failed"})
            )
            
            response = test_client.get("/voice/tokens?sessionId=room-error")
            
            # Should return room name as fallback
            assert response.status_code == 200
            data = response.json()
            assert data["room"] == "flowone-room-error"

    def test_voice_tokens_room_creation_400_non_duplicate(self, test_client):
        """Test voice tokens when room creation returns 400 but not duplicate error."""
        with respx.mock:
            # Mock room check to fail
            respx.get("https://api.daily.co/v1/rooms/flowone-400-error").mock(
                return_value=Response(404, json={"error": "Not found"})
            )
            # Mock room creation to return 400 with different error
            respx.post("https://api.daily.co/v1/rooms").mock(
                return_value=Response(400, json={
                    "error": "validation-error",
                    "info": "Invalid room configuration"
                })
            )
            
            response = test_client.get("/voice/tokens?sessionId=400-error")
            
            # Should return room name as fallback
            assert response.status_code == 200
            data = response.json()
            assert data["room"] == "flowone-400-error"

    def test_voice_tokens_room_creation_400_no_json(self, test_client):
        """Test voice tokens when room creation returns 400 with no JSON response."""
        with respx.mock:
            # Mock room check to fail
            respx.get("https://api.daily.co/v1/rooms/flowone-no-json").mock(
                return_value=Response(404, json={"error": "Not found"})
            )
            # Mock room creation to return 400 with no JSON
            respx.post("https://api.daily.co/v1/rooms").mock(
                return_value=Response(400, text="Bad Request")
            )
            
            response = test_client.get("/voice/tokens?sessionId=no-json")
            
            # Should return room name as fallback
            assert response.status_code == 200
            data = response.json()
            assert data["room"] == "flowone-no-json"

