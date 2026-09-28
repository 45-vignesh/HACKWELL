import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import AgentRun, Medicine, Ward, Inventory
from app.agents.orchestrator import Orchestrator
from app.agents.state import AgentState

router = APIRouter(tags=["Agents"])

@router.get("/api/agents")
def list_agents():
    return [
        {
            "id": "orchestrator",
            "name": "Orchestrator Agent",
            "role": "Master Coordinator & Conflict Resolution",
            "status": "ACTIVE",
            "description": "Stateful LangGraph supervisor managing multi-agent pipeline and human governance escalation.",
            "capabilities": ["Workflow Routing", "Conflict Resolution", "Policy Enforcement", "Human-in-the-Loop Interruption"]
        },
        {
            "id": "monitor",
            "name": "Monitor Agent",
            "role": "24x7 Stock Telemetry & Anomaly Detection",
            "status": "ACTIVE",
            "description": "Continuously audits inventory levels, calculates burn rates, and flags critical stock-outs and consumption spikes.",
            "capabilities": ["get_inventory", "get_low_stock_items", "get_batch_details", "get_recent_usage"]
        },
        {
            "id": "forecast",
            "name": "Forecast Agent",
            "role": "Demand & Depletion Modeling",
            "status": "ACTIVE",
            "description": "Employs Prophet and seasonal ML models to project 7, 14, and 30-day demand trajectories and stock-out dates.",
            "capabilities": ["generate_forecast", "calculate_stockout_risk", "compute_prediction_intervals"]
        },
        {
            "id": "distribution",
            "name": "Distribution Agent",
            "role": "Inter-Department Inventory Balancer",
            "status": "ACTIVE",
            "description": "Identifies surplus departments and formulates safe internal transfers to eliminate acute ward deficits.",
            "capabilities": ["find_surplus_stock", "calculate_transfer_quantity", "verify_safety_stock_constraints"]
        },
        {
            "id": "procurement",
            "name": "Procurement Agent",
            "role": "Supplier & Purchase Order Automation",
            "status": "ACTIVE",
            "description": "Evaluates certified vendors on price, reliability, and lead time to construct optimal purchase orders.",
            "capabilities": ["get_suppliers", "compare_suppliers", "calculate_order_quantity", "create_purchase_order"]
        },
        {
            "id": "waste_guard",
            "name": "Waste Guard Agent",
            "role": "FEFO & Expiry Minimization",
            "status": "ACTIVE",
            "description": "Enforces First-Expiry-First-Out dispensing, computes value-at-risk, and prevents drug wastage.",
            "capabilities": ["get_expiring_batches", "calculate_expiry_risk", "recommend_fefo_action"]
        }
    ]

@router.get("/api/agents/runs")
def list_agent_runs(limit: int = Query(20), db: Session = Depends(get_db)):
    runs = db.query(AgentRun).order_by(AgentRun.start_time.desc()).limit(limit).all()
    results = []
    for r in runs:
        results.append({
            "id": r.id,
            "run_id": r.run_id,
            "trigger_event": r.trigger_event,
            "status": r.status,
            "agents_involved": r.agents_involved,
            "execution_log": r.execution_log,
            "start_time": r.start_time.isoformat() if r.start_time else None,
            "end_time": r.end_time.isoformat() if r.end_time else None,
            "summary": r.summary
        })
    return results

@router.post("/api/agents/analyze")
@router.post("/api/agent/analyze")
def trigger_agent_analysis(
    medicine_id: Optional[int] = None,
    ward_id: Optional[int] = None,
    trigger_reason: str = "Manual On-Demand Scan",
    db: Session = Depends(get_db)
):
    if not medicine_id:
        med = db.query(Medicine).filter(Medicine.code == "MED-IVF-NS").first()
        medicine_id = med.id if med else 1
    if not ward_id:
        ward = db.query(Ward).filter(Ward.code == "WARD-EMERG").first()
        ward_id = ward.id if ward else 2

    run_id = f"RUN-{uuid.uuid4().hex[:8].upper()}"
    initial_state: AgentState = {
        "run_id": run_id,
        "user_request": f"Analyze inventory for medicine {medicine_id} in ward {ward_id}",
        "trigger_event": trigger_reason,
        "created_at": datetime.utcnow().isoformat(),
        "medicine_id": medicine_id,
        "ward_id": ward_id,
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
        "timeline_logs": [],
        "final_summary": None
    }

    orchestrator = Orchestrator(db)
    final_state = orchestrator.execute(initial_state)

    return {
        "run_id": run_id,
        "execution_status": final_state.get("execution_status"),
        "approval_required": final_state.get("approval_required"),
        "stockout_risk": final_state.get("stockout_risk"),
        "estimated_stockout_days": final_state.get("estimated_stockout_days"),
        "recommended_transfer": final_state.get("recommended_transfer"),
        "recommended_procurement": final_state.get("recommended_procurement"),
        "timeline_logs": final_state.get("timeline_logs"),
        "final_summary": final_state.get("final_summary")
    }
