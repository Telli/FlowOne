"""Pytest configuration and fixtures for backend tests."""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
from unittest.mock import patch
import tempfile
import os

from app import app
from memory.store import get_engine
from settings import Settings, get_settings


@pytest.fixture(name="test_db_engine")
def test_db_engine_fixture():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="test_session")
def test_session_fixture(test_db_engine):
    """Create a test database session."""
    with Session(test_db_engine) as session:
        yield session


@pytest.fixture(name="mock_settings")
def mock_settings_fixture():
    """Mock settings with test values."""
    return Settings(
        GEMINI_API_KEY="test_gemini_key",
        DAILY_API_KEY="test_daily_key",
        LANGFUSE_PUBLIC_KEY="",
        LANGFUSE_SECRET_KEY="",
        LANGFUSE_HOST="https://cloud.langfuse.com",
        DATABASE_URL="sqlite:///:memory:",
    )


@pytest.fixture(name="test_client")
def test_client_fixture(test_db_engine, mock_settings):
    """Create a FastAPI test client with mocked dependencies."""
    # Override get_engine to use test database
    app.dependency_overrides[get_engine] = lambda: test_db_engine
    
    # Override settings
    app.dependency_overrides[get_settings] = lambda: mock_settings
    
    # Create tables
    SQLModel.metadata.create_all(test_db_engine)
    
    with TestClient(app) as client:
        yield client
    
    # Clean up
    app.dependency_overrides.clear()
    SQLModel.metadata.drop_all(test_db_engine)


@pytest.fixture
def mock_gemini_api():
    """Mock httpx client for Gemini API calls."""
    import respx
    from httpx import Response
    
    with respx.mock:
        # Mock Gemini Flash endpoint
        respx.post(
            url__regex=r"https://generativelanguage\.googleapis\.com/.*"
        ).mock(return_value=Response(200, json={
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": '{"id": "test_agent", "name": "Test Agent", "persona": {"role": "test", "goals": ["test"], "tone": "neutral", "style": {}}, "tools": [], "memory": {"summaries": [], "vectors": []}, "routing": {"policies": []}}'
                    }]
                }
            }]
        }))
        yield respx


@pytest.fixture
def mock_daily_api():
    """Mock httpx client for Daily.co API calls."""
    import respx
    from httpx import Response
    
    with respx.mock:
        # Mock Daily room creation
        respx.post("https://api.daily.co/v1/rooms").mock(
            return_value=Response(200, json={"name": "test-room", "url": "https://test.daily.co/test-room"})
        )
        
        # Mock Daily token creation
        respx.post("https://api.daily.co/v1/meeting-tokens").mock(
            return_value=Response(200, json={"token": "test-token"})
        )
        yield respx

