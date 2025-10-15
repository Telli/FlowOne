"""Integration tests for health API."""
import pytest


class TestHealthAPI:
    """Test suite for /health endpoints."""

    def test_health_live(self, test_client):
        """Test GET /health/live endpoint."""
        response = test_client.get("/health/live")
        
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "trace_id" in data

    def test_health_ready(self, test_client):
        """Test GET /health/ready endpoint."""
        response = test_client.get("/health/ready")
        
        assert response.status_code == 200
        data = response.json()
        assert "ok" in data
        assert "db" in data
        assert "env" in data
        assert "trace_id" in data

    def test_health_status(self, test_client):
        """Test GET /health/status endpoint."""
        response = test_client.get("/health/status")
        
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert "trace_id" in data
        assert data["version"] == "0.1.0"

