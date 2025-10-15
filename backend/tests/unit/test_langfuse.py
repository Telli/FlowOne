"""Unit tests for Langfuse observability."""
import pytest
from unittest.mock import patch, MagicMock

from backend.observability.langfuse import trace_event


class TestLangfuse:
    """Test suite for Langfuse tracing."""

    def test_trace_event_returns_trace_id(self):
        """Test that trace_event returns a trace_id."""
        trace_id = trace_event("test.event", test_data="value")
        
        assert trace_id is not None
        assert isinstance(trace_id, str)
        assert len(trace_id) > 0

    def test_trace_event_custom_trace_id(self):
        """Test that trace_event uses provided trace_id."""
        custom_id = "custom-trace-123"
        trace_id = trace_event("test.event", trace_id=custom_id)
        
        assert trace_id == custom_id

    @patch("backend.observability.langfuse._lf")
    def test_trace_event_calls_langfuse_when_available(self, mock_lf):
        """Test that trace_event calls Langfuse client when configured."""
        mock_lf.event = MagicMock()
        
        trace_id = trace_event("test.event", key="value")
        
        # Should have called langfuse event
        mock_lf.event.assert_called_once()
        call_args = mock_lf.event.call_args
        assert call_args[1]["name"] == "test.event"
        assert "key" in call_args[1]["metadata"]

    def test_trace_event_fail_open_on_error(self):
        """Test that trace_event doesn't raise on Langfuse error."""
        with patch("backend.observability.langfuse._lf") as mock_lf:
            mock_lf.event.side_effect = Exception("Langfuse error")
            
            # Should not raise
            trace_id = trace_event("test.event")
            
            assert trace_id is not None

    def test_trace_event_without_langfuse(self):
        """Test trace_event when Langfuse is not configured."""
        with patch("backend.observability.langfuse._lf", None):
            trace_id = trace_event("test.event")
            
            # Should still return a trace_id
            assert trace_id is not None

