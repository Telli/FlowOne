from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from settings import get_settings
from api import agents, sessions, voice
from api import flows, templates, nlp, health, avatars, metrics, multi_agent


app = FastAPI(
    title="FlowOne API", 
    version="0.2.0",
    description="Production-ready AI agent platform with multi-agent coordination"
)
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    print("🚀 Initializing database...")
    from memory.store import create_db, get_engine, get_agent, upsert_agent, Agent
    create_db(get_engine())
    
    # Seed default agent if not exists
    default_id = "agent_fitness_coach"
    if not get_agent(default_id):
        card = {
            "id": default_id,
            "name": "Fitness Coach",
            "persona": {
                "role": "You are a concise fitness coach that tailors workouts.",
                "goals": ["motivate", "10k-steps", "weekly-plan"],
                "tone": "friendly",
            },
            "tools": [],
            "memory": {"summaries": [], "vectors": []},
        }
        upsert_agent(Agent.from_card(card))
        print(f"✓ Seeded default agent: {default_id}")
    
    print("✓ Database initialized")
    print("✓ FlowOne API ready")


@app.get("/")
def root():
    """API root with feature flags"""
    return {
        "name": "FlowOne API",
        "version": "0.2.0",
        "features": {
            "production_pipeline": settings.USE_PRODUCTION_PIPELINE,
            "multi_agent": settings.ENABLE_MULTI_AGENT,
            "tavus_avatars": bool(settings.TAVUS_API_KEY),
            "screen_sharing": settings.ENABLE_SCREEN_SHARING
        }
    }


@app.get("/health")
def health_check():
    return {"ok": True}


# Core endpoints
app.include_router(agents.router, prefix="/agents", tags=["agents"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(voice.router, prefix="/voice", tags=["voice"])

# Flow and template management
app.include_router(flows.router, prefix="/flows", tags=["flows"])
app.include_router(templates.router, prefix="/templates", tags=["templates"])

# AI and NLP
app.include_router(nlp.router, prefix="/nlp/commands", tags=["nlp"])

# Monitoring and health
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(metrics.router, prefix="/metrics", tags=["metrics"])

# Multi-agent coordination
app.include_router(multi_agent.router, prefix="/multi-agent", tags=["multi-agent"])

# Avatars
app.include_router(avatars.router, prefix="/avatars", tags=["avatars"])



