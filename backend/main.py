"""HubSpot — Agentic AI CRM API + website.

The Next.js static site is served at "/" (from app/web/) and the entire backend API is
mounted under "/api/*" so the root URL opens the polished UI rather than an API probe.
"""
import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app import repository as repo, security, seed
from app.agents.agents import CRMManagerAgent
from app.config import settings
from app.observability import observe
from app.routers import (
    analytics,
    assistant,
    conversations,
    customers,
    ops,
    orders,
    products,
    proposals,
    security_router,
    workspace,
    ws,
)

BACKEND_DIR = Path(__file__).parent
WEB_BUILD = BACKEND_DIR / "app" / "web"
manager = CRMManagerAgent()


@asynccontextmanager
async def lifespan(_: FastAPI):
    repo.init_db()
    try:
        seed.run()
    except Exception as exc:  # noqa: BLE001
        logging.getLogger("hubspot").warning("seed skipped: %s", exc)
    yield


app = FastAPI(
    title="HubSpot AI CRM",
    version="3.0.0",
    description="Conversation in → structured intelligence out. Multi-agent AI, NLP, RAG, proposals, commerce.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


for r in (customers, conversations, proposals, products, orders, assistant, analytics, workspace, security_router, ops, ws):
    app.include_router(r.router, prefix="/api")


# ---------- convenience + legacy endpoints ----------
@app.get("/health")
@app.get("/api/health")
def health():
    return {
        "healthy": True,
        "project": settings.PROJECT_NAME,
        "version": app.version,
        "llm_configured": __import__("app.services.llm", fromlist=["llm"]).available(),
        "database": "sqlite",
        "agents": len(manager.describe()),
    }


@app.get("/api")
def api_root():
    return {"service": settings.PROJECT_NAME, "docs": "/api/docs", "health": "/api/health"}


@app.get("/architecture.html", include_in_schema=False)
def architecture_page():
    return FileResponse(BACKEND_DIR / "architecture.html")


# ---------- static site + SPA fallback ----------
if WEB_BUILD.exists():
    app.mount("/", StaticFiles(directory=WEB_BUILD, html=True), name="web_static")


@app.middleware("http")
async def telemetry_middleware(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    elapsed = time.perf_counter() - started
    observe(request.url.path, elapsed)
    security.audit(request.client.host if request.client else "anonymous", "http", f"{request.method} {request.url.path}")
    response.headers["X-HubSpot-Version"] = app.version
    response.headers["X-Response-Time-ms"] = str(round(elapsed * 1000, 2))
    return response


@app.post("/api/agents/run", include_in_schema=False)
@app.post("/agents/run", include_in_schema=False)
def run_agent(payload: dict):
    return manager.run(payload)