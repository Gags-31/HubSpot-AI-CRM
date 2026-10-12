# RAG-Based AI CRM Assistant

**Code paths:** `backend/app/services/rag.py, backend/app/routers/assistant.py`

## Purpose
Dealers ask questions in natural language; answers are grounded in structured records and retrieved context.

## Flowchart
```mermaid
flowchart LR
  Q[Question] --> DB[Structured search]
  Q --> VS[Vector search]
  DB --> LLM[Reasoning]
  VS --> LLM
  M[Memory] --> LLM
  LLM --> A[Grounded answer + sources]
```

## Source
See `backend/app/services/rag.py, backend/app/routers/assistant.py` in this repository.
