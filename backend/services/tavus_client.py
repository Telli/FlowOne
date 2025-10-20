"""Tavus Phoenix API client for real-time avatar streaming."""
import httpx
from typing import Dict, Any, Optional
from settings import get_settings


class TavusClient:
    """Wrapper for Tavus Phoenix API."""
    
    def __init__(self):
        self.settings = get_settings()
        self.base_url = "https://api.tavus.io/v2"
        self.api_key = self.settings.TAVUS_API_KEY
    
    async def start_phoenix_session(
        self,
        replica_id: str,
        audio_stream_url: str,
        enable_vision: bool = False
    ) -> Dict[str, Any]:
        """
        Start a Tavus Phoenix session for real-time avatar generation.
        
        Args:
            replica_id: Tavus replica ID
            audio_stream_url: URL or stream endpoint for audio input
            enable_vision: Whether to enable vision input (default: False for audio-only)
        
        Returns:
            Dict with session_id, video_stream_url, and status
        """
        if not self.api_key:
            return {
                "error": "TAVUS_API_KEY not configured",
                "session_id": None,
                "video_stream_url": None
            }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/phoenix",
                    headers={
                        "x-api-key": self.api_key,
                        "Content-Type": "application/json"
                    },
                    json={
                        "replica_id": replica_id,
                        "stream_input": {
                            "audio_url": audio_stream_url
                        },
                        "enable_vision": enable_vision
                    },
                    timeout=30.0
                )
                
                if response.status_code not in (200, 201):
                    return {
                        "error": f"Tavus API error: {response.status_code}",
                        "session_id": None,
                        "video_stream_url": None,
                        "details": response.text
                    }
                
                data = response.json()
                return {
                    "error": None,
                    "session_id": data.get("session_id"),
                    "video_stream_url": data.get("video_stream_url"),
                    "status": data.get("status", "started")
                }
        except Exception as e:
            return {
                "error": f"Failed to start Tavus session: {str(e)}",
                "session_id": None,
                "video_stream_url": None
            }
    
    async def stop_phoenix_session(self, session_id: str) -> Dict[str, Any]:
        """
        Stop a Tavus Phoenix session.
        
        Args:
            session_id: Tavus session ID
        
        Returns:
            Dict with status and any error messages
        """
        if not self.api_key:
            return {"error": "TAVUS_API_KEY not configured", "status": "failed"}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/phoenix/{session_id}/stop",
                    headers={"x-api-key": self.api_key},
                    timeout=30.0
                )
                
                if response.status_code not in (200, 204):
                    return {
                        "error": f"Tavus API error: {response.status_code}",
                        "status": "failed"
                    }
                
                return {"error": None, "status": "stopped"}
        except Exception as e:
            return {"error": f"Failed to stop Tavus session: {str(e)}", "status": "failed"}
    
    async def get_replicas(self) -> Dict[str, Any]:
        """
        Get list of available Tavus replicas.
        
        Returns:
            Dict with list of replicas or error message
        """
        if not self.api_key:
            return {"error": "TAVUS_API_KEY not configured", "replicas": []}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/replicas",
                    headers={"x-api-key": self.api_key},
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    return {
                        "error": f"Tavus API error: {response.status_code}",
                        "replicas": []
                    }
                
                data = response.json()
                return {
                    "error": None,
                    "replicas": data.get("replicas", [])
                }
        except Exception as e:
            return {
                "error": f"Failed to fetch replicas: {str(e)}",
                "replicas": []
            }
    
    async def create_replica(
        self,
        name: str,
        video_url: str
    ) -> Dict[str, Any]:
        """
        Create a new Tavus replica from uploaded video.
        
        Args:
            name: Replica name
            video_url: URL to video file
        
        Returns:
            Dict with replica_id or error message
        """
        if not self.api_key:
            return {"error": "TAVUS_API_KEY not configured", "replica_id": None}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/replicas",
                    headers={
                        "x-api-key": self.api_key,
                        "Content-Type": "application/json"
                    },
                    json={
                        "name": name,
                        "video_url": video_url
                    },
                    timeout=60.0
                )
                
                if response.status_code not in (200, 201):
                    return {
                        "error": f"Tavus API error: {response.status_code}",
                        "replica_id": None,
                        "details": response.text
                    }
                
                data = response.json()
                return {
                    "error": None,
                    "replica_id": data.get("replica_id"),
                    "status": data.get("status", "pending")
                }
        except Exception as e:
            return {
                "error": f"Failed to create replica: {str(e)}",
                "replica_id": None
            }


def get_tavus_client() -> TavusClient:
    """Get or create Tavus client singleton."""
    return TavusClient()
