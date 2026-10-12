# AI Next-Best-Action Engine

**Code paths:** `backend/app/services/next_action.py, backend/app/agents/agents.py (NextActionAgent)`

## Purpose
Nine candidate dealer actions are scored from sentiment, intent, days since contact, pending proposals, churn risk and budget, then weighted and ranked.

## Flowchart
```mermaid
flowchart TD
  I[Signals: sentiment, intent, days, churn, budget] --> S[Score 9 candidate actions]
  S --> A1[Call]
  S --> A2[Message]
  S --> A3[Proposal]
  S --> A4[Recommend]
  S --> A5[Discount]
  S --> A6[Follow-up]
  S --> A7[Escalate]
  S --> A8[Request info]
  S --> A9[Do nothing]
  A1 --> T[Ranked plan]
```

## Notes
Every module runs with zero external services (SQLite + deterministic fallbacks) and upgrades automatically when PostgreSQL/Mongo/Kafka/Spark/Whisper/LLM keys are provided.
