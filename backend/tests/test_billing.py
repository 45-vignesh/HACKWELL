import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from datetime import datetime, date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.models.entities import (
    Inventory, Medicine, Ward, InventoryBatch, Bill, BillItem,
    BillStatus, BatchStatus, AuditLog, DataAuditTrail, MedicationUsageHistory,
    UserRole
)
from app.services.auth_service import create_access_token

client = TestClient(app)

@pytest.fixture
def auth_headers():
    dm_token = create_access_token("data_manager", "DATA_MANAGER", "Alex Chen", company_id=1, branch_id=1)
    pharm_token = create_access_token("pharmacist", "PHARMACIST", "Dr. Sarah Alston", company_id=1, branch_id=1)
    admin_token = create_access_token("admin", "ADMIN", "Elena Rostova", company_id=1, branch_id=None)
    return {
        "data_manager": {"Authorization": f"Bearer {dm_token}"},
        "pharmacist": {"Authorization": f"Bearer {pharm_token}"},
        "admin": {"Authorization": f"Bearer {admin_token}"}
    }

def test_1_successful_bill_reduces_inventory(auth_headers):
    """1. Successful bill reduces inventory by the exact billed quantity."""
    db = SessionLocal()
    try:
        inv = db.query(Inventory).filter(Inventory.current_stock >= 15).first()
        assert inv is not None, "Need an inventory record with at least 15 stock"
        med_id = inv.medicine_id
        ward_id = inv.ward_id
        initial_stock = inv.current_stock
        bill_qty = 5
    finally:
        db.close()

    res = client.post(
        "/api/billing/bills",
        headers=auth_headers["pharmacist"],
        json={
            "ward_id": ward_id,
            "patient_name": "John Doe",
            "items": [{"medicine_id": med_id, "quantity": bill_qty}]
        }
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert len(data["items"]) == 1
    assert data["items"][0]["previous_stock"] == initial_stock
    assert data["items"][0]["updated_stock"] == initial_stock - bill_qty

    # Verify directly in PostgreSQL
    db = SessionLocal()
    try:
        inv_after = db.query(Inventory).filter(Inventory.medicine_id == med_id, Inventory.ward_id == ward_id).first()
        assert inv_after.current_stock == initial_stock - bill_qty
    finally:
        db.close()

def test_2_multiple_medicine_bill_reduces_each_item(auth_headers):
    """2. Multiple medicine bill reduces each item correctly."""
    db = SessionLocal()
    try:
        inv1 = db.query(Inventory).filter(Inventory.ward_id == 1, Inventory.current_stock >= 10).first()
        assert inv1 is not None, "Need first inventory item with stock >= 10"
        inv2 = db.query(Inventory).filter(
            Inventory.ward_id == 1,
            Inventory.medicine_id != inv1.medicine_id,
            Inventory.current_stock >= 10
        ).first()
        assert inv2 is not None, "Need second distinct inventory item with stock >= 10"
        med1_id, ward1_id, stock1 = inv1.medicine_id, inv1.ward_id, inv1.current_stock
        med2_id, stock2 = inv2.medicine_id, inv2.current_stock
        qty1, qty2 = 3, 4
    finally:
        db.close()


    res = client.post(
        "/api/billing/bills",
        headers=auth_headers["pharmacist"],
        json={
            "ward_id": ward1_id,
            "patient_name": "Multi Patient",
            "items": [
                {"medicine_id": med1_id, "quantity": qty1},
                {"medicine_id": med2_id, "quantity": qty2}
            ]
        }
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert len(data["items"]) == 2

    # Verify both stock levels in database
    db = SessionLocal()
    try:
        inv1 = db.query(Inventory).filter(Inventory.medicine_id == med1_id, Inventory.ward_id == ward1_id).first()
        inv2 = db.query(Inventory).filter(Inventory.medicine_id == med2_id, Inventory.ward_id == ward1_id).first()
        assert inv1.current_stock == stock1 - qty1
        assert inv2.current_stock == stock2 - qty2
    finally:
        db.close()

def test_3_insufficient_stock_rejects_billing(auth_headers):
    """3. Insufficient stock rejects billing and leaves stock unchanged."""
    db = SessionLocal()
    try:
        inv = db.query(Inventory).first()
        med_id = inv.medicine_id
        ward_id = inv.ward_id
        current_stock = inv.current_stock
    finally:
        db.close()

    excess_qty = current_stock + 9999
    res = client.post(
        "/api/billing/bills",
        headers=auth_headers["pharmacist"],
        json={
            "ward_id": ward_id,
            "items": [{"medicine_id": med_id, "quantity": excess_qty}]
        }
    )
    assert res.status_code == 400
    assert "Insufficient stock" in res.json()["detail"]

    # Verify stock is completely unchanged
    db = SessionLocal()
    try:
        inv_after = db.query(Inventory).filter(Inventory.medicine_id == med_id, Inventory.ward_id == ward_id).first()
        assert inv_after.current_stock == current_stock
    finally:
        db.close()

def test_4_negative_quantity_rejected(auth_headers):
    """4. Negative quantity is rejected with HTTP 400."""
    res = client.post(
        "/api/billing/bills",
        headers=auth_headers["pharmacist"],
        json={
            "ward_id": 1,
            "items": [{"medicine_id": 1, "quantity": -5}]
        }
    )
    assert res.status_code == 400
    assert "positive integer" in res.json()["detail"]

def test_5_zero_quantity_rejected(auth_headers):
    """5. Zero quantity is rejected with HTTP 400."""
    res = client.post(
        "/api/billing/bills",
        headers=auth_headers["pharmacist"],
        json={
            "ward_id": 1,
            "items": [{"medicine_id": 1, "quantity": 0}]
        }
    )
    assert res.status_code == 400
    assert "positive integer" in res.json()["detail"]

def test_6_failed_transaction_does_not_reduce_stock(auth_headers):
    """6. Failed transaction rolls back and does not reduce stock of any item."""
    db = SessionLocal()
    try:
        inv1 = db.query(Inventory).filter(Inventory.current_stock >= 10).first()
        med1_id = inv1.medicine_id
        ward_id = inv1.ward_id
        stock1 = inv1.current_stock
    finally:
        db.close()

    # Create multi-item request where second item has an invalid medicine ID
    res = client.post(
        "/api/billing/bills",
        headers=auth_headers["pharmacist"],
        json={
            "ward_id": ward_id,
            "items": [
                {"medicine_id": med1_id, "quantity": 5},
                {"medicine_id": 999999, "quantity": 2}  # non-existent medicine
            ]
        }
    )
    assert res.status_code in [400, 404]

    # Check stock1 is completely untouched
    db = SessionLocal()
    try:
        inv1_after = db.query(Inventory).filter(Inventory.medicine_id == med1_id, Inventory.ward_id == ward_id).first()
        assert inv1_after.current_stock == stock1
    finally:
        db.close()

def test_7_successful_bill_creates_audit_record(auth_headers):
    """7. Successful bill creates audit record in AuditLog and DataAuditTrail."""
    db = SessionLocal()
    try:
        inv = db.query(Inventory).filter(Inventory.current_stock >= 5).first()
        med_id = inv.medicine_id
        ward_id = inv.ward_id
    finally:
        db.close()

    res = client.post(
        "/api/billing/bills",
        headers=auth_headers["pharmacist"],
        json={
            "ward_id": ward_id,
            "items": [{"medicine_id": med_id, "quantity": 2}]
        }
    )
    assert res.status_code == 201
    bill_number = res.json()["bill_number"]

    # Verify AuditLog has BILL_COMPLETED record
    db = SessionLocal()
    try:
        audits = db.query(AuditLog).filter(AuditLog.action == "BILL_COMPLETED").order_by(AuditLog.id.desc()).limit(20).all()
        matched_audit = next((a for a in audits if a.details and a.details.get("bill_number") == bill_number), None)
        assert matched_audit is not None
        assert matched_audit.event_type == "PHARMACY_BILLING"

        trails = db.query(DataAuditTrail).filter(DataAuditTrail.action == "BILL_COMPLETED").order_by(DataAuditTrail.id.desc()).limit(20).all()
        matched_trail = next((t for t in trails if t.new_value and t.new_value.get("bill_number") == bill_number), None)
        assert matched_trail is not None
        assert matched_trail.source == "BILLING"
    finally:
        db.close()


def test_8_duplicate_submission_does_not_double_deduct(auth_headers):
    """8. Duplicate submission check (e.g. duplicate item inside same bill rejected)."""
    res = client.post(
        "/api/billing/bills",
        headers=auth_headers["pharmacist"],
        json={
            "ward_id": 1,
            "items": [
                {"medicine_id": 1, "quantity": 2},
                {"medicine_id": 1, "quantity": 3}
            ]
        }
    )
    assert res.status_code == 400
    assert "Duplicate medicine" in res.json()["detail"]

def test_9_only_authorized_role_can_create_bills(auth_headers):
    """9. Only PHARMACIST and ADMIN can create bills; DATA_MANAGER is rejected with 403."""
    # Data Manager attempt -> 403 Forbidden
    res_dm = client.post(
        "/api/billing/bills",
        headers=auth_headers["data_manager"],
        json={
            "ward_id": 1,
            "items": [{"medicine_id": 1, "quantity": 1}]
        }
    )
    assert res_dm.status_code == 403
    assert "Access denied" in res_dm.json()["detail"]

    # Admin attempt -> Allowed
    db = SessionLocal()
    try:
        inv = db.query(Inventory).filter(Inventory.current_stock >= 5).first()
        med_id = inv.medicine_id
        ward_id = inv.ward_id
    finally:
        db.close()

    res_admin = client.post(
        "/api/billing/bills",
        headers=auth_headers["admin"],
        json={
            "ward_id": ward_id,
            "items": [{"medicine_id": med_id, "quantity": 1}]
        }
    )
    assert res_admin.status_code == 201

def test_10_mimic_historical_data_remains_unchanged(auth_headers):
    """10. MIMIC historical data (MedicationUsageHistory) remains 100% unchanged."""
    db = SessionLocal()
    try:
        initial_mimic_count = db.query(MedicationUsageHistory).count()
        sample_record = db.query(MedicationUsageHistory).first()
        sample_qty = sample_record.quantity_used if sample_record else None
    finally:
        db.close()

    # Perform a successful bill
    db = SessionLocal()
    try:
        inv = db.query(Inventory).filter(Inventory.current_stock >= 5).first()
        med_id = inv.medicine_id
        ward_id = inv.ward_id
    finally:
        db.close()

    res = client.post(
        "/api/billing/bills",
        headers=auth_headers["pharmacist"],
        json={
            "ward_id": ward_id,
            "items": [{"medicine_id": med_id, "quantity": 1}]
        }
    )
    assert res.status_code == 201

    # Verify MIMIC records are completely untouched
    db = SessionLocal()
    try:
        final_mimic_count = db.query(MedicationUsageHistory).count()
        assert final_mimic_count == initial_mimic_count
        if sample_record:
            rec = db.query(MedicationUsageHistory).filter(MedicationUsageHistory.id == sample_record.id).first()
            assert rec.quantity_used == sample_qty
    finally:
        db.close()

def test_11_batch_fefo_behavior(auth_headers):
    """11. Batch/FEFO behavior: earliest-expiring active batch is consumed first."""
    db = SessionLocal()
    try:
        # Find a medicine with at least 2 active batches with stock
        batches = db.query(InventoryBatch).filter(
            InventoryBatch.current_quantity > 0,
            InventoryBatch.status.in_([BatchStatus.ACTIVE, BatchStatus.NEAR_EXPIRY])
        ).order_by(InventoryBatch.expiry_date.asc()).all()

        assert len(batches) >= 2, "Need at least 2 active batches"
        earliest_batch = batches[0]
        med_id = earliest_batch.medicine_id
        ward_id = earliest_batch.ward_id
        initial_batch_qty = earliest_batch.current_quantity
        b_id = earliest_batch.id
    finally:
        db.close()

    deduct_qty = min(2, initial_batch_qty)
    res = client.post(
        "/api/billing/bills",
        headers=auth_headers["pharmacist"],
        json={
            "ward_id": ward_id,
            "items": [{"medicine_id": med_id, "quantity": deduct_qty}]
        }
    )
    assert res.status_code == 201
    bill_data = res.json()

    # Check batch deduction detail in response
    item_res = bill_data["items"][0]
    assert len(item_res["batch_deductions"]) > 0
    assert item_res["batch_deductions"][0]["batch_id"] == b_id

    # Check database state
    db = SessionLocal()
    try:
        b_after = db.query(InventoryBatch).filter(InventoryBatch.id == b_id).first()
        assert b_after.current_quantity == initial_batch_qty - deduct_qty
    finally:
        db.close()

def test_12_cancelled_bill_reverses_stock_exactly_once(auth_headers):
    """12. Cancelled bill reverses stock exactly once; duplicate cancellation is blocked."""
    db = SessionLocal()
    try:
        inv = db.query(Inventory).filter(Inventory.current_stock >= 10).first()
        med_id = inv.medicine_id
        ward_id = inv.ward_id
        stock_before_bill = inv.current_stock
    finally:
        db.close()

    bill_qty = 4
    # 1. Create bill
    res = client.post(
        "/api/billing/bills",
        headers=auth_headers["pharmacist"],
        json={
            "ward_id": ward_id,
            "items": [{"medicine_id": med_id, "quantity": bill_qty}]
        }
    )
    assert res.status_code == 201
    bill_id = res.json()["id"]

    # Verify stock dropped
    db = SessionLocal()
    try:
        inv_billed = db.query(Inventory).filter(Inventory.medicine_id == med_id, Inventory.ward_id == ward_id).first()
        assert inv_billed.current_stock == stock_before_bill - bill_qty
    finally:
        db.close()

    # 2. Cancel bill
    cancel_res = client.post(
        f"/api/billing/bills/{bill_id}/cancel",
        headers=auth_headers["pharmacist"]
    )
    assert cancel_res.status_code == 200
    cancel_data = cancel_res.json()
    assert cancel_data["status"] == "CANCELLED"
    assert cancel_data["reversed_items"][0]["restored_stock"] == stock_before_bill

    # Verify stock restored in database
    db = SessionLocal()
    try:
        inv_restored = db.query(Inventory).filter(Inventory.medicine_id == med_id, Inventory.ward_id == ward_id).first()
        assert inv_restored.current_stock == stock_before_bill
    finally:
        db.close()

    # 3. Attempt duplicate cancellation -> must be rejected with 400
    dup_cancel = client.post(
        f"/api/billing/bills/{bill_id}/cancel",
        headers=auth_headers["pharmacist"]
    )
    assert dup_cancel.status_code == 400
    assert "already cancelled" in dup_cancel.json()["detail"]

    # Stock should remain at stock_before_bill (no double-reversal)
    db = SessionLocal()
    try:
        inv_check = db.query(Inventory).filter(Inventory.medicine_id == med_id, Inventory.ward_id == ward_id).first()
        assert inv_check.current_stock == stock_before_bill
    finally:
        db.close()


def test_13_billing_with_explicit_inventory_id_reduces_exact_inventory_record(auth_headers):
    """13. Explicit inventory_id targets and reduces the exact inventory row in PostgreSQL."""
    db = SessionLocal()
    try:
        # Pick an inventory record in Ward 3 or 4 with stock
        target_inv = db.query(Inventory).filter(Inventory.ward_id >= 2, Inventory.current_stock >= 10).first()
        assert target_inv is not None
        target_inv_id = target_inv.id
        med_id = target_inv.medicine_id
        target_ward_id = target_inv.ward_id
        initial_stock = target_inv.current_stock

        # Also find another inventory record for the SAME medicine in another ward to ensure it is untouched
        other_inv = db.query(Inventory).filter(
            Inventory.medicine_id == med_id,
            Inventory.id != target_inv_id
        ).first()
        other_inv_id = other_inv.id if other_inv else None
        other_initial_stock = other_inv.current_stock if other_inv else None
    finally:
        db.close()

    bill_qty = 3
    res = client.post(
        "/api/billing/bills",
        headers=auth_headers["pharmacist"],
        json={
            "ward_id": target_ward_id,
            "patient_name": "Target Ward Patient",
            "items": [{"inventory_id": target_inv_id, "medicine_id": med_id, "quantity": bill_qty}]
        }
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["items"][0]["inventory_id"] == target_inv_id
    assert data["items"][0]["previous_stock"] == initial_stock
    assert data["items"][0]["updated_stock"] == initial_stock - bill_qty

    # Verify directly in PostgreSQL: targeted inventory is reduced
    db = SessionLocal()
    try:
        inv_after = db.query(Inventory).filter(Inventory.id == target_inv_id).first()
        assert inv_after.current_stock == initial_stock - bill_qty

        # Verify other ward inventory for same medicine remained UNTOUCHED
        if other_inv_id is not None:
            other_after = db.query(Inventory).filter(Inventory.id == other_inv_id).first()
            assert other_after.current_stock == other_initial_stock
    finally:
        db.close()


def test_14_billing_and_cancel_with_inventory_id_restores_exact_record(auth_headers):
    """14. Cancelling a bill created with inventory_id restores stock to that exact record."""
    db = SessionLocal()
    try:
        target_inv = db.query(Inventory).filter(Inventory.current_stock >= 10).first()
        target_inv_id = target_inv.id
        initial_stock = target_inv.current_stock
    finally:
        db.close()

    bill_qty = 2
    res = client.post(
        "/api/billing/bills",
        headers=auth_headers["pharmacist"],
        json={
            "items": [{"inventory_id": target_inv_id, "quantity": bill_qty}]
        }
    )
    assert res.status_code == 201
    bill_id = res.json()["id"]

    # Verify reduced
    db = SessionLocal()
    try:
        inv_reduced = db.query(Inventory).filter(Inventory.id == target_inv_id).first()
        assert inv_reduced.current_stock == initial_stock - bill_qty
    finally:
        db.close()

    # Cancel
    cancel_res = client.post(
        f"/api/billing/bills/{bill_id}/cancel",
        headers=auth_headers["pharmacist"]
    )
    assert cancel_res.status_code == 200

    # Verify restored exactly
    db = SessionLocal()
    try:
        inv_restored = db.query(Inventory).filter(Inventory.id == target_inv_id).first()
        assert inv_restored.current_stock == initial_stock
    finally:
        db.close()

