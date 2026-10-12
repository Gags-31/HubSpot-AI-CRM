# Multi-Agent AI Architecture

**Code paths:** `backend/app/agents/agents.py, backend/app/routers/ops.py`

## Purpose
Eleven specialised agents (consumer, conversation, NLP, proposal, recommendation, follow-up, customer intelligence, next-action, assistant/RAG, voice, ML) coordinated by the CRM Manager agent.

## Flowchart
```mermaid
flowchart TD
  O[CRM Manager orchestrator] --> A1[Consumer]
  O --> A2[Conversation]
  O --> A3[NLP Intelligence]
  O --> A4[Proposal]
  O --> A5[Recommendation]
  O --> A6[Follow-Up]
  O --> A7[Customer Intelligence]
  O --> A8[Next Best Action]
  O --> A9[Assistant RAG]
  O --> A10[Voice STT]
  O --> A11[ML]
  A4 --> S[services: crm, proposal, catalog]
  A7 --> S
  A9 --> S
```

## Notes
Every module runs with zero external services (SQLite + deterministic fallbacks) and upgrades automatically when PostgreSQL/Mongo/Kafka/Spark/Whisper/LLM keys are provided.
