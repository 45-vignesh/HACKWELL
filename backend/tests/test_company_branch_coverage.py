import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.entities import Company, Branch, User, UserRole
from app.services.auth_service import ensure_seed_users, DEFAULT_DEMO_USERS

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database_accounts():
    """Ensure all seed users, companies, and branches are seeded and synchronized before tests."""
    db = SessionLocal()
    ensure_seed_users(db)
    db.close()

def test_all_companies_have_active_admin_login():
    """
    Every active company must have at least one valid, active ADMIN login.
    Admin authentication requires ONLY Company (NO branch).
    """
    db = SessionLocal()
    companies = db.query(Company).filter(Company.status == "ACTIVE").all()
    db.close()

    assert len(companies) >= 2, "There must be at least 2 active companies."

    for comp in companies:
        db = SessionLocal()
        admin_user = db.query(User).filter(
            User.company_id == comp.id,
            User.role == UserRole.ADMIN,
            User.branch_id == None,
            User.active == True
        ).first()
        db.close()

        assert admin_user is not None, f"Active company '{comp.name}' (ID: {comp.id}) has no valid ADMIN account!"

        response = client.post(
            "/api/auth/login",
            json={
                "username": admin_user.username,
                "password": "Admin@123",
                "role": "ADMIN",
                "company_id": comp.id
            }
        )
        assert response.status_code == 200, f"ADMIN login failed for company {comp.name}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "ADMIN"
        assert data["user"]["company_id"] == comp.id
        assert data["user"]["branch_id"] is None, "Administrator must NOT have a branch assigned."

def test_all_branches_have_active_data_manager_login():
    """
    Every active branch must have a valid, active DATA_MANAGER login.
    Authentication: Company -> Branch -> Credentials.
    """
    db = SessionLocal()
    branches = db.query(Branch).filter(Branch.status == "ACTIVE").all()
    db.close()

    assert len(branches) >= 5, "There must be at least 5 active branches."

    for branch in branches:
        db = SessionLocal()
        dm_user = db.query(User).filter(
            User.company_id == branch.company_id,
            User.branch_id == branch.id,
            User.role == UserRole.DATA_MANAGER,
            User.active == True
        ).first()
        db.close()

        assert dm_user is not None, f"Branch '{branch.name}' (ID: {branch.id}) has no DATA_MANAGER account!"

        response = client.post(
            "/api/auth/login",
            json={
                "username": dm_user.username,
                "password": "DataManager@123",
                "role": "DATA_MANAGER",
                "company_id": branch.company_id,
                "branch_id": branch.id
            }
        )
        assert response.status_code == 200, f"DATA_MANAGER login failed for branch {branch.name}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "DATA_MANAGER"
        assert data["user"]["company_id"] == branch.company_id
        assert data["user"]["branch_id"] == branch.id

def test_all_branches_have_active_pharmacist_login():
    """
    Every active branch must have a valid, active PHARMACIST login.
    Authentication: Company -> Branch -> Credentials.
    """
    db = SessionLocal()
    branches = db.query(Branch).filter(Branch.status == "ACTIVE").all()
    db.close()

    assert len(branches) >= 5, "There must be at least 5 active branches."

    for branch in branches:
        db = SessionLocal()
        pharm_user = db.query(User).filter(
            User.company_id == branch.company_id,
            User.branch_id == branch.id,
            User.role == UserRole.PHARMACIST,
            User.active == True
        ).first()
        db.close()

        assert pharm_user is not None, f"Branch '{branch.name}' (ID: {branch.id}) has no PHARMACIST account!"

        response = client.post(
            "/api/auth/login",
            json={
                "username": pharm_user.username,
                "password": "Pharmacist@123",
                "role": "PHARMACIST",
                "company_id": branch.company_id,
                "branch_id": branch.id
            }
        )
        assert response.status_code == 200, f"PHARMACIST login failed for branch {branch.name}: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "PHARMACIST"
        assert data["user"]["company_id"] == branch.company_id
        assert data["user"]["branch_id"] == branch.id

def test_invalid_cross_company_branch_rejection():
    """Selected branch must belong to selected company; reject cross-combinations with 400."""
    res = client.post(
        "/api/auth/login",
        json={
            "username": "data_manager",
            "password": "DataManager@123",
            "role": "DATA_MANAGER",
            "company_id": 1,
            "branch_id": 4
        }
    )
    assert res.status_code == 400
    assert "does not belong to company" in res.json()["detail"]

    res2 = client.post(
        "/api/auth/login",
        json={
            "username": "dm_apex_city",
            "password": "DataManager@123",
            "role": "DATA_MANAGER",
            "company_id": 2,
            "branch_id": 1
        }
    )
    assert res2.status_code == 400
    assert "does not belong to company" in res2.json()["detail"]

def test_cross_branch_unauthorized_access_rejection():
    """Users cannot authenticate into a branch they are not assigned to (403 Forbidden)."""
    res = client.post(
        "/api/auth/login",
        json={
            "username": "data_manager",
            "password": "DataManager@123",
            "role": "DATA_MANAGER",
            "company_id": 1,
            "branch_id": 2
        }
    )
    assert res.status_code == 403
    assert "not authorized for branch ID 2" in res.json()["detail"]

    res2 = client.post(
        "/api/auth/login",
        json={
            "username": "dm_annanagar",
            "password": "DataManager@123",
            "role": "DATA_MANAGER",
            "company_id": 1,
            "branch_id": 3
        }
    )
    assert res2.status_code == 403
    assert "not authorized for branch ID 3" in res2.json()["detail"]

def test_cross_company_unauthorized_access_rejection():
    """Users cannot authenticate into a company they are not assigned to (403 Forbidden)."""
    res = client.post(
        "/api/auth/login",
        json={
            "username": "admin",
            "password": "Admin@123",
            "role": "ADMIN",
            "company_id": 2
        }
    )
    assert res.status_code == 403
    assert "not authorized for company ID 2" in res.json()["detail"]

def test_invalid_passwords_rejected():
    """Incorrect passwords must always return HTTP 401."""
    res = client.post(
        "/api/auth/login",
        json={
            "username": "dm_annanagar",
            "password": "WrongPassword!999",
            "role": "DATA_MANAGER",
            "company_id": 1,
            "branch_id": 2
        }
    )
    assert res.status_code == 401

def test_coverage_report_endpoint():
    """GET /api/auth/coverage-report returns complete audit with 100% pass rate."""
    res = client.get("/api/auth/coverage-report")
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["total_active_companies"] >= 2
    assert data["summary"]["total_active_branches"] >= 5
    assert data["summary"]["all_branches_passed"] is True
    assert data["summary"]["data_manager_verified"] == data["summary"]["total_active_branches"]
    assert data["summary"]["pharmacist_verified"] == data["summary"]["total_active_branches"]
    assert data["summary"]["admin_verified"] == data["summary"]["total_active_companies"]
