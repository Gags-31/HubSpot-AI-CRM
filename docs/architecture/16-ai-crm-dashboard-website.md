# AI CRM Dashboard & Website

**Code paths:** `frontend/app/*, backend/main.py static mount`

## Purpose
The public-facing site — dashboard, live chat, catalog, orders, proposals, customer 360 and a platform console — served by the API process so one URL exposes everything.

## Flowchart
```mermaid
flowchart TD
  W[Next.js static site] --> API[FastAPI]
  API --> C[Customers + workspace]
  API --> P[Products + orders]
  API --> PR[Proposals + PDF]
  API --> A[Analytics + 360]
  API --> OPS[Agents + ML + jobs + metrics]
  API --> DOCS[Swagger + architecture]
```

## Notes
Every module runs with zero external services (SQLite + deterministic fallbacks) and upgrades automatically when PostgreSQL/Mongo/Kafka/Spark/Whisper/LLM keys are provided.
