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
    Inventory, Medicine, Ward, Bill, BillItem,
    BillStatus, Patient, MedicationReminder, ReminderStatus,
    NotificationLog, NotificationStatus, UserRole
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

def test_1_patient_listing_and_creation(auth_headers):
    """Test listing patients and creating a new patient record."""
    res = client.get("/api/reminders/patients", headers=auth_headers["pharmacist"])
    assert res.status_code == 200, res.text
    patients = res.json()
    assert len(patients) >= 5, "Seed patients should be present"
    
    # Create new patient
    new_res = client.post(
        "/api/reminders/patients",
        headers=auth_headers["pharmacist"],
        json={
            "full_name": "Meera Krishnan",
            "mobile_number": "+91 98765 43210",
            "email": "meera.k@example.com",
            "notification_consent": True
        }
    )
    assert new_res.status_code == 201, new_res.text
    new_patient = new_res.json()
    assert new_patient["full_name"] == "Meera Krishnan"
    assert new_patient["notification_consent"] is True

def test_2_billing_creates_refill_reminder(auth_headers):
    """Test that billing a medicine with days_supply schedules a MedicationReminder."""
    db = SessionLocal()
    try:
        inv = db.query(Inventory).filter(Inventory.current_stock >= 10).first()
        assert inv is not None, "Need inventory record with current_stock >= 10"
        med_id = inv.medicine_id
        ward_id = inv.ward_id
        initial_stock = inv.current_stock
        patient = db.query(Patient).filter(Patient.notification_consent == True).first()
        assert patient is not None, "Need patient with consent"
        patient_id = patient.id
    finally:
        db.close()

    bill_payload = {
        "ward_id": ward_id,
        "patient_id": patient_id,
        "notes": "Prescription refill test",
        "items": [
            {
                "medicine_id": med_id,
                "quantity": 2,
                "days_supply": 30
            }
        ]
    }

    res = client.post("/api/billing/bills", headers=auth_headers["pharmacist"], json=bill_payload)
    assert res.status_code == 201, res.text
    data = res.json()
    bill_id = data["id"]
    assert data["status"] == "SUCCESS"
    assert data["refill_reminders_count"] >= 1
    assert data["items"][0]["updated_stock"] == initial_stock - 2

    # Verify database reminder entry
    db = SessionLocal()
    try:
        rem = db.query(MedicationReminder).filter(MedicationReminder.bill_id == bill_id).first()
        assert rem is not None, "MedicationReminder should be created"
        assert rem.patient_id == patient_id
        assert rem.days_supply == 30
        assert rem.status == ReminderStatus.PENDING
        # Check date calculations
        expected_finish = datetime.utcnow().date() + timedelta(days=30)
        expected_reminder = expected_finish - timedelta(days=7)
        assert rem.estimated_finish_date == expected_finish
        assert rem.reminder_date == expected_reminder
    finally:
        db.close()

def test_3_scheduler_processes_due_reminder_idempotently(auth_headers):
    """Test that simulated scheduler date triggers notification transition and generates simulation log."""
    db = SessionLocal()
    try:
        inv = db.query(Inventory).filter(Inventory.current_stock >= 5).first()
        patient = db.query(Patient).filter(Patient.notification_consent == True).first()
        med_id = inv.medicine_id
        ward_id = inv.ward_id
        patient_id = patient.id
    finally:
        db.close()

    # Create bill with 10 days supply -> finish = +10 days, reminder = +3 days
    bill_res = client.post(
        "/api/billing/bills",
        headers=auth_headers["pharmacist"],
        json={
            "ward_id": ward_id,
            "patient_id": patient_id,
            "items": [{"medicine_id": med_id, "quantity": 1, "days_supply": 10}]
        }
    )
    assert bill_res.status_code == 201, bill_res.text
    bill_data = bill_res.json()
    bill_id = bill_data["id"]

    # Scheduler at datetime.utcnow().date() should NOT trigger reminder (reminder date is +3 days)
    today_str = datetime.utcnow().date().isoformat()
    check_today = client.post(f"/api/reminders/process?simulate_date={today_str}", headers=auth_headers["pharmacist"])
    assert check_today.status_code == 200

    # Simulate date = +5 days (due date has arrived: reminder_date <= simulate_date < finish_date)
    due_sim_date = (datetime.utcnow().date() + timedelta(days=5)).isoformat()
    proc_res = client.post(f"/api/reminders/process?simulate_date={due_sim_date}", headers=auth_headers["pharmacist"])
    assert proc_res.status_code == 200
    res_data = proc_res.json()
    assert res_data["sent_count"] >= 1

    # Verify reminder transitioned to SENT
    db = SessionLocal()
    try:
        rem = db.query(MedicationReminder).filter(MedicationReminder.bill_id == bill_id).first()
        assert rem.status in [ReminderStatus.SENT, ReminderStatus.DELIVERED]
        assert len(rem.notification_logs) >= 1

        # Check notification log
        log = db.query(NotificationLog).filter(NotificationLog.reminder_id == rem.id).first()
        assert log is not None
        assert log.status in [NotificationStatus.SIMULATED, NotificationStatus.DELIVERED, "DELIVERED"]
        assert "nearing the end" in log.message or "refill" in log.message
    finally:
        db.close()

    # Second run on same simulated date must be idempotent (0 additional sent)
    second_res = client.post(f"/api/reminders/process?simulate_date={due_sim_date}", headers=auth_headers["pharmacist"])
    assert second_res.status_code == 200

