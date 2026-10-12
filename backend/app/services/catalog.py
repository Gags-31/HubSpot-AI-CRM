"""Product catalog (acts as the dealer's inventory / items you have ordered)."""
from datetime import datetime, timezone

CATALOG = [
    {
        "id": "PRD-A100",
        "name": "Product A — Industrial Sensor Kit",
        "category": "Sensors",
        "unit_price": 1500,
        "currency": "INR",
        "stock": 500,
        "description": "Temperature + vibration sensor kit with 2-year warranty.",
    },
    {
        "id": "PRD-B220",
        "name": "Product B — Control Unit",
        "category": "Controllers",
        "unit_price": 8200,
        "currency": "INR",
        "stock": 120,
        "description": "Programmable control unit for automation lines.",
    },
    {
        "id": "PRD-C330",
        "name": "Product C — Power Supply Module",
        "category": "Power",
        "unit_price": 4300,
        "currency": "INR",
        "stock": 260,
        "description": "Redundant 48V power supply module.",
    },
    {
        "id": "PRD-SVC1",
        "name": "Service — Installation & Commissioning",
        "category": "Services",
        "unit_price": 12000,
        "currency": "INR",
        "stock": 999,
        "description": "On-site installation, calibration and commissioning.",
    },
    {
        "id": "PRD-SUP1",
        "name": "Support — Annual Maintenance Contract",
        "category": "Support",
        "unit_price": 18000,
        "currency": "INR",
        "stock": 999,
        "description": "24x7 support, 4-hour response SLA.",
    },
]


def list_products(category: str | None = None):
    if not category:
        return CATALOG
    return [p for p in CATALOG if p["category"].lower() == category.lower()]


def get_product(product_id: str):
    for p in CATALOG:
        if p["id"].lower() == product_id.lower():
            return p
    return None


def resolve_budget(budget_text: str | None) -> list[dict]:
    """Suggest products that fit a budget string such as 'Rs 2 lakh'."""
    if not budget_text:
        return []
    digits = "".join(ch for ch in budget_text if ch.isdigit() or ch == ",")
    if not digits:
        return []
    value = float(digits.replace(",", ""))
    low = budget_text.lower()
    if "lakh" in low:
        value *= 100000
    elif "k" in low.split():
        value *= 1000
    fits = [p for p in CATALOG if p["unit_price"] <= value]
    return sorted(fits, key=lambda p: p["unit_price"])


def recommend(quantity: int = 1, category: str | None = None) -> dict:
    pool = list_products(category) or CATALOG
    primary = max(pool, key=lambda p: p["unit_price"])
    total = primary["unit_price"] * max(1, quantity)
    return {
        "recommended_products": pool[:3],
        "primary_suggestion": primary,
        "quantity": quantity,
        "estimated_total": total,
        "currency": "INR",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }