"""Retrieval-Augmented Generation over CRM data (vector store + optional LLM)."""
from app.services import llm, vectorstore


def search(query: str, k: int = 4, customer_id: str | None = None) -> list[dict]:
    return vectorstore.search(query, k, customer_id)


def answer(query: str, customer_id: str | None = None) -> dict:
    hits = search(query, 4, customer_id)
    context = "\n".join(f"[{h['source']} | {h['customer_id']}] {h['text']}" for h in hits)
    generated = llm.answer(query, context)
    if generated["answer"]:
        return {
            "answer": generated["answer"],
            "engine": "llm+rag",
            "grounded": True,
            "sources": hits,
            "context_chars": len(context),
        }
    if not hits:
        return {"answer": "No relevant records found in the CRM for that question.", "engine": "rag", "grounded": False, "sources": []}
    top = hits[0]
    return {
        "answer": (
            f"From {top['source']} for {top['customer_id']}: {top['text'][:400]}\n"
            f"Related matches: {', '.join(h['id'] for h in hits[1:]) or 'none'}"
        ),
        "engine": "rag-retrieval",
        "grounded": True,
        "sources": hits,
        "context_chars": len(context),
    }