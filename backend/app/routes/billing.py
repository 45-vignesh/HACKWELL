import time
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.entities import (
    Medicine, Ward, Inventory, InventoryBatch, Bill, BillItem,
    BillStatus, BatchStatus, AuditLog, DataAuditTrail, UserRole
)
from app.schemas.schemas import (
    BillCreateRequest, BillResponse, BillItemDetailResponse, BillCancelResponse
)
from app.services.auth_service import require_role, get_current_user

router = APIRouter(prefix="/api/billing", tags=["Billing"])

def _format_bill_response(bill: Bill, db: Session) -> Dict[str, Any]:
    """Helper to format a Bill entity into the BillResponse schema dictionary."""
    ward_name = bill.ward.name if bill.ward else (f"Ward {bill.ward_id}" if bill.ward_id else "Central Pharmacy")
    
    items_data = []
    for item in bill.items:
        med = item.medicine or db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
        items_data.append({
            "id": item.id,
            "medicine_id": item.medicine_id,
            "medicine_name": med.name if med else f"Medicine #{item.medicine_id}",
            "medicine_code": med.code if med else "",
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": item.total_price,
            "previous_stock": item.previous_stock,
            "updated_stock": item.updated_stock,
            "batch_deductions": item.batch_deductions or []
        })

    return {
        "id": bill.id,
        "bill_number": bill.bill_number,
        "company_id": bill.company_id,
        "branch_id": bill.branch_id,
        "ward_id": bill.ward_id,
        "ward_name": ward_name,
        "created_by": bill.created_by,
        "role": bill.role,
        "status": bill.status.value if hasattr(bill.status, 'value') else str(bill.status),
        "subtotal": bill.subtotal,
        "total_amount": bill.total_amount,
        "patient_name": bill.patient_name,
        "notes": bill.notes,
        "created_at": bill.created_at,
        "items": items_data
    }

