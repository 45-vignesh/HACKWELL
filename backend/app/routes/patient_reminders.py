import logging
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import (
    Patient, MedicationReminder, NotificationLog, ReminderStatus, UserRole
)
from app.schemas.schemas import (
    PatientCreate, PatientResponse, MedicationReminderResponse,
    NotificationLogResponse, ReminderProcessResult, SMSGatewayConfig, SMSGatewayUpdate
)
from app.services.auth_service import require_role
from app.services.patient_reminder_service import (
    process_due_reminders, send_single_reminder, seed_default_patients
)
from app.services.sms_provider import sms_gateway

logger = logging.getLogger("medisentinel.patient_reminders_route")

router = APIRouter(prefix="/api/reminders", tags=["Patient Refill Reminders"])

def _format_reminder_response(rem: MedicationReminder) -> Dict[str, Any]:
    patient = rem.patient
    med = rem.medicine
    bill = rem.bill
    logs = [
        {
            "id": l.id,
            "reminder_id": l.reminder_id,
            "channel": l.channel,
            "recipient": l.recipient,
            "message": l.message,
            "status": l.status,
            "sent_at": l.sent_at,
            "failure_reason": l.failure_reason
        }
        for l in rem.notification_logs
    ]
    return {
        "id": rem.id,
        "patient_id": rem.patient_id,
        "patient_name": patient.full_name if patient else "Unknown",
        "patient_code": patient.patient_id if patient else f"PID-{rem.patient_id}",
        "mobile_number": patient.mobile_number if patient else "N/A",
        "notification_consent": patient.notification_consent if patient else False,
        "bill_id": rem.bill_id,
        "bill_number": bill.bill_number if bill else f"BILL-{rem.bill_id}",
        "bill_item_id": rem.bill_item_id,
        "medicine_id": rem.medicine_id,
        "medicine_name": med.name if med else f"Medicine #{rem.medicine_id}",
        "quantity": rem.quantity,
        "days_supply": rem.days_supply,
        "bill_date": rem.bill_date,
        "estimated_finish_date": rem.estimated_finish_date,
        "reminder_date": rem.reminder_date,
        "status": rem.status.value if hasattr(rem.status, 'value') else str(rem.status),
        "notification_message": rem.notification_message,
        "channel": "SMS",
        "created_at": rem.created_at,
        "notification_logs": logs
    }

@router.get("/patients", response_model=List[PatientResponse])
def get_patients(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_role([UserRole.PHARMACIST.value, UserRole.ADMIN.value]))
):
    """
    List all authorized hospital patients for billing and refill reminders.
    Strictly forbidden for DATA_MANAGER (HTTP 403).
    """
    # Seed default sample patients if none exist
    if db.query(Patient).count() == 0:
        seed_default_patients(db)
    
    patients = db.query(Patient).order_by(Patient.full_name.asc()).all()
    return patients

@router.post("/patients", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def register_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_role([UserRole.PHARMACIST.value, UserRole.ADMIN.value]))
):
    """
    Register a new patient with explicit notification consent.
    Generates a unique patient_id if not supplied.
    """
    patient_id = payload.patient_id
    if not patient_id:
        existing_count = db.query(Patient).count() + 1
        patient_id = f"PID-{4000 + existing_count}"

    existing = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Patient with identifier {patient_id} already exists."
        )

    company_id = current_user.get("company_id", 1)
    branch_id = current_user.get("branch_id", 1)

    patient = Patient(
        patient_id=patient_id,
        full_name=payload.full_name.strip(),
        mobile_number=payload.mobile_number.strip(),
        email=payload.email.strip() if payload.email else None,
        notification_consent=payload.notification_consent,
        company_id=company_id,
        branch_id=branch_id,
        created_at=datetime.utcnow()
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient

@router.get("", response_model=List[MedicationReminderResponse])
@router.get("/", response_model=List[MedicationReminderResponse])
def get_reminders(
    status_filter: Optional[str] = Query(None, alias="status"),
    patient_id: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_role([UserRole.PHARMACIST.value, UserRole.ADMIN.value]))
):
    """
    Fetch patient medication refill reminders ledger.
    Accessible to PHARMACIST and ADMIN.
    """
    query = db.query(MedicationReminder)
    if status_filter:
        query = query.filter(MedicationReminder.status == status_filter.upper())
    if patient_id:
        query = query.filter(MedicationReminder.patient_id == patient_id)

    reminders = query.order_by(MedicationReminder.created_at.desc()).limit(limit).all()
    return [_format_reminder_response(r) for r in reminders]

@router.get("/logs", response_model=List[NotificationLogResponse])
def get_all_notification_logs(
    reminder_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_role([UserRole.PHARMACIST.value, UserRole.ADMIN.value]))
):
    """
    Fetch all notification audit and dispatch logs with optional filtering.
    """
    query = db.query(NotificationLog)
    if reminder_id:
        query = query.filter(NotificationLog.reminder_id == reminder_id)
    if status_filter:
        query = query.filter(NotificationLog.status == status_filter.upper())
    logs = query.order_by(NotificationLog.sent_at.desc()).limit(limit).all()
    return logs

@router.get("/{reminder_id}/logs", response_model=List[NotificationLogResponse])
def get_reminder_logs(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_role([UserRole.PHARMACIST.value, UserRole.ADMIN.value]))
):
    """
    Fetch audit and dispatch logs for a specific medication reminder.
    """
    logs = db.query(NotificationLog).filter(
        NotificationLog.reminder_id == reminder_id
    ).order_by(NotificationLog.sent_at.desc()).all()
    return logs

@router.post("/process-due", response_model=ReminderProcessResult)
@router.post("/process", response_model=ReminderProcessResult)
def trigger_process_due_reminders(
    simulate_date: Optional[str] = Query(None, description="Optional ISO date YYYY-MM-DD for simulation demo"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_role([UserRole.PHARMACIST.value, UserRole.ADMIN.value]))
):
    """
    Trigger the scheduler logic to check and process due refill reminders.
    Supports simulate_date for jury interactive demonstrations.
    """
    target = None
    if simulate_date:
        try:
            target = datetime.strptime(simulate_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="simulate_date must be in YYYY-MM-DD format."
            )
    return process_due_reminders(target_date=target, db=db)

@router.post("/{reminder_id}/send")
def trigger_single_reminder(
    reminder_id: int,
    channel: str = Query("SMS"),
    force: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_role([UserRole.PHARMACIST.value, UserRole.ADMIN.value]))
):
    """
    Manually dispatch / test a specific reminder notification from the UI.
    """
    try:
        result = send_single_reminder(reminder_id, channel=channel, force=force, db=db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/sms-config", response_model=SMSGatewayConfig)
def get_sms_config(
    current_user: Dict[str, Any] = Depends(require_role([UserRole.PHARMACIST.value, UserRole.ADMIN.value]))
):
    """
    Get current Real SMS Provider configuration details and active provider.
    """
    return sms_gateway.get_config_info()

@router.post("/sms-config", response_model=SMSGatewayConfig)
def update_sms_config(
    payload: SMSGatewayUpdate,
    current_user: Dict[str, Any] = Depends(require_role([UserRole.PHARMACIST.value, UserRole.ADMIN.value]))
):
    """
    Update Real SMS Provider credentials at runtime (Twilio, Fast2SMS, Custom Gateway).
    """
    return sms_gateway.update_config(
        twilio_sid=payload.twilio_sid,
        twilio_auth=payload.twilio_auth,
        twilio_from=payload.twilio_from,
        fast2sms_key=payload.fast2sms_key,
        gateway_url=payload.gateway_url,
        provider=payload.provider
    )
