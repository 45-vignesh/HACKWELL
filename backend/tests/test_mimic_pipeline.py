import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.entities import Medicine, MedicationUsageHistory, DataSource, DataQualityLog
from app.data.mimic import (
    MIMICReader, MIMICValidator, MIMICNormalizer, MIMICMapper, MIMICUsageAggregator
)
from app.forecasting.forecast_service import ForecastService
from app.agents.monitor import MonitorAgent

client = TestClient(app)

def test_mimic_reader_and_validator():
    reader = MIMICReader()
    validator = MIMICValidator(reader)
    report = validator.validate_all()
    assert report["all_valid"] is True
    assert report["total_records_inspected"] > 50000

def test_mimic_normalizer():
    # Test normalization rules
    res1 = MIMICNormalizer.normalize("0.9% Sodium Chloride (Mini Bag Plus)")
    assert "sodium chloride" in res1["clean_name"]
    assert res1["dosage"] == "0.9%"

    res2 = MIMICNormalizer.normalize("Acetaminophen 1000mg/100ml IV")
    assert "acetaminophen" in res2["clean_name"]
    assert res2["form"] == "iv"

    res3 = MIMICNormalizer.normalize("EPINEPHrine 1:1000")
    assert "epinephrine" in res3["clean_name"]

def test_mimic_mapper():
    db = SessionLocal()
    try:
        mapper = MIMICMapper(db)
        # Test exact match
        m1 = mapper.map_medication("Insulin Human Regular")
        assert m1["matched"] is True
        assert m1["medicine_code"] == "MED-DIA-INS"
        assert m1["confidence"] >= 0.90

        # Test synonym match (Normal Saline)
        m2 = mapper.map_medication("0.9% Sodium Chloride")
        assert m2["matched"] is True
        assert m2["medicine_code"] == "MED-IVF-NS"

        # Test unmapped drug
        m3 = mapper.map_medication("Docusate Sodium")
        assert m3["matched"] is False
        assert m3["status"] == "UNMAPPED"
        assert m3["medicine_id"] is None
    finally:
        db.close()

def test_daily_usage_aggregator():
    db = SessionLocal()
    try:
        reader = MIMICReader()
        mapper = MIMICMapper(db)
        aggregator = MIMICUsageAggregator(reader, mapper)
        records, metrics = aggregator.aggregate_daily_usage(target_end_date=date.today(), days_window=30)
        assert len(records) > 0
        assert metrics["records_read"] > 50000
        # Check that no patient identifiers exist in aggregated records
        first = records[0]
        assert "subject_id" not in first
        assert "hadm_id" not in first
        assert "medicine_id" in first
        assert "date" in first
        assert "quantity_used" in first
        assert first["source"] in ["MIMIC", "DERIVED"]
    finally:
        db.close()

def test_forecast_service_with_mimic():
    db = SessionLocal()
    try:
        # Emergency Ward Normal Saline (Medicine 1, Ward 2)
        res = ForecastService.forecast_demand(db, medicine_id=1, ward_id=2, horizon_days=14, force_refresh=True)
        assert res.medicine_id == 1
        assert res.horizon_days == 14
        assert res.total_predicted_demand > 0
        assert res.usage_source == "MIMIC-Derived"
        assert res.data_status == "sufficient"
        assert len(res.forecast_points) > 0
    finally:
        db.close()

def test_insufficient_historical_data_handling():
    db = SessionLocal()
    try:
        # A nonexistent medicine ID or temporary dummy without historical records
        with pytest.raises(ValueError):
            ForecastService.forecast_demand(db, medicine_id=99999, ward_id=2)
    finally:
        db.close()

def test_monitor_agent_with_mimic():
    db = SessionLocal()
    try:
        snapshot = MonitorAgent.inspect_inventory(db, medicine_id=1, ward_id=2)
        assert snapshot["medicine_id"] == 1
        assert snapshot["current_stock"] >= 0
        assert snapshot["daily_consumption_avg"] > 0
        assert snapshot["status"] in ["NORMAL", "LOW_STOCK", "CRITICAL_LOW", "SURPLUS"]
    finally:
        db.close()

def test_data_quality_endpoint():
    res = client.get("/api/data-quality")
    assert res.status_code == 200
    data = res.json()
    assert data["records_inspected"] > 50000
    assert data["mapped_medicines_count"] > 10
    assert data["imported_daily_records"] > 0
    assert len(data["unmapped_samples"]) > 0

def test_data_sources_endpoint():
    res = client.get("/api/data-sources")
    assert res.status_code == 200
    sources = res.json()
    assert len(sources) >= 4
    names = [s["name"] for s in sources]
    assert "MIMIC-IV Demo" in names
    assert "Operational Inventory" in names
    assert "Prophet Forecasting" in names

def test_usage_history_endpoint():
    res = client.get("/api/usage-history/1")
    assert res.status_code == 200
    data = res.json()
    assert data["medicine_id"] == 1
    assert "history" in data
    assert len(data["history"]) > 0
    first = data["history"][0]
    assert "date" in first
    assert "quantity_used" in first
    assert "source" in first

def test_chat_ai_assistant_mimic_queries():
    # 1. Test highest usage query
    r1 = client.post("/api/agent/chat", json={"message": "Which medicines have the highest recent usage?"})
    assert r1.status_code == 200
    d1 = r1.json()
    assert "highest" in d1["reply"].lower() or "usage" in d1["reply"].lower()
    assert "mimic" in d1["reply"].lower()

    # 2. Test forecast grounding query
    r2 = client.post("/api/agent/chat", json={"message": "What historical usage data supports this forecast?", "context_medicine_id": 1})
    assert r2.status_code == 200
    d2 = r2.json()
    assert "mimic" in d2["reply"].lower() or "observed" in d2["reply"].lower()
