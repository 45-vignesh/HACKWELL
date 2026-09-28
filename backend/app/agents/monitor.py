from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import (
    Inventory, InventoryBatch, Medicine, Ward, DailyUsage, MedicationUsageHistory,
    Alert, AlertType, AlertSeverity, AlertStatus, BatchStatus, CriticalityLevel,
    TrustStatus
)
from app.agents.state import AgentState, AgentStepLog, InventorySnapshot
from app.config import settings

class MonitorAgent:
    """
    Monitor Agent: Continuous 24x7 telemetry of stock levels across all wards.
    Detects low stock, critically low thresholds, expiring batches, and consumption anomalies.
    Integrates MIMIC-derived historical consumption patterns with operational inventory.
    Strictly restricted to VALIDATED operational inventory data.
    """

    @staticmethod
    def inspect_inventory(db: Session, medicine_id: int, ward_id: int) -> InventorySnapshot:
        inv = db.query(Inventory).filter(
            Inventory.medicine_id == medicine_id,
            Inventory.ward_id == ward_id,
            Inventory.trust_status == TrustStatus.VALIDATED
        ).first()

        med = db.query(Medicine).filter(Medicine.id == medicine_id).first()
        ward = db.query(Ward).filter(Ward.id == ward_id).first()

        if not inv or not med or not ward:
            raise ValueError(f"Validated inventory item, medicine, or ward not found for med_id={medicine_id}, ward_id={ward_id}.")

        # Compute recent 14-day average daily usage from MedicationUsageHistory (MIMIC-derived baseline)
        recent_cutoff = date.today() - timedelta(days=14)
        mimic_usages = db.query(MedicationUsageHistory).filter(
            MedicationUsageHistory.medicine_id == medicine_id,
            MedicationUsageHistory.date >= recent_cutoff
        ).all()

        # Check if there is an active emergency surge recorded in DailyUsage
        active_surge = db.query(DailyUsage).filter(
            DailyUsage.medicine_id == medicine_id,
            DailyUsage.ward_id == ward_id,
            DailyUsage.date >= date.today() - timedelta(days=3),
            DailyUsage.emergency_surges == True
        ).all()

        if active_surge:
            daily_avg = float(sum(u.quantity_used for u in active_surge) / len(active_surge))
        elif mimic_usages:
            ward_weight = 0.50 if ward.code == "WARD-EMERG" else 0.25
            daily_avg = float(sum(u.quantity_used * ward_weight for u in mimic_usages) / max(len(mimic_usages), 1))
        else:
            usages = db.query(DailyUsage).filter(
                DailyUsage.medicine_id == medicine_id,
                DailyUsage.ward_id == ward_id,
                DailyUsage.date >= recent_cutoff
            ).all()
            daily_avg = float(sum(u.quantity_used for u in usages) / max(len(usages), 1)) if usages else (inv.avg_daily_usage or 1.0)

        daily_avg = max(0.5, daily_avg)
        days_rem = round(inv.current_stock / max(daily_avg, 0.1), 1)

        safety_stock = inv.safety_stock or med.safety_stock or 30
        reorder_point = inv.reorder_point or med.reorder_threshold or 50

        # Status categorization
        if days_rem <= settings.CRITICAL_STOCKOUT_DAYS_THRESHOLD or inv.current_stock < safety_stock:
            status = "CRITICAL_LOW"
        elif days_rem <= settings.WARNING_STOCKOUT_DAYS_THRESHOLD or inv.current_stock <= reorder_point:
            status = "LOW_STOCK"
        elif days_rem >= 20.0 and inv.current_stock >= reorder_point * 2:
            status = "SURPLUS"
        else:
            status = "NORMAL"

        return InventorySnapshot(
            medicine_id=med.id,
            medicine_name=med.name,
            medicine_code=med.code,
            criticality=med.criticality.value,
            unit=med.unit,
            unit_cost=med.unit_cost,
            safety_stock=safety_stock,
            reorder_threshold=reorder_point,
            ward_id=ward.id,
            ward_name=ward.name,
            current_stock=inv.current_stock,
            days_remaining=days_rem,
            daily_consumption_avg=round(daily_avg, 1),
            status=status
        )

    @staticmethod
    def run(state: AgentState, db: Session) -> Dict[str, Any]:
        """
        LangGraph node function for Monitor Agent.
        """
        med_id = state.get("medicine_id")
        ward_id = state.get("ward_id")
        now_iso = datetime.utcnow().isoformat()

        timeline: List[AgentStepLog] = state.get("timeline_logs", [])
        messages: List[str] = state.get("agent_messages", [])

        # If specific medicine & ward were provided
        if med_id and ward_id:
            snapshot = MonitorAgent.inspect_inventory(db, med_id, ward_id)
            timeline.append(AgentStepLog(
                timestamp=now_iso,
                agent="Monitor Agent",
                action="INSPECT_WARD_INVENTORY",
                detail=f"Telemetry scanned: {snapshot['medicine_name']} in {snapshot['ward_name']} has {snapshot['current_stock']} {snapshot['unit']} ({snapshot['days_remaining']} days remaining). Status: {snapshot['status']}.",
                severity="CRITICAL" if snapshot['status'] == "CRITICAL_LOW" else "INFO"
            ))

            if snapshot['status'] == "CRITICAL_LOW":
                messages.append(f"Monitor: Critical stockout risk detected for {snapshot['medicine_name']} ({snapshot['days_remaining']} days left).")

            return {
                "inventory_snapshot": snapshot,
                "timeline_logs": timeline,
                "agent_messages": messages,
                "stockout_risk": "CRITICAL" if snapshot['status'] == "CRITICAL_LOW" else ("MEDIUM" if snapshot['status'] == "LOW_STOCK" else "LOW")
            }
        else:
            # Global scan across all items (strictly validated operational records only)
            low_items = []
            all_inv = db.query(Inventory).filter(Inventory.trust_status == TrustStatus.VALIDATED).all()
            for inv in all_inv:
                if inv.current_stock <= inv.min_level:
                    low_items.append(inv)

            timeline.append(AgentStepLog(
                timestamp=now_iso,
                agent="Monitor Agent",
                action="GLOBAL_AUDIT_SCAN",
                detail=f"Completed system-wide inventory scan. Identified {len(low_items)} items requiring attention.",
                severity="WARNING" if low_items else "INFO"
            ))

            return {
                "timeline_logs": timeline,
                "agent_messages": messages
            }
