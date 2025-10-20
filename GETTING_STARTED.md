# FlowOne - Getting Started Guide

Welcome to FlowOne! This guide will help you get up and running with the complete FlowOne platform, including the main studio, voice interactions, and real-time avatar features.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (3.11 or higher)
- **Git** (for cloning the repository)

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd FlowOne

# Install all dependencies
npm run install-all
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```bash
# Required API Keys
GEMINI_API_KEY=your_gemini_api_key_here
DAILY_API_KEY=your_daily_api_key_here
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_SECRET_KEY=your_langfuse_secret_key
LANGFUSE_HOST=https://cloud.langfuse.com

# Tavus Avatar Integration (Optional)
TAVUS_API_KEY=your_tavus_api_key_here
TAVUS_DEFAULT_REPLICA_ID=your_default_replica_id

# Database
DATABASE_URL=sqlite:///./flowone.db
```

### 3. Start the Application

```bash
# Start all services (recommended)
npm run dev

# Or start individually:
npm run dev:backend     # Backend API (http://localhost:8000)
npm run dev:studio      # Main Studio (http://localhost:5173)
npm run dev:voice       # Voice Studio (http://localhost:5174)
npm run dev:configurator # Agent Configurator (http://localhost:5175)
```

## 🎯 Applications Overview

FlowOne consists of three main applications:

### 1. **Main FlowOne Studio** 🎨
**URL**: http://localhost:5173  
**Purpose**: Canvas-based flow designer with drag-and-drop agent creation

**Features**:
- Visual flow designer with React Flow
- Drag-and-drop agent creation
- Real-time agent testing with avatars
- Flow saving and loading
- AI assistant integration
- Tavus avatar support

### 2. **Voice Studio** 🎤
**URL**: http://localhost:5174  
**Purpose**: Real-time voice interactions with agents

**Features**:
- Push-to-talk voice interface
- Live transcript display
- Real-time avatar streaming (Tavus)
- Daily.co WebRTC integration
- Persona visualization

### 3. **Agent Configurator** ⚙️
**URL**: http://localhost:5175  
**Purpose**: Simple configure/test interface for agents

**Features**:
- Simple agent configuration
- Basic testing interface
- Configure/Test tab interface

## 🎨 Main FlowOne Studio - Detailed Guide

### Getting Started with the Canvas

1. **Open the Studio**: Navigate to http://localhost:5173
2. **Create Your First Agent**:
   - Click "Add Agent" in the palette
   - Fill in agent details (name, role, goals, tone)
   - Select an avatar (if Tavus is configured)
   - Click "Create Agent"

3. **Design Your Flow**:
   - Drag agents from the palette to the canvas
   - Connect agents by dragging from output to input handles
   - Use the AI Assistant for natural language commands

### Key Features

#### **Agent Creation**
- **Name**: Give your agent a descriptive name
- **Role**: Define what the agent does (e.g., "Sales Coach", "Technical Support")
- **Goals**: List specific objectives (e.g., "increase conversion", "resolve tickets")
- **Tone**: Choose communication style (friendly, professional, casual)
- **Avatar**: Select a photorealistic avatar (requires Tavus setup)

#### **Flow Design**
- **Canvas**: Drag and drop agents to create workflows
- **Connections**: Link agents to create conversation flows
- **Testing**: Click "Test" on any agent to start a conversation
- **Saving**: Use the save/load controls to persist your flows

#### **AI Assistant**
- **Natural Commands**: Use voice or text to control the interface
- **Examples**:
  - "Create a sales agent for B2B software"
  - "Make the coach more encouraging"
  - "Add a follow-up step after the demo"

## 🎤 Voice Studio - Detailed Guide

### Setting Up Voice Interactions

1. **Open Voice Studio**: Navigate to http://localhost:5174
2. **Configure Session**:
   - Enter Agent ID (or use default: "agent_fitness_coach")
   - Check "Enable Avatar" for photorealistic avatars
   - Click "Start Session"

3. **Voice Interaction**:
   - Click and hold "Push to Talk" to speak
   - Release to send your message
   - Watch the avatar respond in real-time
   - View live transcripts of the conversation

### Voice Features

#### **Real-Time Avatar Streaming**
- **Tavus Integration**: Photorealistic avatars that sync with agent speech
- **Lip Sync**: Avatars mouth movements match the agent's voice
- **Facial Expressions**: Natural expressions during conversation
- **Fallback**: Works without Tavus (shows remote video instead)

#### **Live Transcripts**
- **Real-Time Display**: See conversation as it happens
- **User/Agent Distinction**: Clear labeling of who said what
- **Timestamps**: Track conversation timing
- **Search**: Find specific parts of the conversation

#### **Persona Visualization**
- **Live Updates**: See agent persona change in real-time
- **Persona Chips**: Visual representation of agent characteristics
- **Goal Tracking**: Monitor agent objectives during conversation

## ⚙️ Agent Configurator - Detailed Guide

### Simple Agent Setup

1. **Open Configurator**: Navigate to http://localhost:5175
2. **Configure Tab**:
   - Enter agent name and role
   - Set communication goals
   - Choose tone and style
   - Select avatar (if available)
   - Click "Generate Agent"

3. **Test Tab**:
   - Start a test session
   - Chat with your agent
   - See avatar in action
   - Monitor conversation quality

