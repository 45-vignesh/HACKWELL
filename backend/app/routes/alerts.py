from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import Alert, AlertStatus, AlertSeverity
from app.schemas.schemas import AlertResponse

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    query = db.query(Alert).order_by(Alert.created_at.desc())
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)

    alerts = query.limit(limit).all()
    results = []
    for a in alerts:
        results.append(AlertResponse(
            id=a.id,
            alert_type=a.alert_type,
            severity=a.severity,
            medicine_id=a.medicine_id,
            medicine_name=a.medicine.name if a.medicine else None,
            ward_id=a.ward_id,
            ward_name=a.ward.name if a.ward else None,
            title=a.title,
            message=a.message,
            status=a.status,
            recommended_action=a.recommended_action,
            triggered_by_agent=a.triggered_by_agent,
            created_at=a.created_at
        ))
    return results

@router.post("/{id}/resolve")
def resolve_alert(id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = AlertStatus.RESOLVED
    db.commit()
    return {"status": "success", "message": f"Alert {id} marked as resolved."}
