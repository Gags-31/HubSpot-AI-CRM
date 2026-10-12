"""Long-term customer memory (delegates to the CRM repository layer)."""
from app.services import crm


def remember(customer_id: str, key: str, value) -> None:
    crm.remember(customer_id, key, value)


def recall(customer_id: str) -> dict:
    return crm.recall(customer_id)