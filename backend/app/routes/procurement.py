from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import (
    PurchaseOrder, PurchaseOrderItem, OrderStatus, Supplier,
    Inventory, AuditLog, Approval, ApprovalStatus, ActionType
)
from app.schemas.schemas import PurchaseOrderResponse, POItemResponse

router = APIRouter(prefix="/api/procurement", tags=["Procurement"])

@router.get("/orders", response_model=List[PurchaseOrderResponse])
def get_purchase_orders(
    status: Optional[str] = Query(None),
    limit: int = Query(50),
    db: Session = Depends(get_db)
):
    query = db.query(PurchaseOrder).order_by(PurchaseOrder.order_date.desc())
    if status:
        query = query.filter(PurchaseOrder.status == status)

    pos = query.limit(limit).all()
    results = []
    for po in pos:
        sup = po.supplier
        items = []
        for it in po.items:
            items.append(POItemResponse(
                id=it.id,
                medicine_id=it.medicine_id,
                medicine_name=it.medicine.name if it.medicine else "Medicine",
                quantity=it.quantity,
                unit_price=it.unit_price,
                total_price=it.total_price
            ))

        lead_time = sup.medicines[0].lead_time_days if sup and sup.medicines else 2
        results.append(PurchaseOrderResponse(
            id=po.id,
            po_number=po.po_number,
            supplier_id=po.supplier_id,
            supplier_name=sup.name if sup else "Supplier",
            supplier_lead_time_days=lead_time,
            supplier_reliability=sup.reliability_score if sup else 0.95,
            total_amount=po.total_amount,
            status=po.status,
            priority=po.priority,
            created_by_agent=po.created_by_agent,
            approved_by=po.approved_by,
            order_date=po.order_date,
            expected_delivery_date=po.expected_delivery_date,
            items=items,
            notes=po.notes
        ))
    return results

@router.post("/{id}/execute")
def execute_purchase_order(
    id: int,
    executed_by: str = "Chief Pharmacist",
    db: Session = Depends(get_db)
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if po.status in [OrderStatus.ORDERED, OrderStatus.DELIVERED]:
        return {"status": "already_active", "message": f"PO {po.po_number} is already in {po.status.value} status."}

    po.status = OrderStatus.ORDERED
    po.approved_by = executed_by
    po.expected_delivery_date = date.today() + timedelta(days=2)

    # If pending approval exists, update it
    appr = db.query(Approval).filter(
        Approval.action_type == ActionType.PURCHASE_ORDER,
        Approval.reference_id == po.id,
        Approval.status == ApprovalStatus.PENDING
    ).first()
    if appr:
        appr.status = ApprovalStatus.APPROVED
        appr.decision_by = executed_by
        appr.decided_at = datetime.utcnow()
        appr.decision_reason = "Approved and dispatched purchase order to vendor."

    # Audit log
    db.add(AuditLog(
        event_type="PURCHASE_ORDER_DISPATCHED",
        actor=executed_by,
        entity_type="PurchaseOrder",
        entity_id=str(po.id),
        action="DISPATCHED_TO_SUPPLIER",
        details={
            "po_number": po.po_number,
            "supplier_id": po.supplier_id,
            "total_amount": po.total_amount,
            "items_count": len(po.items)
        }
    ))

    db.commit()
    return {
        "status": "success",
        "message": f"Purchase order {po.po_number} dispatched to {po.supplier.name} for ₹{po.total_amount:,.2f}."
    }
