from typing import TypedDict, List, Dict, Any, Optional
from datetime import datetime

class InventorySnapshot(TypedDict):
    medicine_id: int
    medicine_name: str
    medicine_code: str
    criticality: str
    unit: str
    unit_cost: float
    safety_stock: int
    reorder_threshold: int
    ward_id: int
    ward_name: str
    current_stock: int
    days_remaining: float
    daily_consumption_avg: float
    status: str

class TransferProposal(TypedDict):
    medicine_id: int
    medicine_name: str
    source_ward_id: int
    source_ward_name: str
    destination_ward_id: int
    destination_ward_name: str
    quantity: int
    reason: str
    risk_level: str
    approval_required: bool

class ProcurementProposal(TypedDict):
    medicine_id: int
    medicine_name: str
    target_ward_id: int
    target_ward_name: str
    supplier_id: int
    supplier_name: str
    supplier_lead_time: int
    supplier_reliability: float
    unit_price: float
    quantity: int
    total_cost: float
    reason: str
    risk_level: str
    approval_required: bool

class ExpiryRiskDetail(TypedDict):
    batch_number: str
    medicine_id: int
    medicine_name: str
    ward_id: int
    ward_name: str
    quantity: int
    unit_cost: float
    value_at_risk: float
    expiry_date: str
    days_to_expiry: int
    fefo_recommendation: str

class AgentStepLog(TypedDict):
    timestamp: str
    agent: str
    action: str
    detail: str
    severity: str

class AgentState(TypedDict):
    # Context & Triggers
    run_id: str
    user_request: Optional[str]
    trigger_event: str
    created_at: str

    # Focus Entities
    medicine_id: Optional[int]
    ward_id: Optional[int]

    # Telemetry & Observations
    inventory_snapshot: Optional[InventorySnapshot]
    surplus_candidates: List[Dict[str, Any]]
    expiring_batches: List[ExpiryRiskDetail]

    # Analytics & Predictions
    demand_forecast: Optional[Dict[str, Any]]
    stockout_risk: Optional[str]  # LOW, MEDIUM, HIGH, CRITICAL
    estimated_stockout_days: Optional[float]
    expiry_risk: Optional[str]

    # Specialist Agent Decision Proposals
    recommended_transfer: Optional[TransferProposal]
    recommended_procurement: Optional[ProcurementProposal]
    recommended_fefo_action: Optional[Dict[str, Any]]

    # Governance & Execution Gating
    approval_required: bool
    approval_status: str  # NONE, PENDING, APPROVED, REJECTED
    approval_id: Optional[int]
    action_type: Optional[str]
    execution_status: str  # IDLE, PENDING_APPROVAL, EXECUTED, REJECTED, COMPLETED

    # Telemetry Log & Narrative
    agent_messages: List[str]
    timeline_logs: List[AgentStepLog]
    final_summary: Optional[str]
