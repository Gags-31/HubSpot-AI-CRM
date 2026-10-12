# Consumer-Specific Digital Workspace

**Code paths:** `backend/app/services/crm.py (workspace, write_workspace), backend/app/routers/workspace.py`

## Purpose
Every consumer gets an auto-created workspace with eight standard sections that agents fill as interactions happen. Backed by the workspace_entries table.

## Flowchart
```mermaid
flowchart LR
  N[New consumer detected] --> W[workspace_entries created]
  W --> S1[Profile]
  W --> S2[Conversations]
  W --> S3[Requirements]
  W --> S4[Products]
  W --> S5[Proposals]
  W --> S6[Documents]
  W --> S7[Followups]
  W --> S8[Interaction_History]
  PROPOSAL[Proposal agent] --> S5
  ORDERS[Orders] --> S4
```

## Notes
Every module runs with zero external services (SQLite + deterministic fallbacks) and upgrades automatically when PostgreSQL/Mongo/Kafka/Spark/Whisper/LLM keys are provided.
