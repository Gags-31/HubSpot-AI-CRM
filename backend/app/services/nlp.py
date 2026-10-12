"""NLP pipeline: tokenisation, NER-ish extraction, intent, sentiment, topics,
agreements, questions, complaints and semantic similarity.

Deterministic and dependency-free. Replace with spaCy / transformers in production:
    spacy.load("en_core_web_sm") for NER; transformers pipeline for classification.
"""
import math
import re
from collections import Counter

STOPWORDS = set(
    "a an the and or but if then of to in on at for with about i we you he she they my our your is are was were "
    "be been being do does did have has had will would can could should please this that these those it its as by "
    "from not no so very just also me us them there here what which who when where how why".split()
)

POSITIVE = {"good", "great", "happy", "satisfied", "excellent", "love", "thanks", "thank", "perfect", "best", "helpful", "quick"}
NEGATIVE = {"bad", "angry", "poor", "complaint", "delay", "delayed", "late", "broken", "refund", "worst", "unsatisfied", "issue", "problem", "rude"}

INTENTS = {
    "Purchase": ["buy", "purchase", "need", "order", "quote me", "units", "interested in", "book"],
    "Pricing Inquiry": ["price", "quote", "cost", "budget", "discount", "rate", "charges"],
    "Complaint": ["complaint", "issue", "problem", "not working", "delay", "refund", "complain", "late"],
    "Follow-up": ["follow", "update", "status", "pending", "waiting"],
    "Support": ["support", "help", "warranty", "repair", "service"],
    "Greeting": ["hello", "hi", "hey", "good morning", "good evening"],
}

TOPIC_KEYWORDS = {
    "delivery": ["delivery", "deliver", "shipment", "shipping", "dispatch", "lead time"],
    "payment": ["payment", "invoice", "installment", "emi", "credit", "terms"],
    "warranty": ["warranty", "guarantee", "support", "amc", "maintenance"],
    "quantity": ["units", "quantity", "pieces", "qty", "lot", "batch"],
    "installation": ["install", "installation", "commissioning", "setup", "site"],
    "negotiation": ["discount", "negotiate", "reduce", "best price", "offer"],
}

AGREEMENT_MARKERS = ["agree", "agreed", "confirmed", "confirm", "accepted", "approved", "let's proceed", "go ahead", "finalize", "finalise"]
QUESTION_MARKERS = ["?", "what", "which", "when", "where", "how much", "can you", "do you", "is there", "any update"]

STOP_ENTITIES = ("units", "pieces", "items", "kg", "bags", "boxes", "sets", "kits")


def tokenize(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9']+", (text or "").lower())]


def content_tokens(text: str) -> list[str]:
    return [t for t in tokenize(text) if t not in STOPWORDS]


def sentiment(text: str) -> dict:
    tokens = set(tokenize(text))
    pos = sorted(tokens & POSITIVE)
    neg = sorted(tokens & NEGATIVE)
    if len(pos) > len(neg):
        label, score = "Positive", min(0.99, 0.55 + 0.1 * (len(pos) - len(neg)))
    elif len(neg) > len(pos):
        label, score = "Negative", min(0.99, 0.55 + 0.1 * (len(neg) - len(pos)))
    else:
        label, score = "Neutral", 0.5
    return {"label": label, "score": round(score, 3), "positive": pos, "negative": neg}


def intent(text: str) -> dict:
    t = (text or "").lower()
    scores = {name: sum(1 for kw in kws if kw in t) for name, kws in INTENTS.items()}
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return {"label": "General", "scores": scores}
    return {"label": best, "confidence": round(min(0.99, 0.4 + 0.2 * scores[best]), 2), "scores": scores}


def topics(text: str) -> list[str]:
    t = (text or "").lower()
    return [name for name, kws in TOPIC_KEYWORDS.items() if any(k in t for k in kws)]


def agreements(text: str) -> list[str]:
    t = (text or "").lower()
    return [m for m in AGREEMENT_MARKERS if m in t]


def is_question(text: str) -> bool:
    return any(m in (text or "").lower() for m in QUESTION_MARKERS)


def is_complaint(text: str) -> bool:
    return intent(text)["label"] == "Complaint" or sentiment(text)["label"] == "Negative"


def extract_entities(text: str) -> dict:
    raw = text or ""
    low = raw.lower()

    qty = re.search(r"(\d[\d,]*)\s*(?:[a-z\-]+\s+){0,2}?(units?|pieces?|pcs|items?|kits?|sets?|boxes|bags|kg)\b", low)
    budget = re.search(r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(lakh|lakhs|crore|cr|k|thousand)?", low)
    delivery = re.search(r"\bbefore\s+([\w\s]+\d+[\w]*|\w+day|\w+\s+\w+day|monday|tuesday|wednesday|thursday|friday|saturday|sunday)", low)
    date = re.search(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}(st|nd|rd|th))\b", low)
    location = re.search(r"\b(?:in|at|to|for)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b", raw)
    money = None
    if budget:
        value = float(budget.group(1).replace(",", ""))
        unit = (budget.group(2) or "").lower()
        if unit in ("lakh", "lakhs"):
            value *= 100000
        elif unit == "crore" or unit == "cr":
            value *= 10000000
        elif unit == "k" or unit == "thousand":
            value *= 1000
        money = value

    return {
        "quantity": f"{qty.group(1).replace(',', '')} {qty.group(2)}" if qty else None,
        "quantity_value": int(qty.group(1).replace(",", "")) if qty else None,
        "budget": f"Rs {budget.group(1)}{' ' + (budget.group(2) or '') if budget and budget.group(2) else ''}" if budget else None,
        "budget_value": money,
        "delivery": f"Before {delivery.group(1).strip()}" if delivery else None,
        "date": date.group(1) if date else None,
        "location": location.group(1) if location else None,
        "intent": intent(raw)["label"],
        "priority": "High" if any(k in low for k in ["urgent", "asap", "immediately", "today"]) else "Normal",
        "agreement": bool(agreements(raw)),
        "question": is_question(raw),
        "complaint": is_complaint(raw),
        "topics": topics(raw),
    }


def keywords(text: str, top: int = 6) -> list[str]:
    return [w for w, _ in Counter(content_tokens(text)).most_common(top)]


def summarize(messages: list[str], max_sentences: int = 2) -> str:
    text = " ".join(messages)
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    if len(sentences) <= max_sentences:
        return text.strip()
    counts = Counter(content_tokens(text))
    scored = sorted(sentences, key=lambda s: sum(counts[w] for w in content_tokens(s)), reverse=True)
    return " ".join(scored[:max_sentences]).strip()


def similarity(a: str, b: str) -> float:
    ta, tb = Counter(tokenize(a)), Counter(tokenize(b))
    if not ta or not tb:
        return 0.0
    common = set(ta) & set(tb)
    dot = sum(ta[w] * tb[w] for w in common)
    norm = math.sqrt(sum(v * v for v in ta.values())) * math.sqrt(sum(v * v for v in tb.values()))
    return round(dot / norm, 4) if norm else 0.0


def analyze(messages: list[str]) -> dict:
    """One-shot conversation intelligence pass used by the Conversation agent."""
    joined = " ".join(messages)
    return {
        "summary": summarize(messages),
        "entities": extract_entities(joined),
        "sentiment": sentiment(joined)["label"],
        "sentiment_score": sentiment(joined)["score"],
        "intent": intent(joined),
        "topics": topics(joined),
        "agreements": agreements(joined),
        "keywords": keywords(joined),
    }