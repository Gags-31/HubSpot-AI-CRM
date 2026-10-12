"""Security layer: PBKDF2 password hashing, HS256 JWTs, RBAC, consent and audit logging."""
import base64
import hashlib
import hmac
import json
import os
import time
import uuid

from app import repository as repo

SECRET = os.getenv("HUBSPOT_SECRET", "dev-secret-change-me")
TOKEN_TTL = int(os.getenv("HUBSPOT_TOKEN_TTL", "3600"))
ROLES = {"dealer": {"role": "dealer", "scope": "all"}, "analyst": {"role": "analyst", "scope": "read"}, "admin": {"role": "admin", "scope": "all"}}
CONSENT: dict[str, bool] = {}


# ------------------------------------------------------------------ passwords
def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or base64.b64encode(os.urandom(16)).decode()
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120000).hex()
    return digest, salt


def verify_password(password: str, digest: str, salt: str) -> bool:
    calc, _ = hash_password(password, salt)
    return hmac.compare_digest(calc, digest)


def ensure_user(username: str, password: str, role: str = "dealer") -> dict:
    existing = repo.q("SELECT username FROM users WHERE username = ?", (username,), one=True)
    if existing:
        return {"username": username, "role": role, "created": False}
    digest, salt = hash_password(password)
    repo.execute("INSERT INTO users(username, password_hash, salt, role) VALUES(?,?,?,?)", (username, digest, salt, role))
    return {"username": username, "role": role, "created": True}


def authenticate(username: str, password: str) -> dict | None:
    row = repo.q("SELECT * FROM users WHERE username = ?", (username,), one=True)
    if not row:
        return None
    if not verify_password(password, row["password_hash"], row["salt"]):
        return None
    return {"username": username, "role": row["role"]}


# ----------------------------------------------------------------------- JWT
def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def create_token(user: dict, ttl: int = TOKEN_TTL) -> dict:
    header = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64(json.dumps({
        "sub": user["username"],
        "role": user.get("role", "dealer"),
        "scope": ROLES.get(user.get("role", "dealer"), {}).get("scope", "read"),
        "iat": int(time.time()),
        "exp": int(time.time()) + ttl,
        "jti": uuid.uuid4().hex[:10],
    }).encode())
    signature = _b64(hmac.new(SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest())
    return {"token": f"{header}.{payload}.{signature}", "expires_in": ttl, "role": user.get("role", "dealer")}


def decode_token(token: str) -> dict | None:
    try:
        header, payload, signature = token.split(".")
        expected = _b64(hmac.new(SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(expected, signature):
            return None
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if data["exp"] < time.time():
            return None
        return data
    except (ValueError, json.JSONDecodeError, base64.binascii.Error):
        return None


def authorize(token: str | None, required_scope: str = "all") -> dict:
    claims = decode_token(token) if token else None
    if not claims:
        return {"authorized": False, "reason": "invalid or missing token"}
    if required_scope == "write" and claims["scope"] not in ("all", "write"):
        return {"authorized": False, "reason": "insufficient scope"}
    return {"authorized": True, "claims": claims}


# -------------------------------------------------------------------- consent
def set_consent(customer_id: str, granted: bool) -> dict:
    CONSENT[customer_id] = granted
    repo.execute("INSERT OR REPLACE INTO memory(customer_id, key, value, updated_at) VALUES(?,?,?,?)",
                 (customer_id, "recording_consent", repo.jdump(granted), repo.now()))
    audit("system", "consent", f"{customer_id}={granted}")
    return {"customer_id": customer_id, "recording_consent": granted}


def has_consent(customer_id: str) -> bool:
    return CONSENT.get(customer_id, True)


# --------------------------------------------------------------------- audit
def audit(user: str, action: str, resource: str) -> dict:
    repo.execute("INSERT INTO audit(ts, user, action, resource) VALUES(?,?,?,?)", (repo.now(), user, action, resource))
    repo.bump(f"audit.{action}")
    return {"ts": repo.now(), "user": user, "action": action, "resource": resource}


def audit_log(limit: int = 50) -> list[dict]:
    return [dict(r) for r in repo.q("SELECT * FROM audit ORDER BY id DESC LIMIT ?", (limit,))]