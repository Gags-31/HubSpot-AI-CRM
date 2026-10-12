# Big Data Architecture & Processing

**Code paths:** `backend/app/streaming/kafka_bus.py, backend/app/streaming/spark_job.py, backend/app/observability.py`

## Purpose
Kafka-style event bus for conversation events, Spark-style batch feature generation hooks, plus streaming metrics. Both degrade to stubs when the libraries are absent.

## Flowchart
```mermaid
flowchart TD
  D[Conversations / audio / profiles / orders] --> K[Event bus kafka_bus]
  K --> SPARK[Spark job feature generation]
  SPARK --> CI[Customer intelligence features]
  CI --> ML[Churn / purchase models]
  ML --> NBA[Next-best-action]
  K --> OBS[Observability metrics]
```

## Notes
Every module runs with zero external services (SQLite + deterministic fallbacks) and upgrades automatically when PostgreSQL/Mongo/Kafka/Spark/Whisper/LLM keys are provided.
