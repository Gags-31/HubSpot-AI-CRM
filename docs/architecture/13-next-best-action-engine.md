# AI Next-Best-Action Engine

**Code paths:** `backend/app/services/next_action.py`

## Purpose
Ranks candidate dealer actions using history, conversation, predicted behaviour and open requirements.

## Flowchart
```mermaid
flowchart TD
  I[Context] --> S[Score actions]
  S --> A1[Call]
  S --> A2[Message]
  S --> A3[Proposal]
  S --> A4[Recommend]
  S --> A5[Discount]
  S --> A6[Follow-up]
  S --> A7[Escalate]
  A1 --> T[Top action]
```

## Source
See `backend/app/services/next_action.py` in this repository.
