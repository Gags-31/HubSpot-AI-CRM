# Big Data Architecture & Processing

**Code paths:** `backend/app/streaming/kafka_bus.py, spark_job.py`

## Purpose
Kafka streams conversation events, Spark performs large-scale analytics and ML feature generation.

## Flowchart
```mermaid
flowchart TD
  D[Conversations / audio / profiles / orders] --> K[Kafka]
  K --> S[Spark]
  S --> FE[Feature generation]
  S --> AN[Analytics]
  S --> ML[ML processing]
  FE --> CI[Customer Intelligence]
```

## Source
See `backend/app/streaming/kafka_bus.py, spark_job.py` in this repository.
