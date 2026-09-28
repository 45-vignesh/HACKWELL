from datetime import date, timedelta
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import InventoryBatch, BatchStatus
from app.agents.waste_guard import WasteGuardAgent

router = APIRouter(prefix="/api/waste", tags=["Waste Guard"])

@router.get("/expiring")
def get_expiring_batches(
    horizon_days: int = Query(90),
    db: Session = Depends(get_db)
):
    batches = WasteGuardAgent.inspect_batches(db, horizon_days=horizon_days)
    total_val = sum(b["value_at_risk"] for b in batches)

    return {
        "horizon_days": horizon_days,
        "total_batches_at_risk": len(batches),
        "total_value_at_risk": total_val,
        "batches": batches
    }
