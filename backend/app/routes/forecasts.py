from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import Medicine, Ward, Inventory
from app.forecasting.forecast_service import ForecastService
from app.schemas.schemas import ForecastResponse

router = APIRouter(prefix="/api/forecasts", tags=["Forecasts"])

@router.get("", response_model=ForecastResponse)
def get_default_forecast(
    medicine_id: Optional[int] = Query(None),
    ward_id: Optional[int] = Query(None),
    horizon_days: int = Query(14, ge=7, le=30),
    db: Session = Depends(get_db)
):
    # If not provided, default to Emergency Ward IV Fluid (the primary hero item)
    if not medicine_id:
        med = db.query(Medicine).filter(Medicine.code == "MED-IVF-NS").first()
        if not med:
            med = db.query(Medicine).first()
        medicine_id = med.id if med else 1

    if not ward_id:
        ward = db.query(Ward).filter(Ward.code == "WARD-EMERG").first()
        if not ward:
            ward = db.query(Ward).first()
        ward_id = ward.id if ward else 1

    try:
        return ForecastService.forecast_demand(db, medicine_id, ward_id, horizon_days=horizon_days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting error: {str(e)}")

@router.get("/{medicine_id}", response_model=ForecastResponse)
def get_medicine_forecast(
    medicine_id: int,
    ward_id: Optional[int] = Query(None),
    horizon_days: int = Query(14, ge=7, le=30),
    db: Session = Depends(get_db)
):
    if not ward_id:
        # Default to Emergency ward or first ward with inventory
        inv = db.query(Inventory).filter(Inventory.medicine_id == medicine_id).first()
        ward_id = inv.ward_id if inv else 2

    try:
        return ForecastService.forecast_demand(db, medicine_id, ward_id, horizon_days=horizon_days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting error: {str(e)}")
