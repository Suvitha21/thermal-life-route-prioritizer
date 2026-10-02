"""
Comprehensive Unit Tests for Thermal Life Simulation & Route Prioritisation

Tests all 15+ operational, calculation, edge case, and fallback scenarios:
1. Normal shipment
2. High temperature history
3. Temperature breach
4. Thermal exhaustion
5. Low remaining thermal life / tight buffer
6. Empty temperature history
7. Missing temperature history
8. Invalid packaging performance sanitization
9. Invalid numerical temperature values / physical limits
10. Missing location data
11. Missing sensor data
12. Simultaneous expiry conflict resolution (tie-breaking)
13. Route priority correctness
14. Baseline versus proposed comparison & trade-offs
15. Travel time greater than remaining thermal life (deficit buffer)
16. Invalid initial thermal life sanitization
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
    assert res.thermal_buffer_hours is not None and res.thermal_buffer_hours > 3.0
    assert res.is_thermal_exhausted is False


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
    assert res.risk_level in ["HIGH", "CRITICAL"]


# 4. Thermal Life Exhausted
def test_thermal_life_exhausted():
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
    assert res.is_thermal_exhausted is True
    assert res.risk_level == "CRITICAL"
    assert res.route_feasibility == "INFEASIBLE"

    score, reason, action = calculate_priority_score_and_reason(res, 30.0)
    assert score == 100.0
    assert "exhausted" in reason.lower()
    assert action in ["COLLECT NOW", "PRIORITIZE"]


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
    assert res.thermal_buffer_hours == round(res.remaining_thermal_life_hours - 1.0, 2)
    assert res.thermal_buffer_hours <= 1.0
    assert res.risk_level in ["HIGH", "CRITICAL"]


# 6. Empty Temperature History
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
    assert res.latest_temperature_c is None
    assert "unavailable" in res.fallback_message.lower()


# 7. Missing Temperature History
def test_missing_temperature_history():
    res = evaluate_shipment_thermal_life(
        shipment_id="TEST-NONE",
        temperature_history=None,
        packaging_performance=0.75,
        initial_thermal_life_hours=12.0,
        travel_time_minutes=50.0,
        distance_km=27.0,
    )
    assert res.sensor_status == "UNAVAILABLE"
    assert res.manual_review_required is True
    assert "unavailable" in res.fallback_message.lower()
    assert res.latest_temperature_c is None


# 8. Invalid / Boundary Packaging Performance
def test_packaging_performance_sanitization():
    # Negative performance clamped to 0.0 -> max(1.0, 2.0 - 0.0) = 2.0
    mult_neg = calculate_packaging_multiplier(-0.5)
    assert mult_neg == 2.0

    # Over 1.0 clamped to 1.0 -> max(1.0, 2.0 - 1.0) = 1.0
    mult_high = calculate_packaging_multiplier(1.5)
    assert mult_high == 1.0

    # Non-numeric string or invalid type
    mult_str = calculate_packaging_multiplier("invalid")  # type: ignore
    assert mult_str == 1.5  # safe default 0.5 -> 2.0 - 0.5 = 1.5


# 9. Invalid Numerical Temperature Values
def test_invalid_temperature_values():
    # Includes corrupt strings, extreme physical outliers (< -5 or > 45)
    corrupted_history = ["bad_val", 4.0, 999.0, 4.2, -100.0]  # type: ignore
    res = evaluate_shipment_thermal_life(
        shipment_id="TEST-CORRUPT",
        temperature_history=corrupted_history,
        packaging_performance=0.8,
        initial_thermal_life_hours=12.0,
        travel_time_minutes=30.0,
        distance_km=15.0,
    )
    # The valid readings (4.0, 4.2) should be extracted without crashing!
    assert res.sensor_status == "ONLINE"
    assert res.latest_temperature_c == 4.2
    assert res.remaining_thermal_life_hours > 0.0

    # If completely corrupt:
    all_bad = ["error", "nan", None]  # type: ignore
    res_bad = evaluate_shipment_thermal_life(
        shipment_id="TEST-ALL-BAD",
        temperature_history=all_bad,
        packaging_performance=0.8,
        initial_thermal_life_hours=12.0,
        travel_time_minutes=30.0,
        distance_km=15.0,
    )
    assert res_bad.sensor_status == "UNAVAILABLE"
    assert res_bad.manual_review_required is True


# 10. Missing Location & Travel Data
def test_missing_location_travel_data():
    res = evaluate_shipment_thermal_life(
        shipment_id="TEST-NOLOC",
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


# 11. Missing Sensor Data Fallback State
def test_missing_sensor_data_fallback():
    res = evaluate_shipment_thermal_life(
        shipment_id="SHIP-027",
        temperature_history=None,
        packaging_performance=0.75,
        initial_thermal_life_hours=12.0,
        travel_time_minutes=50.0,
        distance_km=27.0,
    )
    assert res.sensor_status == "UNAVAILABLE"
    assert res.risk_level == "MANUAL_REVIEW"
    score, reason, action = calculate_priority_score_and_reason(res, 50.0)
    assert "telemetry is offline" in reason.lower()
    assert action in ["PRIORITIZE", "COLLECT NOW"]


# 12. Simultaneous Expiry Conflict (Tie-Breaking)
def test_simultaneous_expiry_conflict():
    # Two shipments with identical tight remaining life and buffer
    shipment_small = {
        "shipment_id": "CONFLICT-SMALL",
        "producer_id": "PROD-A",
        "milk_quantity_litres": 50.0,
        "temperature_history": [5.5, 5.8, 6.0],
        "packaging_performance": 0.5,
        "distance_km": 20.0,
        "travel_time_minutes": 40.0,
        "maximum_safe_temperature_c": 6.0,
        "initial_thermal_life_hours": 6.0,
    }
    shipment_large = {
        "shipment_id": "CONFLICT-LARGE",
        "producer_id": "PROD-B",
        "milk_quantity_litres": 500.0,
        "temperature_history": [5.5, 5.8, 6.0],
        "packaging_performance": 0.5,
        "distance_km": 20.0,
        "travel_time_minutes": 40.0,
        "maximum_safe_temperature_c": 6.0,
        "initial_thermal_life_hours": 6.0,
    }

    plan = generate_proposed_route_plan([shipment_small, shipment_large])
    # The larger volume shipment must be prioritized first to minimize milk loss!
    assert plan.stops[0]["shipment_id"] == "CONFLICT-LARGE"
    assert plan.stops[1]["shipment_id"] == "CONFLICT-SMALL"


# 13. Route Priority Correctness
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


# 14. Baseline vs Proposed Route Comparison & Trade-Offs
def test_baseline_vs_proposed_comparison():
    svc = ShipmentService()
    comparison = svc.get_route_comparison()

    assert comparison.baseline_plan.total_shipments == 28
    assert comparison.proposed_plan.total_shipments == 28
    # Proposed should deliver significantly more shipments before expiry
    assert (
        comparison.proposed_plan.delivered_before_expiry_percentage
        >= comparison.baseline_plan.delivered_before_expiry_percentage
    )
    assert comparison.improvement_delivered_count > 0
    assert comparison.rescued_volume_litres > 0.0
    assert len(comparison.trade_off_analysis) > 20
    assert "Objective A" in comparison.trade_off_analysis
    assert "Objective B" in comparison.trade_off_analysis


# 15. Travel Time Greater Than Remaining Thermal Life (Negative Buffer Deficit)
def test_travel_time_greater_than_remaining_life():
    res = evaluate_shipment_thermal_life(
        shipment_id="DEFICIT-001",
        temperature_history=[5.2, 5.8, 6.1],
        packaging_performance=0.5,
        initial_thermal_life_hours=8.0,
        travel_time_minutes=120.0,  # 2.0 hours travel
        distance_km=60.0,
    )
    assert res.travel_time_hours == 2.0
    assert res.remaining_thermal_life_hours < 2.0
    assert res.thermal_buffer_hours is not None and res.thermal_buffer_hours < 0.0
    assert res.route_feasibility == "INFEASIBLE"
    assert res.risk_level == "CRITICAL"

    score, reason, action = calculate_priority_score_and_reason(res, 120.0)
    assert score >= 90.0
    assert action == "COLLECT NOW"
    assert "deficit" in reason.lower()


# 16. Invalid Initial Thermal Life Sanitization
def test_invalid_initial_thermal_life():
    res = evaluate_shipment_thermal_life(
        shipment_id="TEST-INIT-LIFE",
        temperature_history=[4.0, 4.0],
        packaging_performance=0.8,
        initial_thermal_life_hours=-10.0,  # negative invalid
        travel_time_minutes=30.0,
        distance_km=15.0,
    )
    # Sanitized to 0.0 or safe default without crashing
    assert res.initial_thermal_life_hours >= 0.0
