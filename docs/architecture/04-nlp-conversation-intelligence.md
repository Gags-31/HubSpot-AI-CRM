# NLP Conversation Intelligence

**Code paths:** `backend/app/services/nlp.py`

## Purpose
Conversations are understood, not just stored: intent, sentiment, NER-style extraction, summarisation, complaints, semantic similarity.

## Flowchart
```mermaid
flowchart TD
  IN[Transcript] --> NER[NER]
  IN --> ID[Intent]
  IN --> SA[Sentiment]
  IN --> RE[Requirement extraction]
  IN --> PE[Product / price / quantity / date]
  IN --> AD[Agreement]
  IN --> SU[Summarisation]
  IN --> CD[Complaint]
  RE --> OUT[Structured requirement set]
```

## Source
See `backend/app/services/nlp.py` in this repository.
