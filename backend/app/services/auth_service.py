import hmac
import hashlib
import json
import base64
import time
import secrets
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, Header, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import User, UserRole, Company, Branch

AUTH_SECRET = "medisentinel-data-governance-secret-key-2026"

def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Hash password securely using PBKDF2-HMAC-SHA256 with salt."""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${key.hex()}"

def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Verify password against stored salt$hash string."""
    if not stored_hash or "$" not in stored_hash:
        return False
    try:
        salt, key_hex = stored_hash.split("$", 1)
        computed = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return hmac.compare_digest(computed.hex(), key_hex)
    except Exception:
        return False


# Demo Seed Users with Official Passwords and Organizational Scope
DEFAULT_DEMO_USERS = [
    # Company 1: ABC Healthcare
    {
        "username": "data_manager",
        "role": UserRole.DATA_MANAGER.value,
        "display_name": "Liam Patel",
        "title": "Inventory Data Specialist",
        "password": "DataManager@123",
        "company_id": 1,
        "branch_id": 1
    },
    {
        "username": "pharmacist",
        "role": UserRole.PHARMACIST.value,
        "display_name": "Dr. Sarah Alston",
        "title": "Chief Pharmacist & Clinical Approver",
        "password": "Pharmacist@123",
        "company_id": 1,
        "branch_id": 1
    },
    {
        "username": "admin",
        "role": UserRole.ADMIN.value,
        "display_name": "Marcus Vance",
        "title": "Hospital Systems Administrator",
        "password": "Admin@123",
        "company_id": 1,
        "branch_id": None
    },
    {
        "username": "dm_annanagar",
        "role": UserRole.DATA_MANAGER.value,
        "display_name": "Liam Patel (Anna Nagar)",
        "title": "Inventory Data Specialist",
        "password": "DataManager@123",
        "company_id": 1,
        "branch_id": 2
    },
    {
        "username": "pharm_annanagar",
        "role": UserRole.PHARMACIST.value,
        "display_name": "Dr. Sarah Alston (Anna Nagar)",
        "title": "Chief Pharmacist & Clinical Approver",
        "password": "Pharmacist@123",
        "company_id": 1,
        "branch_id": 2
    },
    {
        "username": "dm_tambaram",
        "role": UserRole.DATA_MANAGER.value,
        "display_name": "Liam Patel (Tambaram)",
        "title": "Inventory Data Specialist",
        "password": "DataManager@123",
        "company_id": 1,
        "branch_id": 3
    },
    {
        "username": "pharm_tambaram",
        "role": UserRole.PHARMACIST.value,
        "display_name": "Dr. Sarah Alston (Tambaram)",
        "title": "Chief Pharmacist & Clinical Approver",
        "password": "Pharmacist@123",
        "company_id": 1,
        "branch_id": 3
    },
    # Company 2: Apex Global Health
    {
        "username": "admin_apex",
        "role": UserRole.ADMIN.value,
        "display_name": "Marcus Vance (Apex)",
        "title": "Hospital Systems Administrator",
        "password": "Admin@123",
        "company_id": 2,
        "branch_id": None
    },
    {
        "username": "dm_apex_city",
        "role": UserRole.DATA_MANAGER.value,
        "display_name": "Liam Patel (Apex City)",
        "title": "Inventory Data Specialist",
        "password": "DataManager@123",
        "company_id": 2,
        "branch_id": 4
    },
    {
        "username": "pharm_apex_city",
        "role": UserRole.PHARMACIST.value,
        "display_name": "Dr. Sarah Alston (Apex City)",
        "title": "Chief Pharmacist & Clinical Approver",
        "password": "Pharmacist@123",
        "company_id": 2,
        "branch_id": 4
    },
    {
        "username": "dm_apex_north",
        "role": UserRole.DATA_MANAGER.value,
        "display_name": "Liam Patel (Apex North)",
        "title": "Inventory Data Specialist",
        "password": "DataManager@123",
        "company_id": 2,
        "branch_id": 5
    },
    {
        "username": "pharm_apex_north",
        "role": UserRole.PHARMACIST.value,
        "display_name": "Dr. Sarah Alston (Apex North)",
        "title": "Chief Pharmacist & Clinical Approver",
        "password": "Pharmacist@123",
        "company_id": 2,
        "branch_id": 5
    }
]

