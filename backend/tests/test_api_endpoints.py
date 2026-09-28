import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_dashboard_summary():
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_medicines"] >= 10
    assert "risk_radar" in data
    assert "health_map" in data

def test_inventory_list():
    response = client.get("/api/inventory")
    assert response.status_code == 200
    items = response.json()
    assert len(items) > 0
    # Check that computed properties exist
    first = items[0]
    assert "days_remaining" in first
    assert "risk_level" in first
    assert "stock_status" in first

def test_forecast_endpoint():
    response = client.get("/api/forecasts?horizon_days=14")
    assert response.status_code == 200
    data = response.json()
    assert "forecast_points" in data
    assert data["horizon_days"] == 14
    assert data["estimated_stockout_days"] is not None

def test_agent_analyze():
    response = client.post("/api/agent/analyze")
    assert response.status_code == 200
    data = response.json()
    assert "timeline_logs" in data
    assert len(data["timeline_logs"]) > 0

def test_dengue_simulation_and_approval():
    # 1. Trigger Dengue Surge simulation
    sim_res = client.post("/api/simulation/dengue")
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["spiked_daily_demand"] == 62.0
    assert len(sim_data["steps"]) >= 4

    # 2. Check that pending approvals exist
    appr_res = client.get("/api/approvals?status=PENDING")
    assert appr_res.status_code == 200
    apprs = appr_res.json()
    assert len(apprs) > 0

    # 3. Pharmacist 1-tap Approve
    target_appr = apprs[0]
    decide_res = client.post(
        f"/api/approvals/{target_appr['id']}/decide",
        json={
            "decision": "APPROVE",
            "decision_by": "Chief Pharmacist Dr. Sarah",
            "reason": "Approved for acute Dengue surge emergency protocol"
        }
    )
    assert decide_res.status_code == 200
    assert decide_res.json()["decision"] == "APPROVE"
