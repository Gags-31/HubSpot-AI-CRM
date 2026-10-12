"""Product catalog, persisted in SQLite and seeded from the built-in catalogue."""
from datetime import datetime, timezone

from app import repository as repo

SEED = [
    ("PRD-A100", "Product A - Industrial Sensor Kit", "Sensors", 1500, 500, "Temperature + vibration sensor kit with 2-year warranty."),
    ("PRD-B220", "Product B - Control Unit", "Controllers", 8200, 120, "Programmable control unit for automation lines."),
    ("PRD-C330", "Product C - Power Supply Module", "Power", 4300, 260, "Redundant 48V power supply module."),
    ("PRD-SVC1", "Service - Installation & Commissioning", "Services", 12000, 999, "On-site installation, calibration and commissioning."),
    ("PRD-SUP1", "Support - Annual Maintenance Contract", "Support", 18000, 999, "24x7 support with 4-hour response SLA."),
    ("PRD-D140", "Product D - Network Gateway", "Networking", 6400, 180, "Industrial gateway with remote telemetry."),
    ("PRD-E250", "Product E - Safety Relay Panel", "Safety", 5100, 210, "Fail-safe relay panel for line shutdown."),
]


def seed_products() -> int:
    inserted = 0
    for pid, name, cat, price, stock, desc in SEED:
        exists = repo.q("SELECT id FROM products WHERE id = ?", (pid,), one=True)
        if not exists:
            repo.execute(
                "INSERT INTO products(id, name, category, unit_price, currency, stock, description) VALUES(?,?,?,?,?,?,?)",
                (pid, name, cat, price, "INR", stock, desc),
            )
            inserted += 1
    return inserted


def list_products(category: str | None = None) -> list[dict]:
    sql = "SELECT * FROM products"
    args: tuple = ()
    if category:
        sql += " WHERE category = ? COLLATE NOCASE"
        args = (category,)
    return [dict(r) for r in repo.q(sql + " ORDER BY name", args)]


def categories() -> list[str]:
    return [r["category"] for r in repo.q("SELECT DISTINCT category FROM products ORDER BY category")]


def get_product(product_id: str) -> dict | None:
    row = repo.q("SELECT * FROM products WHERE id = ? COLLATE NOCASE", (product_id,), one=True)
    return dict(row) if row else None


def _budget_value(budget_text: str) -> float | None:
    digits = "".join(ch for ch in (budget_text or "") if ch.isdigit() or ch == ",")
    if not digits:
        return None
    value = float(digits.replace(",", ""))
    low = (budget_text or "").lower()
    if "lakh" in low:
        value *= 100000
    elif "crore" in low or "cr " in low:
        value *= 10000000
    elif "k" in low.split() or "thousand" in low:
        value *= 1000
    return value


def resolve_budget(budget_text: str | None) -> list[dict]:
    value = _budget_value(budget_text or "")
    if not value:
        return []
    fits = [p for p in list_products() if p["unit_price"] <= value]
    return sorted(fits, key=lambda p: p["unit_price"])


def recommend(quantity: int = 1, category: str | None = None) -> dict:
    pool = list_products(category) or list_products()
    quantity = max(1, int(quantity))
    ranked = sorted(pool, key=lambda p: (p["unit_price"], -p["stock"]))
    primary = ranked[0]
    upsell = next((p for p in ranked[1:] if p["category"] != primary["category"]), None)
    bundle_total = primary["unit_price"] * quantity + (upsell["unit_price"] if upsell else 0)
    return {
        "primary_suggestion": primary,
        "upsell": upsell,
        "alternatives": ranked[1:4],
        "quantity": quantity,
        "estimated_total": bundle_total,
        "stock_check": "in_stock" if primary["stock"] >= quantity else "backorder",
        "currency": "INR",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }