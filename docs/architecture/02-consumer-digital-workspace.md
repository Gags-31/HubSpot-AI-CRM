# Consumer-Specific Digital Workspace

**Code paths:** `backend/app/routers/workspace.py`

## Purpose
Auto-created folder per consumer with 8 standard sections, written by agents as interactions happen.

## Flowchart
```mermaid
flowchart LR
  N[New consumer] --> W[Consumer_00X workspace]
  W --> S1[Profile]
  W --> S2[Conversations]
  W --> S3[Requirements]
  W --> S4[Products]
  W --> S5[Proposals]
  W --> S6[Documents]
  W --> S7[Followups]
  W --> S8[Interaction_History]
```

## Source
See `backend/app/routers/workspace.py` in this repository.
