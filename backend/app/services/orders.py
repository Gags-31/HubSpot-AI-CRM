"""Order management (delegates to the CRM service layer)."""
from app.services import crm


def create_order(customer_id: str, items: list[dict], status: str = "confirmed") -> dict:
    return crm.create_order(customer_id, items, status)


def list_orders(customer_id: str | None = None) -> list[dict]:
    return crm.list_orders(customer_id)