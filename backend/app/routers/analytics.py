from fastapi import APIRouter

from app.services import catalog, crm, next_action, predictive, proposal as proposal_svc

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/customer/{customer_id}")
def customer360(customer_id: str):
    memory = crm.recall(customer_id)
    return {
        "profile": crm.customer_360(customer_id),
        "memory": memory,
        "prediction": predictive.predict(customer_id),
        "next_actions": next_action.rank(
            sentiment=memory.get("last_sentiment", "Neutral"),
            intent=memory.get("last_intent", "General"),
            days_since_contact=memory.get("days_since_contact", 0),
            proposal_pending=bool(memory.get("last_proposal_id")),
            churn_risk=predictive.predict(customer_id)["churn_risk"],
            budget=(memory.get("last_requirement") or {}).get("budget"),
        ),
        "open_proposal": next(
            ({"id": p["id"], "completeness": p["terms"] and proposal_svc.completeness(p["terms"])}
             for p in crm.list_proposals(customer_id)), None),
    }


@router.get("/portfolio")
def portfolio():
    """Dealer's whole book of business."""
    customers = [crm.customer_360(c["id"]) for c in crm.list_customers()]
    orders = crm.list_orders()
    return {
        "customers": len(customers),
        "conversations": sum(c["total_conversations"] for c in customers),
        "orders": len(orders),
        "revenue": round(sum(o["grand_total"] for o in orders), 2),
        "negative_sentiment": [c["customer_id"] for c in customers if c["sentiment"] == "Negative"],
        "high_value": sorted(customers, key=lambda c: c["total_spend"], reverse=True)[:5],
        "top_products": catalog.categories(),
    }