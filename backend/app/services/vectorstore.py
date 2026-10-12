"""Embeddings + persisted vector store with cosine search (RAG retrieval)."""
import hashlib
import math
import struct

from app import repository as repo

DIM = 128


def embed(text: str, dim: int = DIM) -> list[float]:
    """Hash-based deterministic embedding (works offline).

    Swap for sentence-transformers / OpenAI embeddings in production:
        from sentence_transformers import SentenceTransformer; model.encode(text)
    """
    vec = [0.0] * dim
    for token in (text or "").lower().split():
        h = int(hashlib.md5(token.encode()).hexdigest(), 16)
        vec[h % dim] += 1.0
        vec[(h // dim) % dim] += 0.5
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def _pack(vec: list[float]) -> bytes:
    return struct.pack(f"{len(vec)}f", *vec)


def _unpack(blob: bytes) -> list[float]:
    return list(struct.unpack(f"{len(blob) // 4}f", blob))


def index_text(doc_id: str, customer_id: str, source: str, text: str) -> None:
    repo.execute(
        "INSERT OR REPLACE INTO vectors(id, customer_id, source, text, dim, embedding, created_at) VALUES(?,?,?,?,?,?,?)",
        (doc_id, customer_id, source, text, DIM, _pack(embed(text)), repo.now()),
    )


def search(query: str, k: int = 4, customer_id: str | None = None) -> list[dict]:
    qv = embed(query)
    sql = "SELECT id, customer_id, source, text, embedding FROM vectors"
    args: tuple = ()
    if customer_id:
        sql += " WHERE customer_id = ?"
        args = (customer_id,)
    results = []
    for row in repo.q(sql, args):
        score = cosine(qv, _unpack(row["embedding"]))
        results.append({"id": row["id"], "customer_id": row["customer_id"], "source": row["source"], "text": row["text"], "score": round(score, 4)})
    results.sort(key=lambda r: r["score"], reverse=True)
    return results[:k]


def context_for(query: str, customer_id: str | None = None, k: int = 3) -> str:
    return "\n".join(f"- [{r['source']}] {r['text']}" for r in search(query, k, customer_id))