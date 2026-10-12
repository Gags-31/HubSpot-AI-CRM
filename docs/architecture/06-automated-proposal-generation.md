# Automated Proposal Generation

**Code paths:** `backend/app/services/proposal.py, backend/app/routers/proposals.py`

## Purpose
Agreed terms are extracted from the conversation and rendered into a structured proposal.

## Flowchart
```mermaid
flowchart TD
  C[Conversation] --> NLP[NLP]
  NLP --> REQ[Requirements]
  REQ --> AGR[Agreements]
  AGR --> PA[Proposal Agent]
  PA --> T[Terms]
  T --> PDF[Rendered proposal]
```

## Source
See `backend/app/services/proposal.py, backend/app/routers/proposals.py` in this repository.