def ensure_seed_companies_and_branches(db: Session):
    """Seed prototype companies and branches in the database if they do not exist."""
    c1 = db.query(Company).filter(Company.code == "ABC-HC").first()
    if not c1:
        c1 = Company(id=1, name="ABC Healthcare", code="ABC-HC", status="ACTIVE")
        db.add(c1)
        db.flush()

    c2 = db.query(Company).filter(Company.code == "APEX-GH").first()
    if not c2:
        c2 = Company(id=2, name="Apex Global Health", code="APEX-GH", status="ACTIVE")
        db.add(c2)
        db.flush()

    branches_c1 = [
        ("Chennai Main Hospital", "ABC-CHN-MAIN", "Central Chennai"),
        ("Anna Nagar Branch", "ABC-ANNA-NGR", "Anna Nagar, Chennai"),
        ("Tambaram Branch", "ABC-TMB-BR", "Tambaram, Chennai")
    ]
    for name, code, loc in branches_c1:
        if not db.query(Branch).filter(Branch.code == code).first():
            b = Branch(company_id=c1.id, name=name, code=code, location=loc, status="ACTIVE")
            db.add(b)

    branches_c2 = [
        ("Apex City Medical Center", "APEX-CITY-01", "Metro Hub, Chennai"),
        ("Apex North Outpost", "APEX-NORTH-02", "North Corridor, Chennai")
    ]
    for name, code, loc in branches_c2:
        if not db.query(Branch).filter(Branch.code == code).first():
            b = Branch(company_id=c2.id, name=name, code=code, location=loc, status="ACTIVE")
            db.add(b)

    try:
        db.commit()
    except Exception:
        db.rollback()

def ensure_seed_users(db: Session):
    """Seed prototype users and dynamically audit all active companies and branches."""
    ensure_seed_companies_and_branches(db)

    # 1. Seed or synchronize explicit demo users
    for u in DEFAULT_DEMO_USERS:
        exists = db.query(User).filter(User.username == u["username"]).first()
        hashed = hash_password(u["password"])
        if not exists:
            new_user = User(
                username=u["username"],
                role=UserRole(u["role"]),
                display_name=u["display_name"],
                title=u.get("title", ""),
                password_hash=hashed,
                company_id=u.get("company_id"),
                branch_id=u.get("branch_id"),
                active=True
            )
            db.add(new_user)
        else:
            # Sync company, branch, active, and password_hash
            exists.role = UserRole(u["role"])
            exists.company_id = u.get("company_id")
            exists.branch_id = u.get("branch_id")
            exists.active = True
            if not exists.password_hash:
                exists.password_hash = hashed

    db.flush()

    # 2. Dynamic Audit & Auto-repair for any active company in the DB
    active_companies = db.query(Company).filter(Company.status == "ACTIVE").all()
    for comp in active_companies:
        admin_user = db.query(User).filter(
            User.company_id == comp.id,
            User.role == UserRole.ADMIN,
            User.branch_id == None,
            User.active == True
        ).first()
        if not admin_user:
            slug = comp.code.lower().replace("-", "_")
            admin_uname = f"admin_{slug}"
            existing = db.query(User).filter(User.username == admin_uname).first()
            if existing:
                existing.company_id = comp.id
                existing.branch_id = None
                existing.active = True
                if not existing.password_hash:
                    existing.password_hash = hash_password("Admin@123")
            else:
                db.add(User(
                    username=admin_uname,
                    role=UserRole.ADMIN,
                    display_name=f"Admin ({comp.name})",
                    title="Hospital Systems Administrator",
                    password_hash=hash_password("Admin@123"),
                    company_id=comp.id,
                    branch_id=None,
                    active=True
                ))

    # 3. Dynamic Audit & Auto-repair for any active branch in the DB
    active_branches = db.query(Branch).filter(Branch.status == "ACTIVE").all()
    for branch in active_branches:
        # Check DATA_MANAGER
        dm_user = db.query(User).filter(
            User.company_id == branch.company_id,
            User.branch_id == branch.id,
            User.role == UserRole.DATA_MANAGER,
            User.active == True
        ).first()
        if not dm_user:
            slug = branch.code.lower().replace("-", "_")
            dm_uname = f"dm_{slug}"
            existing = db.query(User).filter(User.username == dm_uname).first()
            if existing:
                existing.company_id = branch.company_id
                existing.branch_id = branch.id
                existing.active = True
                if not existing.password_hash:
                    existing.password_hash = hash_password("DataManager@123")
            else:
                db.add(User(
                    username=dm_uname,
                    role=UserRole.DATA_MANAGER,
                    display_name=f"Data Manager ({branch.name})",
                    title="Inventory Data Specialist",
                    password_hash=hash_password("DataManager@123"),
                    company_id=branch.company_id,
                    branch_id=branch.id,
                    active=True
                ))

        # Check PHARMACIST
        pharm_user = db.query(User).filter(
            User.company_id == branch.company_id,
            User.branch_id == branch.id,
            User.role == UserRole.PHARMACIST,
            User.active == True
        ).first()
        if not pharm_user:
            slug = branch.code.lower().replace("-", "_")
            pharm_uname = f"pharm_{slug}"
            existing = db.query(User).filter(User.username == pharm_uname).first()
            if existing:
                existing.company_id = branch.company_id
                existing.branch_id = branch.id
                existing.active = True
                if not existing.password_hash:
                    existing.password_hash = hash_password("Pharmacist@123")
            else:
                db.add(User(
                    username=pharm_uname,
                    role=UserRole.PHARMACIST,
                    display_name=f"Pharmacist ({branch.name})",
                    title="Chief Pharmacist & Clinical Approver",
                    password_hash=hash_password("Pharmacist@123"),
                    company_id=branch.company_id,
                    branch_id=branch.id,
                    active=True
                ))

    try:
        db.commit()
    except Exception:
        db.rollback()

