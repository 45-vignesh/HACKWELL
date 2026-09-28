import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_synthetic_inventory_ingestion_and_fields():
    response = client.get("/api/inventory")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 75

    # Check synthetic metadata
    synthetic_items = [i for i in items if i.get("data_source") == "SYNTHETIC"]
    assert len(synthetic_items) >= 75

    # Check fields present
    first = synthetic_items[0]
    assert "reorder_point" in first
    assert "safety_stock" in first
    assert "supplier_name" in first
    assert "lead_time_days" in first
    assert "unit_price_inr" in first

def test_synthetic_low_stock_and_expiry_scenarios():
    response = client.get("/api/inventory")
    assert response.status_code == 200
    items = response.json()

    # Low stock scenarios
    critical_items = [i for i in items if i.get("stock_status") in ("CRITICAL_LOW", "LOW_STOCK")]
    assert len(critical_items) >= 4

    # Verify Heparin or Enoxaparin is present in critical/low stock
    heparin_items = [i for i in critical_items if "Heparin" in i["medicine_name"]]
    assert len(heparin_items) >= 1

def test_synthetic_inventory_detail_endpoint():
    # Fetch inventory list to get an id
    response = client.get("/api/inventory?search=Heparin")
    assert response.status_code == 200
    items = response.json()
    assert len(items) > 0
    item_id = items[0]["id"]

    detail_res = client.get(f"/api/inventory/{item_id}")
    assert detail_res.status_code == 200
    data = detail_res.json()
    assert data["data_source"] == "SYNTHETIC"
    assert "batches" in data
    assert len(data["batches"]) >= 1
    assert "suppliers" in data
    assert len(data["suppliers"]) >= 1
    assert "hospital_distribution" in data
    assert len(data["hospital_distribution"]) == 5
