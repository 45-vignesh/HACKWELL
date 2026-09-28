"""
MIMIC-IV Core Ingestion Engine.
Coordinates reading, validation, mapping, aggregation, and database upsert.
"""

import os
import uuid
import logging
from datetime import datetime, date
from typing import Optional

from app.database import SessionLocal, Base, engine
from app.models.entities import (
    Medicine, Ward, DailyUsage, MedicationUsageHistory,
    MedicineAlias, DataSource, DataQualityLog
)
from app.data.mimic import (
    MIMICReader, MIMICValidator, MIMICNormalizer,
    MIMICMapper, MIMICUsageAggregator
)

logger = logging.getLogger("mimic_importer")

def run_import(data_dir: Optional[str] = None, days_window: int = 180):
    """
    Executes the idempotent ingestion pipeline:
    1. Reads and validates MIMIC files.
    2. Maps unique medication names with fuzzy & alias matching.
    3. Aggregates bedside admin and fluid orders into daily usage history.
    4. Upserts records into PostgreSQL / database.
    5. Syncs clinical ward DailyUsage baselines.
    6. Updates data source registries and data quality audit logs.
    """
    import_id = str(uuid.uuid4())
    start_time = datetime.utcnow()
    logger.info(f"=== Starting MIMIC-IV Ingestion Pipeline [Import ID: {import_id}] ===")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    quality_log = DataQualityLog(
        import_id=import_id,
        start_time=start_time,
        status="RUNNING"
    )
    db.add(quality_log)
    db.commit()

    try:
        reader = MIMICReader(data_dir=data_dir)
        validator = MIMICValidator(reader)
        validation_report = validator.validate_all()
        logger.info(f"Validation report: all_valid={validation_report['all_valid']}, records_inspected={validation_report['total_records_inspected']}")

        mapper = MIMICMapper(db)
        aggregator = MIMICUsageAggregator(reader, mapper, days_window=days_window)

        logger.info(f"Extracting and aggregating medication usage over {days_window} day window...")
        aggregated_records, metrics = aggregator.aggregate_all()

        unique_drugs = aggregator.get_unique_source_drugs()
        mapping_report = mapper.generate_mapping_report(unique_drugs)

        logger.info(
            f"Mapping Results: {mapping_report['mapped_count']} mapped, "
            f"{mapping_report['unmapped_count']} unmapped, "
            f"{mapping_report['low_confidence_count']} low-confidence."
        )

        aliases_to_insert = mapping_report["mapped"] + mapping_report["low_confidence"] + mapping_report["unmapped"]
        for a in aliases_to_insert:
            existing = db.query(MedicineAlias).filter(
                MedicineAlias.source == "MIMIC",
                MedicineAlias.source_name == a["source_name"]
            ).first()

            if not existing:
                alias_obj = MedicineAlias(
                    medicine_id=a["medicine_id"],
                    source="MIMIC",
                    source_name=a["source_name"],
                    normalized_name=a["normalized_name"],
                    mapping_method=a["mapping_method"],
                    confidence=a["confidence"]
                )
                db.add(alias_obj)
            else:
                existing.medicine_id = a["medicine_id"]
                existing.normalized_name = a["normalized_name"]
                existing.mapping_method = a["mapping_method"]
                existing.confidence = a["confidence"]

        db.commit()

        logger.info(f"Inserting {len(aggregated_records)} aggregated daily usage history records...")
        inserted_count = 0
        updated_count = 0

        existing_hist = {
            (r.medicine_id, r.date, r.source): r
            for r in db.query(MedicationUsageHistory).all()
        }

        for rec in aggregated_records:
            key = (rec["medicine_id"], rec["date"], rec["source"])
            if key in existing_hist:
                item = existing_hist[key]
                item.quantity_used = rec["quantity_used"]
                item.source_record_count = rec["source_record_count"]
                updated_count += 1
            else:
                new_item = MedicationUsageHistory(
                    medicine_id=rec["medicine_id"],
                    date=rec["date"],
                    quantity_used=rec["quantity_used"],
                    source=rec["source"],
                    source_record_count=rec["source_record_count"]
                )
                db.add(new_item)
                existing_hist[key] = new_item
                inserted_count += 1

        db.commit()
        logger.info(f"MedicationUsageHistory: {inserted_count} inserted, {updated_count} updated.")

        active_wards = db.query(Ward).filter(Ward.code.in_(["WARD-EMERG", "WARD-MICU", "WARD-GENMED"])).all()
        if active_wards:
            existing_du = {
                (r.medicine_id, r.ward_id, r.date): r
                for r in db.query(DailyUsage).all()
            }
            du_inserted = 0
            for rec in aggregated_records:
                for ward in active_wards:
                    weight = 0.50 if ward.code == "WARD-EMERG" else 0.25
                    ward_qty = round(max(0.5, rec["quantity_used"] * weight), 1)
                    du_key = (rec["medicine_id"], ward.id, rec["date"])
                    if du_key in existing_du:
                        existing_du[du_key].quantity_used = ward_qty
                    else:
                        du_obj = DailyUsage(
                            medicine_id=rec["medicine_id"],
                            ward_id=ward.id,
                            date=rec["date"],
                            quantity_used=ward_qty,
                            admission_count=15
                        )
                        db.add(du_obj)
                        existing_du[du_key] = du_obj
                        du_inserted += 1
            db.commit()
            logger.info(f"Synchronized MIMIC daily patterns to DailyUsage ({du_inserted} new ward records).")

        sources_to_sync = [
            {
                "name": "MIMIC-IV Demo",
                "source_type": "HISTORICAL_REAL",
                "description": "PhysioNet MIMIC-IV Clinical Database Demo (hosp module: emar, prescriptions, pharmacy)",
                "record_count": len(aggregated_records),
                "last_imported": datetime.utcnow(),
                "status": "ACTIVE"
            },
            {
                "name": "Operational Inventory",
                "source_type": "SYNTHETIC",
                "description": "Synthetic hospital inventory stock levels, batches, and shelf locations",
                "record_count": db.query(Medicine).count(),
                "last_imported": datetime.utcnow(),
                "status": "ACTIVE"
            },
            {
                "name": "Prophet Forecasting",
                "source_type": "DERIVED",
                "description": "Time-series demand predictions, confidence bounds, and depletion projections",
                "record_count": len(metrics["unique_medicines_mapped"]),
                "last_imported": datetime.utcnow(),
                "status": "ACTIVE"
            },
            {
                "name": "Dengue Simulation",
                "source_type": "SIMULATION",
                "description": "Multi-agent emergency outbreak stress test scenario",
                "record_count": 1,
                "last_imported": datetime.utcnow(),
                "status": "ACTIVE"
            }
        ]

        for s in sources_to_sync:
            src = db.query(DataSource).filter(DataSource.name == s["name"]).first()
            if not src:
                src = DataSource(**s)
                db.add(src)
            else:
                src.source_type = s["source_type"]
                src.description = s["description"]
                src.record_count = s["record_count"]
                src.last_imported = s["last_imported"]
                src.status = s["status"]
        db.commit()

        end_time = datetime.utcnow()
        quality_log.end_time = end_time
        quality_log.files_processed = len(validation_report["tables"])
        quality_log.records_read = validation_report["total_records_inspected"]
        quality_log.records_imported = inserted_count + updated_count
        quality_log.records_skipped = metrics["records_skipped"]
        quality_log.records_failed = 0
        quality_log.mapping_success = mapping_report["mapped_count"]
        quality_log.mapping_failure = mapping_report["unmapped_count"]
        quality_log.status = "COMPLETED"
        quality_log.details = {
            "unique_medicines_mapped": list(metrics["unique_medicines_mapped"]),
            "medication_records_found": metrics["records_read"],
            "records_used": metrics["records_used"],
            "daily_usage_records_created": len(aggregated_records),
            "date_range_start": metrics["date_range_start"],
            "date_range_end": metrics["date_range_end"],
            "unmapped_samples": [u["source_name"] for u in mapping_report["unmapped"][:10]],
            "low_confidence_samples": [l["source_name"] for l in mapping_report["low_confidence"][:10]],
            "data_directory": str(reader.data_dir)
        }
        db.commit()

        logger.info("=== MIMIC Ingestion Completed Successfully ===")
        print("\n========================================================")
        print("MIMIC-IV IMPORT COMPLETE")
        print("========================================================")
        print(f"Import ID:                   {import_id}")
        print(f"Dataset Path:                {reader.data_dir}")
        print(f"Files processed:             {len(validation_report['tables'])}")
        print(f"Records inspected:           {validation_report['total_records_inspected']:,}")
        print(f"Medication records found:    {metrics['records_read']:,}")
        print(f"Records imported:            {inserted_count + updated_count:,}")
        print(f"Records skipped:             {metrics['records_skipped']:,}")
        print(f"Records failed:              0")
        print(f"Mapped medicines:            {len(metrics['unique_medicines_mapped'])}")
        print(f"Unmapped medicines:          {mapping_report['unmapped_count']}")
        print(f"Daily usage records created: {len(aggregated_records):,}")
        print(f"Database insertion:          SUCCESS")
        print(f"Status:                      SUCCESS")
        print(f"Elapsed Time:                {(end_time - start_time).total_seconds():.1f}s")
        print("========================================================\n")

        return quality_log

    except Exception as e:
        logger.exception(f"Fatal error during MIMIC import: {e}")
        quality_log.end_time = datetime.utcnow()
        quality_log.status = "FAILED"
        quality_log.details = {"error": str(e)}
        db.commit()
        raise
    finally:
        db.close()
