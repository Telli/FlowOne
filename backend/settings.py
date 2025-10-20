from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    DAILY_API_KEY: str = ""
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"
    DATABASE_URL: str = "sqlite:///./flowone.db"
    TAVUS_API_KEY: str = ""
    TAVUS_DEFAULT_REPLICA_ID: str = "default"
    
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
    ENABLE_TRACING: str = "true"

    class Config:
        env_file = ".env"
        extra = "ignore"  # Allow extra fields in .env


@lru_cache()
def get_settings() -> Settings:
    return Settings()



