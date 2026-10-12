# Security and Privacy

**Code paths:** `backend/app/security.py, backend/app/main.py (audit middleware)`

## Purpose
Authentication, role-based access, per-consumer permissions, audit logging, consent and retention.

## Flowchart
```mermaid
flowchart TD
  R[Request] --> A{Token / API key?}
  A -- no --> D[401]
  A -- yes --> RB[RBAC]
  RB --> C{Recording consent?}
  C -- no --> NS[Do not store]
  C -- yes --> EX[Execute]
  EX --> L[Audit log]
```

## Source
See `backend/app/security.py, backend/app/main.py (audit middleware)` in this repository.
