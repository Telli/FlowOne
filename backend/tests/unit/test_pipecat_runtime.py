"""Unit tests for Pipecat runtime."""
import pytest
import asyncio

from backend.services.pipecat_runtime import Session, SessionManager


class TestPipecatRuntime:
    """Test suite for Pipecat runtime components."""

    @pytest.mark.asyncio
    async def test_session_creation(self):
        """Test session instantiation."""
        agent_card = {"id": "test", "persona": {"role": "test"}}
        session = Session("test_session", agent_card)
        
        assert session.id == "test_session"
        assert session.agent == agent_card
        assert session.queue is not None

    @pytest.mark.asyncio
    async def test_session_event_queue(self):
        """Test session event queueing."""
        agent_card = {"id": "test", "persona": {"role": "test"}}
        session = Session("test_session", agent_card)
        
        # Add event to queue
        test_event = {"type": "test.event", "data": "test"}
        await session.queue.put(test_event)
        
        # Retrieve event
        event = await session.queue.get()
        assert event == test_event

    @pytest.mark.asyncio
    async def test_session_stream_events(self):
        """Test session event streaming."""
        agent_card = {"id": "test", "persona": {"role": "test"}}
        session = Session("test_session", agent_card)
        
        # Put some events
        await session.queue.put({"type": "event1"})
        await session.queue.put({"type": "event2"})
        
        # Stream events
        events = []
        async def collect_events():
            count = 0
            async for event in session.stream_events():
                events.append(event)
                count += 1
                if count >= 2:
                    break
        
        # Run with timeout
        await asyncio.wait_for(collect_events(), timeout=1.0)
        
        assert len(events) == 2
        assert events[0]["type"] == "event1"
        assert events[1]["type"] == "event2"

    @pytest.mark.asyncio
    async def test_session_manager_spawn(self):
        """Test session manager spawning sessions."""
        manager = SessionManager()
        agent_card = {"id": "test", "persona": {"role": "test"}}
        
        manager.spawn("test_session", agent_card)
        
        assert "test_session" in manager.sessions
        assert manager.sessions["test_session"].id == "test_session"

    @pytest.mark.asyncio
    async def test_session_manager_emit(self):
        """Test session manager event emission."""
        manager = SessionManager()
        agent_card = {"id": "test", "persona": {"role": "test"}}
        
        manager.spawn("test_session", agent_card)
        
        # Emit event
        test_event = {"type": "test.emit", "data": "value"}
        result = await manager.emit("test_session", test_event)
        
        assert result is True
        
        # Verify event in queue
        session = manager.sessions["test_session"]
        # Queue should have session.started + test.emit
        assert session.queue.qsize() >= 1

    @pytest.mark.asyncio
    async def test_session_manager_events_stream(self):
        """Test session manager event streaming."""
        manager = SessionManager()
        agent_card = {"id": "test", "persona": {"role": "test"}}
        
        manager.spawn("test_session", agent_card)
        
        events = []
        async def collect_events():
            count = 0
            async for event in manager.events("test_session"):
                events.append(event)
                count += 1
                if count >= 1:  # Get at least session.started
                    break
        
        await asyncio.wait_for(collect_events(), timeout=2.0)
        
        assert len(events) >= 1
        assert events[0]["type"] == "session.started"

    @pytest.mark.asyncio
    async def test_session_manager_close(self):
        """Test session manager closing sessions."""
        manager = SessionManager()
        agent_card = {"id": "test", "persona": {"role": "test"}}
        
        manager.spawn("test_session", agent_card)
        assert "test_session" in manager.sessions
        
        manager.close("test_session")
        assert "test_session" not in manager.sessions

    @pytest.mark.asyncio
    async def test_session_manager_emit_to_nonexistent_session(self):
        """Test emitting to non-existent session."""
        manager = SessionManager()
        
        result = await manager.emit("nonexistent", {"type": "test"})
        assert result is False

