# Customer 360° Intelligence

**Code paths:** `backend/app/routers/analytics.py`

## Purpose
A complete AI-generated view of each consumer assembled from conversations, orders, memory and predictions.

## Flowchart
```mermaid
flowchart LR
  S1[Conversations] --> X[360 Engine]
  S2[Orders] --> X
  S3[Proposals] --> X
  S4[Sentiment] --> X
  X --> O1[Conversation count]
  X --> O2[Products of interest]
  X --> O3[Average purchase]
  X --> O4[Purchase probability]
  X --> O5[Churn risk]
```

## Source
See `backend/app/routers/analytics.py` in this repository.
