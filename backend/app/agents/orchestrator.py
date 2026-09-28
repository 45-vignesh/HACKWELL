import uuid
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from langgraph.graph import StateGraph, END
from app.agents.state import AgentState, AgentStepLog
from app.agents.monitor import MonitorAgent
from app.agents.forecast_agent import ForecastAgent
from app.agents.distribution import DistributionAgent
from app.agents.procurement import ProcurementAgent
from app.agents.waste_guard import WasteGuardAgent
from app.models.entities import (
    Approval, ActionType, ApprovalStatus, RiskLevel,
    PurchaseOrder, PurchaseOrderItem, OrderStatus, PriorityLevel,
    StockTransfer, TransferStatus, Alert, AlertType, AlertSeverity,
    AlertStatus, AgentRun, AuditLog, Inventory
)

class Orchestrator:
    """
    LangGraph Stateful Multi-Agent Orchestrator.
    Coordinates Monitor, Forecast, Distribution, Procurement, and Waste Guard agents.
    Enforces deterministic safety gating and maintains the full execution lifecycle.
    """

    def __init__(self, db: Session):
        self.db = db
        self.workflow = self._build_graph()

    def _build_graph(self) -> StateGraph:
        builder = StateGraph(AgentState)

        # 1. Define Nodes
        builder.add_node("monitor_node", self._monitor_step)
        builder.add_node("forecast_node", self._forecast_step)
        builder.add_node("distribution_node", self._distribution_step)
        builder.add_node("procurement_node", self._procurement_step)
        builder.add_node("waste_guard_node", self._waste_guard_step)
        builder.add_node("governance_node", self._governance_step)

        # 2. Define Edges and Conditional Branching
        builder.set_entry_point("monitor_node")
        builder.add_edge("monitor_node", "forecast_node")

        # After forecast, decide whether shortage mitigation is needed
        builder.add_conditional_edges(
            "forecast_node",
            self._route_after_forecast,
            {
                "mitigate_shortage": "distribution_node",
                "check_waste": "waste_guard_node"
            }
        )

        builder.add_edge("distribution_node", "procurement_node")
        builder.add_edge("procurement_node", "waste_guard_node")
        builder.add_edge("waste_guard_node", "governance_node")
        builder.add_edge("governance_node", END)

        return builder.compile()

    # Step Functions
    def _monitor_step(self, state: AgentState) -> Dict[str, Any]:
        return MonitorAgent.run(state, self.db)

    def _forecast_step(self, state: AgentState) -> Dict[str, Any]:
        return ForecastAgent.run(state, self.db)

    def _route_after_forecast(self, state: AgentState) -> str:
        risk = state.get("stockout_risk", "LOW")
        days = state.get("estimated_stockout_days")
        if risk in ["CRITICAL", "HIGH"] or (days is not None and days <= 7.0):
            return "mitigate_shortage"
        return "check_waste"

    def _distribution_step(self, state: AgentState) -> Dict[str, Any]:
        return DistributionAgent.run(state, self.db)

    def _procurement_step(self, state: AgentState) -> Dict[str, Any]:
        return ProcurementAgent.run(state, self.db)

    def _waste_guard_step(self, state: AgentState) -> Dict[str, Any]:
        return WasteGuardAgent.run(state, self.db)

    def _governance_step(self, state: AgentState) -> Dict[str, Any]:
        """
        Final synthesis node:
        Evaluates risk policies, registers proposals in the database,
        creates human approval tickets for high-risk actions,
        or auto-executes low-risk transfers.
        """
        now = datetime.utcnow()
        timeline: List[AgentStepLog] = state.get("timeline_logs", [])
        messages: List[str] = state.get("agent_messages", [])
        
        po_prop = state.get("recommended_procurement")
        tr_prop = state.get("recommended_transfer")

        approval_needed = False
        exec_status = "COMPLETED"
        summary_points = []

        # 1. Process Stock Transfer Proposal
        if tr_prop:
            st = StockTransfer(
                transfer_number=f"TRF-{uuid.uuid4().hex[:8].upper()}",
                medicine_id=tr_prop["medicine_id"],
                from_ward_id=tr_prop["source_ward_id"],
                to_ward_id=tr_prop["destination_ward_id"],
                quantity=tr_prop["quantity"],
                reason=tr_prop["reason"],
                status=TransferStatus.PENDING_APPROVAL if tr_prop["approval_required"] else TransferStatus.COMPLETED,
                risk_level=RiskLevel(tr_prop["risk_level"]),
                initiated_by_agent="Distribution Agent",
                created_at=now,
                completed_at=None if tr_prop["approval_required"] else now
            )
            self.db.add(st)
            self.db.flush()

            if tr_prop["approval_required"]:
                approval_needed = True
                appr = Approval(
                    action_type=ActionType.STOCK_TRANSFER,
                    reference_id=st.id,
                    medicine_id=tr_prop["medicine_id"],
                    requested_by_agent="Distribution Agent",
                    risk_level=RiskLevel(tr_prop["risk_level"]),
                    justification=tr_prop["reason"],
                    estimated_cost=0.0,
                    requested_quantity=tr_prop["quantity"],
                    status=ApprovalStatus.PENDING,
                    created_at=now
                )
                self.db.add(appr)
                summary_points.append(f"Stock transfer of {tr_prop['quantity']} units routed to Pharmacist Approval.")
            else:
                # Auto-executed routine transfer! Update inventory balances immediately
                src_inv = self.db.query(Inventory).filter(
                    Inventory.medicine_id == tr_prop["medicine_id"],
                    Inventory.ward_id == tr_prop["source_ward_id"]
                ).first()
                dst_inv = self.db.query(Inventory).filter(
                    Inventory.medicine_id == tr_prop["medicine_id"],
                    Inventory.ward_id == tr_prop["destination_ward_id"]
                ).first()
                if src_inv and dst_inv:
                    src_inv.current_stock -= tr_prop["quantity"]
                    dst_inv.current_stock += tr_prop["quantity"]
                    summary_points.append(f"Auto-executed safe stock transfer of {tr_prop['quantity']} units from {tr_prop['source_ward_name']} to {tr_prop['destination_ward_name']}.")

        # 2. Process Procurement Proposal
        if po_prop:
            status = OrderStatus.PENDING_APPROVAL if po_prop["approval_required"] else OrderStatus.ORDERED
            po = PurchaseOrder(
                po_number=f"PO-{uuid.uuid4().hex[:8].upper()}",
                supplier_id=po_prop["supplier_id"],
                total_amount=po_prop["total_cost"],
                status=status,
                priority=PriorityLevel.EMERGENCY if po_prop["risk_level"] == "HIGH" else PriorityLevel.NORMAL,
                created_by_agent="Procurement Agent",
                order_date=now,
                expected_delivery_date=(now.date()),
                notes=po_prop["reason"]
            )
            self.db.add(po)
            self.db.flush()

            item = PurchaseOrderItem(
                purchase_order_id=po.id,
                medicine_id=po_prop["medicine_id"],
                quantity=po_prop["quantity"],
                unit_price=po_prop["unit_price"],
                total_price=po_prop["total_cost"]
            )
            self.db.add(item)
            self.db.flush()

            if po_prop["approval_required"]:
                approval_needed = True
                exec_status = "PENDING_APPROVAL"
                appr_po = Approval(
                    action_type=ActionType.PURCHASE_ORDER,
                    reference_id=po.id,
                    medicine_id=po_prop["medicine_id"],
                    requested_by_agent="Procurement Agent",
                    risk_level=RiskLevel(po_prop["risk_level"]),
                    justification=po_prop["reason"],
                    estimated_cost=po_prop["total_cost"],
                    requested_quantity=po_prop["quantity"],
                    status=ApprovalStatus.PENDING,
                    created_at=now
                )
                self.db.add(appr_po)
                summary_points.append(f"High-value PO for {po_prop['quantity']} units (₹{po_prop['total_cost']:,.2f}) paused for Pharmacist 1-tap sign-off.")
            else:
                summary_points.append(f"Auto-placed standard PO for {po_prop['quantity']} units (₹{po_prop['total_cost']:,.2f}).")

        # 3. Create Alert if Critical
        stockout_days = state.get("estimated_stockout_days")
        if stockout_days is not None and stockout_days <= 3.0:
            inv_snap = state.get("inventory_snapshot")
            alt = Alert(
                alert_type=AlertType.SHORTAGE_PREDICTED,
                severity=AlertSeverity.CRITICAL,
                medicine_id=state.get("medicine_id"),
                ward_id=state.get("ward_id"),
                title=f"PREDICTED STOCKOUT: {inv_snap['medicine_name']} in {stockout_days:.1f} days",
                message=f"Current reserve ({inv_snap['current_stock']} {inv_snap['unit']}) will be depleted. Mitigations initiated by agent team.",
                status=AlertStatus.OPEN,
                recommended_action="Review pending transfer and purchase order approval.",
                triggered_by_agent="Orchestrator Agent",
                created_at=now
            )
            self.db.add(alt)

        final_summary = " | ".join(summary_points) if summary_points else "Periodic audit cycle finished. System health stable."

        timeline.append(AgentStepLog(
            timestamp=now.isoformat(),
            agent="Orchestrator Agent",
            action="GOVERNANCE_DECISION_FINALIZED",
            detail=f"Synthesized run outcomes. Status: {exec_status}. Approval Required: {approval_needed}. Summary: {final_summary}",
            severity="CRITICAL" if approval_needed else "INFO"
        ))

        # Record AgentRun
        run_record = AgentRun(
            run_id=state.get("run_id", f"RUN-{uuid.uuid4().hex[:8].upper()}"),
            trigger_event=state.get("trigger_event", "Manual / Simulation Trigger"),
            status=exec_status,
            agents_involved=["Monitor Agent", "Forecast Agent", "Distribution Agent", "Procurement Agent", "Waste Guard Agent", "Orchestrator Agent"],
            execution_log=[dict(t) for t in timeline],
            start_time=datetime.fromisoformat(state.get("created_at", now.isoformat())),
            end_time=now,
            summary=final_summary
        )
        self.db.add(run_record)

        # Audit Log
        self.db.add(AuditLog(
            event_type="AGENT_WORKFLOW_EXECUTION",
            actor="Orchestrator Agent",
            entity_type="AgentRun",
            entity_id=run_record.run_id,
            action="COMPLETED_AUTONOMOUS_CYCLE",
            details={"execution_status": exec_status, "approval_required": approval_needed, "summary": final_summary}
        ))

        self.db.commit()

        return {
            "approval_required": approval_needed,
            "execution_status": exec_status,
            "final_summary": final_summary,
            "timeline_logs": timeline,
            "agent_messages": messages
        }

    def execute(self, state: AgentState) -> AgentState:
        """
        Executes the compiled LangGraph workflow.
        """
        return self.workflow.invoke(state)
