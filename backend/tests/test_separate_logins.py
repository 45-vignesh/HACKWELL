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
