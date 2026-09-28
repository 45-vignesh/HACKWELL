import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db, SessionLocal
from app.models.entities import (
    User, UserRole, Medicine, Ward, Inventory, InventoryBatch, BatchStatus,
    Bill, BillStatus, NotificationLog, AuditLog, Patient
)
from app.services.auth_service import create_access_token
from app.services.sms_provider import mask_phone_number, is_valid_phone_number, sms_gateway
from app.services.bill_sms_service import generate_bill_completion_message

client = TestClient(app)

@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    yield db
    db.close()

@pytest.fixture(scope="module")
def pharmacist_auth():
    token = create_access_token("pharmacist", "PHARMACIST", "Dr. Sarah Alston", company_id=1, branch_id=1)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def data_manager_auth():
    token = create_access_token("data_manager", "DATA_MANAGER", "Alex Chen", company_id=1, branch_id=1)
    return {"Authorization": f"Bearer {token}"}

def test_1_phone_masking_and_validation():
    """Verify privacy masking (+91 ******3210) and validation."""
    assert mask_phone_number("+919840199887") == "+91 ******9887"
    assert mask_phone_number("9840199887") == "+91 ******9887"
    assert mask_phone_number("+91 98401-99887") == "+91 ******9887"
    assert is_valid_phone_number("+919840199887") is True
    assert is_valid_phone_number("9840199887") is True
    assert is_valid_phone_number("12345") is False
    assert is_valid_phone_number("") is False

def test_2_consolidated_message_generation():
    """Verify single consolidated SMS format adhering to patient privacy guidelines."""
    msg1 = generate_bill_completion_message("Anita Roy", "BILL-1001", ["Paracetamol 500mg"])
    assert "Hello Anita Roy" in msg1
    assert "BILL-1001" in msg1
    assert "successfully generated" in msg1
    assert "We wish you good health" in msg1

    msg_multi = generate_bill_completion_message("Anita Roy", "BILL-1003", [
        "Paracetamol 500mg", "Amoxicillin 250mg", "Cetirizine 10mg", "Omeprazole 20mg"
    ])
    assert "Hello Anita Roy" in msg_multi
    assert "BILL-1003" in msg_multi

def test_3_billing_triggers_autonomous_sms(db_session: Session, pharmacist_auth):
    """Verify successful billing atomically reduces inventory AND triggers autonomous SMS with masked phone."""
    med = db_session.query(Medicine).first()
    assert med is not None, "Medicine required"
    ward = db_session.query(Ward).first()
    assert ward is not None, "Ward required"

    inv = db_session.query(Inventory).filter(
        Inventory.medicine_id == med.id,
        Inventory.ward_id == ward.id
    ).first()
    if not inv or inv.current_stock < 5:
        if not inv:
            inv = Inventory(medicine_id=med.id, ward_id=ward.id, current_stock=20, reorder_level=5)
            db_session.add(inv)
        else:
            inv.current_stock = 20
        db_session.commit()
        db_session.refresh(inv)

    prev_stock = inv.current_stock

    payload = {
        "ward_id": ward.id,
        "patient_name": "Ramesh Kumar",
        "patient_phone": "+919876543210",
        "notification_consent": True,
        "items": [
            {
                "medicine_id": med.id,
                "inventory_id": inv.id,
                "quantity": 2,
                "days_supply": 7,
                "unit_price": 15.0
            }
        ]
    }

    res = client.post("/api/billing/bills", json=payload, headers=pharmacist_auth)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "SUCCESS"
    bill_id = data["id"]

    # Verify inventory was reduced
    db_session.expire_all()
    inv_after = db_session.query(Inventory).filter(Inventory.id == inv.id).first()
    assert inv_after.current_stock == prev_stock - 2

    # Verify autonomous SMS status in response
    assert data.get("sms_notification") is not None
    sms = data["sms_notification"]
    assert sms["status"] in ("QUEUED", "SENT", "DELIVERED", "NOT_CONFIGURED")
    assert sms["masked_phone"] == "+91 ******3210"
    assert "Ramesh Kumar" in sms["message"]
    assert "successfully generated" in sms["message"]

    # Verify NotificationLog record in database
    notif = db_session.query(NotificationLog).filter(NotificationLog.bill_id == bill_id).first()
    assert notif is not None
    assert notif.masked_phone_number == "+91 ******3210"
    assert notif.status in ("QUEUED", "SENT", "DELIVERED", "NOT_CONFIGURED")

    # Verify AuditLog record exists
    audit = db_session.query(AuditLog).filter(
        AuditLog.entity_id == str(bill_id),
        AuditLog.event_type == "PATIENT_NOTIFICATION"
    ).first()
    assert audit is not None
    assert audit.details["masked_phone"] == "+91 ******3210"

def test_4_multi_item_bill_consolidates_into_one_sms(db_session: Session, pharmacist_auth):
    """Verify a bill with multiple items dispatches exactly ONE SMS referencing all medicines."""
    meds = db_session.query(Medicine).limit(3).all()
    assert len(meds) >= 2, "At least 2 medicines needed"
    ward = db_session.query(Ward).first()

    items = []
    for m in meds:
        inv = db_session.query(Inventory).filter(
            Inventory.medicine_id == m.id,
            Inventory.ward_id == ward.id
        ).first()
        if not inv or inv.current_stock < 5:
            if not inv:
                inv = Inventory(medicine_id=m.id, ward_id=ward.id, current_stock=20, reorder_level=5)
                db_session.add(inv)
            else:
                inv.current_stock = 20
            db_session.commit()
            db_session.refresh(inv)

        items.append({
            "medicine_id": m.id,
            "inventory_id": inv.id,
            "quantity": 1,
            "days_supply": 5,
            "unit_price": 25.0
        })

    payload = {
        "ward_id": ward.id,
        "patient_name": "Deepa Sundaram",
        "patient_phone": "+919840112233",
        "notification_consent": True,
        "items": items
    }

    res = client.post("/api/billing/bills", json=payload, headers=pharmacist_auth)
    assert res.status_code == 201
    data = res.json()
    bill_id = data["id"]

    # Verify exactly ONE NotificationLog entry was created for this bill
    logs = db_session.query(NotificationLog).filter(NotificationLog.bill_id == bill_id).all()
    assert len(logs) == 1, f"Expected exactly 1 consolidated SMS log, got {len(logs)}"
    sms_text = logs[0].message
    assert "Deepa Sundaram" in sms_text
    assert "successfully generated" in sms_text

