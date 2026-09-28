import hmac
import hashlib
import json
import base64
import time
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, Header, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import User, UserRole

AUTH_SECRET = "medisentinel-data-governance-secret-key-2026"

# Demo Seed Users with Official Passwords
DEFAULT_DEMO_USERS = [
    {
        "username": "data_manager",
        "role": UserRole.DATA_MANAGER.value,
        "display_name": "Liam Patel",
        "title": "Inventory Data Specialist",
        "password": "DataManager@123"
    },
    {
        "username": "pharmacist",
        "role": UserRole.PHARMACIST.value,
        "display_name": "Dr. Sarah Alston",
        "title": "Chief Pharmacist & Clinical Approver",
        "password": "Pharmacist@123"
    },
    {
        "username": "admin",
        "role": UserRole.ADMIN.value,
        "display_name": "Marcus Vance",
        "title": "Hospital Systems Administrator",
        "password": "Admin@123"
    }
]

def ensure_seed_users(db: Session):
    """Seed prototype users in the database if they do not exist."""
    for u in DEFAULT_DEMO_USERS:
        exists = db.query(User).filter(User.username == u["username"]).first()
        if not exists:
            new_user = User(
                username=u["username"],
                role=UserRole(u["role"]),
                display_name=u["display_name"],
                title=u["title"],
                active=True
            )
            db.add(new_user)
    try:
        db.commit()
    except Exception:
        db.rollback()

def create_access_token(username: str, role: str, display_name: str, title: Optional[str] = None) -> str:
    """Generate a lightweight HMAC-signed JWT-like token for hackathon prototype."""
    payload = {
        "sub": username,
        "role": role,
        "display_name": display_name,
        "title": title or "",
        "exp": int(time.time()) + 86400 * 7  # 7 days
    }
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    signature = hmac.new(AUTH_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify signature and return token payload if valid."""
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        expected_sig = hmac.new(AUTH_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode()).decode())
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def get_current_user(
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
    x_user_name: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Extracts current authenticated user.
    Supports:
    1. Authorization: Bearer <token>
    2. Direct prototype header: X-User-Role / X-User-Name
    3. Fallback: Pharmacist default (backward-compatible)
    """
    # 1. Bearer Token
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        payload = verify_token(token)
        if payload:
            return {
                "username": payload["sub"],
                "role": payload["role"],
                "display_name": payload.get("display_name", payload["sub"]),
                "title": payload.get("title", "")
            }

    # 2. Prototype Demo Headers
    if x_user_role:
        role_upper = x_user_role.upper().replace(" ", "_")
        if role_upper in [r.value for r in UserRole]:
            matched_user = next((u for u in DEFAULT_DEMO_USERS if u["role"] == role_upper), None)
            return {
                "username": x_user_name or (matched_user["username"] if matched_user else "user"),
                "role": role_upper,
                "display_name": matched_user["display_name"] if matched_user else (x_user_name or "Hospital User"),
                "title": matched_user["title"] if matched_user else role_upper
            }

    # 3. Default prototype user: Pharmacist
    default_user = DEFAULT_DEMO_USERS[1]
    return {
        "username": default_user["username"],
        "role": default_user["role"],
        "display_name": default_user["display_name"],
        "title": default_user["title"]
    }

def require_role(allowed_roles: List[str]):
    """
    Dependency factory to enforce RBAC permissions.
    Returns HTTP 403 Forbidden if current user role is not permitted.
    """
    def role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = user.get("role", "")
        # ADMIN has universal access
        if user_role == UserRole.ADMIN.value or user_role in allowed_roles:
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required role in {allowed_roles}, but current user has role '{user_role}'."
        )
    return role_checker
