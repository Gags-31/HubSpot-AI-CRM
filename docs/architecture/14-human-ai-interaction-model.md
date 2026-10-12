# Human-AI Interaction Model

**Code paths:** `frontend/app/chat/page.jsx`

## Purpose
The human only communicates, presses a button, reviews and approves; the AI performs every CRM operation.

## Flowchart
```mermaid
flowchart LR
  H1[Open app] --> H2[Talk] --> H3[Press button] --> H4[Review] --> H5[Approve / Send]
  H4 --> AI[AI records, extracts, remembers, predicts, generates, recommends]
```

## Source
See `frontend/app/chat/page.jsx` in this repository.
