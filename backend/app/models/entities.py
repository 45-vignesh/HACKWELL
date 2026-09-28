import enum
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, DateTime,
    ForeignKey, Text, Enum, JSON, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base

# Enums
class CriticalityLevel(str, enum.Enum):
    CRITICAL = "CRITICAL"  # ICU, Emergency resuscitation, Oxygen, Life-saving
    HIGH = "HIGH"          # Standard antibiotics, IV fluids, insulin
    MEDIUM = "MEDIUM"      # Pain management, routine injections
    LOW = "LOW"            # General supplements, elective care

class DepartmentType(str, enum.Enum):
    CENTRAL = "CENTRAL"
    EMERGENCY = "EMERGENCY"
    ICU = "ICU"
    INPATIENT = "INPATIENT"
    OUTPATIENT = "OUTPATIENT"

class BatchStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    NEAR_EXPIRY = "NEAR_EXPIRY"
    EXPIRED = "EXPIRED"
    DEPLETED = "DEPLETED"

class OrderStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PROPOSED = "PROPOSED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ORDERED = "ORDERED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

class PriorityLevel(str, enum.Enum):
    NORMAL = "NORMAL"
    URGENT = "URGENT"
    EMERGENCY = "EMERGENCY"

class TransferStatus(str, enum.Enum):
    PROPOSED = "PROPOSED"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    IN_TRANSIT = "IN_TRANSIT"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class AlertSeverity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    EMERGENCY = "EMERGENCY"

class AlertType(str, enum.Enum):
    SHORTAGE_PREDICTED = "SHORTAGE_PREDICTED"
    CRITICAL_LOW = "CRITICAL_LOW"
    EXPIRY_RISK = "EXPIRY_RISK"
    SURPLUS_DETECTED = "SURPLUS_DETECTED"
    ABNORMAL_CONSUMPTION = "ABNORMAL_CONSUMPTION"

class AlertStatus(str, enum.Enum):
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"

class ActionType(str, enum.Enum):
    PURCHASE_ORDER = "PURCHASE_ORDER"
    STOCK_TRANSFER = "STOCK_TRANSFER"
    DISPOSAL = "DISPOSAL"
    SAFETY_STOCK_OVERRIDE = "SAFETY_STOCK_OVERRIDE"

class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class TrustStatus(str, enum.Enum):
    VALIDATED = "VALIDATED"
    PENDING_REVIEW = "PENDING_REVIEW"
    WARNING = "WARNING"
    REJECTED = "REJECTED"

class UserRole(str, enum.Enum):
    DATA_MANAGER = "DATA_MANAGER"
    PHARMACIST = "PHARMACIST"
    ADMIN = "ADMIN"

# Models
class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False, index=True)
    generic_name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    unit = Column(String(50), default="units")  # bottles, vials, strips, ampoules
    criticality = Column(Enum(CriticalityLevel), default=CriticalityLevel.MEDIUM, nullable=False)
    shelf_life_days = Column(Integer, default=365)
    reorder_threshold = Column(Integer, default=50)
    safety_stock = Column(Integer, default=30)
    unit_cost = Column(Float, default=10.0)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    inventory_items = relationship("Inventory", back_populates="medicine", cascade="all, delete-orphan")
    batches = relationship("InventoryBatch", back_populates="medicine", cascade="all, delete-orphan")
    daily_usages = relationship("DailyUsage", back_populates="medicine", cascade="all, delete-orphan")
    supplier_offerings = relationship("SupplierMedicine", back_populates="medicine")
    alerts = relationship("Alert", back_populates="medicine")
    transfers = relationship("StockTransfer", back_populates="medicine")
    usage_history = relationship("MedicationUsageHistory", back_populates="medicine", cascade="all, delete-orphan")
    aliases = relationship("MedicineAlias", back_populates="medicine")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    type = Column(Enum(DepartmentType), default=DepartmentType.CLINICAL if hasattr(DepartmentType, 'CLINICAL') else DepartmentType.INPATIENT)
    floor = Column(String(20), default="1st Floor")
    active = Column(Boolean, default=True)

    wards = relationship("Ward", back_populates="department")
    inventory_items = relationship("Inventory", back_populates="department")

class Ward(Base):
    __tablename__ = "wards"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    bed_count = Column(Integer, default=20)
    active = Column(Boolean, default=True)

    department = relationship("Department", back_populates="wards")
    inventory_items = relationship("Inventory", back_populates="ward")
    batches = relationship("InventoryBatch", back_populates="ward")
    daily_usages = relationship("DailyUsage", back_populates="ward")

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=False, index=True)
    current_stock = Column(Integer, default=0, nullable=False)
    reserved_stock = Column(Integer, default=0)
    min_level = Column(Integer, default=20)
    max_level = Column(Integer, default=200)
    safety_stock = Column(Integer, default=30)
    reorder_point = Column(Integer, default=50)
    avg_daily_usage = Column(Float, default=10.0)
    days_of_stock = Column(Float, default=15.0)
    data_source = Column(String(50), default="SYNTHETIC")
    risk_scenario = Column(String(50), default="NORMAL")
    trust_status = Column(Enum(TrustStatus), default=TrustStatus.VALIDATED, nullable=False, index=True)
    validated_by = Column(String(100), default="SYSTEM_SEED")
    validated_at = Column(DateTime, default=datetime.utcnow)
    validation_notes = Column(Text, nullable=True)
    last_modified_by = Column(String(100), nullable=True)
    last_modified_at = Column(DateTime, nullable=True)
    last_restocked_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    medicine = relationship("Medicine", back_populates="inventory_items")
    department = relationship("Department", back_populates="inventory_items")
    ward = relationship("Ward", back_populates="inventory_items")

    __table_args__ = (
        UniqueConstraint("medicine_id", "ward_id", name="uq_inventory_med_ward"),
    )

class InventoryBatch(Base):
    __tablename__ = "inventory_batches"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False, index=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=False, index=True)
    batch_number = Column(String(100), nullable=False, index=True)
    initial_quantity = Column(Integer, nullable=False)
    current_quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float, default=10.0)
    manufacturing_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False, index=True)
    status = Column(Enum(BatchStatus), default=BatchStatus.ACTIVE, nullable=False)
    received_date = Column(Date, default=date.today)

    medicine = relationship("Medicine", back_populates="batches")
    ward = relationship("Ward", back_populates="batches")

    __table_args__ = (
        UniqueConstraint("medicine_id", "ward_id", "batch_number", name="uq_batch_med_ward_num"),
    )

class DailyUsage(Base):
    __tablename__ = "daily_usage"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False, index=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    quantity_used = Column(Float, nullable=False)
    admission_count = Column(Integer, default=0)
    emergency_surges = Column(Boolean, default=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    medicine = relationship("Medicine", back_populates="daily_usages")
    ward = relationship("Ward", back_populates="daily_usages")

    __table_args__ = (
        Index("idx_usage_med_ward_date", "medicine_id", "ward_id", "date"),
    )

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, unique=True)
    contact_email = Column(String(150), nullable=False)
    phone = Column(String(50))
    address = Column(String(255))
    reliability_score = Column(Float, default=0.95)  # 0.0 to 1.0 (95% on-time & quality)
    payment_terms = Column(String(100), default="Net 30")
    active = Column(Boolean, default=True)

    medicines = relationship("SupplierMedicine", back_populates="supplier")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")

class SupplierMedicine(Base):
    __tablename__ = "supplier_medicines"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    unit_price = Column(Float, nullable=False)
    lead_time_days = Column(Integer, default=2)
    available_quantity = Column(Integer, default=1000)
    min_order_qty = Column(Integer, default=10)

    supplier = relationship("Supplier", back_populates="medicines")
    medicine = relationship("Medicine", back_populates="supplier_offerings")

    __table_args__ = (
        UniqueConstraint("supplier_id", "medicine_id", name="uq_supplier_med"),
    )

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(50), unique=True, index=True, nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PROPOSED, nullable=False, index=True)
    priority = Column(Enum(PriorityLevel), default=PriorityLevel.NORMAL)
    created_by_agent = Column(String(100), default="Procurement Agent")
    approved_by = Column(String(100), nullable=True)
    order_date = Column(DateTime, default=datetime.utcnow)
    expected_delivery_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    medicine = relationship("Medicine")

class StockTransfer(Base):
    __tablename__ = "stock_transfers"

    id = Column(Integer, primary_key=True, index=True)
    transfer_number = Column(String(50), unique=True, index=True, nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    from_ward_id = Column(Integer, ForeignKey("wards.id"), nullable=False)
    to_ward_id = Column(Integer, ForeignKey("wards.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(Enum(TransferStatus), default=TransferStatus.PROPOSED, nullable=False, index=True)
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.LOW)
    approved_by = Column(String(100), nullable=True)
    initiated_by_agent = Column(String(100), default="Distribution Agent")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    medicine = relationship("Medicine", back_populates="transfers")
    from_ward = relationship("Ward", foreign_keys=[from_ward_id])
    to_ward = relationship("Ward", foreign_keys=[to_ward_id])

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(Enum(AlertType), nullable=False, index=True)
    severity = Column(Enum(AlertSeverity), nullable=False, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(Enum(AlertStatus), default=AlertStatus.OPEN, nullable=False, index=True)
    recommended_action = Column(Text, nullable=True)
    triggered_by_agent = Column(String(100), default="Monitor Agent")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    medicine = relationship("Medicine", back_populates="alerts")
    ward = relationship("Ward")

class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    action_type = Column(Enum(ActionType), nullable=False, index=True)
    reference_id = Column(Integer, nullable=False)  # ID of PurchaseOrder or StockTransfer
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=True)
    requested_by_agent = Column(String(100), nullable=False)
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.HIGH, nullable=False)
    justification = Column(Text, nullable=False)
    estimated_cost = Column(Float, default=0.0)
    requested_quantity = Column(Integer, default=0)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False, index=True)
    decision_by = Column(String(100), nullable=True)
    decision_reason = Column(Text, nullable=True)
    decided_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    medicine = relationship("Medicine")

