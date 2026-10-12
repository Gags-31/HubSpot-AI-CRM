# Multi-Agent AI Architecture

**Code paths:** `backend/app/agents/agents.py`

## Purpose
Eight specialised agents coordinated by the CRM Manager agent, each owning a domain of CRM work.

## Flowchart
```mermaid
flowchart TD
  O[CRM Manager] --> A1[Consumer]
  O --> A2[Conversation]
  O --> A3[NLP Intelligence]
  O --> A4[Proposal]
  O --> A5[Recommendation]
  O --> A6[Follow-Up]
  O --> A7[Customer Intelligence]
  O --> A8[Next Best Action]
  A4 --> S[services]
  A3 --> S
```

## Source
See `backend/app/agents/agents.py` in this repository.
