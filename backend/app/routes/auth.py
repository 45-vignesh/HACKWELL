from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import User, UserRole, Company, Branch
from datetime import datetime
from sqlalchemy import func
from app.schemas.schemas import (
    LoginRequest,
    LoginResponse,
    UserResponse,
    RegisterRequest,
    RegisterResponse,
    CompanyResponse,
    BranchResponse
)
from app.services.auth_service import (
    DEFAULT_DEMO_USERS,
    ensure_seed_users,
    ensure_seed_companies_and_branches,
    create_access_token,
    get_current_user,
    require_role,
    hash_password,
    verify_password
)

router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])

@router.get("/companies", response_model=List[CompanyResponse])
def get_companies(db: Session = Depends(get_db)):
    """List available hospital companies and their facilities."""
    ensure_seed_companies_and_branches(db)
    companies = db.query(Company).filter(Company.status == "ACTIVE").all()
    results = []
    for c in companies:
        branch_items = [
            BranchResponse(
                id=b.id,
                company_id=b.company_id,
                name=b.name,
                code=b.code,
                location=b.location,
                status=b.status
            )
            for b in c.branches if b.status == "ACTIVE"
        ]
        results.append(CompanyResponse(
            id=c.id,
            name=c.name,
            code=c.code,
            status=c.status,
            branches=branch_items
        ))
    return results

@router.get("/companies/{company_id}/branches", response_model=List[BranchResponse])
def get_company_branches(company_id: int, db: Session = Depends(get_db)):
    """List active branches belonging strictly to the requested company."""
    ensure_seed_companies_and_branches(db)
    company = db.query(Company).filter(Company.id == company_id, Company.status == "ACTIVE").first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID {company_id} not found or inactive."
        )
    branches = db.query(Branch).filter(Branch.company_id == company_id, Branch.status == "ACTIVE").all()
    return [
        BranchResponse(
            id=b.id,
            company_id=b.company_id,
            name=b.name,
            code=b.code,
            location=b.location,
            status=b.status
        )
        for b in branches
    ]