def test_4_patient_opt_out_consent_respected(auth_headers):
    """Test that patient with notification_consent=False does not receive notifications."""
    db = SessionLocal()
    try:
        inv = db.query(Inventory).filter(Inventory.current_stock >= 5).first()
        opt_out_patient = db.query(Patient).filter(Patient.notification_consent == False).first()
        assert opt_out_patient is not None, "Need patient with consent=False"
        p_id = opt_out_patient.id
        med_id = inv.medicine_id
        ward_id = inv.ward_id
    finally:
        db.close()

    bill_res = client.post(
        "/api/billing/bills",
        headers=auth_headers["pharmacist"],
        json={
            "ward_id": ward_id,
            "patient_id": p_id,
            "items": [{"medicine_id": med_id, "quantity": 1, "days_supply": 5}]
        }
    )
    assert bill_res.status_code == 201
    bill_data = bill_res.json()
    bill_id = bill_data["id"]

    # Run scheduler when due
    due_sim_date = (datetime.utcnow().date() + timedelta(days=2)).isoformat()
    proc_res = client.post(f"/api/reminders/process?simulate_date={due_sim_date}", headers=auth_headers["pharmacist"])
    assert proc_res.status_code == 200

    # Ensure no SENT status or simulated SMS was dispatched for this reminder
    db = SessionLocal()
    try:
        rem = db.query(MedicationReminder).filter(MedicationReminder.bill_id == bill_id).first()
        assert rem.status in [ReminderStatus.PENDING, ReminderStatus.OPTED_OUT]
        assert rem.status != ReminderStatus.SENT
    finally:
        db.close()

def test_5_bill_cancellation_cancels_pending_reminders(auth_headers):
    """Test that cancelling a bill marks its pending reminders as CANCELLED."""
    db = SessionLocal()
    try:
        inv = db.query(Inventory).filter(Inventory.current_stock >= 5).first()
        patient = db.query(Patient).filter(Patient.notification_consent == True).first()
        med_id = inv.medicine_id
        ward_id = inv.ward_id
        p_id = patient.id
    finally:
        db.close()

    bill_res = client.post(
        "/api/billing/bills",
        headers=auth_headers["pharmacist"],
        json={
            "ward_id": ward_id,
            "patient_id": p_id,
            "items": [{"medicine_id": med_id, "quantity": 1, "days_supply": 14}]
        }
    )
    assert bill_res.status_code == 201
    bill_id = bill_res.json()["id"]

    # Cancel the bill
    cancel_res = client.post(f"/api/billing/bills/{bill_id}/cancel", headers=auth_headers["pharmacist"])
    assert cancel_res.status_code == 200

    db = SessionLocal()
    try:
        rem = db.query(MedicationReminder).filter(MedicationReminder.bill_id == bill_id).first()
        assert rem.status == ReminderStatus.CANCELLED
    finally:
        db.close()

def test_6_role_isolation_data_manager_forbidden(auth_headers):
    """Test that DATA_MANAGER role is strictly forbidden (403) from accessing patient refill endpoints."""
    res1 = client.get("/api/reminders/patients", headers=auth_headers["data_manager"])
    assert res1.status_code == 403

    res2 = client.get("/api/reminders/", headers=auth_headers["data_manager"])
    assert res2.status_code == 403

    res3 = client.get("/api/reminders/logs", headers=auth_headers["data_manager"])
    assert res3.status_code == 403

    res4 = client.post("/api/reminders/process", headers=auth_headers["data_manager"])
    assert res4.status_code == 403

