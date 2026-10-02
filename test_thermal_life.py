"""
Comprehensive Unit Tests for Thermal Life Simulation & Route Prioritisation

Tests all 10+ operational, calculation, edge case, and fallback scenarios.
"""

import pytest
from algorithms.thermal_life import (
    calculate_temperature_ratio,
    calculate_packaging_multiplier,
    calculate_hourly_consumption,
    calculate_total_thermal_consumed,
    calculate_remaining_thermal_life,
    calculate_thermal_buffer,
    classify_risk,
    evaluate_shipment_thermal_life,
    BASELINE_TEMPERATURE_C,
    DEFAULT_MAX_SAFE_TEMPERATURE_C,
)
from algorithms.route_prioritizer import (
    calculate_priority_score_and_reason,
    generate_baseline_route_plan,
    generate_proposed_route_plan,
    compare_route_plans,
)
from backend.services.shipment_service import ShipmentService
from backend.models import OverrideRequest


# 1. Normal Temperature History
def test_normal_temperature_history():
    history = [3.8, 3.9, 4.0, 4.1]
    perf = 0.85
    init_hours = 14.0
    consumed = calculate_total_thermal_consumed(history, perf)
    remaining = calculate_remaining_thermal_life(init_hours, consumed)
    assert consumed > 0.0
    assert remaining > 0.0
    assert remaining < init_hours

    # Evaluate full shipment
    res = evaluate_shipment_thermal_life(
        shipment_id="TEST-001",
        temperature_history=history,
        packaging_performance=perf,
        initial_thermal_life_hours=init_hours,
        travel_time_minutes=30.0,
        distance_km=15.0,
    )
    assert res.sensor_status == "ONLINE"
    assert res.risk_level in ["LOW", "MEDIUM"]
    assert res.temperature_breach is False
    assert res.thermal_buffer_hours > 3.0


# 2. High Temperature History
def test_high_temperature_history():
    normal_history = [4.0, 4.0, 4.0, 4.0]
    high_history = [5.5, 5.8, 5.9, 6.0]
    perf = 0.80
    consumed_norm = calculate_total_thermal_consumed(normal_history, perf)
    consumed_high = calculate_total_thermal_consumed(high_history, perf)
    assert consumed_high > consumed_norm


# 3. Temperature Breach
def test_temperature_breach():
    breach_history = [4.5, 5.5, 6.2, 6.8]
    res = evaluate_shipment_thermal_life(
        shipment_id="TEST-BREACH",
        temperature_history=breach_history,
        packaging_performance=0.50,
        initial_thermal_life_hours=10.0,
        travel_time_minutes=45.0,
        distance_km=25.0,
    )
    assert res.temperature_breach is True
    assert res.latest_temperature_c == 6.8
    # Latest temp >= 6.0 + 1.0 (7.0) is CRITICAL, 6.8 >= 6.0 is at least HIGH
    assert res.risk_level in ["HIGH", "CRITICAL"]


# 4. Thermal Life Exhausted
def test_thermal_life_exhausted():
    # Large consumption exceeding initial life
    history = [8.0] * 10
    perf = 0.30
    consumed = calculate_total_thermal_consumed(history, perf)
    remaining = calculate_remaining_thermal_life(8.0, consumed)
    assert remaining == 0.0

    res = evaluate_shipment_thermal_life(
        shipment_id="TEST-EXHAUSTED",
        temperature_history=history,
        packaging_performance=perf,
        initial_thermal_life_hours=8.0,
        travel_time_minutes=30.0,
        distance_km=15.0,
    )
    assert res.remaining_thermal_life_hours == 0.0
    assert res.risk_level == "CRITICAL"


# 5. Low Remaining Thermal Life & Tight Buffer
def test_low_remaining_thermal_life():
    res = evaluate_shipment_thermal_life(
        shipment_id="TEST-TIGHT",
        temperature_history=[5.5, 5.8, 5.9],
        packaging_performance=0.5,
        initial_thermal_life_hours=7.0,
        travel_time_minutes=60.0,  # 1.0 hour travel
        distance_km=30.0,
    )
    assert res.travel_time_hours == 1.0
    # Buffer should be remaining - 1.0
    assert res.thermal_buffer_hours == round(res.remaining_thermal_life_hours - 1.0, 2)


