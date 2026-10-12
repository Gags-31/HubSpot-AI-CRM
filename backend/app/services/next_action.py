"""Next-Best-Action engine: scores every candidate dealer action and returns a ranked plan."""
ACTIONS = [
    "Call Customer",
    "Send Message",
    "Generate Proposal",
    "Recommend Product",
    "Offer Discount",
    "Schedule Follow-up",
    "Escalate Complaint",
    "Request Missing Information",
    "Do Nothing",
]

WEIGHTS = {
    "Call Customer": 1.4,
    "Send Message": 1.0,
    "Generate Proposal": 1.8,
    "Recommend Product": 0.9,
    "Offer Discount": 1.2,
    "Schedule Follow-up": 1.1,
    "Escalate Complaint": 2.6,
    "Request Missing Information": 1.5,
    "Do Nothing": 0.2,
}


def rank(sentiment: str = "Neutral", intent: str = "General", days_since_contact: int = 0,
         proposal_pending: bool = False, churn_risk: float = 0.2, budget: str | None = None) -> list[dict]:
    scores: dict[str, float] = {a: 0.0 for a in ACTIONS}

    if sentiment == "Negative" or intent == "Complaint":
        scores["Escalate Complaint"] += 3.0
        scores["Call Customer"] += 1.2
    if intent == "Purchase":
        scores["Generate Proposal"] += 2.4
    if proposal_pending:
        scores["Generate Proposal"] += 1.0
        scores["Request Missing Information"] += 1.4
    if days_since_contact >= 3:
        scores["Send Message"] += 1.2
    if days_since_contact >= 7:
        scores["Schedule Follow-up"] += 1.5
    if days_since_contact >= 14:
        scores["Call Customer"] += 1.5
        scores["Do Nothing"] -= 1.5
    if sentiment == "Negative":
        scores["Offer Discount"] += 0.8
    if budget:
        scores["Recommend Product"] += 1.1
    if churn_risk >= 0.5:
        scores["Call Customer"] += 1.3
        scores["Offer Discount"] += 0.6
    scores["Do Nothing"] += 0.3

    ranked = sorted(
        ({"action": a, "score": round(s * WEIGHTS[a], 3), "priority": "high" if s * WEIGHTS[a] >= 2.5 else "medium" if s * WEIGHTS[a] >= 1 else "low"}
         for a, s in scores.items()),
        key=lambda x: x["score"],
        reverse=True,
    )
    return ranked