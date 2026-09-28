from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import (
    Approval, ApprovalStatus, ActionType, StockTransfer,
    PurchaseOrder, TransferStatus, OrderStatus, Inventory, AuditLog
)
from app.schemas.schemas import ApprovalResponse, ApprovalActionRequest

router = APIRouter(prefix="/api/approvals", tags=["Approvals"])

@router.get("", response_model=List[ApprovalResponse])
def get_approvals(
    status: Optional[str] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    query = db.query(Approval).order_by(Approval.created_at.desc())
    if status:
        query = query.filter(Approval.status == status)

    approvals = query.limit(limit).all()
    results = []
    for ap in approvals:
        details = {}
        if ap.action_type == ActionType.PURCHASE_ORDER:
            po = db.query(PurchaseOrder).filter(PurchaseOrder.id == ap.reference_id).first()
            if po and po.supplier:
                details["po_number"] = po.po_number
                details["supplier_name"] = po.supplier.name
                details["lead_time_days"] = po.supplier.medicines[0].lead_time_days if po.supplier.medicines else 2
                details["priority"] = po.priority.value
        elif ap.action_type == ActionType.STOCK_TRANSFER:
            st = db.query(StockTransfer).filter(StockTransfer.id == ap.reference_id).first()
            if st:
                details["transfer_number"] = st.transfer_number
                details["from_ward"] = st.from_ward.name if st.from_ward else ""
                details["to_ward"] = st.to_ward.name if st.to_ward else ""

        results.append(ApprovalResponse(
            id=ap.id,
            action_type=ap.action_type,
            reference_id=ap.reference_id,
            medicine_id=ap.medicine_id,
            medicine_name=ap.medicine.name if ap.medicine else None,
            requested_by_agent=ap.requested_by_agent,
            risk_level=ap.risk_level,
            justification=ap.justification,
            estimated_cost=ap.estimated_cost,
            requested_quantity=ap.requested_quantity,
            status=ap.status,
            decision_by=ap.decision_by,
            decision_reason=ap.decision_reason,
            decided_at=ap.decided_at,
            created_at=ap.created_at,
            details=details
        ))
    return results

@router.post("/{id}/decide")
def decide_approval(
    id: int,
    payload: ApprovalActionRequest,
    db: Session = Depends(get_db)
):
    appr = db.query(Approval).filter(Approval.id == id).first()
    if not appr:
        raise HTTPException(status_code=404, detail="Approval request not found")

    if appr.status != ApprovalStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Approval request is already {appr.status.value}")

    now = datetime.utcnow()
    appr.decision_by = payload.decision_by
    appr.decision_reason = payload.reason
    appr.decided_at = now

    if payload.decision == "APPROVE":
        appr.status = ApprovalStatus.APPROVED

        # Execute underlying action
        if appr.action_type == ActionType.PURCHASE_ORDER:
            po = db.query(PurchaseOrder).filter(PurchaseOrder.id == appr.reference_id).first()
            if po:
                po.status = OrderStatus.ORDERED
                po.approved_by = payload.decision_by
                po.expected_delivery_date = date.today() + timedelta(days=2)

        elif appr.action_type == ActionType.STOCK_TRANSFER:
            st = db.query(StockTransfer).filter(StockTransfer.id == appr.reference_id).first()
            if st:
                src_inv = db.query(Inventory).filter(
                    Inventory.medicine_id == st.medicine_id,
                    Inventory.ward_id == st.from_ward_id
                ).first()
                dst_inv = db.query(Inventory).filter(
                    Inventory.medicine_id == st.medicine_id,
                    Inventory.ward_id == st.to_ward_id
                ).first()
                if src_inv and dst_inv:
                    src_inv.current_stock -= st.quantity
                    dst_inv.current_stock += st.quantity
                st.status = TransferStatus.COMPLETED
                st.approved_by = payload.decision_by
                st.completed_at = now

    else:
        appr.status = ApprovalStatus.REJECTED
        if appr.action_type == ActionType.PURCHASE_ORDER:
            po = db.query(PurchaseOrder).filter(PurchaseOrder.id == appr.reference_id).first()
            if po:
                po.status = OrderStatus.REJECTED
        elif appr.action_type == ActionType.STOCK_TRANSFER:
            st = db.query(StockTransfer).filter(StockTransfer.id == appr.reference_id).first()
            if st:
                st.status = TransferStatus.REJECTED

    # Audit log
    db.add(AuditLog(
        event_type="PHARMACIST_GOVERNANCE_DECISION",
        actor=payload.decision_by,
        entity_type="Approval",
        entity_id=str(appr.id),
        action=f"DECISION_{payload.decision}",
        details={
            "action_type": appr.action_type.value,
            "decision": payload.decision,
            "reason": payload.reason,
            "reference_id": appr.reference_id
        }
    ))

    db.commit()

    return {
        "status": "success",
        "decision": payload.decision,
        "message": f"Action {appr.action_type.value} was successfully {payload.decision.lower()}d by {payload.decision_by}."
    }
