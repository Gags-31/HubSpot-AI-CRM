from fastapi import APIRouter

from app.services import crm

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("/")
def post(customer_id: str, messages: list[str], role: str = "consumer"):
    """Records each message, then analyses the whole conversation."""
    conv_id = None
    for m in messages:
        info = crm.start_conversation(customer_id, role, m)
        conv_id = info["conversation_id"]
    analysis = crm.record_analysis(customer_id, conv_id, messages)
    return {"conversation_id": conv_id, "analysis": analysis, "workspace": crm.workspace(customer_id)["sections"]}


@router.post("/end")
def end(customer_id: str):
    return crm.end_conversation(customer_id)


@router.get("/")
def list_all(customer_id: str | None = None):
    return crm.list_conversations(customer_id)


@router.get("/{conversation_id}/messages")
def messages(conversation_id: str):
    return crm.conversation_messages(conversation_id)