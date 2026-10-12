# Conversational CRM Application

**Code paths:** `frontend/app/chat/page.jsx, frontend/lib/api.js, backend/app/routers/conversations.py`

## Purpose
The single entry point where a consumer and a dealer talk over text or voice. Each message is recorded, streamed back with live NLP analysis, and finally closed into a structured requirement set.

## Flowchart
```mermaid
flowchart TD
  U[Consumer / Dealer] --> UI[React conversational UI]
  UI -->|WebSocket /ws/conversation| WS[Conversation server]
  WS --> REC[store message in SQLite]
  REC --> NLP[NLP analysis per turn]
  NLP --> LIVE[stream entities + sentiment back to UI]
  LIVE --> CLOSE[End conversation -> requirement set]
  CLOSE --> PROPOSAL[Proposal agent]
```

## Notes
Every module runs with zero external services (SQLite + deterministic fallbacks) and upgrades automatically when PostgreSQL/Mongo/Kafka/Spark/Whisper/LLM keys are provided.
