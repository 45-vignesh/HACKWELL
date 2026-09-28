"""
Synthetic Hospital Data Generator for MediSentinel
Generates 180+ days of historical dispensing data, 15 medicines, 4+ wards/departments,
multiple batches, suppliers, and predefined scenarios (surplus in OPD, shortage in Emergency, near-expiry).
"""

import sys
import os
from pathlib import Path
from datetime import datetime, date, timedelta
import random

# Add backend directory to sys.path so app modules can be imported
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.database import SessionLocal, Base, engine
from app.models.entities import (
    CriticalityLevel, DepartmentType, BatchStatus, OrderStatus,
    PriorityLevel, TransferStatus, RiskLevel, AlertSeverity,
    AlertType, AlertStatus, ActionType, ApprovalStatus,
    Medicine, Department, Ward, Inventory, InventoryBatch,
    DailyUsage, Supplier, SupplierMedicine, PurchaseOrder,
    PurchaseOrderItem, StockTransfer, Alert, Approval,
    ForecastResult, AgentRun, AuditLog
)

def seed_database():
    print("Initializing MediSentinel database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        existing_meds = db.query(Medicine).count()
        if existing_meds > 0:
            print(f"Database already contains {existing_meds} medicines. Re-seeding clean dataset...")
            # Clean existing records
            db.query(AuditLog).delete()
            db.query(AgentRun).delete()
            db.query(ForecastResult).delete()
            db.query(Approval).delete()
            db.query(Alert).delete()
            db.query(StockTransfer).delete()
            db.query(PurchaseOrderItem).delete()
            db.query(PurchaseOrder).delete()
            db.query(SupplierMedicine).delete()
            db.query(Supplier).delete()
            db.query(DailyUsage).delete()
            db.query(InventoryBatch).delete()
            db.query(Inventory).delete()
            db.query(Ward).delete()
            db.query(Department).delete()
            db.query(Medicine).delete()
            db.commit()

        print("1. Creating Departments & Wards...")
        departments_data = [
            {"code": "DEP-CENTRAL", "name": "Central Pharmacy & Logistics", "type": DepartmentType.CENTRAL, "floor": "Ground Floor"},
            {"code": "DEP-EMERGENCY", "name": "Emergency & Trauma Center", "type": DepartmentType.EMERGENCY, "floor": "Ground Floor"},
            {"code": "DEP-ICU", "name": "Critical Care / ICU Division", "type": DepartmentType.ICU, "floor": "2nd Floor"},
            {"code": "DEP-INPATIENT", "name": "General Inpatient Wards", "type": DepartmentType.INPATIENT, "floor": "3rd Floor"},
            {"code": "DEP-OPD", "name": "Outpatient Department & Clinic", "type": DepartmentType.OUTPATIENT, "floor": "1st Floor"},
        ]

        departments = {}
        for d in departments_data:
            dept = Department(**d)
            db.add(dept)
            db.flush()
            departments[dept.code] = dept

        wards_data = [
            {"code": "WARD-CSTORE", "name": "Central Drug Warehouse", "department_id": departments["DEP-CENTRAL"].id, "bed_count": 0},
            {"code": "WARD-EMERG", "name": "Emergency Acute Care Ward", "department_id": departments["DEP-EMERGENCY"].id, "bed_count": 30},
            {"code": "WARD-MICU", "name": "Medical Intensive Care Unit (MICU)", "department_id": departments["DEP-ICU"].id, "bed_count": 20},
            {"code": "WARD-GENMED", "name": "General Medicine Ward-A", "department_id": departments["DEP-INPATIENT"].id, "bed_count": 50},
            {"code": "WARD-OPD", "name": "OPD Satellite Pharmacy", "department_id": departments["DEP-OPD"].id, "bed_count": 0},
        ]

        wards = {}
        for w in wards_data:
            ward = Ward(**w)
            db.add(ward)
            db.flush()
            wards[ward.code] = ward

        print("2. Creating Essential Medicines...")
        medicines_data = [
            {
                "code": "MED-IVF-NS", "name": "Normal Saline 0.9% (500ml)", "generic_name": "Sodium Chloride 0.9%",
                "category": "IV Fluids", "unit": "bottles", "criticality": CriticalityLevel.CRITICAL,
                "shelf_life_days": 730, "reorder_threshold": 90, "safety_stock": 50, "unit_cost": 45.0
            },
            {
                "code": "MED-IVF-RL", "name": "Ringer's Lactate (500ml)", "generic_name": "Compound Sodium Lactate",
                "category": "IV Fluids", "unit": "bottles", "criticality": CriticalityLevel.CRITICAL,
                "shelf_life_days": 730, "reorder_threshold": 80, "safety_stock": 45, "unit_cost": 52.0
            },
            {
                "code": "MED-IVF-D5", "name": "Dextrose 5% (500ml)", "generic_name": "Dextrose Monohydrate 5%",
                "category": "IV Fluids", "unit": "bottles", "criticality": CriticalityLevel.HIGH,
                "shelf_life_days": 730, "reorder_threshold": 60, "safety_stock": 30, "unit_cost": 48.0
            },
            {
                "code": "MED-ANT-CEF", "name": "Ceftriaxone 1g Injection", "generic_name": "Ceftriaxone Sodium",
                "category": "Antibiotics", "unit": "vials", "criticality": CriticalityLevel.HIGH,
                "shelf_life_days": 365, "reorder_threshold": 70, "safety_stock": 40, "unit_cost": 85.0
            },
            {
                "code": "MED-ANT-MER", "name": "Meropenem 1g Injection", "generic_name": "Meropenem Trihydrate",
                "category": "Antibiotics", "unit": "vials", "criticality": CriticalityLevel.CRITICAL,
                "shelf_life_days": 365, "reorder_threshold": 40, "safety_stock": 25, "unit_cost": 450.0
            },
            {
                "code": "MED-ANT-AMX", "name": "Amoxicillin-Clavulanate 1.2g", "generic_name": "Co-Amoxiclav",
                "category": "Antibiotics", "unit": "vials", "criticality": CriticalityLevel.HIGH,
                "shelf_life_days": 365, "reorder_threshold": 50, "safety_stock": 30, "unit_cost": 125.0
            },
            {
                "code": "MED-EMG-EPI", "name": "Epinephrine 1mg/ml (1:1000)", "generic_name": "Adrenaline Tartrate",
                "category": "Emergency & Resuscitation", "unit": "ampoules", "criticality": CriticalityLevel.CRITICAL,
                "shelf_life_days": 365, "reorder_threshold": 45, "safety_stock": 30, "unit_cost": 65.0
            },
            {
                "code": "MED-EMG-NOR", "name": "Norepinephrine 4mg/2ml", "generic_name": "Noradrenaline Bitartrate",
                "category": "Emergency & Resuscitation", "unit": "ampoules", "criticality": CriticalityLevel.CRITICAL,
                "shelf_life_days": 365, "reorder_threshold": 35, "safety_stock": 25, "unit_cost": 185.0
            },
            {
                "code": "MED-EMG-ATR", "name": "Atropine Sulfate 0.6mg/ml", "generic_name": "Atropine Sulfate",
                "category": "Emergency & Resuscitation", "unit": "ampoules", "criticality": CriticalityLevel.CRITICAL,
                "shelf_life_days": 540, "reorder_threshold": 30, "safety_stock": 20, "unit_cost": 32.0
            },
            {
                "code": "MED-EMG-HYD", "name": "Hydrocortisone Sodium 100mg", "generic_name": "Hydrocortisone",
                "category": "Emergency & Resuscitation", "unit": "vials", "criticality": CriticalityLevel.HIGH,
                "shelf_life_days": 540, "reorder_threshold": 40, "safety_stock": 25, "unit_cost": 58.0
            },
            {
                "code": "MED-AIN-PCM-IV", "name": "Paracetamol 1000mg/100ml IV", "generic_name": "Acetaminophen Infusion",
                "category": "Analgesics & Antipyretics", "unit": "bottles", "criticality": CriticalityLevel.HIGH,
                "shelf_life_days": 730, "reorder_threshold": 80, "safety_stock": 45, "unit_cost": 72.0
            },
            {
                "code": "MED-AIN-PCM-TAB", "name": "Paracetamol 650mg Tablets", "generic_name": "Acetaminophen 650mg",
                "category": "Analgesics & Antipyretics", "unit": "strips", "criticality": CriticalityLevel.MEDIUM,
                "shelf_life_days": 730, "reorder_threshold": 120, "safety_stock": 60, "unit_cost": 24.0
            },
            {
                "code": "MED-DIA-INS", "name": "Regular Human Insulin 100IU/ml", "generic_name": "Human Insulin rDNA",
                "category": "Endocrine & Diabetes", "unit": "vials", "criticality": CriticalityLevel.CRITICAL,
                "shelf_life_days": 365, "reorder_threshold": 40, "safety_stock": 25, "unit_cost": 235.0
            },
            {
                "code": "MED-GIT-PAN", "name": "Pantoprazole 40mg Injection", "generic_name": "Pantoprazole Sodium",
                "category": "Gastrointestinal", "unit": "vials", "criticality": CriticalityLevel.MEDIUM,
                "shelf_life_days": 540, "reorder_threshold": 60, "safety_stock": 35, "unit_cost": 44.0
            },
            {
                "code": "MED-GIT-OND", "name": "Ondansetron 4mg/2ml Injection", "generic_name": "Ondansetron HCl",
                "category": "Gastrointestinal", "unit": "ampoules", "criticality": CriticalityLevel.MEDIUM,
                "shelf_life_days": 540, "reorder_threshold": 50, "safety_stock": 25, "unit_cost": 29.0
            },
        ]

        medicines = {}
        for m in medicines_data:
            med = Medicine(**m)
            db.add(med)
            db.flush()
            medicines[med.code] = med

        print("3. Creating Qualified Pharmaceutical Suppliers...")
        suppliers_data = [
            {
                "name": "Apex Lifesciences Ltd.", "contact_email": "orders@apexlife.com",
                "phone": "+91 98450 11223", "address": "Plot 42, Biotech Hub, Bangalore",
                "reliability_score": 0.98, "payment_terms": "Net 30"
            },
            {
                "name": "Bharat Healthcare Distributors", "contact_email": "supply@bharathealth.in",
                "phone": "+91 98110 44556", "address": "Sector 18, Pharma City, Hyderabad",
                "reliability_score": 0.94, "payment_terms": "Net 45"
            },
            {
                "name": "MediSource Pharma Supplies", "contact_email": "dispatch@medisource.co.in",
                "phone": "+91 97220 88990", "address": "GIDC Estate, Vadodara",
                "reliability_score": 0.89, "payment_terms": "Net 15"
            },
            {
                "name": "Vanguard Emergency Logistics", "contact_email": "priority@vanguardpharma.com",
                "phone": "+91 99000 77112", "address": "Express Logistics Zone, Mumbai Airport",
                "reliability_score": 0.99, "payment_terms": "Immediate / Net 7"
            },
        ]

        suppliers = []
        for s in suppliers_data:
            supplier = Supplier(**s)
            db.add(supplier)
            db.flush()
            suppliers.append(supplier)

        # Supplier offerings for all medicines with varying lead times and pricing
        for med in medicines.values():
            for idx, sup in enumerate(suppliers):
                if idx == 0:  # Apex: reliable, standard lead time 2 days
                    lead_time = 2
                    price_mult = 1.00
                elif idx == 1:  # Bharat: cost-effective, lead time 3 days
                    lead_time = 3
                    price_mult = 0.93
                elif idx == 2:  # MediSource: lowest price, lead time 4 days
                    lead_time = 4
                    price_mult = 0.88
                else:  # Vanguard: express 1 day, premium price
                    lead_time = 1
                    price_mult = 1.18

                offering = SupplierMedicine(
                    supplier_id=sup.id,
                    medicine_id=med.id,
                    unit_price=round(med.unit_cost * price_mult, 2),
                    lead_time_days=lead_time,
                    available_quantity=random.randint(500, 3000),
                    min_order_qty=random.choice([10, 20, 50])
                )
                db.add(offering)

        db.flush()

        print("4. Generating 180 Days of Historical Usage Data...")
        today = date.today()
        start_date = today - timedelta(days=180)

        # Daily usage baseline for each medicine by ward
        # Emergency has high usage of IV fluids, Epinephrine, Norepinephrine, PCM
        # Central Store doesn't use, it only distributes. MICU has high antibiotics & insulin.
        for med_code, med in medicines.items():
            base_rate = {
                "MED-IVF-NS": {"WARD-EMERG": 28.0, "WARD-MICU": 14.0, "WARD-GENMED": 18.0, "WARD-OPD": 6.0},
                "MED-IVF-RL": {"WARD-EMERG": 24.0, "WARD-MICU": 12.0, "WARD-GENMED": 15.0, "WARD-OPD": 5.0},
                "MED-IVF-D5": {"WARD-EMERG": 12.0, "WARD-MICU": 10.0, "WARD-GENMED": 14.0, "WARD-OPD": 4.0},
                "MED-ANT-CEF": {"WARD-EMERG": 10.0, "WARD-MICU": 16.0, "WARD-GENMED": 22.0, "WARD-OPD": 4.0},
                "MED-ANT-MER": {"WARD-EMERG": 4.0, "WARD-MICU": 12.0, "WARD-GENMED": 5.0, "WARD-OPD": 0.5},
                "MED-ANT-AMX": {"WARD-EMERG": 6.0, "WARD-MICU": 8.0, "WARD-GENMED": 16.0, "WARD-OPD": 8.0},
                "MED-EMG-EPI": {"WARD-EMERG": 8.0, "WARD-MICU": 6.0, "WARD-GENMED": 1.5, "WARD-OPD": 0.2},
                "MED-EMG-NOR": {"WARD-EMERG": 6.0, "WARD-MICU": 9.0, "WARD-GENMED": 1.0, "WARD-OPD": 0.1},
                "MED-EMG-ATR": {"WARD-EMERG": 5.0, "WARD-MICU": 4.0, "WARD-GENMED": 1.0, "WARD-OPD": 0.1},
                "MED-EMG-HYD": {"WARD-EMERG": 7.0, "WARD-MICU": 8.0, "WARD-GENMED": 6.0, "WARD-OPD": 2.0},
                "MED-AIN-PCM-IV": {"WARD-EMERG": 22.0, "WARD-MICU": 14.0, "WARD-GENMED": 20.0, "WARD-OPD": 5.0},
                "MED-AIN-PCM-TAB": {"WARD-EMERG": 15.0, "WARD-MICU": 10.0, "WARD-GENMED": 45.0, "WARD-OPD": 60.0},
                "MED-DIA-INS": {"WARD-EMERG": 4.0, "WARD-MICU": 12.0, "WARD-GENMED": 14.0, "WARD-OPD": 8.0},
                "MED-GIT-PAN": {"WARD-EMERG": 12.0, "WARD-MICU": 14.0, "WARD-GENMED": 26.0, "WARD-OPD": 10.0},
                "MED-GIT-OND": {"WARD-EMERG": 14.0, "WARD-MICU": 10.0, "WARD-GENMED": 18.0, "WARD-OPD": 12.0},
            }.get(med_code, {})

            for day_offset in range(180):
                curr_day = start_date + timedelta(days=day_offset)
                is_weekend = curr_day.weekday() >= 5
                
                # Seasonal sinusoidal wave
                seasonal_factor = 1.0 + 0.15 * random.random()

                for ward_code, base in base_rate.items():
                    ward = wards[ward_code]
                    noise = random.uniform(-0.15, 0.15)
                    weekend_mult = 0.85 if is_weekend and ward_code != "WARD-EMERG" else 1.05 if is_weekend and ward_code == "WARD-EMERG" else 1.0
                    
                    qty = max(1.0, round(base * seasonal_factor * weekend_mult * (1.0 + noise), 1))
                    
                    usage_record = DailyUsage(
                        medicine_id=med.id,
                        ward_id=ward.id,
                        date=curr_day,
                        quantity_used=qty,
                        admission_count=int(ward.bed_count * random.uniform(0.7, 0.95)),
                        emergency_surges=False
                    )
                    db.add(usage_record)

        db.flush()

        print("5. Initializing Ward Inventories & Batches (With Hackathon Scenarios)...")
        # Setup specific realistic conditions:
        # 1) Emergency Ward has low IV fluid stock (45 bottles left, daily use ~28 -> ~1.6 days of stock -> CRITICAL)
        # 2) OPD Ward has huge surplus of IV fluids (160 bottles left, daily use ~6 -> ~26 days of stock -> SURPLUS)
        # 3) General Ward has Ceftriaxone batch expiring in 25 days -> Waste Guard alert
        # 4) Pantoprazole batch in Central Store expiring in 45 days -> Waste Guard FEFO

        batch_id_counter = 1001

        for med_code, med in medicines.items():
            for ward_code, ward in wards.items():
                # Tailor stock to scenario
                if med_code in ["MED-IVF-NS", "MED-IVF-RL"] and ward_code == "WARD-EMERG":
                    stock = 45  # Critically low! Stockout in ~1.6 days!
                    min_lvl = 60
                    max_lvl = 250
                elif med_code in ["MED-IVF-NS", "MED-IVF-RL"] and ward_code == "WARD-OPD":
                    stock = 175  # Surplus available for transfer!
                    min_lvl = 30
                    max_lvl = 100
                elif ward_code == "WARD-CSTORE":
                    stock = random.randint(200, 500)
                    min_lvl = 150
                    max_lvl = 800
                else:
                    stock = random.randint(60, 140)
                    min_lvl = med.reorder_threshold
                    max_lvl = min_lvl * 3

                inv = Inventory(
                    medicine_id=med.id,
                    department_id=ward.department_id,
                    ward_id=ward.id,
                    current_stock=stock,
                    reserved_stock=0,
                    min_level=min_lvl,
                    max_level=max_lvl,
                    last_restocked_at=datetime.utcnow() - timedelta(days=random.randint(1, 10))
                )
                db.add(inv)
                db.flush()

                # Generate batches for this inventory
                # If Ceftriaxone in GENMED, create a near-expiry batch
                if med_code == "MED-ANT-CEF" and ward_code == "WARD-GENMED":
                    b1 = InventoryBatch(
                        medicine_id=med.id,
                        ward_id=ward.id,
                        batch_number=f"BAT-CEF-EXP-{batch_id_counter}",
                        initial_quantity=45,
                        current_quantity=35,
                        unit_cost=med.unit_cost,
                        manufacturing_date=today - timedelta(days=330),
                        expiry_date=today + timedelta(days=25),  # 25 days to expiry!
                        status=BatchStatus.NEAR_EXPIRY,
                        received_date=today - timedelta(days=60)
                    )
                    b2 = InventoryBatch(
                        medicine_id=med.id,
                        ward_id=ward.id,
                        batch_number=f"BAT-CEF-REG-{batch_id_counter+1}",
                        initial_quantity=80,
                        current_quantity=stock - 35,
                        unit_cost=med.unit_cost,
                        manufacturing_date=today - timedelta(days=90),
                        expiry_date=today + timedelta(days=275),
                        status=BatchStatus.ACTIVE,
                        received_date=today - timedelta(days=10)
                    )
                    db.add_all([b1, b2])
                    batch_id_counter += 2
                elif med_code == "MED-GIT-PAN" and ward_code == "WARD-CSTORE":
                    b1 = InventoryBatch(
                        medicine_id=med.id,
                        ward_id=ward.id,
                        batch_number=f"BAT-PAN-EXP-{batch_id_counter}",
                        initial_quantity=100,
                        current_quantity=80,
                        unit_cost=med.unit_cost,
                        manufacturing_date=today - timedelta(days=480),
                        expiry_date=today + timedelta(days=42),  # 42 days to expiry!
                        status=BatchStatus.NEAR_EXPIRY,
                        received_date=today - timedelta(days=90)
                    )
                    b2 = InventoryBatch(
                        medicine_id=med.id,
                        ward_id=ward.id,
                        batch_number=f"BAT-PAN-REG-{batch_id_counter+1}",
                        initial_quantity=250,
                        current_quantity=stock - 80,
                        unit_cost=med.unit_cost,
                        manufacturing_date=today - timedelta(days=60),
                        expiry_date=today + timedelta(days=480),
                        status=BatchStatus.ACTIVE,
                        received_date=today - timedelta(days=15)
                    )
                    db.add_all([b1, b2])
                    batch_id_counter += 2
                else:
                    # Regular active batches
                    b1 = InventoryBatch(
                        medicine_id=med.id,
                        ward_id=ward.id,
                        batch_number=f"BAT-{med.code[:7]}-{batch_id_counter}",
                        initial_quantity=stock,
                        current_quantity=stock,
                        unit_cost=med.unit_cost,
                        manufacturing_date=today - timedelta(days=random.randint(60, 180)),
                        expiry_date=today + timedelta(days=random.randint(240, 600)),
                        status=BatchStatus.ACTIVE,
                        received_date=today - timedelta(days=random.randint(5, 30))
                    )
                    db.add(b1)
                    batch_id_counter += 1

        db.flush()

        print("6. Creating Baseline Realistic Alerts & Initial Agent Telemetry...")
        # Emergency IV fluid alert
        iv_ns = medicines["MED-IVF-NS"]
        em_ward = wards["WARD-EMERG"]
        alert1 = Alert(
            alert_type=AlertType.CRITICAL_LOW,
            severity=AlertSeverity.CRITICAL,
            medicine_id=iv_ns.id,
            ward_id=em_ward.id,
            title="CRITICAL: Normal Saline (0.9%) Stock Depletion Imminent",
            message=f"Current Emergency ward stock is 45 bottles. Daily consumption is 28 bottles/day. Predicted exhaustion within 1.6 days.",
            status=AlertStatus.OPEN,
            recommended_action="Trigger Distribution Agent to inspect OPD surplus and initiate external emergency procurement.",
            triggered_by_agent="Monitor Agent",
            created_at=datetime.utcnow() - timedelta(minutes=15)
        )

        # Ceftriaxone expiry alert
        cef_med = medicines["MED-ANT-CEF"]
        gen_ward = wards["WARD-GENMED"]
        alert2 = Alert(
            alert_type=AlertType.EXPIRY_RISK,
            severity=AlertSeverity.WARNING,
            medicine_id=cef_med.id,
            ward_id=gen_ward.id,
            title="EXPIRY RISK: Ceftriaxone Batch (35 vials) Expiring in 25 Days",
            message=f"Batch BAT-CEF-EXP-1001 contains 35 vials expiring on {(today + timedelta(days=25)).strftime('%Y-%m-%d')}. Value at risk: ₹2,975.",
            status=AlertStatus.OPEN,
            recommended_action="Waste Guard recommends priority FEFO dispensing or cross-ward redistribution to MICU where daily demand is high.",
            triggered_by_agent="Waste Guard Agent",
            created_at=datetime.utcnow() - timedelta(minutes=45)
        )

        # OPD Surplus alert
        opd_ward = wards["WARD-OPD"]
        alert3 = Alert(
            alert_type=AlertType.SURPLUS_DETECTED,
            severity=AlertSeverity.INFO,
            medicine_id=iv_ns.id,
            ward_id=opd_ward.id,
            title="SURPLUS: Normal Saline (0.9%) Excess in OPD Pharmacy",
            message="OPD holds 175 bottles against 30 min-level (26 days of reserve). 70 units available for cross-ward rebalancing.",
            status=AlertStatus.OPEN,
            recommended_action="Rebalance 50-70 units to Emergency Ward to buffer against stockout.",
            triggered_by_agent="Distribution Agent",
            created_at=datetime.utcnow() - timedelta(minutes=12)
        )

        db.add_all([alert1, alert2, alert3])

        # Record Initial Agent Runs
        agent_run = AgentRun(
            run_id="RUN-SYS-INIT-001",
            trigger_event="Scheduled 24x7 Hospital Inventory Audit",
            status="COMPLETED",
            agents_involved=["Monitor Agent", "Forecast Agent", "Waste Guard Agent", "Orchestrator Agent"],
            execution_log=[
                {"timestamp": (datetime.utcnow() - timedelta(minutes=16)).isoformat(), "agent": "Orchestrator", "action": "Triggered periodic inventory telemetry scan across 5 wards."},
                {"timestamp": (datetime.utcnow() - timedelta(minutes=15)).isoformat(), "agent": "Monitor Agent", "action": "Detected critical low stock for Normal Saline in Emergency Ward (1.6 days of supply)."},
                {"timestamp": (datetime.utcnow() - timedelta(minutes=14)).isoformat(), "agent": "Forecast Agent", "action": "Computed 14-day demand forecast. Estimated complete stockout on day +2."},
                {"timestamp": (datetime.utcnow() - timedelta(minutes=13)).isoformat(), "agent": "Waste Guard", "action": "Flagged Ceftriaxone batch BAT-CEF-EXP-1001 with 25 days to expiry in General Ward."},
                {"timestamp": (datetime.utcnow() - timedelta(minutes=12)).isoformat(), "agent": "Distribution Agent", "action": "Found 175 units in OPD Pharmacy with 70 safe transferable units."},
                {"timestamp": (datetime.utcnow() - timedelta(minutes=10)).isoformat(), "agent": "Orchestrator", "action": "Synthesized risk state: Recommended emergency transfer + procurement proposal pending pharmacist approval."},
            ],
            start_time=datetime.utcnow() - timedelta(minutes=16),
            end_time=datetime.utcnow() - timedelta(minutes=10),
            summary="Autonomous scan completed: 1 Critical shortage flagged (IV Normal Saline), 1 Expiry hazard flagged (Ceftriaxone), 1 Surplus rebalance opportunity identified."
        )
        db.add(agent_run)

        # Add Audit log entries
        db.add(AuditLog(
            event_type="SYSTEM_BOOTSTRAP",
            actor="System Seeder",
            entity_type="Database",
            entity_id="ALL",
            action="SEEDED_SYNTHETIC_HOSPITAL_DATA",
            details={"medicines": len(medicines_data), "departments": len(departments_data), "wards": len(wards_data), "history_days": 180}
        ))

        db.commit()
        print("\nSUCCESS: MediSentinel synthetic hospital dataset generated successfully!")
        print(f"- Medicines: {len(medicines_data)}")
        print(f"- Wards/Departments: {len(wards_data)}")
        print(f"- Historical Usage Records: 180 days across all medicines & wards")
        print(f"- Suppliers: {len(suppliers_data)} with differentiated lead times & prices")
        print(f"- Live Hackathon Scenarios: Emergency IV Shortage, OPD Surplus, Ceftriaxone Near-Expiry")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
