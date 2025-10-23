# FlowOne - AI Agent Platform

FlowOne is a comprehensive platform for creating, testing, and deploying AI agents with real-time voice interactions and photorealistic avatars.Building and configuring AI agents often involves juggling APIs, prompts, and parameters ,a process that’s powerful but cognitively overwhelming. FlowOne was created to reduce that cognitive load by turning complex agent logic into an intuitive visual and conversational experience.
Instead of managing code and context manually, users can see, connect, and speak their agents into existence — letting reasoning flow naturally between human intuition and machine intelligence.

## Quick Start

```bash
# Install dependencies
npm run install-all

# Start all applications
npm run dev
```

**Applications:**
- **Main Studio**: http://localhost:5173 ✨ (Primary application - visual flow designer, persona management, avatar configuration)
- **Backend API**: http://localhost:8000 (FastAPI backend)

**Legacy Applications** (deprecated - use Main Studio instead):
- Voice Studio: http://localhost:5174
- Agent Configurator: http://localhost:5175

## Documentation

### User Guides
- **[Getting Started Guide](GETTING_STARTED.md)** - Complete user guide
- **[Quick Reference](QUICK_REFERENCE.md)** - Commands and features

### Architecture & Features
- **[Frontend Structure](FRONTEND_STRUCTURE.md)** - Architecture overview
- **[Tavus Integration](TAVUS_INTEGRATION_SUMMARY.md)** - Avatar setup guide
- **[Persona Management Guide](PERSONA_MANAGEMENT_GUIDE.md)** - Tavus persona management (Windows compatible) ✨ NEW
- **[Production Pipeline Guide](PRODUCTION_PIPELINE_GUIDE.md)** - Production features
- **[Pipecat Recommendations](PIPECAT_RECOMMENDATIONS.md)** - Best practices

## Key Features

### Core Features
- **Visual Flow Designer**: Drag-and-drop agent creation in Main Studio
- **Persona Management**: Create and manage Tavus personas for avatar conversations ✨ NEW
- **Real-Time Voice**: Push-to-talk interactions with agents
- **Photorealistic Avatars**: Tavus integration for live avatar streaming (Windows compatible)
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
npm run dev:studio       # Main Studio (recommended) ✨
npm run dev:backend      # Backend API

# Legacy applications (deprecated)
npm run dev:voice        # Voice Studio (use Main Studio instead)
npm run dev:configurator # Agent Configurator (use Main Studio instead)

# Testing
npm run test:e2e         # E2E tests
pytest                   # Backend tests
```

## Avatar Integration

FlowOne includes Tavus integration for photorealistic avatar streaming:
- **Persona Management**: Create AI personas with custom system prompts and behavior ✨ NEW
- **Windows Compatible**: Phoenix REST mode works natively on Windows
- Real-time avatar generation from audio
- Perfect lip-sync with agent speech
- Avatar selection and management in Main Studio
- Graceful fallback when unavailable

See [PERSONA_MANAGEMENT_GUIDE.md](PERSONA_MANAGEMENT_GUIDE.md) for detailed setup instructions.

## Learn More

- **User Guide**: [GETTING_STARTED.md](GETTING_STARTED.md)
- **Persona Management**: [PERSONA_MANAGEMENT_GUIDE.md](PERSONA_MANAGEMENT_GUIDE.md) ✨ NEW
- **Quick Commands**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Architecture**: [FRONTEND_STRUCTURE.md](FRONTEND_STRUCTURE.md)
- **Avatar Setup**: [TAVUS_INTEGRATION_SUMMARY.md](TAVUS_INTEGRATION_SUMMARY.md)

---

**Ready to build AI agents?** Start with the [Getting Started Guide](GETTING_STARTED.md)!