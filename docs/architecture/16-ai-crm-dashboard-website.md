# AI CRM Dashboard & Website

**Code paths:** `frontend/app/*, backend/main.py static mount`

## Purpose
The public-facing site: dashboard, conversation view, catalog, orders and customer 360°, served by the API process.

## Flowchart
```mermaid
flowchart TD
  W[Next.js static site] --> API[FastAPI]
  API --> C[Customers]
  API --> P[Products / Orders]
  API --> A[Analytics]
  API --> DOCS[Swagger docs]
```

## Source
See `frontend/app/*, backend/main.py static mount` in this repository.
