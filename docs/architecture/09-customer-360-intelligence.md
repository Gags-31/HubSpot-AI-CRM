# Customer 360° Intelligence

**Code paths:** `backend/app/services/crm.py (customer_360), backend/app/routers/analytics.py`

## Purpose
A complete AI-generated view of each consumer assembled from conversations, orders, proposals, memory and sentiment, exposed per-customer and as a dealer portfolio.

## Flowchart
```mermaid
flowchart LR
  S1[Conversations] --> X[360 engine]
  S2[Orders + spend] --> X
  S3[Proposals] --> X
  S4[Sentiment + intent] --> X
  S5[Memory] --> X
  X --> O1[Conversation count]
  X --> O2[Products of interest]
  X --> O3[Total spend]
  X --> O4[Current requirement]
  X --> O5[Portfolio view]
```

## Notes
Every module runs with zero external services (SQLite + deterministic fallbacks) and upgrades automatically when PostgreSQL/Mongo/Kafka/Spark/Whisper/LLM keys are provided.
