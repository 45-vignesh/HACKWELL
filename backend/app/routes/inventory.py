from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.entities import (
    Medicine, Inventory, InventoryBatch, Ward, Department,
    DailyUsage, MedicationUsageHistory, SupplierMedicine, RiskLevel, BatchStatus,
    TrustStatus, DataAuditTrail
)
from app.schemas.schemas import (
    InventoryItemResponse, MedicineResponse, BatchResponse,
    StockUpdateRequest, BatchValidationResponse
)
from app.services.inventory_validator import InventoryValidator
from app.services.auth_service import require_role, get_current_user

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])

@router.get("", response_model=List[InventoryItemResponse])
def get_inventory(
    ward_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    criticality: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    trust_status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Inventory).join(Medicine).join(Ward)

    if ward_id:
        query = query.filter(Inventory.ward_id == ward_id)
    if category:
        query = query.filter(Medicine.category == category)
    if criticality:
        query = query.filter(Medicine.criticality == criticality)
    if trust_status:
        query = query.filter(Inventory.trust_status == trust_status)
    if search:
        s = f"%{search}%"
        query = query.filter((Medicine.name.ilike(s)) | (Medicine.generic_name.ilike(s)) | (Medicine.code.ilike(s)))

    items = query.all()
    today = date.today()
    cutoff_14d = today - timedelta(days=14)

    # Pre-fetch supplier medicine mappings
    sm_list = db.query(SupplierMedicine).all()
    supplier_meds = {sm.medicine_id: sm for sm in sm_list}

    results = []
    for item in items:
        med = item.medicine
        ward = item.ward
        dept = ward.department if ward else None

        # Compute average 14-day daily usage
        usages = db.query(DailyUsage).filter(
            DailyUsage.medicine_id == med.id,
            DailyUsage.ward_id == ward.id,
            DailyUsage.date >= cutoff_14d
        ).all()
        daily_avg = float(sum(u.quantity_used for u in usages) / max(len(usages), 1)) if usages else (item.avg_daily_usage or 1.0)

        days_rem = round(item.current_stock / max(daily_avg, 0.1), 1)

        # Nearest batch expiry
        near_batch = db.query(InventoryBatch).filter(
            InventoryBatch.medicine_id == med.id,
            InventoryBatch.ward_id == ward.id,
            InventoryBatch.current_quantity > 0
        ).order_by(InventoryBatch.expiry_date.asc()).first()

        near_exp = near_batch.expiry_date if near_batch else None
        days_to_exp = (near_exp - today).days if near_exp else None

        reorder_pt = item.reorder_point or med.reorder_threshold or 50
        safety_stk = item.safety_stock or med.safety_stock or 30

        # Determine risk and status
        if days_rem <= 3.0 or item.current_stock < safety_stk:
            risk = RiskLevel.HIGH
            stock_stat = "CRITICAL_LOW"
        elif days_rem <= 7.0 or item.current_stock <= reorder_pt:
            risk = RiskLevel.MEDIUM
            stock_stat = "LOW_STOCK"
        elif days_rem >= 20.0 and item.current_stock >= reorder_pt * 2:
            risk = RiskLevel.LOW
            stock_stat = "SURPLUS"
        else:
            risk = RiskLevel.LOW
            stock_stat = "NORMAL"

        if risk_level and risk.value != risk_level:
            continue

        sm = supplier_meds.get(med.id)
        supplier_name = sm.supplier.name if sm and sm.supplier else None
        lead_time = sm.lead_time_days if sm else None
        unit_price = sm.unit_price if sm else med.unit_cost

        results.append(InventoryItemResponse(
            id=item.id,
            medicine_id=med.id,
            medicine_code=med.code,
            medicine_name=med.name,
            generic_name=med.generic_name,
            category=med.category,
            criticality=med.criticality,
            unit=med.unit,
            unit_cost=med.unit_cost,
            ward_id=ward.id,
            ward_name=ward.name,
            department_name=dept.name if dept else "Hospital",
            current_stock=item.current_stock,
            reserved_stock=item.reserved_stock,
            available_stock=max(0, item.current_stock - item.reserved_stock),
            min_level=item.min_level,
            max_level=item.max_level,
            safety_stock=safety_stk,
            reorder_point=reorder_pt,
            daily_consumption_avg=round(daily_avg, 1),
            days_remaining=days_rem,
            risk_level=risk,
            stock_status=stock_stat,
            nearest_expiry_date=near_exp,
            days_to_nearest_expiry=days_to_exp,
            last_restocked_at=item.last_restocked_at,
            data_source=item.data_source or "SYNTHETIC",
            risk_scenario=item.risk_scenario or "NORMAL",
            trust_status=item.trust_status.value if hasattr(item.trust_status, 'value') else (item.trust_status or "VALIDATED"),
            validated_by=item.validated_by or "SYSTEM_SEED",
            validated_at=item.validated_at,
            validation_notes=item.validation_notes,
            last_modified_by=item.last_modified_by,
            last_modified_at=item.last_modified_at,
            supplier_name=supplier_name,
            lead_time_days=lead_time,
            unit_price_inr=unit_price
        ))

    return results