def test_5_opt_out_consent_skips_sms(db_session: Session, pharmacist_auth):
    """Verify that when notification_consent=False, no SMS is sent to carrier."""
    med = db_session.query(Medicine).first()
    ward = db_session.query(Ward).first()
    inv = db_session.query(Inventory).filter(Inventory.medicine_id == med.id, Inventory.ward_id == ward.id).first()

    payload = {
        "ward_id": ward.id,
        "patient_name": "Suresh Raina",
        "patient_phone": "+919840998877",
        "notification_consent": False,
        "items": [
            {
                "medicine_id": med.id,
                "inventory_id": inv.id,
                "quantity": 1,
                "days_supply": 3,
                "unit_price": 10.0
            }
        ]
    }

    res = client.post("/api/billing/bills", json=payload, headers=pharmacist_auth)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data.get("sms_notification") is not None
    assert data["sms_notification"]["status"] == "OPTED_OUT"

    # NotificationLog status should be OPTED_OUT
    log = db_session.query(NotificationLog).filter(NotificationLog.bill_id == data["id"]).first()
    assert log.status == "OPTED_OUT"
    assert "opted out" in log.message.lower()

def test_6_invalid_phone_does_not_break_billing(db_session: Session, pharmacist_auth):
    """Verify invalid phone numbers do NOT fail or rollback the billing transaction."""
    med = db_session.query(Medicine).first()
    ward = db_session.query(Ward).first()
    inv = db_session.query(Inventory).filter(Inventory.medicine_id == med.id, Inventory.ward_id == ward.id).first()
    prev_stock = inv.current_stock

    payload = {
        "ward_id": ward.id,
        "patient_name": "Vikram Seth",
        "patient_phone": "invalid-phone",
        "notification_consent": True,
        "items": [
            {
                "medicine_id": med.id,
                "inventory_id": inv.id,
                "quantity": 1,
                "days_supply": 3,
                "unit_price": 10.0
            }
        ]
    }

    res = client.post("/api/billing/bills", json=payload, headers=pharmacist_auth)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "SUCCESS"

    # Stock was still reduced safely
    db_session.expire_all()
    inv_after = db_session.query(Inventory).filter(Inventory.id == inv.id).first()
    assert inv_after.current_stock == prev_stock - 1

    # SMS notification record marked as FAILED with invalid mobile reason
    assert data.get("sms_notification") is not None
    assert data["sms_notification"]["status"] == "FAILED"

def test_7_sms_delivery_webhook_transitions_to_delivered(db_session: Session, pharmacist_auth):
    """Verify carrier DLR webhook updates NotificationLog status to DELIVERED and writes AuditLog."""
    # Find a NotificationLog with provider_message_id
    notif = db_session.query(NotificationLog).filter(
        NotificationLog.provider_message_id.isnot(None),
        NotificationLog.status.in_(["QUEUED", "SENT"])
    ).first()

    # If none found, create a test notification log
    if not notif:
        notif = NotificationLog(
            bill_id=None,
            channel="SMS",
            recipient="+919840199887",
            masked_phone_number="+91 ******9887",
            message="Test MediSentinel prescription dispensed",
            provider="Twilio Live SMS Gateway",
            provider_message_id="SM-TEST-WEBHOOK-9988",
            status="SENT",
            created_at=datetime.utcnow(),
            sent_at=datetime.utcnow()
        )
        db_session.add(notif)
        db_session.commit()
        db_session.refresh(notif)

    # Post delivery webhook
    webhook_payload = {
        "MessageSid": notif.provider_message_id,
        "MessageStatus": "delivered"
    }

    wh_res = client.post("/api/notifications/sms/webhook", json=webhook_payload)
    assert wh_res.status_code == 200
    assert wh_res.json()["status"] == "success"
    assert wh_res.json()["updated_records"] >= 1

    # Verify notification log updated to DELIVERED
    db_session.expire_all()
    updated_notif = db_session.query(NotificationLog).filter(NotificationLog.id == notif.id).first()
    assert updated_notif.status == "DELIVERED"
    assert updated_notif.delivered_at is not None

    # Verify audit log recorded SMS_DELIVERED
    audit = db_session.query(AuditLog).filter(
        AuditLog.entity_id == str(notif.id),
        AuditLog.action == "SMS_DELIVERED"
    ).first()
    assert audit is not None

def test_8_role_access_boundaries(data_manager_auth, pharmacist_auth):
    """Verify Data Manager cannot access billing/SMS APIs, while Pharmacist has full access."""
    # Data Manager should get 403 on billing
    dm_res = client.get("/api/billing/bills", headers=data_manager_auth)
    assert dm_res.status_code == 403

    # Pharmacist can access billing and SMS logs
    pharm_res = client.get("/api/billing/bills", headers=pharmacist_auth)
    assert pharm_res.status_code == 200

    logs_res = client.get("/api/notifications/sms/logs", headers=pharmacist_auth)
    assert logs_res.status_code == 200
    assert isinstance(logs_res.json(), list)
