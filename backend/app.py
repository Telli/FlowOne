from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.settings import get_settings
from backend.api import agents, sessions, voice
from backend.api import flows, templates, nlp, health


app = FastAPI(title="FlowOne API", version="0.1.0")
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


app.include_router(agents.router, prefix="/agents", tags=["agents"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(voice.router, prefix="/voice", tags=["voice"])
app.include_router(flows.router, prefix="/flows", tags=["flows"])
app.include_router(templates.router, prefix="/templates", tags=["templates"])
app.include_router(nlp.router, prefix="/nlp/commands", tags=["nlp"])
app.include_router(health.router, prefix="/health", tags=["health"])