@router.get("/{id}")
def get_inventory_detail(id: int, db: Session = Depends(get_db)):
    item = db.query(Inventory).filter(Inventory.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    med = item.medicine
    ward = item.ward
    today = date.today()

    # Batches
    batches = db.query(InventoryBatch).filter(
        InventoryBatch.medicine_id == med.id,
        InventoryBatch.ward_id == ward.id
    ).order_by(InventoryBatch.expiry_date.asc()).all()

    batch_list = []
    for b in batches:
        days_exp = (b.expiry_date - today).days
        batch_list.append({
            "id": b.id,
            "batch_number": b.batch_number,
            "initial_quantity": b.initial_quantity,
            "current_quantity": b.current_quantity,
            "unit_cost": b.unit_cost,
            "manufacturing_date": b.manufacturing_date.strftime("%Y-%m-%d"),
            "expiry_date": b.expiry_date.strftime("%Y-%m-%d"),
            "days_to_expiry": days_exp,
            "status": b.status.value
        })

    # Historical usage for the last 30 days from MedicationUsageHistory (MIMIC-derived)
    cutoff_30d = today - timedelta(days=30)
    mimic_usages = db.query(MedicationUsageHistory).filter(
        MedicationUsageHistory.medicine_id == med.id,
        MedicationUsageHistory.date >= cutoff_30d
    ).order_by(MedicationUsageHistory.date.asc()).all()

    usage_source = "MIMIC-Derived"
    if mimic_usages:
        ward_weight = 0.50 if ward.code == "WARD-EMERG" else 0.25
        usage_history = [
            {
                "date": u.date.strftime("%Y-%m-%d"),
                "quantity_used": round(u.quantity_used * ward_weight, 1),
                "source": u.source
            }
            for u in mimic_usages
        ]
    else:
        usages = db.query(DailyUsage).filter(
            DailyUsage.medicine_id == med.id,
            DailyUsage.ward_id == ward.id,
            DailyUsage.date >= cutoff_30d
        ).order_by(DailyUsage.date.asc()).all()
        usage_source = "Synthetic Baseline"
        usage_history = [
            {
                "date": u.date.strftime("%Y-%m-%d"),
                "quantity_used": u.quantity_used,
                "source": "SYNTHETIC"
            }
            for u in usages
        ]

    # Suppliers offering this medicine
    offerings = db.query(SupplierMedicine).filter(SupplierMedicine.medicine_id == med.id).all()
    suppliers_list = [
        {
            "supplier_id": o.supplier.id,
            "supplier_name": o.supplier.name,
            "unit_price": o.unit_price,
            "lead_time_days": o.lead_time_days,
            "reliability_score": o.supplier.reliability_score,
            "available_quantity": o.available_quantity
        }
        for o in offerings
    ]

    # Ward distribution across entire hospital
    all_ward_inv = db.query(Inventory).filter(Inventory.medicine_id == med.id).all()
    distribution_list = [
        {
            "ward_id": wi.ward.id,
            "ward_name": wi.ward.name,
            "current_stock": wi.current_stock,
            "min_level": wi.min_level,
            "max_level": wi.max_level
        }
        for wi in all_ward_inv
    ]

    return {
        "inventory_id": item.id,
        "medicine": {
            "id": med.id,
            "code": med.code,
            "name": med.name,
            "generic_name": med.generic_name,
            "category": med.category,
            "unit": med.unit,
            "criticality": med.criticality.value,
            "safety_stock": med.safety_stock,
            "reorder_threshold": med.reorder_threshold,
            "unit_cost": med.unit_cost
        },
        "ward": {
            "id": ward.id,
            "name": ward.name,
            "bed_count": ward.bed_count,
            "department": ward.department.name if ward.department else "Hospital"
        },
        "current_stock": item.current_stock,
        "min_level": item.min_level,
        "max_level": item.max_level,
        "safety_stock": item.safety_stock or med.safety_stock,
        "reorder_point": item.reorder_point or med.reorder_threshold,
        "days_of_stock": item.days_of_stock or 0.0,
        "data_source": item.data_source or "SYNTHETIC",
        "risk_scenario": item.risk_scenario or "NORMAL",
        "trust_status": item.trust_status.value if hasattr(item.trust_status, 'value') else (item.trust_status or "VALIDATED"),
        "validated_by": item.validated_by or "SYSTEM_SEED",
        "validated_at": item.validated_at.isoformat() if item.validated_at else None,
        "validation_notes": item.validation_notes,
        "last_modified_by": item.last_modified_by,
        "last_modified_at": item.last_modified_at.isoformat() if item.last_modified_at else None,
        "batches": batch_list,
        "usage_history": usage_history,
        "usage_source": usage_source,
        "suppliers": suppliers_list,
        "hospital_distribution": distribution_list
    }

@router.put("/{id}/stock")
def update_inventory_stock(
    id: int,
    payload: StockUpdateRequest,
    current_user: dict = Depends(require_role(["DATA_MANAGER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Controlled manual stock update.
    Requires DATA_MANAGER or ADMIN role.
    Applies strict validation, abnormal jump warnings, and records an immutable audit log.
    """
    inv = db.query(Inventory).filter(Inventory.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    old_stock = inv.current_stock
    med_name = inv.medicine.name if inv.medicine else "Unknown"
    ward_name = inv.ward.name if inv.ward else "Unknown"

    # Run validation engine
    val_res = InventoryValidator.validate_stock_update(
        db=db,
        inventory_id=id,
        new_stock=payload.new_stock,
        reason=payload.reason,
        override_warning=payload.override_warning
    )

    now = datetime.utcnow()

    # If rejected (e.g. negative stock or missing reason)
    if not val_res.is_valid:
        # Record rejected audit trail
        rejected_audit = DataAuditTrail(
            user=current_user["username"],
            role=current_user["role"],
            action="UPDATE_STOCK",
            entity_type="Inventory",
            record_id=id,
            medicine_name=med_name,
            ward_name=ward_name,
            old_value={"current_stock": old_stock},
            new_value={"current_stock": payload.new_stock},
            reason=payload.reason or "Missing reason",
            validation_result="REJECTED",
            source="MANUAL",
            timestamp=now
        )
        db.add(rejected_audit)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=val_res.message + (f" Errors: {', '.join(val_res.errors)}" if val_res.errors else "")
        )

    # If warning detected and override not explicitly affirmed
    if val_res.status == TrustStatus.WARNING and not payload.override_warning:
        return {
            "status": "WARNING",
            "message": val_res.message,
            "warnings": val_res.warnings,
            "requires_override": True,
            "current_stock": old_stock,
            "proposed_stock": payload.new_stock
        }

    # Commit validated update
    inv.current_stock = payload.new_stock
    inv.trust_status = TrustStatus.VALIDATED
    inv.data_source = "MANUAL"
    inv.last_modified_by = current_user["username"]
    inv.last_modified_at = now
    inv.validated_by = current_user["username"]
    inv.validated_at = now
    inv.validation_notes = payload.reason

    # Add audit log
    audit_entry = DataAuditTrail(
        user=current_user["username"],
        role=current_user["role"],
        action="UPDATE_STOCK",
        entity_type="Inventory",
        record_id=id,
        medicine_name=med_name,
        ward_name=ward_name,
        old_value={"current_stock": old_stock},
        new_value={"current_stock": payload.new_stock},
        reason=payload.reason,
        validation_result="VALIDATED",
        source="MANUAL",
        timestamp=now
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(inv)

    return {
        "status": "SUCCESS",
        "message": f"Successfully updated stock for {med_name} in {ward_name} from {old_stock} to {payload.new_stock}.",
        "inventory_id": inv.id,
        "new_stock": inv.current_stock,
        "trust_status": inv.trust_status.value,
        "data_source": inv.data_source,
        "last_modified_by": inv.last_modified_by,
        "last_modified_at": inv.last_modified_at.isoformat()
    }

@router.post("/validate-batch", response_model=BatchValidationResponse)
def validate_batch(
    payload: Dict[str, Any],
    current_user: dict = Depends(require_role(["DATA_MANAGER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Validates a batch of CSV rows without committing them to the database.
    Returns valid count, warning count, rejected count, and detailed error messages.
    """
    rows = payload.get("rows", [])
    if not rows:
        raise HTTPException(status_code=400, detail="No rows provided in batch payload.")

    report = InventoryValidator.validate_csv_batch(db, rows)
    return report

@router.post("/import-batch")
def import_batch(
    payload: Dict[str, Any],
    current_user: dict = Depends(require_role(["DATA_MANAGER", "ADMIN"])),
    db: Session = Depends(get_db)
):
    """
    Commits ONLY validated rows from an uploaded CSV batch into operational inventory.
    Rejects or quarantines invalid records, and logs an immutable audit trail.
    """
    rows = payload.get("rows", [])
    reason = payload.get("reason", "Batch CSV Ingestion by Data Manager")
    if not rows:
        raise HTTPException(status_code=400, detail="No rows provided for import.")

    report = InventoryValidator.validate_csv_batch(db, rows)
    valid_rows = report["valid_rows"]
    now = datetime.utcnow()

    imported_count = 0
    for r in valid_rows:
        med_id = r["medicine_id"]
        ward_id = r["ward_id"]
        if not med_id or not ward_id:
            continue

        inv = db.query(Inventory).filter(
            Inventory.medicine_id == med_id,
            Inventory.ward_id == ward_id
        ).first()

        old_stock = inv.current_stock if inv else 0

        if inv:
            inv.current_stock = r["current_stock"]
            inv.trust_status = TrustStatus.VALIDATED
            inv.data_source = "MANUAL"
            inv.last_modified_by = current_user["username"]
            inv.last_modified_at = now
            inv.validated_by = current_user["username"]
            inv.validated_at = now
            inv.validation_notes = reason
        else:
            inv = Inventory(
                medicine_id=med_id,
                ward_id=ward_id,
                current_stock=r["current_stock"],
                min_level=r.get("min_level", 20),
                max_level=r.get("max_level", 200),
                safety_stock=r.get("safety_stock", 30),
                reorder_point=r.get("reorder_point", 50),
                avg_daily_usage=r.get("avg_daily_usage", 10.0),
                data_source="MANUAL",
                trust_status=TrustStatus.VALIDATED,
                validated_by=current_user["username"],
                validated_at=now,
                validation_notes=reason,
                last_modified_by=current_user["username"],
                last_modified_at=now
            )
            db.add(inv)

        # Audit trail
        audit = DataAuditTrail(
            user=current_user["username"],
            role=current_user["role"],
            action="CSV_IMPORT",
            entity_type="Inventory",
            record_id=inv.id if inv else None,
            medicine_name=r.get("medicine_name", "Medicine"),
            ward_name=r.get("ward_name", "Ward"),
            old_value={"current_stock": old_stock},
            new_value={"current_stock": r["current_stock"]},
            reason=reason,
            validation_result="VALIDATED",
            source="MANUAL",
            timestamp=now
        )
        db.add(audit)
        imported_count += 1

    db.commit()

    return {
        "status": "SUCCESS",
        "total_submitted": report["total_records"],
        "imported_count": imported_count,
        "rejected_count": report["rejected_count"],
        "warning_count": report["warning_count"],
        "rejected_errors": report["errors"]
    }