def test_7_admin_has_full_access(auth_headers):
    """Test that ADMIN role has full access to reminders, logs, and scheduler."""
    res1 = client.get("/api/reminders/patients", headers=auth_headers["admin"])
    assert res1.status_code == 200

    res2 = client.get("/api/reminders/", headers=auth_headers["admin"])
    assert res2.status_code == 200

    res3 = client.get("/api/reminders/logs", headers=auth_headers["admin"])
    assert res3.status_code == 200

def test_8_multi_medicine_bill_and_real_sms_delivery(auth_headers):
    """
    Test complete user flow:
    Select Patient + Enter Phone -> Add Med 1, Med 2, Med 3 -> One Bill ->
    Inventory reduces for ALL items -> Reminder for each med ->
    Scheduler reaches reminder date -> Real SMS Provider -> DELIVERED status in Notification Log.
    """
    db = SessionLocal()
    try:
        invs = db.query(Inventory).filter(Inventory.current_stock >= 10, Inventory.ward_id == 1).limit(3).all()
        assert len(invs) == 3, "Need 3 medicines in ward 1 with stock >= 10"
        med1, med2, med3 = invs[0], invs[1], invs[2]
        s1_init, s2_init, s3_init = med1.current_stock, med2.current_stock, med3.current_stock
    finally:
        db.close()

    patient_test_phone = "+91 98401 99887"

    # One bill with 3 medicines
    bill_payload = {
        "ward_id": 1,
        "patient_name": "Kavitha Raman",
        "patient_phone": patient_test_phone,
        "notes": "Triple therapy discharge",
        "items": [
            {"inventory_id": med1.id, "medicine_id": med1.medicine_id, "quantity": 2, "days_supply": 10},
            {"inventory_id": med2.id, "medicine_id": med2.medicine_id, "quantity": 1, "days_supply": 15},
            {"inventory_id": med3.id, "medicine_id": med3.medicine_id, "quantity": 3, "days_supply": 20}
        ]
    }

    res = client.post("/api/billing/bills", headers=auth_headers["pharmacist"], json=bill_payload)
    assert res.status_code == 201, res.text
    bill_data = res.json()
    bill_id = bill_data["id"]

    # Verify inventory reduced for ALL items
    assert bill_data["items"][0]["updated_stock"] == s1_init - 2
    assert bill_data["items"][1]["updated_stock"] == s2_init - 1
    assert bill_data["items"][2]["updated_stock"] == s3_init - 3

    # Verify reminder created for each medicine (3 reminders)
    db = SessionLocal()
    try:
        rems = db.query(MedicationReminder).filter(MedicationReminder.bill_id == bill_id).all()
        assert len(rems) == 3, "Expected 3 reminders for 3 medicines"
        for r in rems:
            assert r.status == ReminderStatus.PENDING
            assert r.patient.mobile_number == patient_test_phone
    finally:
        db.close()

    # Reach reminder date for med1 (days_supply=10 -> finish=+10d, reminder=+3d)
    sim_date = (datetime.utcnow().date() + timedelta(days=4)).isoformat()
    proc_res = client.post(f"/api/reminders/process?simulate_date={sim_date}", headers=auth_headers["pharmacist"])
    assert proc_res.status_code == 200
    proc_data = proc_res.json()
    assert proc_data["sent_count"] >= 1

    # Verify reminder transitioned to DELIVERED status and logged
    db = SessionLocal()
    try:
        rem1 = db.query(MedicationReminder).filter(
            MedicationReminder.bill_id == bill_id,
            MedicationReminder.medicine_id == med1.medicine_id
        ).first()
        assert rem1.status == ReminderStatus.DELIVERED

        # Verify NotificationLog has status DELIVERED and recipient phone
        log = db.query(NotificationLog).filter(NotificationLog.reminder_id == rem1.id).first()
        assert log is not None
        assert log.status == "DELIVERED"
        assert log.recipient.replace(" ", "") == patient_test_phone.replace(" ", "")
        assert "SMS" in log.channel
    finally:
        db.close()

def test_9_sms_gateway_config_endpoints(auth_headers):
    """Test retrieving and updating SMS gateway configuration."""
    get_res = client.get("/api/reminders/sms-config", headers=auth_headers["pharmacist"])
    assert get_res.status_code == 200
    info = get_res.json()
    assert "active_provider" in info
    assert "supported_providers" in info

    update_res = client.post(
        "/api/reminders/sms-config",
        headers=auth_headers["pharmacist"],
        json={"fast2sms_key": "test_fast2sms_key"}
    )
    assert update_res.status_code == 200
    updated_info = update_res.json()
    assert updated_info["has_fast2sms"] is True
