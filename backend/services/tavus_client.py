"""Tavus Phoenix API client for real-time avatar streaming."""
import httpx
from typing import Dict, Any, Optional
from settings import get_settings


class TavusClient:
    """Wrapper for Tavus Phoenix API."""
    
    def __init__(self):
        self.settings = get_settings()
        # Derive and normalize base URL with readable steps
        base_url_setting = getattr(self.settings, "TAVUS_BASE_URL", "https://tavusapi.com/v2")
        base_url_value = base_url_setting or "https://tavusapi.com/v2"
        self.base_url = base_url_value.rstrip("/")
        self.api_key = self.settings.TAVUS_API_KEY

    async def start_phoenix_session(
        self,
        replica_id: str,
        audio_stream_url: str,
        persona_id: Optional[str] = None,
        enable_vision: bool = False
    ) -> Dict[str, Any]:
        """
        Start a Tavus conversation session for real-time avatar streaming.

        NOTE: This uses the Tavus API v2 /conversations endpoint.
        The old /phoenix endpoint no longer exists in Tavus API v2.

        Args:
            replica_id: Tavus replica ID
            audio_stream_url: URL or stream endpoint for audio input (currently unused)
            persona_id: Tavus persona ID (required for Phoenix REST mode)
            enable_vision: Whether to enable vision input (default: False for audio-only)

        Returns:
            Dict with conversation_id, conversation_url, and status
        """
        if not self.api_key or self.api_key == "your_tavus_api_key_here":
            print("WARNING: TAVUS_API_KEY not configured")
            return {
                "error": "TAVUS_API_KEY not configured",
                "conversation_id": None,
                "conversation_url": None
            }

        if not persona_id:
            print("WARNING: persona_id is required for Phoenix REST mode")
            return {
                "error": "persona_id is required for Phoenix REST mode",
                "conversation_id": None,
                "conversation_url": None
            }

        try:
            # Tavus API v2 /conversations endpoint requires replica_id and persona_id
            payload = {
                "replica_id": replica_id,
                "persona_id": persona_id,
                "conversation_name": f"FlowOne Session"
            }

            print(f"[Tavus] Starting conversation with replica_id={replica_id}, persona_id={persona_id}")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/conversations",
                    headers={
                        "x-api-key": self.api_key,
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=30.0
                )

                if response.status_code not in (200, 201):
                    error_detail = response.text
                    print(f"[Tavus] API error {response.status_code}: {error_detail}")
                    return {
                        "error": f"Tavus API error: {response.status_code}",
                        "conversation_id": None,
                        "conversation_url": None,
                        "details": error_detail
                    }

                data = response.json()
                conversation_id = data.get("conversation_id")
                conversation_url = data.get("conversation_url")

                print(f"[Tavus] Conversation started: conversation_id={conversation_id}, url={conversation_url}")

                return {
                    "error": None,
                    "conversation_id": conversation_id,
                    "conversation_url": conversation_url,
                    "status": data.get("status", "started")
                }
        except httpx.TimeoutException as e:
            print(f"[Tavus] Timeout error: {str(e)}")
            return {
                "error": f"Tavus API timeout: {str(e)}",
                "conversation_id": None,
                "conversation_url": None
            }
        except Exception as e:
            print(f"[Tavus] Unexpected error: {str(e)}")
            return {
                "error": f"Failed to start Tavus session: {str(e)}",
                "conversation_id": None,
                "conversation_url": None
            }
    
    # ========== Persona Management Methods ==========

    async def create_persona(
        self,
        persona_name: str,
        system_prompt: str,
        context: Optional[str] = None,
        default_replica_id: Optional[str] = None,
        layers: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new Tavus persona.

        Args:
            persona_name: Name for the persona
            system_prompt: System prompt for the LLM (required)
            context: Additional context for the persona
            default_replica_id: Default replica to use with this persona
            layers: Custom layer configuration (perception, STT, LLM, TTS)

        Returns:
            Dict with persona_id and status
        """
        if not self.api_key or self.api_key == "your_tavus_api_key_here":
            print("WARNING: TAVUS_API_KEY not configured")
            return {
                "error": "TAVUS_API_KEY not configured",
                "persona_id": None
            }

        try:
            payload = {
                "persona_name": persona_name,
                "system_prompt": system_prompt
            }

            if context:
                payload["context"] = context
            if default_replica_id:
                payload["default_replica_id"] = default_replica_id
            if layers:
                payload["layers"] = layers

            print(f"[Tavus] Creating persona: {persona_name}")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/personas",
                    headers={
                        "x-api-key": self.api_key,
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=30.0
                )

                if response.status_code not in (200, 201):
                    error_detail = response.text
                    print(f"[Tavus] API error {response.status_code}: {error_detail}")
                    return {
                        "error": f"Tavus API error: {response.status_code}",
                        "persona_id": None,
                        "details": error_detail
                    }

                data = response.json()
                persona_id = data.get("persona_id")

                print(f"[Tavus] Persona created: persona_id={persona_id}")

                return {
                    "error": None,
                    "persona_id": persona_id,
                    "persona_name": data.get("persona_name"),
                    "status": "created"
                }
        except Exception as e:
            print(f"[Tavus] Error creating persona: {str(e)}")
            return {
                "error": f"Failed to create persona: {str(e)}",
                "persona_id": None
            }

    async def get_persona(self, persona_id: str) -> Dict[str, Any]:
        """
        Get a Tavus persona by ID.

        Args:
            persona_id: Tavus persona ID

        Returns:
            Dict with persona details
        """
        if not self.api_key or self.api_key == "your_tavus_api_key_here":
            return {
                "error": "TAVUS_API_KEY not configured",
                "persona": None
            }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/personas/{persona_id}",
                    headers={"x-api-key": self.api_key},
                    timeout=30.0
                )

                if response.status_code != 200:
                    error_detail = response.text
                    print(f"[Tavus] API error {response.status_code}: {error_detail}")
                    return {
                        "error": f"Tavus API error: {response.status_code}",
                        "persona": None
                    }

                return {
                    "error": None,
                    "persona": response.json()
                }
        except Exception as e:
            print(f"[Tavus] Error getting persona: {str(e)}")
            return {
                "error": f"Failed to get persona: {str(e)}",
                "persona": None
            }

    async def list_personas(self) -> Dict[str, Any]:
        """
        List all Tavus personas.

        Returns:
            Dict with list of personas
        """
        if not self.api_key or self.api_key == "your_tavus_api_key_here":
            return {
                "error": "TAVUS_API_KEY not configured",
                "personas": []
            }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/personas",
                    headers={"x-api-key": self.api_key},
                    timeout=30.0
                )

                if response.status_code != 200:
                    error_detail = response.text
                    print(f"[Tavus] API error {response.status_code}: {error_detail}")
                    return {
                        "error": f"Tavus API error: {response.status_code}",
                        "personas": []
                    }

                data = response.json()
                return {
                    "error": None,
                    "personas": data.get("data", [])
                }
        except Exception as e:
            print(f"[Tavus] Error listing personas: {str(e)}")
            return {
                "error": f"Failed to list personas: {str(e)}",
                "personas": []
            }

    async def delete_persona(self, persona_id: str) -> Dict[str, Any]:
        """
        Delete a Tavus persona.

        Args:
            persona_id: Tavus persona ID

        Returns:
            Dict with status
        """
        if not self.api_key or self.api_key == "your_tavus_api_key_here":
            return {
                "error": "TAVUS_API_KEY not configured",
                "success": False
            }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.base_url}/personas/{persona_id}",
                    headers={"x-api-key": self.api_key},
                    timeout=30.0
                )

                if response.status_code not in (200, 204):
                    error_detail = response.text
                    print(f"[Tavus] API error {response.status_code}: {error_detail}")
                    return {
                        "error": f"Tavus API error: {response.status_code}",
                        "success": False
                    }

                print(f"[Tavus] Persona deleted: persona_id={persona_id}")

                return {
                    "error": None,
                    "success": True
                }
        except Exception as e:
            print(f"[Tavus] Error deleting persona: {str(e)}")
            return {
                "error": f"Failed to delete persona: {str(e)}",
                "success": False
            }

    # ========== Session Management Methods ==========

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
