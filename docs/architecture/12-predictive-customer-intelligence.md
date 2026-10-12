# Predictive Customer Intelligence

**Code paths:** `backend/app/services/predictive.py`

## Purpose
ML-style scoring of purchase probability, conversion, churn, CLV, proposal acceptance, engagement and preference.

## Flowchart
```mermaid
flowchart TD
  H[History] --> F[Features]
  F --> M1[Purchase probability]
  F --> M2[Churn risk]
  F --> M3[CLV]
  F --> M4[Acceptance]
  M1 --> R[AI recommendation]
```

## Source
See `backend/app/services/predictive.py` in this repository.
