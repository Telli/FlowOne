"""Unit tests for Tavus client."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from services.tavus_client import TavusClient, get_tavus_client
from settings import get_settings


@pytest.fixture
def tavus_client():
    """Create a TavusClient instance for testing."""
    return TavusClient()


class TestTavusClient:
    """Tests for TavusClient class."""
    
    @pytest.mark.asyncio
    async def test_start_phoenix_session_success(self, tavus_client):
        """Test successful conversation start (updated for Tavus API v2)."""
        with patch("services.tavus_client.httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 201
            mock_response.json.return_value = {
                "conversation_id": "tavus_conversation_123",
                "conversation_url": "https://tavus.io/conversations/123",
                "status": "started"
            }

            mock_async_client = AsyncMock()
            mock_async_client.__aenter__.return_value = mock_async_client
            mock_async_client.post.return_value = mock_response

            with patch("backend.services.tavus_client.httpx.AsyncClient", return_value=mock_async_client):
                result = await tavus_client.start_phoenix_session(
                    replica_id="replica_123",
                    audio_stream_url="https://daily.co/rooms/test"
                )

            assert result["error"] is None
            assert result["conversation_id"] == "tavus_conversation_123"
            assert result["conversation_url"] == "https://tavus.io/conversations/123"

    @pytest.mark.asyncio
    async def test_start_phoenix_session_no_api_key(self, tavus_client):
        """Test conversation start with no API key."""
        tavus_client.api_key = ""
        result = await tavus_client.start_phoenix_session(
            replica_id="replica_123",
            audio_stream_url="https://daily.co/rooms/test"
        )

        assert result["error"] is not None
        assert "not configured" in result["error"]
        assert result["conversation_id"] is None

    @pytest.mark.asyncio
    async def test_start_phoenix_session_api_error(self, tavus_client):
        """Test conversation start with API error."""
        with patch("services.tavus_client.httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 400
            mock_response.text = "Invalid replica ID"

            mock_async_client = AsyncMock()
            mock_async_client.__aenter__.return_value = mock_async_client
            mock_async_client.post.return_value = mock_response

            with patch("backend.services.tavus_client.httpx.AsyncClient", return_value=mock_async_client):
                result = await tavus_client.start_phoenix_session(
                    replica_id="invalid_replica",
                    audio_stream_url="https://daily.co/rooms/test"
                )

            assert result["error"] is not None
            assert "400" in result["error"]
            assert result["conversation_id"] is None
    
    @pytest.mark.asyncio
    async def test_stop_phoenix_session_success(self, tavus_client):
        """Test successful Phoenix session stop."""
        with patch("services.tavus_client.httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 204
            
            mock_async_client = AsyncMock()
            mock_async_client.__aenter__.return_value = mock_async_client
            mock_async_client.post.return_value = mock_response
            
            with patch("backend.services.tavus_client.httpx.AsyncClient", return_value=mock_async_client):
                result = await tavus_client.stop_phoenix_session("tavus_session_123")
            
            assert result["error"] is None
            assert result["status"] == "stopped"
    
    @pytest.mark.asyncio
    async def test_stop_phoenix_session_no_api_key(self, tavus_client):
        """Test Phoenix session stop with no API key."""
        tavus_client.api_key = ""
        result = await tavus_client.stop_phoenix_session("tavus_session_123")
        
        assert result["error"] is not None
        assert result["status"] == "failed"
    
    @pytest.mark.asyncio
    async def test_get_replicas_success(self, tavus_client):
        """Test successful replica list fetch."""
        with patch("services.tavus_client.httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "replicas": [
                    {
                        "id": "replica_1",
                        "name": "Professional Avatar",
                        "status": "ready"
                    },
                    {
                        "id": "replica_2",
                        "name": "Friendly Avatar",
                        "status": "ready"
                    }
                ]
            }
            
            mock_async_client = AsyncMock()
            mock_async_client.__aenter__.return_value = mock_async_client
            mock_async_client.get.return_value = mock_response
            
            with patch("backend.services.tavus_client.httpx.AsyncClient", return_value=mock_async_client):
                result = await tavus_client.get_replicas()
            
            assert result["error"] is None
            assert len(result["replicas"]) == 2
            assert result["replicas"][0]["id"] == "replica_1"
    
    @pytest.mark.asyncio
    async def test_get_replicas_no_api_key(self, tavus_client):
        """Test replica list fetch with no API key."""
        tavus_client.api_key = ""
        result = await tavus_client.get_replicas()
        
        assert result["error"] is not None
        assert result["replicas"] == []
    
    @pytest.mark.asyncio
    async def test_create_replica_success(self, tavus_client):
        """Test successful replica creation."""
        with patch("services.tavus_client.httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 201
            mock_response.json.return_value = {
                "replica_id": "replica_new_123",
                "status": "pending"
            }
            
            mock_async_client = AsyncMock()
            mock_async_client.__aenter__.return_value = mock_async_client
            mock_async_client.post.return_value = mock_response
            
            with patch("backend.services.tavus_client.httpx.AsyncClient", return_value=mock_async_client):
                result = await tavus_client.create_replica(
                    name="Custom Avatar",
                    video_url="https://example.com/avatar.mp4"
                )
            
            assert result["error"] is None
            assert result["replica_id"] == "replica_new_123"
            assert result["status"] == "pending"
    
    @pytest.mark.asyncio
    async def test_create_replica_no_api_key(self, tavus_client):
        """Test replica creation with no API key."""
        tavus_client.api_key = ""
        result = await tavus_client.create_replica(
            name="Custom Avatar",
            video_url="https://example.com/avatar.mp4"
        )
        
        assert result["error"] is not None
        assert result["replica_id"] is None


def test_get_tavus_client():
    """Test get_tavus_client factory function."""
    client = get_tavus_client()
    assert isinstance(client, TavusClient)
    assert client.base_url == "https://tavusapi.com/v2"