### Configuration Options

#### **Basic Settings**
- **Name**: Agent identifier
- **Role**: Primary function
- **Goals**: Specific objectives
- **Tone**: Communication style

#### **Advanced Settings**
- **Tools**: Available capabilities
- **Memory**: Knowledge base
- **Routing**: Decision logic
- **Avatar**: Visual representation

## 🎭 Tavus Avatar Integration

### Setting Up Avatars

1. **Get Tavus Account**:
   - Visit https://www.tavus.io
   - Create an account
   - Get your API key from the dashboard

2. **Create Avatar Replicas**:
   - Upload a 30-second video of a person
   - Wait for processing (usually 5-10 minutes)
   - Note the replica ID

3. **Configure Environment**:
   ```bash
   TAVUS_API_KEY=your_api_key_here
   TAVUS_DEFAULT_REPLICA_ID=your_replica_id
   ```

### Avatar Features

#### **Real-Time Streaming**
- **Phoenix API**: Live avatar generation from audio
- **Low Latency**: <500ms startup time
- **High Quality**: Photorealistic video output
- **Synchronized**: Perfect lip-sync with agent speech

#### **Avatar Management**
- **Selection**: Choose from available replicas
- **Assignment**: Link avatars to specific agents
- **Fallback**: Graceful degradation if unavailable
- **Thumbnails**: Visual previews in UI

## 🔧 Development & Testing

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests (Main Studio)
cd src
npm test

# E2E tests
npm run test:e2e
```

### API Documentation

- **Backend API**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **Avatar Endpoints**: http://localhost:8000/avatars

### Debugging

#### **Common Issues**

1. **Avatar Not Loading**:
   - Check `TAVUS_API_KEY` is set
   - Verify replica exists in Tavus dashboard
   - Check browser console for errors

2. **Voice Not Working**:
   - Ensure microphone permissions
   - Check Daily.co API key
   - Verify WebSocket connection

3. **Agent Creation Fails**:
   - Check Gemini API key
   - Verify backend is running
   - Check network connectivity

#### **Debug Commands**

```bash
# Check backend health
curl http://localhost:8000/health

# Test avatar API
curl http://localhost:8000/avatars/replicas

# Check database
sqlite3 flowone.db ".tables"
```

## 📊 Monitoring & Observability

### Langfuse Integration

- **Tracing**: All operations are traced
- **Metrics**: Performance and usage data
- **Logs**: Detailed operation logs
- **Dashboard**: Visit your Langfuse dashboard

### Key Metrics

- **Avatar Startup Time**: <500ms target
- **Voice Latency**: <200ms target
- **API Response Time**: <100ms target
- **Error Rate**: <1% target

## 🚀 Production Deployment

### Environment Variables

```bash
# Production settings
GEMINI_API_KEY=prod_key
DAILY_API_KEY=prod_key
TAVUS_API_KEY=prod_key
LANGFUSE_PUBLIC_KEY=prod_key
LANGFUSE_SECRET_KEY=prod_key
DATABASE_URL=postgresql://...
```

### Build Commands

```bash
# Build all frontends
npm run build

# Build individual apps
cd src && npm run build
cd frontend/voice-studio && npm run build
cd frontend/agent-configurator && npm run build
```

### Docker Deployment

```bash
# Backend
docker build -t flowone-backend backend/

# Frontend
docker build -t flowone-studio src/
docker build -t flowone-voice frontend/voice-studio/
docker build -t flowone-configurator frontend/agent-configurator/
```

## 🎯 Use Cases & Examples

### Sales Automation
1. Create a sales agent with B2B expertise
2. Add follow-up and qualification steps
3. Test with voice interactions
4. Deploy for customer conversations

### Customer Support
1. Design a support flow with escalation
2. Add knowledge base integration
3. Test with common questions
4. Monitor with Langfuse

### Training & Coaching
1. Create coaching agents for different skills
2. Add progress tracking
3. Use voice for natural interactions
4. Monitor learning outcomes

## 📚 Additional Resources

### Documentation
- **Architecture**: `Overview.md`
- **Tavus Integration**: `TAVUS_INTEGRATION_SUMMARY.md`
- **Frontend Structure**: `FRONTEND_STRUCTURE.md`
- **Implementation**: `TAVUS_IMPLEMENTATION_CHECKLIST.md`

### API References
- **Gemini API**: https://ai.google.dev
- **Daily.co**: https://docs.daily.co
- **Tavus API**: https://docs.tavus.io
- **Langfuse**: https://langfuse.com/docs

### Support
- **Issues**: Check GitHub issues
- **Debugging**: Use browser console and network tab
- **Logs**: Check backend logs for errors
- **Community**: Join our Discord/forum

## 🎉 Next Steps

1. **Explore the Canvas**: Try creating your first flow
2. **Test Voice Interactions**: Set up a voice session
3. **Configure Avatars**: Add photorealistic avatars
4. **Build Workflows**: Create complex agent interactions
5. **Monitor Performance**: Use Langfuse for insights

---

**Welcome to FlowOne!** 🚀 Start with the Main Studio to create your first agent, then explore Voice Studio for real-time interactions, and use the Agent Configurator for quick setups.

**Need Help?** Check the troubleshooting section or review the detailed documentation files in the project root.
