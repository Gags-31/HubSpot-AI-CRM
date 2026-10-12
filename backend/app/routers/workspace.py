import uuid

from fastapi import APIRouter

from app import db
from app.services import memory, orders, proposal as proposal_svc

router = APIRouter(prefix="/workspace", tags=["workspace"])

SECTIONS = [
    "Profile",
    "Conversations",
    "Requirements",
    "Products",
    "Proposals",
    "Documents",
    "Followups",
    "Interaction_History",
]


def _ensure_workspace(customer_id: str) -> dict:
    return db.customer_memory.setdefault(customer_id, {}).setdefault("_workspace", {s: [] for s in SECTIONS})


def write(customer_id: str, section: str, entry: dict):
    ws = _ensure_workspace(customer_id)
    if section not in ws:
        raise KeyError(section)
    ws[section].append({"id": f"{section[:3].upper()}-{uuid.uuid4().hex[:6]}", **entry})
    return ws[section][-1]


@router.post("/{customer_id}/{section}")
def add_entry(customer_id: str, section: str, entry: dict):
    try:
        return write(customer_id, section, entry)
    except KeyError:
        return {"error": f"unknown section '{section}'", "valid": SECTIONS}


@router.get("/{customer_id}")
def get_workspace(customer_id: str):
    ws = _ensure_workspace(customer_id)
    orders_for_customer = orders.list_orders(customer_id)
    return {
        "customer_id": customer_id,
        "sections": ws,
        "totals": {
            "conversations": len(db.conversations),
            "proposals": len(db.proposals),
            "orders": len(orders_for_customer),
            "order_value": sum(o["grand_total"] for o in orders_for_customer),
        },
        "memory": memory.recall(customer_id),
    }