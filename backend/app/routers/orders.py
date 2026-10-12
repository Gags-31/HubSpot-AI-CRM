from fastapi import APIRouter

from app.services import crm

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/")
def create(customer_id: str, items: list[dict]):
    order = crm.create_order(customer_id, items)
    crm.write_workspace(customer_id, "Products", {"order_id": order["id"], "grand_total": order["grand_total"]})
    return order


@router.get("/")
def list_all(customer_id: str | None = None):
    return crm.list_orders(customer_id)


@router.post("/{order_id}/status")
def set_status(order_id: str, status: str):
    from app import repository as repo

    if status not in {"confirmed", "packed", "dispatched", "delivered", "cancelled"}:
        return {"error": "invalid status"}
    repo.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
    return {"order_id": order_id, "status": status}