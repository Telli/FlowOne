# Tavus Avatar Integration - Windows Limitation

## Summary

**Tavus avatar streaming is currently NOT WORKING on Windows** due to platform limitations with the required dependencies.

## The Problem

### Pipecat Daily Mode (Preferred)
- **Status**: ❌ **NOT AVAILABLE on Windows**
- **Reason**: Requires `daily-python` package which only has wheels for Linux (manylinux) and macOS
- **Error**: `No module named 'daily'`
- **Reference**: [pipecat-ai/pipecat#759](https://github.com/pipecat-ai/pipecat/issues/759) - "Hopefully, daily-python will have support for Windows early 2025"

### Phoenix REST Mode (Fallback)
- **Status**: ❌ **NOT WORKING** (API endpoint deprecated)
- **Reason**: Tavus API v2 no longer has `/phoenix` endpoint
- **Current Endpoint**: `/v2/conversations` (requires `persona_id` which we don't manage yet)
- **Error**: `404 Not Found` when trying to use `/phoenix`

## Solutions

### Option 1: Use WSL (Windows Subsystem for Linux) ✅ RECOMMENDED
1. Install WSL2 on Windows
2. Install Python 3.10+ in WSL
3. Install `daily-python` in WSL environment
4. Run the backend in WSL
5. Set `TAVUS_AVATAR_MODE=pipecat_daily` in `.env`

**Pros**:
- Full Pipecat functionality
- Better performance
- Native Linux environment

**Cons**:
- Requires WSL setup
- More complex development environment

### Option 2: Implement Persona Management ⚠️ REQUIRES WORK
1. Create a persona management system
2. Store persona IDs in agent cards
3. Update Phoenix REST mode to use `/v2/conversations` endpoint
4. Handle `conversation_url` instead of `video_stream_url`

**Pros**:
- Works natively on Windows
- Uses official Tavus API v2

**Cons**:
- Requires significant development work
- Need to manage personas lifecycle
- Different response format than Pipecat mode

### Option 3: Wait for Windows Support ⏳ NOT RECOMMENDED
Wait for `daily-python` to add Windows support (mentioned as "early 2025" in GitHub issues).

**Pros**:
- No code changes needed

**Cons**:
- Timeline uncertain
- No guarantee of Windows support

## Current Configuration

### Default Settings (backend/settings.py)
```python
TAVUS_AVATAR_MODE: str = "phoenix_rest"  # Default for Windows compatibility
USE_TAVUS_PIPECAT_VIDEO: bool = False
```

### Environment Variables (.env)
```bash
# Tavus Avatar Configuration
TAVUS_API_KEY=your_tavus_api_key_here
TAVUS_DEFAULT_REPLICA_ID=your_replica_id_here
TAVUS_BASE_URL=https://tavusapi.com/v2

# Avatar Mode (pipecat_daily requires Linux/macOS or WSL)
TAVUS_AVATAR_MODE=phoenix_rest  # Use phoenix_rest on Windows (currently broken)
# TAVUS_AVATAR_MODE=pipecat_daily  # Use this on Linux/macOS/WSL

# Daily.co Configuration (required for both modes)
DAILY_API_KEY=your_daily_api_key_here
DAILY_SUBDOMAIN=your-subdomain  # e.g., "go-scope" (not the full URL)
DAILY_AVATAR_PRIVACY=public  # or "private"
```

## Technical Details

### Pipecat Daily Mode Architecture
```
Backend (pipecat_runtime.py)
  ↓
tavus_pipecat_video.py
  ↓
DailyTransport (requires daily-python) ❌ Windows
  ↓
TavusVideoService
  ↓
Daily.co Room (WebRTC)
  ↓
Frontend (AgentTestDialog.tsx)
  ↓
@daily-co/daily-js (joins room)
  ↓
Avatar Video Display
```

### Phoenix REST Mode Architecture (BROKEN)
```
Backend (pipecat_runtime.py)
  ↓
tavus_client.py
  ↓
POST /v2/conversations ❌ Requires persona_id
  ↓
conversation_url (not video_stream_url)
  ↓
Frontend (AgentTestDialog.tsx)
  ↓
<video src={conversation_url}> ❓ Format unknown
```

## Error Messages

### When Pipecat Daily Mode Fails on Windows
```
Avatar Unavailable
Pipecat dependencies not installed: No module named 'daily'
Text chat is still available below.
```

### When Phoenix REST Mode Fails
```
Avatar Unavailable
Failed to start Tavus session: unsupported operand type(s) for |: 'str' and '_AnyMeta'
Text chat is still available below.
```

OR

```
[Tavus] API error 404: <!doctype html>
<html lang=en>
<title>404 Not Found</title>
<h1>Not Found</h1>
<p>The requested URL was not found on the server...</p>
```

## Recommended Action

**For Windows Development**: Use WSL2 with `pipecat_daily` mode

**For Production**: Deploy on Linux with `pipecat_daily` mode

**For Quick Testing**: Disable avatar features temporarily and use text-only chat

## Files Modified

1. `backend/settings.py` - Changed default to `phoenix_rest` with Windows warning
2. `backend/requirements.txt` - Added `pipecat-ai[daily]` (won't install on Windows)
3. `backend/services/tavus_client.py` - Updated to use `/v2/conversations` endpoint (incomplete)
4. `backend/services/pipecat_runtime.py` - Made ImportError fatal for pipecat_daily mode

## Next Steps

1. **Short-term**: Document the limitation and recommend WSL
2. **Medium-term**: Implement persona management for Phoenix REST mode
3. **Long-term**: Wait for `daily-python` Windows support or migrate to alternative

## References

- [Pipecat Issue #759](https://github.com/pipecat-ai/pipecat/issues/759) - Dependency resolution conflict
- [Pipecat Issue #290](https://github.com/pipecat-ai/pipecat/issues/290) - Windows support question
- [Tavus API v2 Documentation](https://docs.tavus.io/api-reference/conversations/create-conversation)
- [daily-python PyPI](https://pypi.org/project/daily-python/) - No Windows wheels available

## Contact

For questions or issues, please open a GitHub issue or contact the development team.

