from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import DataAuditTrail
from app.schemas.schemas import DataAuditTrailResponse

router = APIRouter(prefix="/api/audit-trail", tags=["Data Governance Audit Trail"])

@router.get("/data", response_model=List[DataAuditTrailResponse])
def get_data_audit_trail(
    user: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    validation_result: Optional[str] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    """
    Returns immutable audit log records of all manual operational data changes,
    validations, and CSV ingestions.
    """
    query = db.query(DataAuditTrail).order_by(DataAuditTrail.timestamp.desc())

    if user:
        query = query.filter(DataAuditTrail.user.ilike(f"%{user}%"))
    if role:
        query = query.filter(DataAuditTrail.role == role)
    if action:
        query = query.filter(DataAuditTrail.action == action)
    if validation_result:
        query = query.filter(DataAuditTrail.validation_result == validation_result)

    records = query.limit(limit).all()
    results = []
    for r in records:
        results.append(DataAuditTrailResponse(
            id=r.id,
            user=r.user,
            role=r.role,
            action=r.action,
            entity_type=r.entity_type,
            record_id=r.record_id,
            medicine_name=r.medicine_name,
            ward_name=r.ward_name,
            old_value=r.old_value,
            new_value=r.new_value,
            reason=r.reason,
            validation_result=r.validation_result,
            source=r.source,
            timestamp=r.timestamp
        ))
    return results
