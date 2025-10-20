# FlowOne - Quick Reference

## 🚀 Development Commands

```bash
# Start all applications
npm run dev

# Individual applications
npm run dev:backend      # Backend API (port 8000)
npm run dev:studio       # Main Studio (port 5173)
npm run dev:voice        # Voice Studio (port 5174)
npm run dev:configurator # Agent Configurator (port 5175)

# Testing
npm run test:e2e         # E2E tests
pytest                   # Backend tests
```

## 🌐 Application URLs

| Application | URL | Purpose |
|-------------|-----|---------|
| **Main Studio** | http://localhost:5173 | Canvas-based flow designer |
| **Voice Studio** | http://localhost:5174 | Real-time voice interactions |
| **Agent Configurator** | http://localhost:5175 | Simple configure/test UI |
| **Backend API** | http://localhost:8000 | FastAPI backend |
| **API Docs** | http://localhost:8000/docs | Swagger documentation |

## 🔑 Required Environment Variables

```bash
# Core APIs
GEMINI_API_KEY=your_gemini_key
DAILY_API_KEY=your_daily_key
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key

# Tavus Avatars (Optional)
TAVUS_API_KEY=your_tavus_key
TAVUS_DEFAULT_REPLICA_ID=your_replica_id

# Database
DATABASE_URL=sqlite:///./flowone.db
```

## 🎯 Key Features by Application

### Main Studio (Canvas Designer)
- ✅ Drag-and-drop agent creation
- ✅ Visual flow designer
- ✅ Real-time agent testing
- ✅ Flow saving/loading
- ✅ AI assistant integration
- ✅ Tavus avatar support

### Voice Studio (Voice Interactions)
- ✅ Push-to-talk interface
- ✅ Live transcript display
- ✅ Real-time avatar streaming
- ✅ Daily.co WebRTC integration
- ✅ Persona visualization

### Agent Configurator (Simple UI)
- ✅ Basic agent configuration
- ✅ Simple testing interface
- ✅ Configure/Test tabs

## 🎭 Avatar Integration (Tavus)

### Setup Steps
1. Create Tavus account at https://www.tavus.io
2. Upload 30-second video to create replica
3. Get API key and replica ID
4. Add to environment variables
5. Restart applications

### Avatar Features
- **Real-time streaming**: <500ms startup
- **Lip sync**: Perfect audio-video sync
- **Fallback**: Works without Tavus
- **Management**: Select/assign avatars to agents

## 🔧 Common Tasks

### Create Your First Agent
1. Open Main Studio (http://localhost:5173)
2. Click "Add Agent" in palette
3. Fill in details (name, role, goals, tone)
4. Select avatar (optional)
5. Click "Create Agent"
6. Drag to canvas and test

### Start Voice Session
1. Open Voice Studio (http://localhost:5174)
2. Enter Agent ID
3. Check "Enable Avatar" (optional)
4. Click "Start Session"
5. Hold "Push to Talk" to speak
6. Watch avatar respond

### Test Agent
1. Click "Test" on any agent node
2. Chat with agent in dialog
3. See avatar video (if enabled)
4. Monitor conversation quality

## 🐛 Troubleshooting

### Avatar Not Loading
```bash
# Check Tavus API key
echo $TAVUS_API_KEY

# Test Tavus API
curl -H "x-api-key: $TAVUS_API_KEY" https://api.tavus.io/v2/replicas
```

### Voice Not Working
```bash
# Check Daily API key
echo $DAILY_API_KEY

# Test backend health
curl http://localhost:8000/health
```

### Agent Creation Fails
```bash
# Check Gemini API key
echo $GEMINI_API_KEY

# Check backend logs
cd backend && python -m uvicorn app:app --reload
```

## 📊 API Endpoints

### Core Endpoints
- `POST /agents` - Create agent
- `GET /agents/{id}` - Get agent
- `PATCH /agents/{id}` - Update agent
- `POST /sessions` - Create session
- `WS /sessions/{id}/events` - Session events

### Avatar Endpoints
- `GET /avatars/replicas` - List replicas
- `GET /avatars/avatars` - List stored avatars
- `POST /avatars/replicas` - Create replica
- `DELETE /avatars/{id}` - Delete avatar

### Health Endpoints
- `GET /health` - Basic health check
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe
- `GET /health/status` - Detailed status

## 🧪 Testing Commands

```bash
# Backend tests
cd backend && pytest -v

# Frontend tests
cd src && npm test

# E2E tests
npm run test:e2e

# Coverage
cd backend && pytest --cov
cd src && npm run test:coverage
```

## 📁 Project Structure

```
FlowOne/
├── backend/                    # Python FastAPI
├── src/                        # Main Studio
├── frontend/
│   ├── voice-studio/          # Voice Studio
│   └── agent-configurator/    # Agent Configurator
├── packages/
│   └── agent-schema/          # Shared types
└── [docs...]
```

## 🚀 Production Deployment

### Build Commands
```bash
# Build all frontends
npm run build

# Individual builds
cd src && npm run build
cd frontend/voice-studio && npm run build
cd frontend/agent-configurator && npm run build
```

### Docker Commands
```bash
# Build images
docker build -t flowone-backend backend/
docker build -t flowone-studio src/
docker build -t flowone-voice frontend/voice-studio/
docker build -t flowone-configurator frontend/agent-configurator/

# Run containers
docker run -p 8000:8000 flowone-backend
docker run -p 5173:5173 flowone-studio
docker run -p 5174:5174 flowone-voice
docker run -p 5175:5175 flowone-configurator
```

## 📚 Documentation Files

- **`GETTING_STARTED.md`** - Complete user guide
- **`FRONTEND_STRUCTURE.md`** - Frontend architecture
- **`TAVUS_INTEGRATION_SUMMARY.md`** - Avatar integration guide
- **`TAVUS_IMPLEMENTATION_CHECKLIST.md`** - Implementation details
- **`QUICK_REFERENCE.md`** - This file

## 🎯 Common Use Cases

### Sales Automation
1. Create sales agent with B2B expertise
2. Add qualification and follow-up steps
3. Test with voice interactions
4. Deploy for customer conversations

### Customer Support
1. Design support flow with escalation
2. Add knowledge base integration
3. Test with common questions
4. Monitor with Langfuse

### Training & Coaching
1. Create coaching agents for different skills
2. Add progress tracking
3. Use voice for natural interactions
4. Monitor learning outcomes

---

**Need Help?** Check the full `GETTING_STARTED.md` guide or review the troubleshooting section above.
