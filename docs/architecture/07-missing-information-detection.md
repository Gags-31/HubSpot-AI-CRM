# Intelligent Missing-Information Detection

**Code paths:** `backend/app/services/proposal.py (completeness, missing_information), backend/app/routers/proposals.py (ask-missing)`

## Purpose
Before a proposal is finalised the system scores completeness and asks the dealer for every absent field, then re-renders the proposal at the next version.

## Flowchart
```mermaid
flowchart TD
  T[Terms] --> C{Complete?}
  C -- no --> MISS[Score + list missing fields]
  MISS --> Q[Auto-generated questions]
  Q --> A[Dealer answers]
  A --> U[Update terms, version + 1]
  U --> C
  C -- yes --> EMIT[Emit final proposal]
```

## Notes
Every module runs with zero external services (SQLite + deterministic fallbacks) and upgrades automatically when PostgreSQL/Mongo/Kafka/Spark/Whisper/LLM keys are provided.
