import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.database import engine, Base, SessionLocal
from app.models.entities import Inventory, User, DataAuditTrail, TrustStatus
from app.services.auth_service import ensure_seed_users
from sqlalchemy import text, inspect

def main():
    print("Creating any missing tables (users, data_audit_trail, etc.)...")
    Base.metadata.create_all(bind=engine)

    insp = inspect(engine)
    inv_cols = [c["name"] for c in insp.get_columns("inventory")]
    print("Existing inventory columns:", inv_cols)

    with engine.connect() as conn:
        if "trust_status" not in inv_cols:
            print("Adding trust_status and governance columns to inventory table...")
            conn.execute(text("ALTER TABLE inventory ADD COLUMN trust_status VARCHAR(50) DEFAULT 'VALIDATED'"))
            conn.execute(text("ALTER TABLE inventory ADD COLUMN validated_by VARCHAR(100) DEFAULT 'SYSTEM_SEED'"))
            conn.execute(text("ALTER TABLE inventory ADD COLUMN validated_at TIMESTAMP"))
            conn.execute(text("ALTER TABLE inventory ADD COLUMN validation_notes TEXT"))
            conn.execute(text("ALTER TABLE inventory ADD COLUMN last_modified_by VARCHAR(100)"))
            conn.execute(text("ALTER TABLE inventory ADD COLUMN last_modified_at TIMESTAMP"))
            conn.commit()
            print("Governance columns added successfully!")
        else:
            print("Governance columns already exist in inventory table.")

    db = SessionLocal()
    try:
        ensure_seed_users(db)
        print("Seed users ensured. Total users in DB:", db.query(User).count())

        # Ensure all existing inventory rows have trust_status = 'VALIDATED'
        count = db.query(Inventory).count()
        print(f"Total operational inventory records in DB: {count}")
        updated = db.query(Inventory).filter(
            (Inventory.trust_status == None) | (Inventory.trust_status == "")
        ).update({"trust_status": TrustStatus.VALIDATED, "validated_by": "SYSTEM_SEED"}, synchronize_session=False)
        db.commit()
        print(f"Verified/updated {updated} inventory items to VALIDATED.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
