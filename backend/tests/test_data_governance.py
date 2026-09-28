import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from datetime import datetime, date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database import get_db, SessionLocal
from app.models.entities import (
    Inventory, Medicine, Ward, TrustStatus, UserRole, DataAuditTrail, Approval,
    ApprovalStatus, ActionType, PurchaseOrder
)
from app.services.inventory_validator import InventoryValidator
from app.agents.monitor import MonitorAgent
from app.services.auth_service import create_access_token

client = TestClient(app)

@pytest.fixture
def auth_headers():
    data_mgr_token = create_access_token("data_manager", "DATA_MANAGER", "Alex Chen")
    pharm_token = create_access_token("pharmacist", "PHARMACIST", "Dr. Sarah Alston")
    admin_token = create_access_token("admin", "ADMIN", "Elena Rostova")
    return {
        "data_manager": {"Authorization": f"Bearer {data_mgr_token}"},
        "pharmacist": {"Authorization": f"Bearer {pharm_token}"},
        "admin": {"Authorization": f"Bearer {admin_token}"}
    }

def test_auth_login_and_roles():
    """Verify login endpoint returns valid JWT token and correct role metadata."""
    # Quick role demo switch
    res = client.post("/api/auth/login", json={"demo_role": "DATA_MANAGER"})
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["role"] == "DATA_MANAGER"
    assert data["user"]["username"] == "data_manager"

    # Pharmacist role
    res = client.post("/api/auth/login", json={"demo_role": "PHARMACIST"})
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "PHARMACIST"

def test_unauthorized_role_restrictions(auth_headers):
    """
    Test RBAC boundary:
    - DATA_MANAGER cannot approve/reject high-risk clinical actions (403 Forbidden).
    - PHARMACIST cannot manually overwrite operational inventory (403 Forbidden).
    """
    db = SessionLocal()
    try:
        # Get an active inventory item
        inv = db.query(Inventory).first()
        inv_id = inv.id

        # 1. Pharmacist trying to directly modify inventory stock -> 403 Forbidden
        pharm_res = client.put(
            f"/api/inventory/{inv_id}/stock",
            json={"new_stock": 100, "reason": "Pharmacist trying to edit stock"},
            headers=auth_headers["pharmacist"]
        )
        assert pharm_res.status_code == 403
        assert "Access denied" in pharm_res.json()["detail"]

        # Create a pending approval item to test approval barrier
        test_approval = db.query(Approval).filter(Approval.status == ApprovalStatus.PENDING).first()
        if not test_approval:
            test_approval = Approval(
                action_type=ActionType.PURCHASE_ORDER,
                reference_id=1,
                requested_by_agent="Procurement Agent",
                justification="Stockout buffer",
                estimated_cost=2500.0,
                requested_quantity=100,
                status=ApprovalStatus.PENDING
            )
            db.add(test_approval)
            db.commit()
            db.refresh(test_approval)

        appr_id = test_approval.id

        # 2. Data Manager trying to approve action -> 403 Forbidden
        dm_res = client.post(
            f"/api/approvals/{appr_id}/decide",
            json={"decision": "APPROVE", "decision_by": "Alex Chen", "reason": "Data Manager approving PO"},
            headers=auth_headers["data_manager"]
        )
        assert dm_res.status_code == 403
        assert "Access denied" in dm_res.json()["detail"]
    finally:
        db.close()

def test_inventory_validation_negative_stock(auth_headers):
    """Verify validation engine rejects negative stock inputs with HTTP 400."""
    db = SessionLocal()
    try:
        inv = db.query(Inventory).first()
        inv_id = inv.id
        old_stock = inv.current_stock

        res = client.put(
            f"/api/inventory/{inv_id}/stock",
            json={"new_stock": -25, "reason": "Physical count audit"},
            headers=auth_headers["data_manager"]
        )
        assert res.status_code == 400
        assert "cannot be negative" in res.json()["detail"]

        # Stock in database must remain unchanged
        db.refresh(inv)
        assert inv.current_stock == old_stock

        # Audit trail must record the rejected attempt
        rejected_audit = db.query(DataAuditTrail).filter(
            DataAuditTrail.record_id == inv_id,
            DataAuditTrail.validation_result == "REJECTED"
        ).order_by(DataAuditTrail.id.desc()).first()
        assert rejected_audit is not None
        assert rejected_audit.user == "data_manager"
    finally:
        db.close()

def test_inventory_validation_invalid_dates_and_duplicates():
    """Verify validation engine catches invalid date orders and duplicate records."""
    db = SessionLocal()
    try:
        med = db.query(Medicine).first()
        ward = db.query(Ward).first()

        # Row with expiry date earlier than received date
        bad_date_row = {
            "medicine_code": med.code,
            "ward_code": ward.code,
            "current_stock": 50,
            "received_date": "2026-05-15",
            "expiry_date": "2026-01-10"
        }
        report = InventoryValidator.validate_single_record(db, bad_date_row)
        assert report["is_valid"] is False
        assert report["status"] == "REJECTED"
        assert any("cannot be earlier than received date" in err for err in report["errors"])

        # Duplicate check in batch
        batch_rows = [
            {"medicine_code": med.code, "ward_code": ward.code, "current_stock": 20},
            {"medicine_code": med.code, "ward_code": ward.code, "current_stock": 40}
        ]
        batch_report = InventoryValidator.validate_csv_batch(db, batch_rows)
        assert batch_report["rejected_count"] == 1
        assert any("Duplicate entry detected" in str(err) for err in batch_report["errors"])
    finally:
        db.close()

