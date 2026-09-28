"""
Repeatable CLI Ingestion Script for MediSentinel Medicine Inventory Dataset.
Reads synthetic operational inventory CSV, validates columns, maps medicines,
wards, batches, and suppliers, and updates PostgreSQL idempotently.

Usage:
    python scripts/import_inventory.py [--csv-path PATH]
"""

import sys
import os
import argparse
import logging
from pathlib import Path
from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional, Tuple, List
import pandas as pd
from sqlalchemy import text

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.database import SessionLocal, Base, engine
from app.models.entities import (
    Medicine, Department, Ward, Inventory, InventoryBatch,
    Supplier, SupplierMedicine, DailyUsage, MedicineAlias,
    DataSource, DataQualityLog, CriticalityLevel, BatchStatus, DepartmentType
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("inventory_importer")

REPO_DIR = Path(__file__).resolve().parent.parent
DEFAULT_CSV_PATHS = [
    REPO_DIR / "datasets" / "medisentinel_medicine_inventory_dataset.csv",
    Path(r"C:\Users\DELL\Downloads\medisentinel_medicine_inventory_dataset.csv"),
    Path(r"D:\hackwell\datasets\medisentinel_medicine_inventory_dataset.csv"),
]

REQUIRED_COLUMNS = [
    "inventory_id", "medicine_code", "medicine_name", "category",
    "dosage_form", "strength", "unit", "ward_code", "ward_name",
    "batch_number", "received_date", "expiry_date", "current_stock",
    "safety_stock", "avg_daily_usage", "days_of_stock", "reorder_point",
    "lead_time_days", "supplier", "unit_price_inr", "criticality",
    "storage_condition", "risk_scenario", "data_source"
]

# Mapping rules for existing 9 medicines
EXISTING_MEDICINE_MAP = {
    "MED-NS-500": "MED-IVF-NS",
    "MED-RL-500": "MED-IVF-RL",
    "MED-D5-500": "MED-IVF-D5",
    "MED-CEF-1G": "MED-ANT-CEF",
    "MED-AMOX-500": "MED-ANT-AMX",
    "MED-PARA-500": "MED-AIN-PCM-TAB",
    "MED-INSR-100": "MED-DIA-INS",
    "MED-PANTO-40": "MED-GIT-PAN",
    "MED-OND-4": "MED-GIT-OND",
}

# New medicines to add if missing
NEW_MEDICINES_DEF = {
    "MED-AZI-500": {
        "name": "Azithromycin 500mg Tablet",
        "generic_name": "Azithromycin",
        "category": "Antibiotics",
        "criticality": CriticalityLevel.MEDIUM,
        "unit": "tablets",
        "unit_cost": 9.0,
        "safety_stock": 25,
        "reorder_threshold": 40
    },
    "MED-METF-500": {
        "name": "Metformin 500mg Tablet",
        "generic_name": "Metformin Hydrochloride",
        "category": "Endocrine & Diabetes",
        "criticality": CriticalityLevel.LOW,
        "unit": "tablets",
        "unit_cost": 2.2,
        "safety_stock": 50,
        "reorder_threshold": 80
    },
    "MED-FUR-40": {
        "name": "Furosemide 10mg/ml Injection",
        "generic_name": "Furosemide",
        "category": "Cardiovascular",
        "criticality": CriticalityLevel.HIGH,
        "unit": "ampoules",
        "unit_cost": 5.5,
        "safety_stock": 30,
        "reorder_threshold": 50
    },
    "MED-ATOR-20": {
        "name": "Atorvastatin 20mg Tablet",
        "generic_name": "Atorvastatin Calcium",
        "category": "Cardiovascular",
        "criticality": CriticalityLevel.LOW,
        "unit": "tablets",
        "unit_cost": 4.2,
        "safety_stock": 40,
        "reorder_threshold": 60
    },
    "MED-HEP-5000": {
        "name": "Heparin 5000IU/ml Injection",
        "generic_name": "Heparin Sodium",
        "category": "Emergency & Resuscitation",
        "criticality": CriticalityLevel.CRITICAL,
        "unit": "vials",
        "unit_cost": 38.0,
        "safety_stock": 25,
        "reorder_threshold": 40
    },
    "MED-ENOX-40": {
        "name": "Enoxaparin 40mg/0.4ml Injection",
        "generic_name": "Enoxaparin Sodium",
        "category": "Emergency & Resuscitation",
        "criticality": CriticalityLevel.CRITICAL,
        "unit": "syringes",
        "unit_cost": 72.0,
        "safety_stock": 30,
        "reorder_threshold": 50
    },
}

WARD_CODE_MAP = {
    "EMR": "WARD-EMERG",
    "ICU": "WARD-MICU",
    "OPD": "WARD-OPD",
    "GEN": "WARD-GENMED",
    "PED": "WARD-PED",
}

SUPPLIER_CONTACTS = {
    "MEDICARE PHARMA": {"email": "orders@medicarepharma.in", "phone": "+91 98201 11223", "reliability": 0.94},
    "LIFECARE SUPPLIES": {"email": "dispatch@lifecaresupplies.in", "phone": "+91 98402 33445", "reliability": 0.91},
    "HEALWELL DISTRIBUTORS": {"email": "support@healwelldist.in", "phone": "+91 98110 55667", "reliability": 0.96},
    "VITALMED LOGISTICS": {"email": "emergency@vitalmedlogistics.in", "phone": "+91 98765 43210", "reliability": 0.95},
}

def ensure_schema_columns(db=None):
    """Safely adds missing columns to the inventory table if not yet migrated."""
    try:
        with engine.connect() as conn:
            dialect = engine.dialect.name
            if dialect == "sqlite":
                res = conn.execute(text("PRAGMA table_info(inventory)")).fetchall()
                existing_cols = {r[1].lower() for r in res}
            else:
                res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'inventory'")).fetchall()
                existing_cols = {r[0].lower() for r in res}
            
            cols_to_add = [
                ("safety_stock", "INTEGER DEFAULT 30"),
                ("reorder_point", "INTEGER DEFAULT 50"),
                ("avg_daily_usage", "FLOAT DEFAULT 10.0"),
                ("days_of_stock", "FLOAT DEFAULT 15.0"),
                ("data_source", "VARCHAR(50) DEFAULT 'SYNTHETIC'"),
                ("risk_scenario", "VARCHAR(50) DEFAULT 'NORMAL'")
            ]
            for col_name, col_type in cols_to_add:
                if col_name not in existing_cols:
                    logger.info(f"Adding column {col_name} to inventory table...")
                    conn.execute(text(f"ALTER TABLE inventory ADD COLUMN {col_name} {col_type};"))
            conn.commit()
    except Exception as e:
        logger.warning(f"Note on schema column check: {e}")

def sync_postgres_sequences():
    """Synchronize primary key sequences for PostgreSQL tables to avoid duplicate key errors."""
    if engine.dialect.name != "postgresql":
        return
    with engine.connect() as conn:
        for tbl in Base.metadata.tables.keys():
            try:
                conn.execute(text(f"SELECT setval(pg_get_serial_sequence('{tbl}', 'id'), COALESCE((SELECT MAX(id) FROM {tbl}), 1));"))
            except Exception as e:
                logger.debug(f"Sequence sync note for {tbl}: {e}")
        conn.commit()

def resolve_csv_path(user_path: Optional[str] = None) -> Path:
    candidates = []
    if user_path:
        candidates.append(Path(user_path))
    candidates.extend(DEFAULT_CSV_PATHS)

    for p in candidates:
        if p.exists() and p.is_file():
            return p.resolve()

    raise FileNotFoundError(
        f"Inventory dataset CSV not found. Checked: {[str(c) for c in candidates]}"
    )

def run_import(csv_path: Optional[str] = None):
    start_time = datetime.utcnow()
    logger.info("=== Starting MediSentinel Medicine Inventory Import ===")

    # 1. Resolve CSV path
    resolved_path = resolve_csv_path(csv_path)
    logger.info(f"Loading inventory CSV from: {resolved_path}")

    # 2. Initialize Database & Schema
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns()
    sync_postgres_sequences()
    db = SessionLocal()

    try:
        # 3. Read and validate CSV
        df = pd.read_csv(resolved_path)
        rows_read = len(df)
        logger.info(f"Read {rows_read} rows from CSV.")

        missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
        if missing_cols:
            raise ValueError(f"CSV is missing required columns: {missing_cols}")

        # 4. Ensure Departments & Wards
        inpatient_dept = db.query(Department).filter(Department.code == "DEP-INPATIENT").first()
        if not inpatient_dept:
            inpatient_dept = Department(
                code="DEP-INPATIENT",
                name="General Inpatient Wards",
                type=DepartmentType.INPATIENT,
                floor="3rd Floor"
            )
            db.add(inpatient_dept)
            db.commit()

        # Ensure WARD-PED exists
        ped_ward = db.query(Ward).filter(Ward.code == "WARD-PED").first()
        if not ped_ward:
            ped_ward = Ward(
                code="WARD-PED",
                name="Pediatrics Ward",
                department_id=inpatient_dept.id,
                bed_count=24,
                active=True
            )
            db.add(ped_ward)
            db.commit()
            logger.info("Created WARD-PED (Pediatrics Ward).")

        # Pre-cache wards
        wards_by_code = {w.code: w for w in db.query(Ward).all()}

        # 5. Ensure Medicines (Map existing + Create new if needed)
        medicines_by_code = {m.code: m for m in db.query(Medicine).all()}
        
        # Add new medicines
        for code, mdef in NEW_MEDICINES_DEF.items():
            if code not in medicines_by_code:
                new_med = Medicine(
                    code=code,
                    name=mdef["name"],
                    generic_name=mdef["generic_name"],
                    category=mdef["category"],
                    unit=mdef["unit"],
                    criticality=mdef["criticality"],
                    unit_cost=mdef["unit_cost"],
                    safety_stock=mdef["safety_stock"],
                    reorder_threshold=mdef["reorder_threshold"],
                    active=True
                )
                db.add(new_med)
                db.commit()
                medicines_by_code[code] = new_med
                logger.info(f"Created new medicine formulary entry: {code} ({mdef['name']})")

        # 6. Ensure Suppliers
        suppliers_by_name = {s.name: s for s in db.query(Supplier).all()}
        for sname, sinfo in SUPPLIER_CONTACTS.items():
            if sname not in suppliers_by_name:
                new_sup = Supplier(
                    name=sname,
                    contact_email=sinfo["email"],
                    phone=sinfo["phone"],
                    reliability_score=sinfo["reliability"],
                    payment_terms="Net 30",
                    active=True
                )
                db.add(new_sup)
                db.commit()
                suppliers_by_name[sname] = new_sup
                logger.info(f"Created supplier record: {sname}")

        # 7. Ingest Inventory, Batches, Supplier Offerings, and DailyUsage
        rows_imported = 0
        rows_updated = 0
        rows_skipped = 0
        invalid_records = 0
        low_stock_count = 0
        expiry_risk_count = 0
        medicines_mapped = set()
        wards_mapped = set()
        suppliers_mapped = set()

        # Pre-cache existing keys to avoid session flush collisions
        existing_aliases = set(
            r[0] for r in db.query(MedicineAlias.source_name).filter(MedicineAlias.source == "SYNTHETIC_CSV").all()
        )
        existing_supplier_meds = {
            (sm.supplier_id, sm.medicine_id): sm for sm in db.query(SupplierMedicine).all()
        }
        existing_daily_usage = set(
            (du.medicine_id, du.ward_id, du.date) for du in db.query(DailyUsage.medicine_id, DailyUsage.ward_id, DailyUsage.date).all()
        )

        for idx, row in df.iterrows():
            csv_med_code = str(row["medicine_code"]).strip()
            csv_ward_code = str(row["ward_code"]).strip()
            csv_supplier = str(row["supplier"]).strip()

            # Map to target medicine
            target_med_code = EXISTING_MEDICINE_MAP.get(csv_med_code, csv_med_code)
            med = medicines_by_code.get(target_med_code)
            if not med:
                logger.warning(f"Row {idx}: Medicine code {csv_med_code} could not be resolved.")
                invalid_records += 1
                rows_skipped += 1
                continue

            # Map to target ward
            target_ward_code = WARD_CODE_MAP.get(csv_ward_code)
            ward = wards_by_code.get(target_ward_code)
            if not ward:
                logger.warning(f"Row {idx}: Ward code {csv_ward_code} could not be resolved.")
                invalid_records += 1
                rows_skipped += 1
                continue

            # Supplier
            sup = suppliers_by_name.get(csv_supplier)
            if sup:
                suppliers_mapped.add(sup.name)
                # Link SupplierMedicine offering
                sm_key = (sup.id, med.id)
                if sm_key not in existing_supplier_meds:
                    sm = SupplierMedicine(
                        supplier_id=sup.id,
                        medicine_id=med.id,
                        unit_price=float(row["unit_price_inr"]),
                        lead_time_days=int(row["lead_time_days"]),
                        available_quantity=2500,
                        min_order_qty=10
                    )
                    db.add(sm)
                    existing_supplier_meds[sm_key] = sm
                else:
                    existing_sm = existing_supplier_meds[sm_key]
                    existing_sm.unit_price = float(row["unit_price_inr"])
                    existing_sm.lead_time_days = int(row["lead_time_days"])

            # Track stats
            medicines_mapped.add(med.code)
            wards_mapped.add(ward.code)

            risk_scen = str(row.get("risk_scenario", "NORMAL")).strip()
            if risk_scen == "LOW_STOCK":
                low_stock_count += 1
            elif risk_scen == "EXPIRY_RISK":
                expiry_risk_count += 1

            # Parse dates
            try:
                rec_date = datetime.strptime(str(row["received_date"]).strip(), "%Y-%m-%d").date()
                exp_date = datetime.strptime(str(row["expiry_date"]).strip(), "%Y-%m-%d").date()
            except Exception as e:
                logger.error(f"Row {idx}: Invalid date format ({e})")
                invalid_records += 1
                rows_skipped += 1
                continue

            current_stock = int(row["current_stock"])
            safety_stock = int(row["safety_stock"])
            avg_daily_usage = float(row["avg_daily_usage"])
            days_of_stock = float(row["days_of_stock"])
            reorder_point = int(row["reorder_point"])
            unit_price = float(row["unit_price_inr"])

            # Upsert Inventory
            inv_item = db.query(Inventory).filter(
                Inventory.medicine_id == med.id,
                Inventory.ward_id == ward.id
            ).first()

            if not inv_item:
                inv_item = Inventory(
                    medicine_id=med.id,
                    ward_id=ward.id,
                    department_id=ward.department_id,
                    current_stock=current_stock,
                    reserved_stock=0,
                    min_level=safety_stock,
                    max_level=max(200, int(safety_stock * 2.5)),
                    safety_stock=safety_stock,
                    reorder_point=reorder_point,
                    avg_daily_usage=avg_daily_usage,
                    days_of_stock=days_of_stock,
                    data_source="SYNTHETIC",
                    risk_scenario=risk_scen,
                    last_restocked_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(inv_item)
                rows_imported += 1
            else:
                inv_item.current_stock = current_stock
                inv_item.safety_stock = safety_stock
                inv_item.reorder_point = reorder_point
                inv_item.avg_daily_usage = avg_daily_usage
                inv_item.days_of_stock = days_of_stock
                inv_item.data_source = "SYNTHETIC"
                inv_item.risk_scenario = risk_scen
                inv_item.updated_at = datetime.utcnow()
                rows_updated += 1

            # Upsert Batch
            batch_num = str(row["batch_number"]).strip()
            batch_item = db.query(InventoryBatch).filter(
                InventoryBatch.medicine_id == med.id,
                InventoryBatch.ward_id == ward.id,
                InventoryBatch.batch_number == batch_num
            ).first()

            days_to_exp = (exp_date - date.today()).days
            b_status = BatchStatus.NEAR_EXPIRY if days_to_exp <= 90 else BatchStatus.ACTIVE

            if not batch_item:
                batch_item = InventoryBatch(
                    medicine_id=med.id,
                    ward_id=ward.id,
                    batch_number=batch_num,
                    initial_quantity=max(current_stock, 100),
                    current_quantity=current_stock,
                    unit_cost=unit_price,
                    manufacturing_date=rec_date - timedelta(days=90),
                    expiry_date=exp_date,
                    received_date=rec_date,
                    status=b_status
                )
                db.add(batch_item)
            else:
                batch_item.current_quantity = current_stock
                batch_item.unit_cost = unit_price
                batch_item.expiry_date = exp_date
                batch_item.received_date = rec_date
                batch_item.status = b_status

            # Ensure DailyUsage has operational baseline for past 7 days
            for d_offset in range(7):
                u_date = date.today() - timedelta(days=d_offset)
                du_key = (med.id, ward.id, u_date)
                if du_key not in existing_daily_usage:
                    du = DailyUsage(
                        medicine_id=med.id,
                        ward_id=ward.id,
                        date=u_date,
                        quantity_used=avg_daily_usage,
                        admission_count=18
                    )
                    db.add(du)
                    existing_daily_usage.add(du_key)

            # Record MedicineAlias for CSV names
            med_name_str = str(row["medicine_name"]).strip()
            if med_name_str not in existing_aliases:
                alias = MedicineAlias(
                    medicine_id=med.id,
                    source="SYNTHETIC_CSV",
                    source_name=med_name_str,
                    normalized_name=med_name_str.lower(),
                    mapping_method="EXACT_FORMULARY",
                    confidence=1.0
                )
                db.add(alias)
                existing_aliases.add(med_name_str)

        db.commit()

        # 8. Update DataSource registry
        ds_inv = db.query(DataSource).filter(DataSource.name == "Operational Inventory").first()
        if ds_inv:
            ds_inv.record_count = db.query(Inventory).count()
            ds_inv.last_imported = datetime.utcnow()
            ds_inv.status = "ACTIVE"
            db.commit()

        end_time = datetime.utcnow()
        elapsed = (end_time - start_time).total_seconds()

        print("\n========================================================")
        print("MEDISENTINEL INVENTORY IMPORT COMPLETE")
        print("========================================================")
        print(f"Dataset Path:         {resolved_path}")
        print(f"Rows read:            {rows_read}")
        print(f"Rows imported:        {rows_imported}")
        print(f"Rows updated:         {rows_updated}")
        print(f"Rows skipped:         {rows_skipped}")
        print(f"Medicines mapped:     {len(medicines_mapped)}")
        print(f"Wards mapped:         {len(wards_mapped)}")
        print(f"Suppliers mapped:     {len(suppliers_mapped)}")
        print(f"Invalid records:      {invalid_records}")
        print(f"Low-stock records:    {low_stock_count}")
        print(f"Expiry-risk records:  {expiry_risk_count}")
        print(f"Database insertion:   SUCCESS")
        print(f"Status:               SUCCESS")
        print(f"Elapsed Time:         {elapsed:.1f}s")
        print("========================================================\n")

        return {
            "status": "SUCCESS",
            "rows_read": rows_read,
            "rows_imported": rows_imported,
            "rows_updated": rows_updated,
            "rows_skipped": rows_skipped,
            "medicines_mapped": len(medicines_mapped),
            "wards_mapped": len(wards_mapped),
            "suppliers_mapped": len(suppliers_mapped),
            "invalid_records": invalid_records
        }

    except Exception as e:
        db.rollback()
        logger.exception(f"Fatal error during inventory import: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import MediSentinel Synthetic Medicine Inventory Dataset into PostgreSQL")
    parser.add_argument("--csv-path", type=str, default=None, help="Path to inventory CSV file")
    args = parser.parse_args()

    run_import(csv_path=args.csv_path)
