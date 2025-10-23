# Tavus Persona Management Guide

## Overview

FlowOne now supports **Tavus Persona Management** to enable avatar streaming on Windows via Phoenix REST mode. This feature allows you to create and manage AI personas that define the behavior, tone, and capabilities of your Tavus avatar conversations.

## Why Persona Management?

**Problem**: The preferred Pipecat Daily mode requires the `daily-python` package, which is **NOT available on Windows** (Linux/macOS only).

**Solution**: Phoenix REST mode uses the Tavus API v2 `/v2/conversations` endpoint, which requires a `persona_id` parameter. This guide shows you how to create and manage personas to enable avatar streaming on Windows.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FlowOne Backend                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Agent      │      │   Persona    │      │   Session    │  │
│  │   Card       │─────▶│   API        │─────▶│   Manager    │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         │                      │                      │          │
│         │                      │                      │          │
│         ▼                      ▼                      ▼          │
│  tavusPersonaId         POST /personas        Phoenix REST      │
│  replicaId              GET /personas         /v2/conversations │
│                         DELETE /personas                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │  Tavus API v2   │
                         │  tavusapi.com   │
                         └─────────────────┘
```

## Quick Start

### 1. Set Up Environment

Add your Tavus API key to `.env`:

```bash
# Required for persona management
TAVUS_API_KEY=your_tavus_api_key_here

# Optional: default replica ID for avatars
TAVUS_DEFAULT_REPLICA_ID=r123456789

# Avatar mode (use phoenix_rest for Windows)
TAVUS_AVATAR_MODE=phoenix_rest
```

### 2. Create a Persona

Use the `/personas` API endpoint to create a new persona:

**Request:**
```bash
POST http://localhost:8000/personas
Content-Type: application/json

{
  "persona_name": "Fitness Coach",
  "system_prompt": "You are an energetic and motivating fitness coach. Your goal is to inspire users to achieve their fitness goals through positive reinforcement and practical advice.",
  "context": "You specialize in personalized workout plans and nutrition guidance.",
  "default_replica_id": "r123456789"
}
```

**Response:**
```json
{
  "persona_id": "pe_abc123def456",
  "persona_name": "Fitness Coach",
  "system_prompt": "You are an energetic...",
  "context": "You specialize in...",
  "default_replica_id": "r123456789",
  "created_at": "2025-10-23T12:00:00Z"
}
```

### 3. Update Agent with Persona

Update your agent's avatar configuration to include the `tavusPersonaId`:

**Request:**
```bash
PATCH http://localhost:8000/agents/agent_fitness_coach
Content-Type: application/json

{
  "avatar": {
    "replicaId": "r123456789",
    "thumbnailUrl": "https://example.com/avatar.jpg",
    "tavusPersonaId": "pe_abc123def456"
  }
}
```

### 4. Start Session with Avatar

Create a session with avatar enabled:

**Request:**
```bash
POST http://localhost:8000/sessions
Content-Type: application/json

{
  "agentId": "agent_fitness_coach",
  "enableAvatar": true
}
```

**Response:**
```json
{
  "sessionId": "uuid-session-id",
  "room": "flowone-uuid-session-id",
  "trace_id": "trace-id"
}
```

The backend will:
1. Create a Daily.co room for WebRTC
2. Extract `tavusPersonaId` from the agent card
3. Call Tavus API `/v2/conversations` with `persona_id` and `replica_id`
4. Start the avatar conversation
5. Emit `avatar.started` event with the conversation URL

## API Reference

### Persona Endpoints

#### Create Persona

```
POST /personas
```

**Request Body:**
```typescript
{
  persona_name: string;           // Required: Name of the persona
  system_prompt: string;          // Required: System prompt defining behavior
  context?: string;               // Optional: Additional context
  default_replica_id?: string;    // Optional: Default avatar replica
  layers?: {                      // Optional: Advanced configuration
    perception?: object;
    stt?: object;
    llm?: object;
    tts?: object;
  };
}
```

**Response:**
```typescript
{
  persona_id: string;
  persona_name: string;
  system_prompt: string;
  context?: string;
  default_replica_id?: string;
  created_at: string;
}
```

#### Get Persona

```
GET /personas/{persona_id}
```

**Response:**
```typescript
{
  persona_id: string;
  persona_name: string;
  system_prompt: string;
  context?: string;
  default_replica_id?: string;
  created_at: string;
}
```

#### List Personas

```
GET /personas
```

**Response:**
```typescript
{
  personas: Array<{
    persona_id: string;
    persona_name: string;
    system_prompt: string;
    context?: string;
    default_replica_id?: string;
    created_at: string;
  }>;
}
```

#### Delete Persona

```
DELETE /personas/{persona_id}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

