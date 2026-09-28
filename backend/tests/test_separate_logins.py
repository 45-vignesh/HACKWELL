import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_data_manager_login_success():
    """Verify Data Manager can authenticate with exact credentials and receives DATA_MANAGER role."""
    res = client.post("/api/auth/login", json={
        "username": "data_manager",
        "password": "DataManager@123",
        "role": "DATA_MANAGER"
    })
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["role"] == "DATA_MANAGER"
    assert data["user"]["username"] == "data_manager"

def test_pharmacist_login_success():
    """Verify Chief Pharmacist can authenticate with exact credentials and receives PHARMACIST role."""
    res = client.post("/api/auth/login", json={
        "username": "pharmacist",
        "password": "Pharmacist@123",
        "role": "PHARMACIST"
    })
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["role"] == "PHARMACIST"
    assert data["user"]["username"] == "pharmacist"

def test_admin_login_success():
    """Verify Hospital Administrator can authenticate with exact credentials and receives ADMIN role."""
    res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "Admin@123",
        "role": "ADMIN"
    })
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["role"] == "ADMIN"
    assert data["user"]["username"] == "admin"

def test_wrong_password_rejection():
    """Verify wrong password returns HTTP 401 Unauthorized for each role."""
    for uname in ["data_manager", "pharmacist", "admin"]:
        res = client.post("/api/auth/login", json={
            "username": uname,
            "password": "WrongPassword!999"
        })
        assert res.status_code == 401
        assert "Invalid username or password" in res.json()["detail"]

def test_missing_password_rejection():
    """Verify missing password returns HTTP 400 Bad Request."""
    res = client.post("/api/auth/login", json={
        "username": "data_manager"
    })
    assert res.status_code == 400
    assert "Password is required" in res.json()["detail"]

def test_portal_role_mismatch_rejection():
    """Verify attempting to log in with valid credentials for role A at portal B returns HTTP 403."""
    # Data Manager credentials at PHARMACIST portal
    res = client.post("/api/auth/login", json={
        "username": "data_manager",
        "password": "DataManager@123",
        "role": "PHARMACIST"
    })
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]

    # Pharmacist credentials at DATA_MANAGER portal
    res = client.post("/api/auth/login", json={
        "username": "pharmacist",
        "password": "Pharmacist@123",
        "role": "DATA_MANAGER"
    })
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]

def test_authenticated_session_and_me_endpoint():
    """Verify token from dedicated login authenticates /api/auth/me correctly."""
    res = client.post("/api/auth/login", json={
        "username": "pharmacist",
        "password": "Pharmacist@123"
    })
    token = res.json()["token"]

    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "PHARMACIST"

def test_registration_validation_failures():
    """Verify validation rules on registration endpoint."""
    # 1. Missing full_name
    r = client.post("/api/auth/register", json={
        "full_name": "", "username": "test_dm", "email": "test@hospital.org",
        "password": "Password123", "confirm_password": "Password123", "role": "DATA_MANAGER"
    })
    assert r.status_code == 400
    assert "Full Name is required" in r.json()["detail"]

    # 2. Invalid email
    r = client.post("/api/auth/register", json={
        "full_name": "Test User", "username": "test_dm", "email": "invalid-email-no-at",
        "password": "Password123", "confirm_password": "Password123", "role": "DATA_MANAGER"
    })
    assert r.status_code == 400
    assert "valid email" in r.json()["detail"].lower()

    # 3. Password mismatch
    r = client.post("/api/auth/register", json={
        "full_name": "Test User", "username": "test_dm", "email": "test@hospital.org",
        "password": "Password123", "confirm_password": "DifferentPassword456", "role": "DATA_MANAGER"
    })
    assert r.status_code == 400
    assert "Passwords do not match" in r.json()["detail"]

    # 4. Short password
    r = client.post("/api/auth/register", json={
        "full_name": "Test User", "username": "test_dm", "email": "test@hospital.org",
        "password": "123", "confirm_password": "123", "role": "DATA_MANAGER"
    })
    assert r.status_code == 400
    assert "at least 6 characters" in r.json()["detail"]

    # 5. Reserved username
    r = client.post("/api/auth/register", json={
        "full_name": "Admin Clone", "username": "admin", "email": "admin2@hospital.org",
        "password": "Password123", "confirm_password": "Password123", "role": "ADMIN"
    })
    assert r.status_code == 400
    assert "already reserved" in r.json()["detail"].lower()

def test_registration_and_login_flow():
    """Verify registration succeeds and newly created account can log in."""
    import uuid
    rand_id = uuid.uuid4().hex[:6]
    test_user = f"reg_user_{rand_id}"
    test_email = f"user_{rand_id}@hospital.org"

    # Register Data Manager
    reg_res = client.post("/api/auth/register", json={
        "full_name": "Registered Data Specialist",
        "username": test_user,
        "email": test_email,
        "password": "SecurePassword@2026",
        "confirm_password": "SecurePassword@2026",
        "role": "DATA_MANAGER"
    })
    assert reg_res.status_code == 200
    assert "Registration successful" in reg_res.json()["message"]
    assert reg_res.json()["username"] == test_user
    assert reg_res.json()["role"] == "DATA_MANAGER"

    # Login with newly registered account
    login_res = client.post("/api/auth/login", json={
        "username": test_user,
        "password": "SecurePassword@2026",
        "role": "DATA_MANAGER"
    })
    assert login_res.status_code == 200
    assert "token" in login_res.json()
    assert login_res.json()["user"]["role"] == "DATA_MANAGER"
    assert login_res.json()["user"]["display_name"] == "Registered Data Specialist"

    # Cannot log in as PHARMACIST portal with DATA_MANAGER account
    mismatch_res = client.post("/api/auth/login", json={
        "username": test_user,
        "password": "SecurePassword@2026",
        "role": "PHARMACIST"
    })
    assert mismatch_res.status_code == 403

