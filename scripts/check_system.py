"""
MediSentinel System Diagnostic Script
Checks configuration, database connectivity, table counts, and dataset presence.
"""

import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.database import SessionLocal
from app.models.entities import (
    Medicine, Ward, Inventory, MedicationUsageHistory,
    DataSource, DataQualityLog
)

def run_diagnostic():
    print("========================================================")
    print("  MediSentinel System & Pipeline Diagnostic Health Check")
    print("========================================================")

    print("\n1. Configuration:")
    print("   Database URL:    ", settings.DATABASE_URL)
    print("   MIMIC Data Dir:  ", settings.MIMIC_DATA_DIR)
    print("   MIMIC Dir Exists:", os.path.exists(settings.MIMIC_DATA_DIR))

    print("\n2. Database Connectivity & Record Counts:")
    db = SessionLocal()
    try:
        meds = db.query(Medicine).count()
        wards = db.query(Ward).count()
        invs = db.query(Inventory).count()
        usage = db.query(MedicationUsageHistory).count()
        logs = db.query(DataQualityLog).count()
        sources = db.query(DataSource).all()

        print(f"   Medicines:                {meds}")
        print(f"   Wards:                    {wards}")
        print(f"   Inventory records:        {invs}")
        print(f"   MedicationUsageHistory:   {usage}")
        print(f"   DataQualityLog entries:   {logs}")
        print(f"   Active Data Sources:      {[s.name for s in sources]}")
        print("\n[STATUS: DATABASE HEALTHY - CONNECTED TO POSTGRESQL]")
    except Exception as e:
        print(f"\n[ERROR: DATABASE CHECK FAILED] {e}")
    finally:
        db.close()

    print("========================================================\n")

if __name__ == "__main__":
    run_diagnostic()
