"""
API & Service Layer Integration Tests

Verifies all FastAPI REST endpoints, Pydantic data serialization contracts,
HTTP error handling, and manual override audit workflows.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.shipment_service import ShipmentService
from backend.models import OverrideRequest

client = TestClient(app)


# 1. Root & Health
def test_api_root():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "simulation" in data["disclaimer"].lower()


def test_api_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["total_shipments_loaded"] == 28
    assert data["simulation_mode"] is True


# 2. Shipments Endpoints
def test_api_get_all_shipments():
    res = client.get("/shipments")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 28
    assert data[0]["shipment_id"] == "SHIP-001"


def test_api_get_single_shipment():
    res = client.get("/shipments/SHIP-003")
    assert res.status_code == 200
    data = res.json()
    assert data["shipment_id"] == "SHIP-003"
    assert data["producer_id"] == "PROD-103"
    assert data["milk_quantity_litres"] == 90.0


def test_api_get_shipment_not_found():
    res = client.get("/shipments/SHIP-NONEXISTENT")
    assert res.status_code == 404
    data = res.json()
    assert data["error"] is True or "detail" in data


# 3. Thermal Analysis Endpoints
def test_api_get_all_thermal_analysis():
    res = client.get("/thermal-analysis")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 28
    assert "remaining_thermal_life_hours" in data[0]
    assert "risk_level" in data[0]


def test_api_get_single_thermal_analysis():
    res = client.get("/thermal-analysis/SHIP-006")
    assert res.status_code == 200
    data = res.json()
    assert data["shipment_id"] == "SHIP-006"
    assert data["temperature_breach"] is True
    assert data["is_thermal_exhausted"] is True
    assert data["risk_level"] == "CRITICAL"


# 4. Summary & KPI Analytics
def test_api_get_summary():
    res = client.get("/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_shipments"] == 28
    assert data["total_milk_volume_litres"] > 0
    assert data["high_risk_shipments"] >= 1
    assert data["critical_risk_shipments"] >= 1
    assert data["deliverable_before_expiry_percentage"] > data["baseline_deliverable_percentage"]
    assert "trade_off_summary" in data


# 5. Priority Queue
def test_api_get_priority_queue():
    res = client.get("/priority-queue")
    assert res.status_code == 200
    stops = res.json()
    assert len(stops) == 28
    assert stops[0]["priority_rank"] == 1
    assert "priority_score" in stops[0]
    assert "priority_reason" in stops[0]
    assert "recommended_action" in stops[0]


# 6. Baseline & Proposed Routes
def test_api_get_baseline_route():
    res = client.get("/route/baseline")
    assert res.status_code == 200
    data = res.json()
    assert data["strategy_type"] == "BASELINE"
    assert data["total_shipments"] == 28
    assert data["delivered_before_expiry_count"] == 16
    assert data["expired_shipments_count"] == 11


def test_api_get_proposed_route():
    res = client.get("/route/proposed")
    assert res.status_code == 200
    data = res.json()
    assert data["strategy_type"] == "PROPOSED"
    assert data["total_shipments"] == 28
    assert data["delivered_before_expiry_count"] == 22
    assert data["expired_shipments_count"] == 5


# 7. Route Comparison & Trade-Offs
def test_api_get_route_comparison():
    res = client.get("/route/comparison")
    assert res.status_code == 200
    data = res.json()
    assert data["improvement_delivered_count"] == 6
    assert data["improvement_delivered_percentage"] == 22.2
    assert data["time_difference_minutes"] == 54.4
    assert data["time_difference_percentage"] == 4.0
    assert data["distance_difference_km"] == 27.8
    assert data["distance_difference_percentage"] == 4.0
    assert data["spoilage_reduction_percentage"] == 54.5
    assert data["rescued_volume_litres"] == 700.0
    assert "trade_off_analysis" in data
    assert "Objective A" in data["trade_off_analysis"]
    assert "Objective B" in data["trade_off_analysis"]


# 8. Delivery Verification
def test_api_get_delivery_results():
    res = client.get("/delivery-results")
    assert res.status_code == 200
    data = res.json()
    assert data["total_stops"] == 28
    assert data["delivered_before_expiry_count"] == 22
    assert len(data["stops"]) == 28


# 9. Edge Case Alerts
def test_api_get_edge_case_alerts():
    res = client.get("/edge-case-alerts")
    assert res.status_code == 200
    alerts = res.json()
    assert len(alerts) >= 4  # sensor offline, location missing, exhausted, breach
    alert_types = {a["alert_type"] for a in alerts}
    assert "SENSOR_OFFLINE" in alert_types
    assert "LOCATION_MISSING" in alert_types
    assert "THERMAL_EXHAUSTED" in alert_types


# 10. Manual Override Workflow & Audit Trail
def test_api_manual_override_workflow():
    # Reset any previous overrides
    client.post("/overrides/reset")

    req_payload = {
        "shipment_id": "SHIP-007",
        "overridden_priority_score": 96.0,
        "overridden_action": "COLLECT NOW",
        "reason": "Compressor malfunction reported by dairy farmer.",
        "operator_id": "OPERATOR-UNIT-TEST",
    }
    post_res = client.post("/override", json=req_payload)
    assert post_res.status_code == 200
    record = post_res.json()
    assert record["shipment_id"] == "SHIP-007"
    assert record["new_priority_score"] == 96.0
    assert record["new_action"] == "COLLECT NOW"
    assert record["operator_id"] == "OPERATOR-UNIT-TEST"
    assert record["audit_id"] is not None

    # Check override audit trail
    audit_res = client.get("/overrides")
    assert audit_res.status_code == 200
    records = audit_res.json()
    assert len(records) >= 1
    assert any(r["shipment_id"] == "SHIP-007" for r in records)

    # Check that proposed route reflects the override
    prop_res = client.get("/route/proposed")
    first_stop = prop_res.json()["stops"][0]
    assert first_stop["shipment_id"] == "SHIP-007"
    assert "[OPERATOR OVERRIDE]" in first_stop["priority_reason"]

    # Reset overrides
    reset_res = client.post("/overrides/reset")
    assert reset_res.status_code == 200
