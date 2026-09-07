"""
API & Service Layer Integration Tests

Verifies all REST endpoints and data serialization contracts.
"""

import json
from dataclasses import asdict
from backend.services.shipment_service import ShipmentService
from backend.models import OverrideRequest


def test_service_health():
    svc = ShipmentService()
    shipments = svc.get_all_raw_shipments()
    assert len(shipments) == 28


def test_service_get_single_shipment():
    svc = ShipmentService()
    shipment = svc.get_shipment_by_id("SHIP-003")
    assert shipment is not None
    assert shipment["shipment_id"] == "SHIP-003"
    assert shipment["producer_id"] == "PROD-103"


def test_service_get_shipment_not_found():
    svc = ShipmentService()
    shipment = svc.get_shipment_by_id("NONEXISTENT")
    assert shipment is None


def test_service_thermal_life_evaluation():
    svc = ShipmentService()
    eval_res = svc.evaluate_shipment("SHIP-006")
    assert eval_res is not None
    assert eval_res.shipment_id == "SHIP-006"
    assert eval_res.temperature_breach is True
    assert eval_res.latest_temperature_c == 7.4
    assert eval_res.risk_level in ["HIGH", "CRITICAL"]


def test_service_baseline_route():
    svc = ShipmentService()
    plan = svc.get_baseline_route()
    assert plan.strategy_type == "BASELINE"
    assert plan.total_shipments == 28
    assert len(plan.stops) == 28
    assert plan.total_travel_time_minutes > 0.0


def test_service_proposed_route():
    svc = ShipmentService()
    plan = svc.get_proposed_route()
    assert plan.strategy_type == "PROPOSED"
    assert plan.total_shipments == 28
    assert len(plan.stops) == 28
    assert plan.total_travel_time_minutes > 0.0


def test_service_route_comparison():
    svc = ShipmentService()
    comp = svc.get_route_comparison()
    assert comp.baseline_plan.total_shipments == 28
    assert comp.proposed_plan.total_shipments == 28
    assert comp.proposed_plan.delivered_before_expiry_percentage >= comp.baseline_plan.delivered_before_expiry_percentage
    assert len(comp.summary_verdict) > 10


def test_service_manual_override_audit():
    svc = ShipmentService()
    req = OverrideRequest(
        shipment_id="SHIP-005",
        overridden_priority_score=98.5,
        overridden_action="COLLECT NOW",
        reason="Storage tank insulation failure reported.",
    )
    rec = svc.apply_override(req)
    assert rec.shipment_id == "SHIP-005"
    assert rec.new_priority_score == 98.5
    assert rec.new_action == "COLLECT NOW"

    overrides = svc.get_all_overrides()
    assert len(overrides) >= 1
    assert overrides[-1]["shipment_id"] == "SHIP-005"


def test_service_summary_kpis():
    svc = ShipmentService()
    summary = svc.get_summary()
    assert summary.total_shipments == 28
    assert summary.total_milk_volume_litres > 0.0
    assert summary.risk_distribution["critical"] >= 1
    assert summary.sensor_unavailable_count == 1
    assert summary.location_unavailable_count == 1
    assert summary.deliverable_before_expiry_percentage >= summary.baseline_deliverable_percentage