@router.post("/register", response_model=RegisterResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user account with dedicated role assignment.
    Validates required fields, email, password strength, confirmation, and uniqueness.
    """
    ensure_seed_users(db)

    full_name = payload.full_name.strip() if payload.full_name else ""
    username = payload.username.lower().strip() if payload.username else ""
    email = payload.email.lower().strip() if payload.email else ""
    password = payload.password or ""
    confirm_password = payload.confirm_password or ""
    role_str = payload.role.upper().strip().replace(" ", "_") if payload.role else ""

    if not full_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Full Name is required.")
    if not username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is required.")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required.")
    if not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is required.")

    import re
    email_regex = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    if not re.match(email_regex, email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please provide a valid email address.")

    if len(password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters long.")
    if password != confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match.")

    valid_roles = [r.value for r in UserRole]
    if role_str not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {payload.role}. Allowed: DATA_MANAGER, PHARMACIST, ADMIN."
        )

    # Check username uniqueness against seed users
    if any(u["username"] == username for u in DEFAULT_DEMO_USERS):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Username '{username}' is already reserved.")

    # Check username uniqueness against database users
    existing_user = db.query(User).filter(func.lower(User.username) == username).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Username '{username}' is already taken.")

    # Check email uniqueness against database users
    existing_email = db.query(User).filter(func.lower(User.email) == email).first()
    if existing_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"An account with email '{email}' already exists.")

    role_titles = {
        UserRole.DATA_MANAGER.value: "Inventory Data Specialist",
        UserRole.PHARMACIST.value: "Clinical Pharmacist",
        UserRole.ADMIN.value: "Hospital Systems Administrator"
    }
    title = role_titles.get(role_str, "Hospital Staff")

    p_hash = hash_password(password)

    comp_id = payload.company_id or 1
    branch_id = payload.branch_id if role_str != UserRole.ADMIN.value else None
    if role_str != UserRole.ADMIN.value and not branch_id:
        branch_id = 1

    new_user = User(
        username=username,
        role=UserRole(role_str),
        display_name=full_name,
        title=title,
        email=email,
        password_hash=p_hash,
        company_id=comp_id,
        branch_id=branch_id,
        active=True,
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    try:
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to register account: {str(e)}")

    return RegisterResponse(
        message="Registration successful. You can now sign in.",
        username=new_user.username,
        role=new_user.role.value if hasattr(new_user.role, 'value') else str(new_user.role),
        company_id=new_user.company_id,
        branch_id=new_user.branch_id
    )

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user via demo role quick-select or username/password.
    Seeds default roles if not yet in database.
    """
    ensure_seed_users(db)

    # 1. Quick demo switch by demo_role (e.g., DATA_MANAGER, PHARMACIST, ADMIN)
    if payload.demo_role:
        role_upper = payload.demo_role.upper().replace(" ", "_")
        matched = next((u for u in DEFAULT_DEMO_USERS if u["role"] == role_upper), None)
        if not matched:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown role: {payload.demo_role}. Choose DATA_MANAGER, PHARMACIST, or ADMIN."
            )
        
        comp_id = payload.company_id or matched.get("company_id", 1)
        company_obj = db.query(Company).filter(Company.id == comp_id).first()
        comp_name = company_obj.name if company_obj else "ABC Healthcare"

        br_id = None
        br_name = None
        if role_upper != UserRole.ADMIN.value:
            br_id = payload.branch_id or matched.get("branch_id", 1)
            branch_obj = db.query(Branch).filter(Branch.id == br_id).first()
            br_name = branch_obj.name if branch_obj else "Chennai Main Hospital"

        token = create_access_token(
            username=matched["username"],
            role=matched["role"],
            display_name=matched["display_name"],
            title=matched["title"],
            company_id=comp_id,
            company_name=comp_name,
            branch_id=br_id,
            branch_name=br_name
        )
        return LoginResponse(
            token=token,
            user=UserResponse(
                id=1,
                username=matched["username"],
                role=matched["role"],
                display_name=matched["display_name"],
                title=matched["title"],
                company_id=comp_id,
                company_name=comp_name,
                branch_id=br_id,
                branch_name=br_name
            )
        )

    # 2. Login by username & password
    if not payload.username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or demo_role required.")

    if not payload.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is required.")

    uname = payload.username.lower().strip()
    matched = next((u for u in DEFAULT_DEMO_USERS if u["username"] == uname), None)
    
    user_id = 1
    user_username = uname
    user_role = ""
    user_display = ""
    user_title = ""
    user_pass = ""
    db_user = None

    if matched:
        user_role = matched["role"]
        user_display = matched["display_name"]
        user_title = matched["title"]
        user_pass = matched.get("password", "")
    else:
        # Fallback to database user query
        db_user = db.query(User).filter(User.username == uname).first()
        if not db_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")
        user_id = db_user.id
        user_username = db_user.username
        user_role = db_user.role.value if hasattr(db_user.role, 'value') else db_user.role
        user_display = db_user.display_name
        user_title = db_user.title or ""
        # Default fallback password for DB users matching role
        if user_role == UserRole.DATA_MANAGER.value:
            user_pass = "DataManager@123"
        elif user_role == UserRole.PHARMACIST.value:
            user_pass = "Pharmacist@123"
        elif user_role == UserRole.ADMIN.value:
            user_pass = "Admin@123"

    # Enforce password check
    password_valid = False
    if db_user and db_user.password_hash:
        password_valid = verify_password(payload.password, db_user.password_hash)
    elif matched:
        password_valid = (payload.password == matched.get("password", ""))
    else:
        password_valid = (payload.password == user_pass)

    if not password_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password.")

    # Enforce portal role restriction if specified
    if payload.role:
        expected_role = payload.role.upper().replace(" ", "_")
        if user_role != expected_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. User '{uname}' does not have the {expected_role} role required for this portal."
            )

    # 3. Company & Branch Validation
    selected_company_id = payload.company_id
    selected_branch_id = payload.branch_id

    # If company_id is provided, validate it exists and is active
    company_obj = None
    if selected_company_id:
        company_obj = db.query(Company).filter(Company.id == selected_company_id, Company.status == "ACTIVE").first()
        if not company_obj:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Company with ID {selected_company_id} does not exist or is inactive."
            )
    else:
        comp_id = (db_user.company_id if db_user and db_user.company_id else (matched.get("company_id") if matched else 1))
        company_obj = db.query(Company).filter(Company.id == comp_id).first()
        selected_company_id = company_obj.id if company_obj else 1

    # Branch validation for DATA_MANAGER and PHARMACIST
    branch_obj = None
    if user_role in [UserRole.DATA_MANAGER.value, UserRole.PHARMACIST.value]:
        if selected_branch_id:
            branch_obj = db.query(Branch).filter(Branch.id == selected_branch_id, Branch.status == "ACTIVE").first()
            if not branch_obj:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Branch with ID {selected_branch_id} does not exist or is inactive."
                )
            # CRITICAL SECURITY CHECK: Branch must belong to the chosen company!
            if branch_obj.company_id != selected_company_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Security violation: Branch '{branch_obj.name}' does not belong to company '{company_obj.name}'."
                )
        else:
            b_id = (db_user.branch_id if db_user and db_user.branch_id else (matched.get("branch_id") if matched else None))
            if b_id:
                branch_obj = db.query(Branch).filter(Branch.id == b_id, Branch.company_id == selected_company_id).first()
            if not branch_obj:
                branch_obj = db.query(Branch).filter(Branch.company_id == selected_company_id, Branch.status == "ACTIVE").first()
            selected_branch_id = branch_obj.id if branch_obj else None
    else:
        # Hospital Administrator does NOT require or use branch selection
        selected_branch_id = None
        branch_obj = None

    # Verify user account authorization scope
    assigned_company_id = db_user.company_id if db_user else (matched.get("company_id") if matched else None)
    if assigned_company_id and selected_company_id and assigned_company_id != selected_company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. User '{uname}' is assigned to company ID {assigned_company_id}, not authorized for company ID {selected_company_id}."
        )

    if user_role != UserRole.ADMIN.value:
        assigned_branch_id = db_user.branch_id if db_user else (matched.get("branch_id") if matched else None)
        if assigned_branch_id and selected_branch_id and assigned_branch_id != selected_branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. User '{uname}' is assigned to branch ID {assigned_branch_id}, not authorized for branch ID {selected_branch_id}."
            )

    company_name = company_obj.name if company_obj else "ABC Healthcare"
    branch_name = branch_obj.name if branch_obj else ("Chennai Main Hospital" if user_role != UserRole.ADMIN.value else None)

    token = create_access_token(
        username=user_username,
        role=user_role,
        display_name=user_display,
        title=user_title,
        company_id=selected_company_id,
        company_name=company_name,
        branch_id=selected_branch_id,
        branch_name=branch_name
    )
    return LoginResponse(
        token=token,
        user=UserResponse(
            id=user_id,
            username=user_username,
            role=user_role,
            display_name=user_display,
            title=user_title,
            company_id=selected_company_id,
            company_name=company_name,
            branch_id=selected_branch_id,
            branch_name=branch_name
        )
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    """Return currently active user session profile with organizational scope."""
    return UserResponse(
        id=current_user.get("id", 1),
        username=current_user["username"],
        role=current_user["role"],
        display_name=current_user.get("display_name", current_user["username"]),
        title=current_user.get("title", ""),
        company_id=current_user.get("company_id", 1),
        company_name=current_user.get("company_name", "ABC Healthcare"),
        branch_id=current_user.get("branch_id"),
        branch_name=current_user.get("branch_name")
    )

@router.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    """List available demo users and accounts."""
    ensure_seed_users(db)
    users = db.query(User).all()
    results = []
    for u in users:
        role_val = u.role.value if hasattr(u.role, 'value') else str(u.role)
        results.append(UserResponse(
            id=u.id,
            username=u.username,
            role=role_val,
            display_name=u.display_name,
            title=u.title,
            company_id=u.company_id,
            company_name=u.company.name if u.company else None,
            branch_id=u.branch_id,
            branch_name=u.branch.name if u.branch else None
        ))
    return results
