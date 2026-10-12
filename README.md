# HubSpot — Agentic AI CRM (Major Engineering Project)

Conversation in → structured intelligence out. Multi-agent AI, NLP, RAG, customer memory,
predictive analytics, automated proposal generation, product catalog + ordering, and security/audit.

## Live
- Website: `/web/` (served by the same FastAPI process)
- Architecture flowcharts: `/architecture.html`
- API docs: `/docs`

## Repo layout
```
HubSpot/
├── backend/
│   ├── main.py                     # FastAPI app: routers, static site, audit middleware
│   ├── architecture.html           # Mermaid flowcharts for all 16 modules
│   ├── requirements.txt
│   ├── Dockerfile
│   └── app/
│       ├── config.py models.py db.py security.py
│       ├── agents/agents.py        # 8 agents + CRM Manager orchestrator
│       ├── services/               # nlp, stt (Whisper), proposal, rag, predictive,
│       │                           # next_action, memory, catalog, orders
│       ├── streaming/              # kafka_bus.py, spark_job.py
│       └── routers/                # customers, conversations, proposals, products,
│                                   # orders, assistant, analytics, workspace, security
│   └── tests/test_api.py
├── frontend/                       # Next.js 14 static export (mounted at /web)
└── docs/                           # module breakdown + per-module architecture docs
```

## Run locally
```bash
cd backend && pip install -r requirements.txt
uvicorn main:app --reload
# website: http://localhost:8000/web/
```
Frontend (dev):
```bash
cd frontend && npm install && npm run dev   # http://localhost:3000
```
Docker:
```bash
docker compose up --build
```

## Modules
1. Conversational CRM app · 2. Consumer workspace · 3. Conversation recording · 4. NLP intelligence
5. Multi-agent AI · 6. Proposal generation · 7. Missing-info detection · 8. Big Data (Kafka/Spark)
9. Customer 360° · 10. Customer memory · 11. RAG assistant · 12. Predictive intelligence
13. Next-best-action · 14. Human-AI interaction · 15. Security/privacy · 16. AI CRM dashboard

See `docs/architecture/` for per-module flowcharts and `docs/PROJECT_BREAKDOWN.md` for the full spec.