class ForecastResult(Base):
    __tablename__ = "forecast_results"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False, index=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=False, index=True)
    forecast_date = Column(Date, default=date.today, index=True)
    horizon_days = Column(Integer, default=14)
    predicted_demand = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=False)
    upper_bound = Column(Float, nullable=False)
    expected_daily_demand = Column(Float, nullable=False)
    estimated_stockout_days = Column(Float, nullable=True)
    estimated_stockout_date = Column(Date, nullable=True)
    confidence_score = Column(Float, default=0.88)
    mape_score = Column(Float, default=12.4)
    forecast_points = Column(JSON, nullable=True)  # List of {date, yhat, yhat_lower, yhat_upper}
    created_at = Column(DateTime, default=datetime.utcnow)

    medicine = relationship("Medicine")
    ward = relationship("Ward")

class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(100), unique=True, index=True, nullable=False)
    trigger_event = Column(String(100), nullable=False)
    status = Column(String(50), default="RUNNING", index=True)  # RUNNING, COMPLETED, INTERRUPTED, FAILED
    agents_involved = Column(JSON, default=list)  # ["Monitor", "Forecast", "Orchestrator", ...]
    execution_log = Column(JSON, default=list)   # Step-by-step telemetry
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    summary = Column(Text, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    actor = Column(String(100), nullable=False)  # Agent name or Pharmacist user
    entity_type = Column(String(50), nullable=False)  # PurchaseOrder, Transfer, Inventory, etc.
    entity_id = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False)
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class MedicationUsageHistory(Base):
    __tablename__ = "medication_usage_history"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    quantity_used = Column(Float, nullable=False)
    source = Column(String(50), default="MIMIC", nullable=False, index=True)  # MIMIC, DERIVED, SYNTHETIC
    source_record_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    medicine = relationship("Medicine", back_populates="usage_history")

    __table_args__ = (
        Index("idx_usage_hist_med_date_src", "medicine_id", "date", "source", unique=True),
    )

class MedicineAlias(Base):
    __tablename__ = "medicine_aliases"

    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=True, index=True)
    source = Column(String(50), default="MIMIC", nullable=False, index=True)
    source_name = Column(String(200), nullable=False, index=True)
    normalized_name = Column(String(200), nullable=False, index=True)
    mapping_method = Column(String(50), default="EXACT")  # EXACT, SYNONYM, REGEX_FORMULATION, UNMAPPED
    confidence = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    medicine = relationship("Medicine", back_populates="aliases")

    __table_args__ = (
        Index("idx_alias_src_name", "source", "source_name", unique=True),
    )

class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    source_type = Column(String(50), nullable=False, index=True)  # HISTORICAL_REAL, SYNTHETIC, SIMULATION, DERIVED
    description = Column(Text, nullable=True)
    record_count = Column(Integer, default=0)
    last_imported = Column(DateTime, nullable=True)
    status = Column(String(50), default="ACTIVE")  # ACTIVE, IDLE, PENDING
    created_at = Column(DateTime, default=datetime.utcnow)

class DataQualityLog(Base):
    __tablename__ = "data_quality_logs"

    id = Column(Integer, primary_key=True, index=True)
    import_id = Column(String(100), unique=True, index=True, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    files_processed = Column(Integer, default=0)
    records_read = Column(Integer, default=0)
    records_imported = Column(Integer, default=0)
    records_skipped = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    mapping_success = Column(Integer, default=0)
    mapping_failure = Column(Integer, default=0)
    status = Column(String(50), default="COMPLETED")  # COMPLETED, FAILED, PARTIAL
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.DATA_MANAGER, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    title = Column(String(100), nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class DataAuditTrail(Base):
    __tablename__ = "data_audit_trail"

    id = Column(Integer, primary_key=True, index=True)
    user = Column(String(100), nullable=False, index=True)
    role = Column(String(50), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), default="Inventory", nullable=False)
    record_id = Column(Integer, nullable=True)
    medicine_name = Column(String(200), nullable=True)
    ward_name = Column(String(100), nullable=True)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    reason = Column(Text, nullable=False)
    validation_result = Column(String(50), default="VALIDATED", nullable=False, index=True)
    source = Column(String(50), default="MANUAL", nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

