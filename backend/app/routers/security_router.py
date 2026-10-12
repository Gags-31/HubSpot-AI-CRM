from fastapi import APIRouter, Header

from app import security

router = APIRouter(prefix="/security", tags=["security"])


@router.post("/register")
def register(username: str, password: str, role: str = "dealer"):
    if role not in security.ROLES:
        return {"error": f"role must be one of {list(security.ROLES)}"}
    return security.ensure_user(username, password, role)


@router.post("/login")
def login(username: str, password: str):
    user = security.authenticate(username, password)
    if not user:
        security.audit(username, "login_failed", "auth")
        return {"authorized": False, "reason": "invalid credentials"}
    security.audit(username, "login", "auth")
    return security.create_token(user)


@router.get("/verify")
def verify(authorization: str | None = Header(default=None)):
    token = authorization.replace("Bearer ", "") if authorization else None
    return security.authorize(token, "write")


@router.post("/consent")
def consent(customer_id: str, granted: bool = True):
    return security.set_consent(customer_id, granted)


@router.get("/audit")
def audit_log(limit: int = 50):
    return security.audit_log(limit)