"""Lightweight security: API keys, RBAC roles, audit logging, consent flags."""
import time
import uuid
from datetime import datetime, timezone

AUDIT_LOG: list[dict] = []
API_KEYS = {"demo-key": {"role": "dealer", "consumer_ids": ["*"]}}
CONSENT: dict[str, bool] = {}


def issue_token(role: str = "dealer") -> dict:
    return {"token": f"tok_{uuid.uuid4().hex[:20]}", "role": role, "issued_at": datetime.now(timezone.utc).isoformat()}


def validate(api_key: str | None) -> dict:
    if api_key and api_key in API_KEYS:
        return {"authenticated": True, **API_KEYS[api_key]}
    return {"authenticated": False, "role": "anonymous"}


def audit(user: str, action: str, resource: str) -> dict:
    entry = {"ts": round(time.time(), 3), "user": user, "action": action, "resource": resource}
    AUDIT_LOG.append(entry)
    return entry


def set_consent(customer_id: str, granted: bool) -> dict:
    CONSENT[customer_id] = granted
    return {"customer_id": customer_id, "recording_consent": granted}