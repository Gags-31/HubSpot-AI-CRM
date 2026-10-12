"""LLM layer: OpenAI-compatible HTTP client when an API key is present,
deterministic domain logic otherwise. Every agent calls through here.
"""
import json
import os
import urllib.error
import urllib.request

API_KEY = os.getenv("OPENAI_API_KEY", "")
BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = (
    "You are the reasoning core of HubSpot, an AI-first CRM for dealers. "
    "Answer only from the provided CRM context. Be precise and operational."
)


def available() -> bool:
    return bool(API_KEY)


def chat(messages: list[dict], context: str = "", max_tokens: int = 400) -> str:
    """Returns an LLM completion, or '' when no key is configured."""
    if not available():
        return ""
    payload = {
        "model": MODEL,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT + (f"\n\nCRM context:\n{context}" if context else "")}] + messages,
        "max_tokens": max_tokens,
    }
    req = urllib.request.Request(
        f"{BASE_URL}/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            body = json.loads(resp.read())
        return body["choices"][0]["message"]["content"].strip()
    except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError):
        return ""


def summarize(messages: list[str], context: str = "") -> dict:
    llm = chat([{"role": "user", "content": "Summarise this customer conversation in 2 sentences and list open items."}],
               context="\n".join(messages))
    from app.services.nlp import summarize as extractive

    return {
        "summary": llm or extractive(messages),
        "engine": "llm" if llm else "extractive",
    }


def generate_proposal(terms: dict, customer_id: str, context: str = "") -> dict:
    prompt = (
        "Write a professional customer proposal from these agreed terms: "
        + json.dumps(terms)
        + ". Use sections: Introduction, Scope of supply, Commercials, Delivery, Warranty & Support, Sign-off."
    )
    llm = chat([{"role": "user", "content": prompt}], context=context)
    from app.services.proposal import render as template_render

    return {
        "body": llm or template_render(terms, customer_id),
        "engine": "llm" if llm else "template",
    }


def answer(question: str, context: str) -> dict:
    llm = chat([{"role": "user", "content": question}], context=context)
    if llm:
        return {"answer": llm, "engine": "llm", "grounded": True}
    return {"answer": "", "engine": "retrieval", "grounded": True}  # caller renders fallback


def follow_up(terms: dict, customer_id: str) -> str:
    llm = chat([{"role": "user", "content": "Draft a short polite follow-up message referencing the customer's requirement."}],
               context=json.dumps(terms))
    if llm:
        return llm
    gaps = [k for k in ("payment", "warranty", "delivery") if not terms.get(k)]
    ask = ", ".join(gaps) if gaps else "confirmation"
    return f"Hello! Following up on your requirement. Could you confirm the {ask} so we can finalise the proposal?"