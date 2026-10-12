"""Predictive customer intelligence (ML-backed, heuristic fallback inside ml)."""
import hashlib

from app.services import crm, ml


def _recommendation(features: dict) -> str:
    req = features.get("current_requirement") or {}
    if not features.get("total_orders"):
        timing = req.get("delivery") or "timing"
        return f"Follow up regarding delivery ({timing}) and payment terms."
    return "Offer an upgrade / AMC renewal while engagement is high."


def predict(customer_id: str) -> dict:
    features = crm.customer_360(customer_id)
    row = next((r for r in crm.feature_rows() if r["customer_id"] == customer_id), {})
    out = ml.predict({**row, "conversations": features["total_conversations"],
                      "orders": features["total_orders"], "spend": features["total_spend"]})
    stable = int(hashlib.md5(customer_id.encode()).hexdigest()[:6], 16) % 100
    return {
        "customer_id": customer_id,
        "purchase_probability": out["purchase_probability"],
        "churn_risk": out["churn_risk"],
        "clv_estimate": out["clv_estimate"],
        "engagement": out["engagement"],
        "proposal_acceptance": round(min(0.99, out["purchase_probability"] * 0.95 + 0.05), 3),
        "lead_conversion_probability": round(min(0.99, out["purchase_probability"] + stable / 500), 3),
        "engine": out["engine"],
        "recommendation": _recommendation(features),
    }