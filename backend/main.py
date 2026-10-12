from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pathlib import Path

from app.config import settings
from app.routers import (
    analytics,
    assistant,
    conversations,
    customers,
    orders,
    products,
    proposals,
    security_router,
    workspace,
)
from app.agents.agents import CRMManagerAgent
from app import security

app = FastAPI(title=settings.PROJECT_NAME, version="2.0.0", docs_url="/docs")
manager = CRMManagerAgent()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (customers, conversations, proposals, products, orders, assistant, analytics, workspace, security_router):
    app.include_router(r.router)

BACKEND_DIR = Path(__file__).parent
WEB_BUILD = BACKEND_DIR / "app" / "web"
if WEB_BUILD.exists():
    from fastapi.staticfiles import StaticFiles

    app.mount("/web", StaticFiles(directory=WEB_BUILD, html=True), name="web")


@app.get("/architecture.html", include_in_schema=False)
def architecture_page():
    from fastapi.responses import FileResponse

    return FileResponse(BACKEND_DIR / "architecture.html")


@app.middleware("http")
async def audit_middleware(request, call_next):
    response = await call_next(request)
    security.audit(request.client.host if request.client else "unknown", request.method, str(request.url.path))
    response.headers["X-HubSpot-Project"] = settings.PROJECT_NAME
    return response


@app.get("/", response_class=HTMLResponse)
def home():
    return """<!doctype html><html><head><meta charset="utf-8"><title>HubSpot</title>
<style>body{font-family:system-ui;background:#0f172a;color:#e2e8f0;max-width:900px;margin:40px auto;padding:0 16px}
a{color:#60a5fa}button{margin:4px;padding:10px 16px;border:0;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer}
#out{white-space:pre-wrap;background:#1e293b;padding:16px;border-radius:8px;min-height:60px}</style></head><body>
<h1>HubSpot</h1><p><i>Talk to the customer. Let AI handle the CRM.</i></p>
<p><b>Website:</b> <a href="/web/">/web/</a> · <b>API Docs:</b> <a href="/docs">/docs</a> · <a href="/architecture.html">Architecture Flowchart</a></p>
<h3>Agents</h3>
<button onclick="run('conversation')">Conversation</button><button onclick="run('nlp')">NLP</button>
<button onclick="run('proposal')">Proposal</button><button onclick="run('recommendation')">Recommendation</button>
<button onclick="run('followup')">Follow-Up</button><button onclick="run('intelligence')">Intelligence</button>
<button onclick="run('next_action')">Next Action</button>
<h3>Output</h3><div id="out">Ready.</div>
<script>
async function run(agent){const r=await fetch('/agents/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent,customer_id:'Consumer_001',messages:['I need 50 units, budget Rs 2 lakh, delivery before the 20th'],name:'Rahul',conversations:14,avg_purchase:75000,sentiment:'Positive',intent:'Purchase',days:6,proposal_pending:true})});document.getElementById('out').textContent=JSON.stringify(await r.json(),null,2)}
</script></body></html>"""


@app.get("/health")
def health():
    return {"healthy": True, "project": settings.PROJECT_NAME, "version": "2.0.0"}


@app.post("/agents/run")
def run_agent(payload: dict):
    return manager.run(payload)