from datetime import datetime, date, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.entities import InventoryBatch, BatchStatus, Medicine, Ward, RiskLevel
from app.agents.state import AgentState, AgentStepLog, ExpiryRiskDetail
from app.policies.policy_engine import PolicyEngine

class WasteGuardAgent:
    """
    Waste Guard Agent: Monitors batch expiration dates, enforces First-Expiry-First-Out (FEFO),
    identifies slow-moving lots, and flags financial value at risk.
    """

    @staticmethod
    def inspect_batches(db: Session, horizon_days: int = 90) -> List[ExpiryRiskDetail]:
        today = date.today()
        target_expiry = today + timedelta(days=horizon_days)

        batches = db.query(InventoryBatch).filter(
            InventoryBatch.current_quantity > 0,
            InventoryBatch.expiry_date <= target_expiry
        ).order_by(InventoryBatch.expiry_date.asc()).all()

        results = []
        for b in batches:
            med = b.medicine
            ward = b.ward
            days_left = (b.expiry_date - today).days
            val_at_risk = round(b.current_quantity * b.unit_cost, 2)

            fefo_action = (
                f"Prioritize immediate dispensing (FEFO) in {ward.name}. "
                f"If daily burn is insufficient, redistribute to high-volume wards."
            )

            results.append(ExpiryRiskDetail(
                batch_number=b.batch_number,
                medicine_id=med.id,
                medicine_name=med.name,
                ward_id=ward.id,
                ward_name=ward.name,
                quantity=b.current_quantity,
                unit_cost=b.unit_cost,
                value_at_risk=val_at_risk,
                expiry_date=b.expiry_date.strftime("%Y-%m-%d"),
                days_to_expiry=days_left,
                fefo_recommendation=fefo_action
            ))

        return results

    @staticmethod
    def run(state: AgentState, db: Session) -> Dict[str, Any]:
        now_iso = datetime.utcnow().isoformat()
        timeline: List[AgentStepLog] = state.get("timeline_logs", [])
        messages: List[str] = state.get("agent_messages", [])

        expiring = WasteGuardAgent.inspect_batches(db, horizon_days=90)

        if expiring:
            total_val = sum(e["value_at_risk"] for e in expiring)
            timeline.append(AgentStepLog(
                timestamp=now_iso,
                agent="Waste Guard Agent",
                action="AUDIT_EXPIRY_RISK",
                detail=f"Detected {len(expiring)} batches nearing expiration within 90 days. Total value at risk: ₹{total_val:,.2f}. FEFO protocols activated.",
                severity="WARNING"
            ))
            messages.append(
                f"Waste Guard Agent: {len(expiring)} batches at risk of expiration (₹{total_val:,.2f} value at risk). Enforcing FEFO."
            )
        else:
            timeline.append(AgentStepLog(
                timestamp=now_iso,
                agent="Waste Guard Agent",
                action="AUDIT_EXPIRY_RISK",
                detail="All active batches have healthy shelf-life (> 90 days). No immediate expiry waste detected.",
                severity="INFO"
            ))

        return {
            "expiring_batches": expiring,
            "expiry_risk": "HIGH" if any(e["days_to_expiry"] <= 30 for e in expiring) else ("MEDIUM" if expiring else "LOW"),
            "timeline_logs": timeline,
            "agent_messages": messages
        }
