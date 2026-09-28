from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.entities import (
    Inventory, Ward, Medicine, StockTransfer, TransferStatus,
    RiskLevel, CriticalityLevel, DailyUsage
)
from app.agents.state import AgentState, AgentStepLog, TransferProposal
from app.policies.policy_engine import PolicyEngine

class DistributionAgent:
    """
    Distribution Agent: Identifies departments with surplus stock and formulates
    safe rebalancing transfers to destination wards in deficit, strictly respecting
    source ward safety-stock constraints.
    """

    @staticmethod
    def find_surplus(
        db: Session,
        medicine_id: int,
        exclude_ward_id: int
    ) -> List[Dict[str, Any]]:
        """
        Scans all wards for surplus stock above (reorder_threshold * 1.5) or > 15 days supply.
        """
        candidates = []
        other_inventories = db.query(Inventory).filter(
            Inventory.medicine_id == medicine_id,
            Inventory.ward_id != exclude_ward_id
        ).all()

        for inv in other_inventories:
            ward = inv.ward
            med = inv.medicine

            # Calculate ward's 14-day average usage
            recent_cutoff = date.today() - timedelta(days=14)
            usages = db.query(DailyUsage).filter(
                DailyUsage.medicine_id == medicine_id,
                DailyUsage.ward_id == ward.id,
                DailyUsage.date >= recent_cutoff
            ).all()

            daily_avg = float(sum(u.quantity_used for u in usages) / max(len(usages), 1)) if usages else 1.0
            
            # Safe transferable headroom: current_stock - max(safety_stock * 1.5, daily_avg * 7)
            retained_buffer = int(max(med.safety_stock, daily_avg * 7))
            transferable = max(0, inv.current_stock - retained_buffer)

            if transferable >= 15:  # meaningful surplus
                candidates.append({
                    "ward_id": ward.id,
                    "ward_name": ward.name,
                    "current_stock": inv.current_stock,
                    "daily_avg": round(daily_avg, 1),
                    "retained_buffer": retained_buffer,
                    "transferable_quantity": transferable
                })

        # Sort by most transferable quantity descending
        candidates.sort(key=lambda x: x["transferable_quantity"], reverse=True)
        return candidates

    @staticmethod
    def run(state: AgentState, db: Session) -> Dict[str, Any]:
        med_id = state.get("medicine_id")
        dest_ward_id = state.get("ward_id")
        now_iso = datetime.utcnow().isoformat()

        timeline: List[AgentStepLog] = state.get("timeline_logs", [])
        messages: List[str] = state.get("agent_messages", [])

        if not med_id or not dest_ward_id:
            return {"timeline_logs": timeline}

        med = db.query(Medicine).filter(Medicine.id == med_id).first()
        dest_ward = db.query(Ward).filter(Ward.id == dest_ward_id).first()

        surplus_list = DistributionAgent.find_surplus(db, med_id, dest_ward_id)

        if not surplus_list:
            timeline.append(AgentStepLog(
                timestamp=now_iso,
                agent="Distribution Agent",
                action="SCAN_SURPLUS_STOCK",
                detail=f"Scanned all wards for {med.name} surplus: No wards currently have safe transferable headroom.",
                severity="INFO"
            ))
            messages.append("Distribution Agent: No internal surplus found in other hospital wards.")
            return {
                "surplus_candidates": [],
                "recommended_transfer": None,
                "timeline_logs": timeline,
                "agent_messages": messages
            }

        # Select best surplus source
        best = surplus_list[0]
        # Transfer up to 60 units or whatever headroom is safe
        needed_quantity = 60
        transfer_qty = min(needed_quantity, best["transferable_quantity"])

        source_remaining = best["current_stock"] - transfer_qty
        risk_lvl, approval_req, reason = PolicyEngine.evaluate_stock_transfer(
            med.criticality,
            transfer_qty,
            source_remaining,
            best["retained_buffer"]
        )

        proposal = TransferProposal(
            medicine_id=med.id,
            medicine_name=med.name,
            source_ward_id=best["ward_id"],
            source_ward_name=best["ward_name"],
            destination_ward_id=dest_ward.id,
            destination_ward_name=dest_ward.name,
            quantity=transfer_qty,
            reason=f"Emergency rebalance: {best['ward_name']} holds {best['current_stock']} units (transferable {best['transferable_quantity']}). Rebalancing {transfer_qty} units to {dest_ward.name}.",
            risk_level=risk_lvl.value,
            approval_required=approval_req
        )

        timeline.append(AgentStepLog(
            timestamp=now_iso,
            agent="Distribution Agent",
            action="PROPOSE_STOCK_TRANSFER",
            detail=f"Identified surplus in {best['ward_name']} (+{best['transferable_quantity']} headroom). Formulated transfer of {transfer_qty} {med.unit} to {dest_ward.name}. Risk: {risk_lvl.value}.",
            severity="INFO"
        ))

        messages.append(
            f"Distribution Agent: Proposing transfer of {transfer_qty} {med.unit} from {best['ward_name']} to {dest_ward.name}."
        )

        return {
            "surplus_candidates": surplus_list,
            "recommended_transfer": proposal,
            "timeline_logs": timeline,
            "agent_messages": messages
        }