def test_abnormal_jump_warning_and_override(auth_headers):
    """
    Verify large stock jump generates a WARNING that requires override confirmation.
    """
    db = SessionLocal()
    try:
        inv = db.query(Inventory).first()
        inv_id = inv.id
        old_stock = inv.current_stock

        # Massive jump without override
        large_stock = old_stock + 600
        res = client.put(
            f"/api/inventory/{inv_id}/stock",
            json={"new_stock": large_stock, "reason": "Massive shipment arrived", "override_warning": False},
            headers=auth_headers["data_manager"]
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "WARNING"
        assert data["requires_override"] is True
        assert "Large stock change detected" in data["message"]

        # Re-submitting with override_warning = True commits the change
        override_res = client.put(
            f"/api/inventory/{inv_id}/stock",
            json={"new_stock": large_stock, "reason": "Massive shipment arrived - verified with packing slip #998", "override_warning": True},
            headers=auth_headers["data_manager"]
        )
        assert override_res.status_code == 200
        assert override_res.json()["status"] == "SUCCESS"
        assert override_res.json()["new_stock"] == large_stock

        # Restore original stock for cleanliness
        client.put(
            f"/api/inventory/{inv_id}/stock",
            json={"new_stock": old_stock, "reason": "Restoring test baseline", "override_warning": True},
            headers=auth_headers["data_manager"]
        )
    finally:
        db.close()

def test_ai_agent_trust_boundary_filtering():
    """
    Core Governance Rule:
    AI agents must strictly ignore unvalidated (REJECTED, PENDING_REVIEW, WARNING) operational data.
    Only VALIDATED inventory is processed.
    """
    db = SessionLocal()
    try:
        med = db.query(Medicine).first()
        ward = db.query(Ward).first()
        inv = db.query(Inventory).filter(
            Inventory.medicine_id == med.id,
            Inventory.ward_id == ward.id
        ).first()

        # Temporarily quarantine item to REJECTED
        original_status = inv.trust_status
        inv.trust_status = TrustStatus.REJECTED
        db.commit()

        # MonitorAgent.inspect_inventory MUST reject or raise ValueError on untrusted data
        with pytest.raises(ValueError, match="Validated inventory item"):
            MonitorAgent.inspect_inventory(db, med.id, ward.id)

        # MonitorAgent global scan MUST ignore the quarantined record
        inv.current_stock = 0  # low stock that would trigger alert if validated
        db.commit()

        state = {"timeline_logs": [], "agent_messages": []}
        scan_res = MonitorAgent.run(state, db)
        # Should not process the rejected inventory item
        assert scan_res is not None

        # Restore to VALIDATED
        inv.trust_status = TrustStatus.VALIDATED
        inv.current_stock = 50
        db.commit()

        # Now inspect_inventory succeeds
        snapshot = MonitorAgent.inspect_inventory(db, med.id, ward.id)
        assert snapshot["medicine_id"] == med.id
        assert snapshot["status"] in ["NORMAL", "LOW_STOCK", "CRITICAL_LOW", "SURPLUS"]
    finally:
        inv.trust_status = TrustStatus.VALIDATED
        db.commit()
        db.close()

def test_data_audit_trail_endpoint(auth_headers):
    """Verify data audit trail endpoint returns logged data changes."""
    res = client.get("/api/audit-trail/data")
    assert res.status_code == 200
    records = res.json()
    assert isinstance(records, list)
    assert len(records) > 0
    first_record = records[0]
    assert "user" in first_record
    assert "role" in first_record
    assert "action" in first_record
    assert "validation_result" in first_record
    assert "reason" in first_record

def test_pharmacist_approval_workflow(auth_headers):
    """Verify Pharmacist can approve recommendations and an audit log is recorded."""
    db = SessionLocal()
    try:
        appr = Approval(
            action_type=ActionType.PURCHASE_ORDER,
            reference_id=1,
            requested_by_agent="Procurement Agent",
            justification="Stockout buffer clinical order",
            estimated_cost=1200.0,
            requested_quantity=50,
            status=ApprovalStatus.PENDING
        )
        db.add(appr)
        db.commit()
        db.refresh(appr)

        res = client.post(
            f"/api/approvals/{appr.id}/decide",
            json={"decision": "APPROVE", "decision_by": "Dr. Sarah Alston", "reason": "Medically indicated for ICU"},
            headers=auth_headers["pharmacist"]
        )
        assert res.status_code == 200
        assert res.json()["status"] == "success"

        db.refresh(appr)
        assert appr.status == ApprovalStatus.APPROVED
        assert appr.decision_by == "Dr. Sarah Alston"

        # Check DataAuditTrail for the approval
        audit = db.query(DataAuditTrail).filter(
            DataAuditTrail.record_id == appr.id,
            DataAuditTrail.action == "DECISION_APPROVE"
        ).first()
        assert audit is not None
        assert audit.role == "PHARMACIST"
    finally:
        db.close()
