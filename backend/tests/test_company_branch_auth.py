import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_company_list_endpoint():
    """1. Test Company selection endpoint returns active companies with branches."""
    res = client.get("/api/auth/companies")
    assert res.status_code == 200
    companies = res.json()
    assert len(companies) >= 2
    c1 = next((c for c in companies if c["code"] == "ABC-HC"), None)
    assert c1 is not None
    assert c1["name"] == "ABC Healthcare"
    assert len(c1["branches"]) >= 3

def test_branch_filtering_by_company():
    """2. Test Branch filtering only returns branches belonging strictly to selected company."""
    # Company 1
    res1 = client.get("/api/auth/companies/1/branches")
    assert res1.status_code == 200
    branches1 = res1.json()
    assert len(branches1) >= 3
    assert all(b["company_id"] == 1 for b in branches1)

    # Company 2
    res2 = client.get("/api/auth/companies/2/branches")
    assert res2.status_code == 200
    branches2 = res2.json()
    assert len(branches2) >= 2
    assert all(b["company_id"] == 2 for b in branches2)

def test_data_manager_login_with_company_and_branch():
    """3. Test Data Manager login with Company 1 + Branch 1."""
    res = client.post("/api/auth/login", json={
        "username": "data_manager",
        "password": "DataManager@123",
        "role": "DATA_MANAGER",
        "company_id": 1,
        "branch_id": 1
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "DATA_MANAGER"
    assert data["user"]["company_id"] == 1
    assert data["user"]["company_name"] == "ABC Healthcare"
    assert data["user"]["branch_id"] == 1
    assert data["user"]["branch_name"] == "Chennai Main Hospital"

def test_pharmacist_login_with_company_and_branch():
    """4. Test Chief Pharmacist login with Company 1 + Branch 1."""
    res = client.post("/api/auth/login", json={
        "username": "pharmacist",
        "password": "Pharmacist@123",
        "role": "PHARMACIST",
        "company_id": 1,
        "branch_id": 1
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "PHARMACIST"
    assert data["user"]["company_id"] == 1
    assert data["user"]["branch_id"] == 1

def test_admin_login_with_company_no_branch():
    """5. Test Hospital Administrator login requires only Company and has NO branch."""
    res = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "Admin@123",
        "role": "ADMIN",
        "company_id": 1
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "ADMIN"
    assert data["user"]["company_id"] == 1
    assert data["user"]["branch_id"] is None
    assert data["user"]["branch_name"] is None

def test_invalid_company_branch_combination_rejection():
    """6. Test selecting Branch belonging to Company 2 with Company 1 is strictly rejected with 400 Bad Request."""
    # Branch 4 belongs to Company 2, but paired with Company 1
    res = client.post("/api/auth/login", json={
        "username": "data_manager",
        "password": "DataManager@123",
        "role": "DATA_MANAGER",
        "company_id": 1,
        "branch_id": 4
    })
    assert res.status_code == 400
    assert "does not belong to company" in res.json()["detail"]

def test_wrong_password_rejection():
    """7. Test incorrect credentials rejected with HTTP 401."""
    res = client.post("/api/auth/login", json={
        "username": "data_manager",
        "password": "WrongPassword!999",
        "role": "DATA_MANAGER",
        "company_id": 1,
        "branch_id": 1
    })
    assert res.status_code == 401

def test_unauthorized_company_rejection():
    """8. Test user attempting to login to a company they are not assigned to is rejected with 403 Forbidden."""
    # data_manager is assigned to Company 1, attempting Company 2
    res = client.post("/api/auth/login", json={
        "username": "data_manager",
        "password": "DataManager@123",
        "role": "DATA_MANAGER",
        "company_id": 2,
        "branch_id": 4
    })
    assert res.status_code == 403
    assert "not authorized for company" in res.json()["detail"]

def test_role_switch_and_me_endpoint_with_scope():
    """9. Test /api/auth/me returns the authenticated company and branch scope."""
    res = client.post("/api/auth/login", json={
        "username": "data_manager",
        "password": "DataManager@123",
        "role": "DATA_MANAGER",
        "company_id": 1,
        "branch_id": 1
    })
    token = res.json()["token"]

    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["username"] == "data_manager"
    assert me_data["role"] == "DATA_MANAGER"
    assert me_data["company_id"] == 1
    assert me_data["company_name"] == "ABC Healthcare"
    assert me_data["branch_id"] == 1
    assert me_data["branch_name"] == "Chennai Main Hospital"
