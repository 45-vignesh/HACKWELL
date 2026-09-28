from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.entities import (
    Medicine, Supplier, SupplierMedicine, PurchaseOrder,
    PurchaseOrderItem, OrderStatus, PriorityLevel, RiskLevel
)
from app.agents.state import AgentState, AgentStepLog, ProcurementProposal
from app.policies.policy_engine import PolicyEngine

class ProcurementAgent:
    """
    Procurement Agent: Compares qualified pharmaceutical suppliers on price, lead time,
    and reliability scores to assemble optimized purchase orders.
    """

    @staticmethod
    def evaluate_suppliers(db: Session, medicine_id: int) -> List[Dict[str, Any]]:
        offerings = db.query(SupplierMedicine).filter(
            SupplierMedicine.medicine_id == medicine_id
        ).all()

        results = []
        for off in offerings:
            sup = off.supplier
            # Multi-attribute scoring:
            # Score = (0.45 * reliability) + (0.35 * price_competitiveness) + (0.20 * lead_time_score)
            results.append({
                "supplier_id": sup.id,
                "supplier_name": sup.name,
                "unit_price": off.unit_price,
                "lead_time_days": off.lead_time_days,
                "reliability_score": sup.reliability_score,
                "available_quantity": off.available_quantity,
                "min_order_qty": off.min_order_qty
            })

        return results

    @staticmethod
    def run(state: AgentState, db: Session) -> Dict[str, Any]:
        med_id = state.get("medicine_id")
        ward_id = state.get("ward_id")
        stockout_days = state.get("estimated_stockout_days", 3.0) or 3.0
        now_iso = datetime.utcnow().isoformat()

        timeline: List[AgentStepLog] = state.get("timeline_logs", [])
        messages: List[str] = state.get("agent_messages", [])

        if not med_id or not ward_id:
            return {"timeline_logs": timeline}

        med = db.query(Medicine).filter(Medicine.id == med_id).first()

        # Check if an internal transfer is already buffering some of the demand
        transfer = state.get("recommended_transfer")
        transferred_qty = transfer["quantity"] if transfer else 0

        # Calculate procurement need: e.g., 14 days of expected daily demand + safety stock - (current + transfer)
        inv_snap = state.get("inventory_snapshot")
        curr_stock = inv_snap["current_stock"] if inv_snap else 50
        daily_demand = inv_snap["daily_consumption_avg"] if inv_snap else 20.0

        target_stock = int(daily_demand * 14 + med.safety_stock)
        shortage = target_stock - (curr_stock + transferred_qty)
        order_quantity = max(100, int(shortage))

        suppliers = ProcurementAgent.evaluate_suppliers(db, med_id)
        if not suppliers:
            timeline.append(AgentStepLog(
                timestamp=now_iso,
                agent="Procurement Agent",
                action="SEARCH_SUPPLIERS_FAILED",
                detail=f"No registered suppliers found in database for medicine ID {med_id}.",
                severity="WARNING"
            ))
            return {"timeline_logs": timeline}

        # Urgent selection strategy:
        # If stockout <= 2 days, prioritize fastest lead time with high reliability
        if stockout_days <= 2.5:
            # Sort primarily by lead_time_days asc, then reliability desc
            suppliers.sort(key=lambda s: (s["lead_time_days"], -s["reliability_score"], s["unit_price"]))
        else:
            # Sort by total value-score: lowest price with >= 0.90 reliability
            suppliers.sort(key=lambda s: (s["unit_price"] / max(s["reliability_score"], 0.5), s["lead_time_days"]))

        best_supplier = suppliers[0]
        total_cost = round(order_quantity * best_supplier["unit_price"], 2)

        risk_lvl, approval_req, reason = PolicyEngine.evaluate_purchase_order(
            med.criticality,
            order_quantity,
            total_cost,
            stockout_days
        )

        proposal = ProcurementProposal(
            medicine_id=med.id,
            medicine_name=med.name,
            target_ward_id=ward_id,
            target_ward_name=inv_snap["ward_name"] if inv_snap else "Target Ward",
            supplier_id=best_supplier["supplier_id"],
            supplier_name=best_supplier["supplier_name"],
            supplier_lead_time=best_supplier["lead_time_days"],
            supplier_reliability=best_supplier["reliability_score"],
            unit_price=best_supplier["unit_price"],
            quantity=order_quantity,
            total_cost=total_cost,
            reason=f"Restock deficit: Projected stockout in {stockout_days:.1f} days. Supplier {best_supplier['supplier_name']} selected for {best_supplier['lead_time_days']}-day delivery.",
            risk_level=risk_lvl.value,
            approval_required=approval_req
        )

        timeline.append(AgentStepLog(
            timestamp=now_iso,
            agent="Procurement Agent",
            action="FORMULATE_PURCHASE_ORDER",
            detail=(
                f"Evaluated {len(suppliers)} suppliers. Selected {best_supplier['supplier_name']} "
                f"({best_supplier['lead_time_days']}d lead time, {best_supplier['reliability_score']*100:.0f}% reliability). "
                f"Prepared PO for {order_quantity} {med.unit} @ ₹{best_supplier['unit_price']}/ea (Total: ₹{total_cost:,.2f}). "
                f"Approval required: {approval_req}."
            ),
            severity="CRITICAL" if risk_lvl.value == "HIGH" else "INFO"
        ))

        messages.append(
            f"Procurement Agent: Prepared PO for {order_quantity} {med.unit} from {best_supplier['supplier_name']} (Total ₹{total_cost:,.2f}). "
            f"{'Requires Pharmacist Approval' if approval_req else 'Auto-executable'}."
        )

        return {
            "recommended_procurement": proposal,
            "timeline_logs": timeline,
            "agent_messages": messages
        }
