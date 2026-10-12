# Conversation Recording System

**Code paths:** `backend/app/services/stt.py, backend/app/routers/conversations.py`

## Purpose
Voice is transcribed with open-source Whisper; every exchange is timestamped, summarised and entity-tagged.

## Flowchart
```mermaid
flowchart TD
  V[Voice] --> W[Whisper STT]
  T[Text] --> S[(Store)]
  W --> S
  S --> M[Timestamp / participants]
  M --> SUM[Summary]
  M --> E[Entities, requirements, agreements, sentiment, topics, actions]
```

## Source
See `backend/app/services/stt.py, backend/app/routers/conversations.py` in this repository.