def audit_login_coverage(db: Session) -> Dict[str, Any]:
    """Audit company and branch login readiness according to hospital governance rules."""
    ensure_seed_users(db)
    companies = db.query(Company).filter(Company.status == "ACTIVE").order_by(Company.id).all()
    report = []
    
    total_companies = len(companies)
    total_branches = 0
    total_dm_verified = 0
    total_pharm_verified = 0
    total_admin_verified = 0

    for comp in companies:
        admin_acc = db.query(User).filter(
            User.company_id == comp.id,
            User.role == UserRole.ADMIN,
            User.branch_id == None,
            User.active == True
        ).first()
        admin_pass = admin_acc is not None
        if admin_pass:
            total_admin_verified += 1

        branches = db.query(Branch).filter(Branch.company_id == comp.id, Branch.status == "ACTIVE").order_by(Branch.id).all()
        total_branches += len(branches)

        for br in branches:
            dm_acc = db.query(User).filter(
                User.company_id == comp.id,
                User.branch_id == br.id,
                User.role == UserRole.DATA_MANAGER,
                User.active == True
            ).first()

            pharm_acc = db.query(User).filter(
                User.company_id == comp.id,
                User.branch_id == br.id,
                User.role == UserRole.PHARMACIST,
                User.active == True
            ).first()

            dm_pass = dm_acc is not None
            pharm_pass = pharm_acc is not None
            if dm_pass:
                total_dm_verified += 1
            if pharm_pass:
                total_pharm_verified += 1

            report.append({
                "company_id": comp.id,
                "company_name": comp.name,
                "company_code": comp.code,
                "branch_id": br.id,
                "branch_name": br.name,
                "branch_code": br.code,
                "data_manager_user": dm_acc.username if dm_acc else None,
                "data_manager_status": "PASS" if dm_pass else "FAIL",
                "pharmacist_user": pharm_acc.username if pharm_acc else None,
                "pharmacist_status": "PASS" if pharm_pass else "FAIL",
                "admin_user": admin_acc.username if admin_acc else None,
                "admin_status": "PASS" if admin_pass else "FAIL",
                "overall_status": "PASS" if (dm_pass and pharm_pass and admin_pass) else "FAIL"
            })

    all_branches_passed = all(item["overall_status"] == "PASS" for item in report)
    return {
        "summary": {
            "total_active_companies": total_companies,
            "total_active_branches": total_branches,
            "data_manager_verified": total_dm_verified,
            "pharmacist_verified": total_pharm_verified,
            "admin_verified": total_admin_verified,
            "all_branches_passed": all_branches_passed
        },
        "coverage_records": report
    }

def create_access_token(
    username: str,
    role: str,
    display_name: str,
    title: Optional[str] = None,
    company_id: Optional[int] = None,
    company_name: Optional[str] = None,
    branch_id: Optional[int] = None,
    branch_name: Optional[str] = None
) -> str:
    """Generate a lightweight HMAC-signed JWT-like token for hackathon prototype."""
    payload = {
        "sub": username,
        "role": role,
        "display_name": display_name,
        "title": title or "",
        "company_id": company_id,
        "company_name": company_name,
        "branch_id": branch_id,
        "branch_name": branch_name,
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
                "title": payload.get("title", ""),
                "company_id": payload.get("company_id", 1),
                "company_name": payload.get("company_name", "ABC Healthcare"),
                "branch_id": payload.get("branch_id", 1 if payload["role"] != "ADMIN" else None),
                "branch_name": payload.get("branch_name", "Chennai Main Hospital" if payload["role"] != "ADMIN" else None),
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
                "title": matched_user["title"] if matched_user else role_upper,
                "company_id": 1,
                "company_name": "ABC Healthcare",
                "branch_id": 1 if role_upper != "ADMIN" else None,
                "branch_name": "Chennai Main Hospital" if role_upper != "ADMIN" else None
            }

    # 3. Default prototype user: Pharmacist
    default_user = next((u for u in DEFAULT_DEMO_USERS if u["username"] == "pharmacist"), DEFAULT_DEMO_USERS[1])
    return {
        "username": default_user["username"],
        "role": default_user["role"],
        "display_name": default_user["display_name"],
        "title": default_user["title"],
        "company_id": 1,
        "company_name": "ABC Healthcare",
        "branch_id": 1,
        "branch_name": "Chennai Main Hospital"
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
