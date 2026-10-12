# Predictive Customer Intelligence

**Code paths:** `backend/app/services/ml.py, backend/app/services/predictive.py`

## Purpose
Feature engineering per customer (conversations, orders, spend, negative sentiment, priority) feeding a scikit-learn logistic-regression model for purchase probability and churn risk, with a transparent heuristic fallback.

## Flowchart
```mermaid
flowchart TD
  H[Interaction history] --> F[Feature rows]
  F --> T[Train / CV score]
  T --> M[Logistic regression model]
  F --> H2[Heuristic fallback]
  M --> P1[Purchase probability]
  M --> P2[Churn risk]
  M --> P3[CLV estimate]
  M --> P4[Engagement]
  P1 --> REC[AI recommendation]
```

## Notes
Every module runs with zero external services (SQLite + deterministic fallbacks) and upgrades automatically when PostgreSQL/Mongo/Kafka/Spark/Whisper/LLM keys are provided.
