from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import User, UserRole
from datetime import datetime
from sqlalchemy import func
from app.schemas.schemas import LoginRequest, LoginResponse, UserResponse, RegisterRequest, RegisterResponse
from app.services.auth_service import (
    DEFAULT_DEMO_USERS,
    ensure_seed_users,
    create_access_token,
    get_current_user,
    require_role,
    hash_password,
    verify_password
)

router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])

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

    new_user = User(
        username=username,
        role=UserRole(role_str),
        display_name=full_name,
        title=title,
        email=email,
        password_hash=p_hash,
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
        role=new_user.role.value if hasattr(new_user.role, 'value') else str(new_user.role)
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
        token = create_access_token(
            username=matched["username"],
            role=matched["role"],
            display_name=matched["display_name"],
            title=matched["title"]
        )
        return LoginResponse(
            token=token,
            user=UserResponse(
                id=1,
                username=matched["username"],
                role=matched["role"],
                display_name=matched["display_name"],
                title=matched["title"]
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

    token = create_access_token(
        username=user_username,
        role=user_role,
        display_name=user_display,
        title=user_title
    )
    return LoginResponse(
        token=token,
        user=UserResponse(
            id=user_id,
            username=user_username,
            role=user_role,
            display_name=user_display,
            title=user_title
        )
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    """Return currently active user session profile."""
    return UserResponse(
        id=1,
        username=current_user["username"],
        role=current_user["role"],
        display_name=current_user.get("display_name", current_user["username"]),
        title=current_user.get("title", "")
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
            title=u.title
        ))
    return results
