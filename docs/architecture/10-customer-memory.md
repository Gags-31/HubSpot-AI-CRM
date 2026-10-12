# Customer Memory Layer

**Code paths:** `backend/app/services/memory.py`

## Purpose
Long-term memory of requirements, purchases, preferences, complaints, proposals, negotiations, agreements and history.

## Flowchart
```mermaid
flowchart TD
  I[Every interaction] --> M[(Customer Memory)]
  M --> R1[Requirements]
  M --> R2[Purchases]
  M --> R3[Preferences]
  M --> R4[Complaints]
  M --> R5[Proposals]
  M --> N[Feeds proposals / prediction / next action]
```

## Source
See `backend/app/services/memory.py` in this repository.
