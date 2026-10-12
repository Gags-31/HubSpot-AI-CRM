# Security and Privacy

**Code paths:** `backend/app/security.py, backend/app/routers/security_router.py, backend/main.py (telemetry middleware)`

## Purpose
PBKDF2 password hashing, HS256 JWT issuance and verification, RBAC scopes, per-consumer recording consent, and an append-only audit trail for every request.

## Flowchart
```mermaid
flowchart TD
  R[Request] --> T{JWT valid?}
  T -- no --> D[401]
  T -- yes --> RB[Scope check: read/write]
  RB --> C{Recording consent?}
  C -- no --> NS[Do not persist conversation]
  C -- yes --> EX[Execute + persist]
  EX --> AU[(audit trail)]
  AU --> RPT[Privacy report / audit log endpoint]
```

## Notes
Every module runs with zero external services (SQLite + deterministic fallbacks) and upgrades automatically when PostgreSQL/Mongo/Kafka/Spark/Whisper/LLM keys are provided.
