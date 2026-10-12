from fastapi import APIRouter

from app.services import rag

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/ask")
def ask(query: str, customer_id: str | None = None):
    return rag.answer(query, customer_id)