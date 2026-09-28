from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import (
    StockTransfer, TransferStatus, Inventory, AuditLog,
    Approval, ApprovalStatus, ActionType
)
from app.schemas.schemas import StockTransferResponse

router = APIRouter(prefix="/api/transfers", tags=["Transfers"])

@router.get("", response_model=List[StockTransferResponse])
def get_transfers(
    status: Optional[str] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    query = db.query(StockTransfer).order_by(StockTransfer.created_at.desc())
    if status:
        query = query.filter(StockTransfer.status == status)

    transfers = query.limit(limit).all()
    results = []
    for t in transfers:
        results.append(StockTransferResponse(
            id=t.id,
            transfer_number=t.transfer_number,
            medicine_id=t.medicine_id,
            medicine_name=t.medicine.name if t.medicine else "Medicine",
            from_ward_id=t.from_ward_id,
            from_ward_name=t.from_ward.name if t.from_ward else "Ward",
            to_ward_id=t.to_ward_id,
            to_ward_name=t.to_ward.name if t.to_ward else "Ward",
            quantity=t.quantity,
            reason=t.reason,
            status=t.status,
            risk_level=t.risk_level,
            approved_by=t.approved_by,
            initiated_by_agent=t.initiated_by_agent,
            created_at=t.created_at,
            completed_at=t.completed_at
        ))
    return results

@router.post("/{id}/execute")
def execute_transfer(
    id: int,
    executed_by: str = "Clinical Pharmacist",
    db: Session = Depends(get_db)
):
    t = db.query(StockTransfer).filter(StockTransfer.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Stock transfer not found")

    if t.status == TransferStatus.COMPLETED:
        return {"status": "already_completed", "message": "Transfer already executed."}

    # Fetch source and destination inventories
    src_inv = db.query(Inventory).filter(
        Inventory.medicine_id == t.medicine_id,
        Inventory.ward_id == t.from_ward_id
    ).first()

    dst_inv = db.query(Inventory).filter(
        Inventory.medicine_id == t.medicine_id,
        Inventory.ward_id == t.to_ward_id
    ).first()

    if not src_inv or not dst_inv:
        raise HTTPException(status_code=400, detail="Source or destination ward inventory not found")

    if src_inv.current_stock < t.quantity:
        raise HTTPException(status_code=400, detail=f"Source ward has insufficient stock ({src_inv.current_stock}) for requested {t.quantity}")

    # Deduct from source and add to destination
    src_inv.current_stock -= t.quantity
    dst_inv.current_stock += t.quantity

    t.status = TransferStatus.COMPLETED
    t.completed_at = datetime.utcnow()
    t.approved_by = executed_by

    # Update associated approval if pending
    appr = db.query(Approval).filter(
        Approval.action_type == ActionType.STOCK_TRANSFER,
        Approval.reference_id == t.id,
        Approval.status == ApprovalStatus.PENDING
    ).first()
    if appr:
        appr.status = ApprovalStatus.APPROVED
        appr.decision_by = executed_by
        appr.decided_at = datetime.utcnow()
        appr.decision_reason = "Executed transfer manually via Command Center."

    # Audit Log
    db.add(AuditLog(
        event_type="STOCK_TRANSFER_EXECUTED",
        actor=executed_by,
        entity_type="StockTransfer",
        entity_id=str(t.id),
        action="MOVED_INVENTORY_UNITS",
        details={
            "medicine_id": t.medicine_id,
            "quantity": t.quantity,
            "from_ward_id": t.from_ward_id,
            "to_ward_id": t.to_ward_id,
            "source_new_stock": src_inv.current_stock,
            "destination_new_stock": dst_inv.current_stock
        }
    ))

    db.commit()
    return {
        "status": "success",
        "message": f"Successfully transferred {t.quantity} units of {t.medicine.name} to {t.to_ward.name}.",
        "source_remaining": src_inv.current_stock,
        "destination_current": dst_inv.current_stock
    }