@router.post("/bills", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
def create_bill(
    req: BillCreateRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_role([UserRole.PHARMACIST.value]))
):
    """
    Create a new medicine bill and atomically reduce operational inventory using FEFO.
    Strictly accessible only to PHARMACIST and ADMIN roles.
    Rejects insufficient stock, invalid quantities, or duplicate medicines.
    Ensures rollback on failure and records audit log entries.
    """
    if not req.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one medicine item is required for billing."
        )

    # Validate items and check for duplicate medicine IDs
    seen_medicines = set()
    for item in req.items:
        if item.quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quantity for medicine ID {item.medicine_id} must be a positive integer greater than 0."
            )
        if item.medicine_id in seen_medicines:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate medicine item (ID: {item.medicine_id}) found in bill. Combine quantities into a single item."
            )
        seen_medicines.add(item.medicine_id)

    # Determine target ward
    target_ward_id = req.ward_id
    if not target_ward_id:
        # Fall back to first available ward (usually Ward 1: Emergency Ward A)
        default_ward = db.query(Ward).filter(Ward.active == True).order_by(Ward.id.asc()).first()
        target_ward_id = default_ward.id if default_ward else 1

    ward = db.query(Ward).filter(Ward.id == target_ward_id).first()
    ward_display_name = ward.name if ward else f"Ward {target_ward_id}"

    # Generate unique bill number
    timestamp_part = int(time.time())
    total_existing = db.query(Bill).count() + 1
    bill_number = f"BILL-{timestamp_part}-{total_existing:04d}"

    actor_name = current_user.get("display_name", current_user.get("username", "Chief Pharmacist"))
    actor_role = current_user.get("role", "PHARMACIST")
    company_id = current_user.get("company_id", 1)
    branch_id = current_user.get("branch_id", 1)

    # Create the Bill record (will be committed atomically with items and inventory updates)
    bill = Bill(
        bill_number=bill_number,
        company_id=company_id,
        branch_id=branch_id,
        ward_id=target_ward_id,
        created_by=actor_name,
        role=actor_role,
        status=BillStatus.SUCCESS,
        subtotal=0.0,
        total_amount=0.0,
        patient_name=req.patient_name,
        notes=req.notes,
        created_at=datetime.utcnow()
    )
    db.add(bill)
    db.flush()  # Populates bill.id

    subtotal = 0.0

    # Process each item with row-level locks
    for item in req.items:
        med = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
        if not med:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Medicine with ID {item.medicine_id} not found."
            )

        # Row lock on inventory
        inv = db.query(Inventory).filter(
            Inventory.medicine_id == item.medicine_id,
            Inventory.ward_id == target_ward_id
        ).with_for_update().first()

        current_avail = inv.current_stock if inv else 0
        if not inv or current_avail < item.quantity:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {med.name}. Available: {current_avail}, Requested: {item.quantity}"
            )

        # FEFO Batch Deduction: query batches sorted by earliest expiry date first
        batches = db.query(InventoryBatch).filter(
            InventoryBatch.medicine_id == item.medicine_id,
            InventoryBatch.ward_id == target_ward_id,
            InventoryBatch.status.in_([BatchStatus.ACTIVE, BatchStatus.NEAR_EXPIRY]),
            InventoryBatch.current_quantity > 0
        ).order_by(InventoryBatch.expiry_date.asc()).with_for_update().all()

        remaining_to_deduct = item.quantity
        batch_deductions = []
        primary_batch_id = None

        for batch in batches:
            if remaining_to_deduct <= 0:
                break
            deduct_amount = min(batch.current_quantity, remaining_to_deduct)
            batch.current_quantity -= deduct_amount
            if batch.current_quantity == 0:
                batch.status = BatchStatus.DEPLETED
            if primary_batch_id is None:
                primary_batch_id = batch.id
            batch_deductions.append({
                "batch_id": batch.id,
                "batch_number": batch.batch_number,
                "quantity": deduct_amount,
                "expiry_date": batch.expiry_date.isoformat() if batch.expiry_date else None
            })
            remaining_to_deduct -= deduct_amount

        # Pricing calculation
        unit_price = med.unit_cost if (med.unit_cost and med.unit_cost > 0) else 10.0
        item_total = round(unit_price * item.quantity, 2)
        subtotal += item_total

        # Inventory reduction
        previous_stock = inv.current_stock
        inv.current_stock -= item.quantity
        updated_stock = inv.current_stock
        inv.days_of_stock = round(inv.current_stock / max(inv.avg_daily_usage, 1.0), 1)
        inv.last_modified_by = actor_name
        inv.last_modified_at = datetime.utcnow()

        # Create BillItem
        bill_item = BillItem(
            bill_id=bill.id,
            medicine_id=med.id,
            batch_id=primary_batch_id,
            quantity=item.quantity,
            unit_price=unit_price,
            total_price=item_total,
            previous_stock=previous_stock,
            updated_stock=updated_stock,
            batch_deductions=batch_deductions
        )
        db.add(bill_item)

        # AuditLog entry
        audit_entry = AuditLog(
            event_type="PHARMACY_BILLING",
            actor=actor_name,
            entity_type="Inventory",
            entity_id=str(inv.id),
            action="BILL_COMPLETED",
            details={
                "bill_number": bill_number,
                "medicine_id": med.id,
                "medicine_name": med.name,
                "medicine_code": med.code,
                "ward_id": target_ward_id,
                "ward_name": ward_display_name,
                "quantity": item.quantity,
                "previous_stock": previous_stock,
                "new_stock": updated_stock,
                "unit_price": unit_price,
                "total_price": item_total,
                "role": actor_role,
                "branch_id": branch_id,
                "status": "SUCCESS"
            }
        )
        db.add(audit_entry)

        # DataAuditTrail entry
        trail_entry = DataAuditTrail(
            user=actor_name,
            role=actor_role,
            action="BILL_COMPLETED",
            entity_type="Inventory",
            record_id=inv.id,
            medicine_name=med.name,
            ward_name=ward_display_name,
            old_value={"current_stock": previous_stock},
            new_value={"current_stock": updated_stock, "billed_qty": item.quantity, "bill_number": bill_number},
            reason=f"Pharmacy Billing Dispense #{bill_number}",
            validation_result="VALIDATED",
            source="BILLING"
        )
        db.add(trail_entry)

    bill.subtotal = round(subtotal, 2)
    bill.total_amount = round(subtotal, 2)

    try:
        db.commit()
        db.refresh(bill)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Billing transaction failed: {str(e)}"
        )

    return _format_bill_response(bill, db)

@router.get("/bills", response_model=List[BillResponse])
def get_bills(
    ward_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_role([UserRole.PHARMACIST.value]))
):
    """
    Fetch recent bills with itemized dispensing records.
    Accessible to PHARMACIST and ADMIN roles.
    """
    query = db.query(Bill)
    if ward_id:
        query = query.filter(Bill.ward_id == ward_id)
    
    bills = query.order_by(Bill.created_at.desc()).limit(limit).all()
    return [_format_bill_response(b, db) for b in bills]

