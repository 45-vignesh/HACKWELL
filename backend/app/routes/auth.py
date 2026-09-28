from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import User, UserRole
from app.schemas.schemas import LoginRequest, LoginResponse, UserResponse
from app.services.auth_service import (
    DEFAULT_DEMO_USERS,
    ensure_seed_users,
    create_access_token,
    get_current_user,
    require_role
)

router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])

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
                detail=f"Unknown demo role: {payload.demo_role}. Choose DATA_MANAGER, PHARMACIST, or ADMIN."
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

    # 2. Login by username
    if not payload.username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or demo_role required.")

    uname = payload.username.lower().strip()
    matched = next((u for u in DEFAULT_DEMO_USERS if u["username"] == uname), None)
    if not matched:
        # Fallback to database user query
        db_user = db.query(User).filter(User.username == uname).first()
        if not db_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
        token = create_access_token(
            username=db_user.username,
            role=db_user.role.value if hasattr(db_user.role, 'value') else db_user.role,
            display_name=db_user.display_name,
            title=db_user.title
        )
        return LoginResponse(
            token=token,
            user=UserResponse(
                id=db_user.id,
                username=db_user.username,
                role=db_user.role.value if hasattr(db_user.role, 'value') else db_user.role,
                display_name=db_user.display_name,
                title=db_user.title
            )
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
