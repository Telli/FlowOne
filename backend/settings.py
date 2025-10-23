from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import field_validator



class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    DAILY_API_KEY: str = ""
    DAILY_SUBDOMAIN: str = "flowone"
    DAILY_AVATAR_PRIVACY: str = "public"

    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"
    DATABASE_URL: str = "sqlite:///./flowone.db"
    TAVUS_API_KEY: str = ""
    TAVUS_DEFAULT_REPLICA_ID: str = "default"
    # Tavus configuration
    TAVUS_BASE_URL: str = "https://tavusapi.com/v2"
    # Avatar mode: 'pipecat_daily' (render in Daily room) or 'phoenix_rest' (direct video URL)
    # NOTE: pipecat_daily requires daily-python which is NOT available on Windows
    # Use phoenix_rest on Windows or WSL for pipecat_daily
    # If not set, falls back to USE_TAVUS_PIPECAT_VIDEO (legacy boolean).
    TAVUS_AVATAR_MODE: str = "phoenix_rest"  # Default to phoenix_rest for Windows compatibility
    # Legacy flag retained for backward compatibility
    USE_TAVUS_PIPECAT_VIDEO: bool = False
    # Optional explicit replica id override (falls back to TAVUS_DEFAULT_REPLICA_ID)
    TAVUS_REPLICA_ID: str = ""


    # Production Pipeline Settings
    USE_PRODUCTION_PIPELINE: bool = False
    DEEPGRAM_API_KEY: str = ""
    CARTESIA_API_KEY: str = ""

    # Alternative STT/TTS options
    GOOGLE_STT_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""

    # Feature flags
    ENABLE_MULTI_AGENT: bool = False
    ENABLE_SCREEN_SHARING: bool = False

    # Development settings (from env.example)
    BACKEND_HOST: str = "localhost"
    BACKEND_PORT: str = "8000"
    VITE_API_URL: str = "http://localhost:8000"
    VITE_API_WS: str = "ws://localhost:8000"
    LOG_LEVEL: str = "INFO"
    ENABLE_AVATARS: str = "true"
    ENABLE_VOICE: str = "true"

    # Sanitize DAILY_SUBDOMAIN to accept values like "go-scope.daily.co" or full URLs
    @field_validator("DAILY_SUBDOMAIN", mode="before")
    @classmethod
    def _sanitize_daily_subdomain(cls, v: str):
        if not isinstance(v, str):
            return v
        s = v.strip().lower()
        # strip scheme
        if s.startswith("http://"):
            s = s[7:]
        elif s.startswith("https://"):
            s = s[8:]
        # take host segment only
        s = s.split("/")[0]
        # strip trailing domain if present
        if s.endswith(".daily.co"):
            s = s[: -len(".daily.co")]
        # also handle accidental trailing dots
        s = s.strip(".")
        return s

    ENABLE_TRACING: str = "true"

    class Config:
        env_file = ".env"
        extra = "ignore"  # Allow extra fields in .env


@lru_cache()
def get_settings() -> Settings:
    return Settings()