### Agent Avatar Configuration

When creating or updating an agent, include the `tavusPersonaId` in the avatar data:

```typescript
{
  "avatar": {
    "replicaId": "r123456789",           // Required: Tavus replica ID
    "thumbnailUrl": "https://...",       // Optional: Avatar thumbnail
    "tavusPersonaId": "pe_abc123def456"  // Required for Phoenix REST mode
  }
}
```

## Database Schema

The `Agent` table now includes a `tavus_persona_id` column:

```sql
CREATE TABLE agent (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  card_json TEXT NOT NULL,
  avatar_replica_id VARCHAR,
  avatar_thumbnail_url VARCHAR,
  tavus_persona_id VARCHAR  -- NEW COLUMN
);
```

The migration is handled automatically in `backend/memory/store.py`:

```python
def create_db(engine):
    """Create database tables and run migrations."""
    SQLModel.metadata.create_all(engine)
    
    # Migration: Add tavus_persona_id column if it doesn't exist
    try:
        with Session(engine) as session:
            try:
                session.exec(text("SELECT tavus_persona_id FROM agent LIMIT 1"))
            except Exception:
                session.exec(text("ALTER TABLE agent ADD COLUMN tavus_persona_id VARCHAR"))
                session.commit()
                print("✓ Migration: Added tavus_persona_id column to agent table")
    except Exception:
        pass
```

## Testing

Run the workflow test to verify persona management:

```bash
python test_persona_workflow.py
```

This test demonstrates:
1. Creating a persona (mocked without API key)
2. Updating an agent with persona_id
3. Creating a session with avatar enabled
4. Verifying the workflow completes successfully

## Troubleshooting

### Error: "Phoenix REST mode requires a Tavus persona ID"

**Cause**: The agent's avatar configuration doesn't include `tavusPersonaId`.

**Solution**: Update the agent with a valid persona ID:
```bash
PATCH /agents/{agent_id}
{
  "avatar": {
    "replicaId": "r123456789",
    "tavusPersonaId": "pe_abc123def456"
  }
}
```

### Error: "Failed to create persona: 401 Unauthorized"

**Cause**: Invalid or missing `TAVUS_API_KEY` in `.env`.

**Solution**: Set a valid Tavus API key in your `.env` file.

### Error: "No such column: agent.tavus_persona_id"

**Cause**: Database schema is outdated.

**Solution**: The migration should run automatically on startup. If it doesn't, manually delete the database file and restart:
```bash
rm backend/flowone.db
# Restart backend
```

## Next Steps

1. **Frontend Integration**: Update the Agent Configurator and Main Studio to support persona creation and selection in the UI
2. **Persona Templates**: Create pre-configured persona templates for common use cases (coach, tutor, assistant, etc.)
3. **Persona Versioning**: Add version control for personas to track changes over time
4. **Persona Analytics**: Track persona performance metrics (engagement, satisfaction, etc.)

## Related Documentation

- [TAVUS_AVATAR_WINDOWS_LIMITATION.md](TAVUS_AVATAR_WINDOWS_LIMITATION.md) - Windows platform limitations
- [PRODUCTION_PIPELINE_GUIDE.md](PRODUCTION_PIPELINE_GUIDE.md) - Production features guide
- [TAVUS_INTEGRATION_SUMMARY.md](TAVUS_INTEGRATION_SUMMARY.md) - Avatar setup guide

