# Customer Memory Layer

**Code paths:** `backend/app/services/memory.py, backend/app/services/crm.py (remember/recall)`

## Purpose
Long-term memory of requirements, purchases, preferences, complaints, proposals, negotiations, agreements and communication history, persisted per customer and feeding proposals, predictions and next actions.

## Flowchart
```mermaid
flowchart TD
  I[Every turn / order / proposal] --> M[(memory table)]
  M --> R1[last_requirement]
  M --> R2[last_sentiment]
  M --> R3[last_intent]
  M --> R4[last_proposal_id]
  M --> R5[order value]
  R1 --> N[Feeds NBA + proposals]
  R3 --> N
```

## Notes
Every module runs with zero external services (SQLite + deterministic fallbacks) and upgrades automatically when PostgreSQL/Mongo/Kafka/Spark/Whisper/LLM keys are provided.
