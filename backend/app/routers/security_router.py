from fastapi import APIRouter

from app import security

router = APIRouter(prefix="/security", tags=["security"])


@router.post("/token")
def token(role: str = "dealer"):
    return security.issue_token(role)


@router.post("/consent")
def consent(customer_id: str, granted: bool = True):
    return security.set_consent(customer_id, granted)


@router.get("/audit")
def audit_log():
    return security.AUDIT_LOG[-50:]