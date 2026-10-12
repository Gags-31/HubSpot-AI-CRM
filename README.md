# HubSpot — Agentic AI CRM (Major Engineering Project)

**Conversation in → structured intelligence out.** A multi-agent AI CRM for dealers: it records and
understands consumer conversations, extracts requirements, maintains long-term customer memory, generates
proposals, recommends products, predicts behaviour and tells the dealer the next best action.

## Live
| Surface | URL |
|---|---|
| Website | `/web/` |
| Live conversation (WebSocket) | `/web/chat/` |
| Products & catalog | `/web/products/` |
| Orders | `/web/orders/` |
| Proposals (+ PDF export) | `/web/proposals/` |
| Customer 360° | `/web/consumers/` |
| Platform console (agents, ML, jobs, telemetry) | `/web/platform/` |
| Architecture flowcharts (16 modules) | `/architecture.html` |
| Swagger API docs | `/docs` |

## Architecture
```
React/Next.js site  ──HTTP/WS──►  FastAPI  ──►  agents (11)  ──►  services
                                                            ├── nlp        (intent, NER, sentiment, topics)
                                                            ├── llm        (OpenAI-compatible, optional)
                                                            ├── vectorstore(embeddings + cosine RAG)
                                                            ├── proposal   (terms, completeness, PDF)
                                                            ├── ml         (logistic regression + fallback)
                                                            ├── next_action(scored action ranking)
                                                            ├── crm        (business logic)
                                                            └── security   (JWT, RBAC, consent, audit)
                                        │
                                        ├── SQLite repository (14 tables)
                                        ├── background job runner (transcribe / propose / train)
                                        └── Kafka + Spark hooks (stub-safe)
```

## Data model (SQLite, 14 tables)
`customers · conversations · messages · requirements · proposals · products · orders · order_items ·
memory · workspace_entries · vectors · users · audit · metrics`

## Repository layout
```
HubSpot/
├── backend/
│   ├── main.py                 # app, routers, static mount, telemetry + audit middleware
│   ├── architecture.html       # live Mermaid flowcharts for all modules
│   ├── requirements.txt  Dockerfile  tests/test_api.py
│   └── app/
│       ├── repository.py       # SQLite schema + helpers
│       ├── config.py  models.py  db.py  security.py  tasks.py  observability.py  seed.py
│       ├── agents/agents.py    # 11 agents + CRM Manager orchestrator
│       ├── services/           # crm, nlp, llm, vectorstore, rag, proposal, ml,
│       │                       # predictive, next_action, memory, catalog, orders, stt
│       ├── streaming/          # kafka_bus.py, spark_job.py
│       └── routers/            # customers, conversations, proposals, products, orders,
│                               # assistant, analytics, workspace, security, ops, ws
├── frontend/                   # Next.js 14 static export (mounted at /web)
├── docs/architecture/          # 16 per-module docs with flowcharts
└── .github/workflows/ci.yml    # backend tests + frontend build
```

## Run
```bash
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
# website http://localhost:8000/web/   docs http://localhost:8000/docs
cd frontend && npm install && npm run dev     # dev mode
docker compose up --build                      # full stack
pytest backend/tests -q                        # test suite
```

## Configuration
Everything runs with zero external services. Set these to upgrade:
`OPENAI_API_KEY` (LLM narratives) · `WHISPER_MODEL`/`openai-whisper` (speech) ·
`kafka-python`/`pyspark` (streaming) · `DATABASE_URL` (PostgreSQL) · `MONGO_URL` ·
`scikit-learn` (trained models) · `HUBSPOT_SECRET` (JWT signing).

## Modules
1 Conversational CRM app · 2 Consumer workspace · 3 Conversation recording · 4 NLP intelligence ·
5 Multi-agent AI · 6 Proposal generation · 7 Missing-info detection · 8 Big Data (Kafka/Spark) ·
9 Customer 360° · 10 Customer memory · 11 RAG assistant · 12 Predictive intelligence ·
13 Next-best-action · 14 Human-AI interaction · 15 Security/privacy · 16 Dashboard & website