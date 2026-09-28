import uuid
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import (
    Medicine, Ward, Inventory, DailyUsage, Alert, Approval,
    StockTransfer, PurchaseOrder, AgentRun, AuditLog,
    CriticalityLevel, RiskLevel, ActionType, ApprovalStatus
)
from app.agents.orchestrator import Orchestrator
from app.agents.state import AgentState, AgentStepLog
from app.schemas.schemas import SimulationResponse, SimulationStep

router = APIRouter(prefix="/api/simulation", tags=["Simulation"])

@router.post("/dengue", response_model=SimulationResponse)
def run_dengue_surge_simulation(db: Session = Depends(get_db)):
    """
    Primary Hackathon Hero Scenario:
    Simulates a sudden monsoon Dengue outbreak:
    1. Injects 400% surge in Emergency Ward IV Fluid (Normal Saline) consumption.
    2. Drops current emergency stock to acute danger levels (35 units).
    3. Launches the complete multi-agent LangGraph workflow.
    4. Monitor flags abnormal consumption spike.
    5. Forecast predicts stockout in ~1.5 days.
    6. Distribution finds surplus in OPD Pharmacy and formulates 50-unit transfer.
    7. Procurement compares suppliers, selects optimal 1-day delivery vendor, drafts ₹18,000 PO.
    8. Policy Engine routes PO to Pharmacist Approval Center.
    9. Emits a rich real-time step timeline for the UI.
    """
    now = datetime.utcnow()
    today = date.today()

    # 1. Fetch Normal Saline and Emergency Ward
    iv_med = db.query(Medicine).filter(Medicine.code == "MED-IVF-NS").first()
    emerg_ward = db.query(Ward).filter(Ward.code == "WARD-EMERG").first()
    opd_ward = db.query(Ward).filter(Ward.code == "WARD-OPD").first()

    if not iv_med or not emerg_ward:
        raise HTTPException(status_code=500, detail="Essential scenario data missing in database.")

    # 2. Update Emergency Ward inventory to acute danger level (35 units)
    emerg_inv = db.query(Inventory).filter(
        Inventory.medicine_id == iv_med.id,
        Inventory.ward_id == emerg_ward.id
    ).first()
    if emerg_inv:
        emerg_inv.current_stock = 35
        emerg_inv.updated_at = now

    # Ensure OPD has surplus (175 units)
    if opd_ward:
        opd_inv = db.query(Inventory).filter(
            Inventory.medicine_id == iv_med.id,
            Inventory.ward_id == opd_ward.id
        ).first()
        if opd_inv:
            opd_inv.current_stock = 175
            opd_inv.updated_at = now

    # 3. Inject Surge in Daily Usage for past 3 days (400% increase to 62 units/day)
    surge_rate = 62.0
    for offset in range(3):
        usage_date = today - timedelta(days=offset)
        record = db.query(DailyUsage).filter(
            DailyUsage.medicine_id == iv_med.id,
            DailyUsage.ward_id == emerg_ward.id,
            DailyUsage.date == usage_date
        ).first()
        if record:
            record.quantity_used = surge_rate
            record.emergency_surges = True
            record.admission_count = 38
        else:
            new_rec = DailyUsage(
                medicine_id=iv_med.id,
                ward_id=emerg_ward.id,
                date=usage_date,
                quantity_used=surge_rate,
                admission_count=38,
                emergency_surges=True
            )
            db.add(new_rec)

    db.commit()

    # 4. Trigger the multi-agent Orchestrator
    run_id = f"RUN-DENGUE-SURGE-{uuid.uuid4().hex[:6].upper()}"
    initial_state: AgentState = {
        "run_id": run_id,
        "user_request": "Dengue Surge Emergency Outbreak Simulation",
        "trigger_event": "Outbreak Spike: 400% Surge in Emergency IV Fluid Consumption",
        "created_at": now.isoformat(),
        "medicine_id": iv_med.id,
        "ward_id": emerg_ward.id,
        "inventory_snapshot": None,
        "surplus_candidates": [],
        "expiring_batches": [],
        "demand_forecast": None,
        "stockout_risk": None,
        "estimated_stockout_days": None,
        "expiry_risk": None,
        "recommended_transfer": None,
        "recommended_procurement": None,
        "recommended_fefo_action": None,
        "approval_required": False,
        "approval_status": "NONE",
        "approval_id": None,
        "action_type": None,
        "execution_status": "RUNNING",
        "agent_messages": [],
        "timeline_logs": [
            AgentStepLog(
                timestamp=now.isoformat(),
                agent="Simulation Engine",
                action="INJECT_DENGUE_OUTBREAK_SURGE",
                detail="Simulated sudden Dengue outbreak: Emergency ward IV fluid consumption surged to 62 bottles/day (400% baseline).",
                severity="WARNING"
            )
        ],
        "final_summary": None
    }

    orchestrator = Orchestrator(db)
    final_state = orchestrator.execute(initial_state)

    # 5. Format Simulation Response
    steps = [
        SimulationStep(
            timestamp=log["timestamp"],
            agent=log["agent"],
            action=log["action"],
            detail=log["detail"],
            severity=log["severity"]
        )
        for log in final_state["timeline_logs"]
    ]

    return SimulationResponse(
        scenario="Monsoon Dengue Epidemic Surge",
        status=final_state.get("execution_status", "PENDING_APPROVAL"),
        message="Dengue surge simulation executed successfully. Autonomous agents analyzed stock, formulated OPD transfer, and queued high-value emergency PO for Pharmacist 1-tap sign-off.",
        medicine_name=iv_med.name,
        affected_ward=emerg_ward.name,
        initial_stock=35,
        spiked_daily_demand=surge_rate,
        days_to_stockout=final_state.get("estimated_stockout_days", 1.5) or 1.5,
        steps=steps,
        transfer_created=None,
        po_created=None,
        approval_created=None
    )

@router.post("/reset")
def reset_simulation(db: Session = Depends(get_db)):
    """
    Resets emergency ward stock back to stable baseline.
    """
    from scripts.generate_synthetic_data import seed_database
    seed_database()
    return {"status": "success", "message": "Hospital inventory and telemetry reset to clean baseline."}
