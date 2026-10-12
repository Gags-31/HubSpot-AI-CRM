import uuid

from fastapi import APIRouter, Response

from app import repository as repo, tasks
from app.services import crm, proposal as proposal_svc

router = APIRouter(prefix="/proposals", tags=["proposals"])


def _build(customer_id: str, messages: list[str], conversation_id: str | None) -> dict:
    draft = proposal_svc.generate(customer_id, messages, conversation_id)
    crm.save_proposal(draft)
    return draft


@router.post("/generate")
def generate(customer_id: str, messages: list[str], conversation_id: str | None = None, background: bool = False):
    if background:
        job = tasks.submit("proposal", _build, customer_id=customer_id, messages=messages, conversation_id=conversation_id)
        return {"job": job}
    return _build(customer_id, messages, conversation_id)


@router.get("/")
def list_all(customer_id: str | None = None):
    return crm.list_proposals(customer_id)


@router.post("/{proposal_id}/status")
def set_status(proposal_id: str, status: str):
    if status not in {"draft", "approved", "sent", "rejected"}:
        return {"error": "status must be draft|approved|sent|rejected"}
    return crm.set_proposal_status(proposal_id, status)


@router.get("/{proposal_id}")
def get(proposal_id: str):
    for p in crm.list_proposals():
        if p["id"] == proposal_id:
            return p
    return {"error": "not found"}


@router.get("/{proposal_id}/pdf")
def pdf(proposal_id: str):
    for p in crm.list_proposals():
        if p["id"] == proposal_id:
            data = proposal_svc.to_pdf_bytes(p)
            repo.bump("proposals_exported")
            return Response(content=data, media_type="application/pdf",
                            headers={"Content-Disposition": f'attachment; filename="{proposal_id}.pdf"'})
    return {"error": "not found"}


@router.post("/ask-missing")
def ask_missing(customer_id: str, field: str, value: str):
    """Dealer answers an auto-generated missing-information question."""
    for p in crm.list_proposals(customer_id):
        terms = dict(p["terms"])
        terms[field] = value
        updated = dict(p)
        updated["terms"] = terms
        updated["version"] = p["version"] + 1
        updated["body"] = proposal_svc.render(terms, customer_id, updated["version"])
        updated["completeness"] = proposal_svc.completeness(terms)
        updated["missing"] = proposal_svc.missing_information(terms)
        repo.execute("UPDATE proposals SET terms = ?, body = ?, version = ? WHERE id = ?",
                     (repo.jdump(terms), updated["body"], updated["version"], p["id"]))
        crm.write_workspace(customer_id, "Followups", {"field": field, "value": value, "proposal_id": p["id"]})
        return updated
    return {"error": "no proposal for customer"}