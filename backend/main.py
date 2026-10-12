"""HubSpot — Agentic AI CRM API.

FastAPI application wiring the full system: conversational interface, NLP intelligence,
multi-agent orchestration, proposal generation, product catalog + ordering, customer 360°,
RAG assistant, predictive analytics, security/audit, telemetry and a static website.
"""
import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from app import observability, repository as repo, security, seed
from app.agents.agents import CRMManagerAgent
from app.config import settings
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


@asynccontextmanager
async def lifespan(_: FastAPI):
    repo.init_db()
    try:
        seed.run()
    except Exception as exc:  # noqa: BLE001 - seeding must never block boot
        logging.getLogger("hubspot").warning("seed skipped: %s", exc)
    yield


app = FastAPI(
    title="HubSpot AI CRM",
    version="3.0.0",
    description="Conversation in → structured intelligence out. Multi-agent AI, NLP, RAG, proposals, commerce.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)
manager = CRMManagerAgent()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (customers, conversations, proposals, products, orders, assistant, analytics, workspace, security_router, ops, ws):
    app.include_router(r.router)

if WEB_BUILD.exists():
    app.mount("/web", StaticFiles(directory=WEB_BUILD, html=True), name="web")


@app.middleware("http")
async def telemetry_middleware(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    elapsed = time.perf_counter() - started
    observability.observe(request.url.path, elapsed)
    security.audit(request.client.host if request.client else "anonymous", "http", f"{request.method} {request.url.path}")
    response.headers["X-HubSpot-Version"] = app.version
    response.headers["X-Response-Time-ms"] = str(round(elapsed * 1000, 2))
    return response


@app.get("/", response_class=HTMLResponse)
def home():
    return """<!doctype html><html><head><meta charset="utf-8"><title>HubSpot — AI CRM</title>
<style>body{font-family:system-ui;background:#0b1220;color:#e2e8f0;max-width:920px;margin:40px auto;padding:0 16px}
a{color:#60a5fa}button{margin:4px;padding:10px 16px;border:0;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer}
#out{white-space:pre-wrap;background:#111c33;padding:16px;border-radius:8px;min-height:60px;font-size:13px}
.card{border:1px solid #1e293b;border-radius:10px;padding:12px;margin:12px 0}</style></head><body>
<h1>HubSpot</h1><p><i>Talk to the customer. Let AI handle the CRM.</i></p>
<div class="card">
<p><b>Website</b> <a href="/web/">/web/</a> · <b>Architecture</b> <a href="/architecture.html">/architecture.html</a> ·
<b>API docs</b> <a href="/docs">/docs</a> · <b>Metrics</b> <a href="/ops/metrics">/ops/metrics</a></p>
<p>Demo login: <code>dealer / dealer@123</code> → <a href="/docs">POST /security/login</a></p>
</div>
<h3>Agents</h3>
<button onclick="run('conversation')">Conversation</button><button onclick="run('nlp')">NLP</button>
<button onclick="run('proposal')">Proposal</button><button onclick="run('recommendation')">Recommendation</button>
<button onclick="run('followup')">Follow-Up</button><button onclick="run('intelligence')">Intelligence</button>
<button onclick="run('next_action')">Next Action</button><button onclick="run('assistant')">Ask AI (RAG)</button>
<button onclick="run('voice')">Voice (STT)</button><button onclick="run('ml')">ML model</button>
<h3>Output</h3><div id="out">Ready.</div>
<script>
async function run(agent){const r=await fetch('/ops/agents/'+agent,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customer_id:'Consumer_DEMO01',messages:['I need 50 units, budget Rs 2 lakh, delivery before the 20th. This is urgent.'],query:'What did this customer ask for?',conversations:14})});document.getElementById('out').textContent=JSON.stringify(await r.json(),null,2)}
</script></body></html>"""


@app.get("/architecture.html", include_in_schema=False)
def architecture_page():
    return FileResponse(BACKEND_DIR / "architecture.html")


@app.get("/health")
def health():
    return {
        "healthy": True,
        "project": settings.PROJECT_NAME,
        "version": app.version,
        "llm_configured": __import__("app.services.llm", fromlist=["llm"]).available(),
        "database": "sqlite",
        "agents": len(manager.describe()),
    }


@app.post("/agents/run")
def run_agent(payload: dict):
    return manager.run(payload)