@router.get("/bills/{id_or_number}", response_model=BillResponse)
def get_bill_detail(
    id_or_number: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_role([UserRole.PHARMACIST.value]))
):
    """
    Get detailed breakdown of a specific bill by ID or bill_number.
    """
    if id_or_number.isdigit():
        bill = db.query(Bill).filter(Bill.id == int(id_or_number)).first()
    else:
        bill = db.query(Bill).filter(Bill.bill_number == id_or_number).first()

    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bill '{id_or_number}' not found."
        )

    return _format_bill_response(bill, db)

@router.post("/bills/{id}/cancel", response_model=BillCancelResponse)
def cancel_bill(
    id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_role([UserRole.PHARMACIST.value]))
):
    """
    Cancel an existing SUCCESS bill and safely reverse the inventory deduction exactly once.
    """
    bill = db.query(Bill).filter(Bill.id == id).with_for_update().first()
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bill with ID {id} not found."
        )

    if bill.status == BillStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bill is already cancelled. Repeated reversal is prevented."
        )

    if bill.status != BillStatus.SUCCESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel bill with status '{bill.status.value}'."
        )

    actor_name = current_user.get("display_name", current_user.get("username", "Chief Pharmacist"))
    actor_role = current_user.get("role", "PHARMACIST")

    reversed_items = []

    # Reverse inventory for each item
    for item in bill.items:
        inv = db.query(Inventory).filter(
            Inventory.medicine_id == item.medicine_id,
            Inventory.ward_id == bill.ward_id
        ).with_for_update().first()

        med = item.medicine or db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
        med_name = med.name if med else f"Medicine #{item.medicine_id}"

        prev_stock = inv.current_stock if inv else 0
        if inv:
            inv.current_stock += item.quantity
            inv.days_of_stock = round(inv.current_stock / max(inv.avg_daily_usage, 1.0), 1)
            inv.last_modified_by = actor_name
            inv.last_modified_at = datetime.utcnow()
            new_stock = inv.current_stock
        else:
            new_stock = item.quantity

        # Restore batches if recorded
        if item.batch_deductions:
            for bd in item.batch_deductions:
                b_id = bd.get("batch_id")
                qty = bd.get("quantity", 0)
                if b_id and qty > 0:
                    batch = db.query(InventoryBatch).filter(InventoryBatch.id == b_id).with_for_update().first()
                    if batch:
                        batch.current_quantity += qty
                        if batch.status == BatchStatus.DEPLETED and batch.current_quantity > 0:
                            batch.status = BatchStatus.ACTIVE

        reversed_items.append({
            "medicine_id": item.medicine_id,
            "medicine_name": med_name,
            "reversed_quantity": item.quantity,
            "previous_stock": prev_stock,
            "restored_stock": new_stock
        })

        # AuditLog cancellation record
        audit_entry = AuditLog(
            event_type="PHARMACY_BILLING",
            actor=actor_name,
            entity_type="Inventory",
            entity_id=str(inv.id) if inv else None,
            action="BILL_CANCELLED",
            details={
                "bill_number": bill.bill_number,
                "medicine_id": item.medicine_id,
                "medicine_name": med_name,
                "reversed_quantity": item.quantity,
                "previous_stock": prev_stock,
                "restored_stock": new_stock,
                "role": actor_role,
                "status": "CANCELLED"
            }
        )
        db.add(audit_entry)

        # DataAuditTrail entry
        trail_entry = DataAuditTrail(
            user=actor_name,
            role=actor_role,
            action="BILL_CANCELLED",
            entity_type="Inventory",
            record_id=inv.id if inv else None,
            medicine_name=med_name,
            ward_name=bill.ward.name if bill.ward else f"Ward {bill.ward_id}",
            old_value={"current_stock": prev_stock},
            new_value={"current_stock": new_stock, "reversal_qty": item.quantity, "bill_number": bill.bill_number},
            reason=f"Cancellation of Bill #{bill.bill_number}",
            validation_result="VALIDATED",
            source="BILLING"
        )
        db.add(trail_entry)

    bill.status = BillStatus.CANCELLED

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bill cancellation failed: {str(e)}"
        )

    return {
        "message": f"Bill {bill.bill_number} cancelled successfully and stock reversed.",
        "bill_id": bill.id,
        "bill_number": bill.bill_number,
        "status": bill.status.value,
        "reversed_items": reversed_items
    }
