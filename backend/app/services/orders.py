"""Order management - records everything a consumer has ordered."""
import uuid
from datetime import datetime, timezone

from app.services import catalog

orders = {}


def create_order(customer_id, items, status="confirmed"):
    lines = []
    subtotal = 0
    for item in items:
        product = catalog.get_product(item.get("product_id", ""))
        if not product:
            continue
        qty = int(item.get("quantity", 1))
        amount = product["unit_price"] * qty
        subtotal += amount
        line = {
            "product_id": product["id"],
            "name": product["name"],
            "quantity": qty,
            "unit_price": product["unit_price"],
            "line_total": amount,
        }
        lines.append(line)
    tax = round(subtotal * 0.18, 2)
    order = {
        "id": "ORD-" + uuid.uuid4().hex[:8].upper(),
        "customer_id": customer_id,
        "items": lines,
        "subtotal": subtotal,
        "tax": tax,
        "grand_total": subtotal + tax,
        "currency": "INR",
        "status": status,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    orders[order["id"]] = order
    return order


def list_orders(customer_id=None):
    if not customer_id:
        return list(orders.values())
    result = []
    for o in orders.values():
        if o["customer_id"] == customer_id:
            result.append(o)
    return result