# 6. Missing Temperature History (Case 1 Fallback)
def test_missing_temperature_history():
    res = evaluate_shipment_thermal_life(
        shipment_id="SHIP-027",
        temperature_history=None,
        packaging_performance=0.75,
        initial_thermal_life_hours=12.0,
        travel_time_minutes=50.0,
        distance_km=27.0,
    )
    assert res.sensor_status == "UNAVAILABLE"
    assert res.manual_review_required is True
    assert "Temperature data unavailable" in res.fallback_message
    assert res.latest_temperature_c is None


# 7. Empty Temperature History
def test_empty_temperature_history():
    res = evaluate_shipment_thermal_life(
        shipment_id="TEST-EMPTY",
        temperature_history=[],
        packaging_performance=0.8,
        initial_thermal_life_hours=12.0,
        travel_time_minutes=30.0,
        distance_km=15.0,
    )
    assert res.sensor_status == "UNAVAILABLE"
    assert res.manual_review_required is True


# 8. Missing Location & Travel Data (Case 2 Fallback)
def test_missing_location_travel_data():
    res = evaluate_shipment_thermal_life(
        shipment_id="SHIP-028",
        temperature_history=[3.8, 3.9, 4.0],
        packaging_performance=0.92,
        initial_thermal_life_hours=15.0,
        travel_time_minutes=None,
        distance_km=None,
    )
    assert res.travel_time_hours is None
    assert res.thermal_buffer_hours is None
    assert res.route_feasibility == "UNKNOWN"
    assert res.manual_review_required is True
    assert "Location unavailable" in res.fallback_message


# 9. Invalid / Boundary Packaging Performance
def test_packaging_performance_sanitization():
    # Negative performance clamped to 0.0 -> max(1.0, 2.0 - 0.0) = 2.0
    mult_neg = calculate_packaging_multiplier(-0.5)
    assert mult_neg == 2.0

    # Over 1.0 clamped to 1.0 -> max(1.0, 2.0 - 1.0) = 1.0
    mult_high = calculate_packaging_multiplier(1.5)
    assert mult_high == 1.0


# 10. Route Priority Calculation & Determinism
def test_route_prioritization_logic():
    eval_urgent = evaluate_shipment_thermal_life(
        shipment_id="URGENT",
        temperature_history=[5.5, 6.2, 6.7],
        packaging_performance=0.4,
        initial_thermal_life_hours=8.0,
        travel_time_minutes=80.0,
        distance_km=40.0,
    )
    eval_safe = evaluate_shipment_thermal_life(
        shipment_id="SAFE",
        temperature_history=[3.5, 3.6, 3.7],
        packaging_performance=0.95,
        initial_thermal_life_hours=16.0,
        travel_time_minutes=20.0,
        distance_km=10.0,
    )

    score_urgent, reason_urgent, action_urgent = calculate_priority_score_and_reason(
        eval_urgent, 80.0
    )
    score_safe, reason_safe, action_safe = calculate_priority_score_and_reason(
        eval_safe, 20.0
    )

    assert score_urgent > score_safe
    assert action_urgent in ["COLLECT NOW", "PRIORITIZE"]
    assert action_safe in ["NORMAL", "MONITOR"]
    assert len(reason_urgent) > 10
    assert len(reason_safe) > 10


# 11. Baseline vs Proposed Route Comparison
def test_baseline_vs_proposed_comparison():
    svc = ShipmentService()
    comparison = svc.get_route_comparison()

    assert comparison.baseline_plan.total_shipments == 28
    assert comparison.proposed_plan.total_shipments == 28
    # Proposed should deliver more shipments before expiry or equal
    assert (
        comparison.proposed_plan.delivered_before_expiry_percentage
        >= comparison.baseline_plan.delivered_before_expiry_percentage
    )
    assert len(comparison.proposed_plan.stops) == 28
    assert len(comparison.baseline_plan.stops) == 28


# 12. Manual Override Persistence
def test_manual_override():
    svc = ShipmentService()
    req = OverrideRequest(
        shipment_id="SHIP-001",
        overridden_priority_score=99.0,
        overridden_action="COLLECT NOW",
        reason="Bulk tank power failure reported by farmer via radio.",
    )
    record = svc.apply_override(req)
    assert record.shipment_id == "SHIP-001"
    assert record.new_priority_score == 99.0
    assert record.new_action == "COLLECT NOW"

    # In proposed route, SHIP-001 should now have high rank
    proposed = svc.get_proposed_route()
    first_stop = proposed.stops[0]
    # It should be ranked near top
    assert first_stop["priority_score"] >= 90.0
