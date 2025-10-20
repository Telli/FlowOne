# FlowOne - AI Agent Platform

FlowOne is a comprehensive platform for creating, testing, and deploying AI agents with real-time voice interactions and photorealistic avatars.

## Quick Start

```bash
# Install dependencies
npm run install-all

# Start all applications
npm run dev
```

**Applications:**
- **Main Studio**: http://localhost:5173 (Canvas-based flow designer)
- **Voice Studio**: http://localhost:5174 (Real-time voice interactions)
- **Agent Configurator**: http://localhost:5175 (Simple configure/test UI)
- **Backend API**: http://localhost:8000 (FastAPI backend)

## Documentation

### User Guides
- **[Getting Started Guide](GETTING_STARTED.md)** - Complete user guide
- **[Quick Reference](QUICK_REFERENCE.md)** - Commands and features

### Architecture & Features
- **[Frontend Structure](FRONTEND_STRUCTURE.md)** - Architecture overview
- **[Tavus Integration](TAVUS_INTEGRATION_SUMMARY.md)** - Avatar setup guide
- **[Production Pipeline Guide](PRODUCTION_PIPELINE_GUIDE.md)** - Production features NEW
- **[Pipecat Recommendations](PIPECAT_RECOMMENDATIONS.md)** - Best practices

## Key Features

### Core Features
- **Visual Flow Designer**: Drag-and-drop agent creation
- **Real-Time Voice**: Push-to-talk interactions with agents
- **Photorealistic Avatars**: Tavus integration for live avatar streaming
- **AI Assistant**: Natural language command processing
- **Flow Management**: Save, load, and version your agent workflows
- **Multi-Modal**: Voice, text, and visual interactions

### Production Features NEW
- **Three-Model Pipeline**: STT → LLM → TTS for better observability
- **Enhanced Tracing**: Component-level monitoring with Langfuse
- **Multi-Agent Coordination**: Complex workflows with smart routing
- **Metrics Dashboard**: Real-time performance and cost tracking
- **Latency Indicators**: Visual performance feedback in UI

## Development

```bash
# Individual applications
npm run dev:studio       # Main Studio
npm run dev:voice        # Voice Studio  
npm run dev:configurator # Agent Configurator
npm run dev:backend      # Backend API

# Testing
npm run test:e2e         # E2E tests
pytest                   # Backend tests
```

## Avatar Integration

FlowOne includes Tavus integration for photorealistic avatar streaming:
- Real-time avatar generation from audio
- Perfect lip-sync with agent speech
- Avatar selection and management
- Graceful fallback when unavailable

## Learn More

- **User Guide**: [GETTING_STARTED.md](GETTING_STARTED.md)
- **Quick Commands**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Architecture**: [FRONTEND_STRUCTURE.md](FRONTEND_STRUCTURE.md)
- **Avatar Setup**: [TAVUS_INTEGRATION_SUMMARY.md](TAVUS_INTEGRATION_SUMMARY.md)

---

**Ready to build AI agents?** Start with the [Getting Started Guide](GETTING_STARTED.md)!