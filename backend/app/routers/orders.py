from fastapi import APIRouter

from app.services import orders

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/")
def create(customer_id: str, items: list[dict]):
    return orders.create_order(customer_id, items)


@router.get("/")
def list_all(customer_id: str | None = None):
    return orders.list_orders(customer_id)