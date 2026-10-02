"""
Route Prioritization & Comparison Module

Implements:
1. Baseline Route Strategy (Traditional: shortest travel time, distance, stops)
2. Proposed Route Strategy (Thermal-life-aware: remaining life, thermal buffer, risk)
3. Fleet Route Delivery Simulation (Realistic multi-vehicle collection schedule)
4. Baseline vs. Proposed Comparison Metrics
"""

from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from algorithms.thermal_life import (
    ThermalLifeEvaluation,
    evaluate_shipment_thermal_life,
    DEFAULT_MAX_SAFE_TEMPERATURE_C,
)

NUM_COLLECTION_VEHICLES: int = 3


@dataclass
class PrioritizedShipment:
    shipment_id: str
    producer_id: str
    milk_quantity_litres: float
    packaging_type: str
    packaging_performance: float
    distance_km: Optional[float]
    travel_time_minutes: Optional[float]
    number_of_stops: int
    maximum_safe_temperature_c: float
    initial_thermal_life_hours: float
    temperature_history: List[float]

    # Computed evaluation
    evaluation: ThermalLifeEvaluation

    # Prioritization metrics
    priority_score: float  # 0.0 - 100.0
    priority_rank: int
    priority_reason: str
    recommended_action: str  # "COLLECT NOW", "PRIORITIZE", "MONITOR", "NORMAL"

    # Route simulation fields
    assigned_vehicle: Optional[str] = None
    cumulative_travel_time_minutes: Optional[float] = None
    cumulative_travel_time_hours: Optional[float] = None
    will_arrive_before_expiry: Optional[bool] = None
    thermal_margin_at_delivery_hours: Optional[float] = None


@dataclass
class RoutePlan:
    strategy_name: str  # "Traditional (Baseline)" or "Thermal-Life-Aware (Proposed)"
    strategy_type: str  # "BASELINE" or "PROPOSED"
    description: str
    total_shipments: int
    total_milk_volume_litres: float
    total_travel_time_minutes: float
    total_travel_time_hours: float
    total_distance_km: float
    total_stops: int
    delivered_before_expiry_count: int
    delivered_before_expiry_percentage: float
    expired_shipments_count: int
    expired_shipments_percentage: float
    at_risk_shipments_count: int
    unknown_feasibility_count: int
    stops: List[Dict[str, Any]]


@dataclass
class RouteComparison:
    baseline_plan: RoutePlan
    proposed_plan: RoutePlan
    improvement_delivered_count: int
    improvement_delivered_percentage: float
    time_difference_minutes: float
    distance_difference_km: float
    summary_verdict: str


def calculate_priority_score_and_reason(
    evaluation: ThermalLifeEvaluation,
    travel_time_minutes: Optional[float],
) -> Tuple[float, str, str]:
    """
    Deterministic, explainable priority scoring (0 - 100).
    Returns (priority_score, priority_reason, recommended_action).
    """
    # Edge case 1: Sensor unavailable
    if evaluation.sensor_status == "UNAVAILABLE":
        return (
            82.0,
            "Urgent manual review: Temperature telemetry is offline. Manual inspection and verification required.",
            "PRIORITIZE",
        )

    # Edge case 2: Location/Travel unavailable
    if evaluation.travel_time_hours is None or evaluation.thermal_buffer_hours is None:
        return (
            74.0,
            "Manual review: Location telemetry is unavailable; route feasibility cannot be confirmed.",
            "MONITOR",
        )

    # Edge case 3: Thermal life exhausted (0.0h)
    if evaluation.remaining_thermal_life_hours <= 0.0:
        return (
            100.0,
            "Critical alert: Thermal life is completely exhausted (0.0h remaining). Immediate quarantine required.",
            "COLLECT NOW",
        )

    # Negative thermal buffer (travel time exceeds remaining thermal life)
    if evaluation.thermal_buffer_hours <= 0.0:
        deficit = abs(evaluation.thermal_buffer_hours)
        score = min(98.0, round(90.0 + deficit * 5.0, 1))
        reason = (
            f"Critical urgency: Only {evaluation.remaining_thermal_life_hours:.1f}h thermal life remains "
            f"with {evaluation.travel_time_hours:.1f}h travel time (deficit of {deficit:.1f}h buffer)."
        )
        return score, reason, "COLLECT NOW"

    # High Urgency: Rescuable with tight thermal buffer <= 1.0 hour
    if evaluation.thermal_buffer_hours <= 1.0:
        score = min(92.0, round(80.0 + (1.0 - evaluation.thermal_buffer_hours) * 12.0, 1))
        reason = (
            f"High priority: Remaining thermal life is {evaluation.remaining_thermal_life_hours:.1f}h, "
            f"travel time is {evaluation.travel_time_hours:.1f}h, leaving an urgent {evaluation.thermal_buffer_hours:.1f}h thermal buffer."
        )
        action = "COLLECT NOW" if score >= 88.0 else "PRIORITIZE"
        return score, reason, action

    # Medium Urgency: Thermal buffer <= 3.0 hours
    if evaluation.thermal_buffer_hours <= 3.0:
        score = round(50.0 + (3.0 - evaluation.thermal_buffer_hours) * 12.0, 1)
        reason = (
            f"Medium priority: Remaining thermal life is {evaluation.remaining_thermal_life_hours:.1f}h "
            f"with {evaluation.travel_time_hours:.1f}h travel time (moderate {evaluation.thermal_buffer_hours:.1f}h buffer)."
        )
        return score, reason, "MONITOR"

    # Low Urgency / Normal
    score = max(5.0, round(45.0 - (evaluation.thermal_buffer_hours - 3.0) * 3.5, 1))
    reason = (
        f"Normal priority: Healthy thermal buffer of {evaluation.thermal_buffer_hours:.1f}h "
        f"({evaluation.remaining_thermal_life_hours:.1f}h remaining vs {evaluation.travel_time_hours:.1f}h travel time)."
    )
    return score, reason, "NORMAL"


def simulate_fleet_route_schedule(
    shipment_dicts: List[Dict[str, Any]],
    strategy_type: str,
    strategy_name: str,
    description: str,
    num_vehicles: int = NUM_COLLECTION_VEHICLES,
    overrides: Optional[Dict[str, Any]] = None,
) -> RoutePlan:
    """
    Simulates collection dispatch across the collection fleet (3 vehicles).
    Tracks cumulative travel time per vehicle and checks whether each shipment arrives before its thermal life expires.
    """
    vehicle_times = [0.0] * num_vehicles
    vehicle_names = [f"Route Truck {chr(65 + i)}" for i in range(num_vehicles)]

    total_dist_km = 0.0
    total_volume = 0.0
    delivered_count = 0
    expired_count = 0
    at_risk_count = 0
    unknown_count = 0

    evaluated_stops = []

    for idx, item in enumerate(shipment_dicts, start=1):
        travel_min = item.get("travel_time_minutes")
        dist_km = item.get("distance_km")
        milk_qty = float(item.get("milk_quantity_litres", 0.0))
        total_volume += milk_qty

        # Evaluate thermal life
        eval_result = evaluate_shipment_thermal_life(
            shipment_id=item["shipment_id"],
            temperature_history=item.get("temperature_history"),
            packaging_performance=float(item.get("packaging_performance", 0.8)),
            initial_thermal_life_hours=float(item.get("initial_thermal_life_hours", 12.0)),
            travel_time_minutes=travel_min,
            distance_km=dist_km,
            maximum_safe_temperature_c=float(item.get("maximum_safe_temperature_c", DEFAULT_MAX_SAFE_TEMPERATURE_C)),
        )

        score, reason, action = calculate_priority_score_and_reason(eval_result, travel_min)

        if overrides and item["shipment_id"] in overrides:
            override_entry = overrides[item["shipment_id"]]
            score = float(override_entry.get("new_priority_score", score))
            reason = f"[OPERATOR OVERRIDE] {override_entry.get('reason', reason)}"
            action = override_entry.get("new_action", action)

        # Assign to the vehicle with the current minimum cumulative time
        if travel_min is not None and dist_km is not None:
            v_idx = min(range(num_vehicles), key=lambda i: vehicle_times[i])
            vehicle_times[v_idx] += float(travel_min)
            total_dist_km += float(dist_km)

            cum_min = vehicle_times[v_idx]
            cum_hours = cum_min / 60.0
            assigned_v = vehicle_names[v_idx]

            # Feasibility check: does the vehicle arrive at this stop before thermal life expires?
            margin = eval_result.remaining_thermal_life_hours - cum_hours
            arrives_before_expiry = margin > 0.0 and eval_result.remaining_thermal_life_hours > 0.0

            if arrives_before_expiry:
                delivered_count += 1
                if margin <= 1.0 or eval_result.risk_level in ["HIGH", "CRITICAL"]:
                    at_risk_count += 1
            else:
                expired_count += 1
        else:
            cum_min = None
            cum_hours = None
            assigned_v = "Unassigned (Telemetry Missing)"
            margin = None
            arrives_before_expiry = None
            unknown_count += 1

        stop_record = {
            "stop_number": idx,
            "shipment_id": item["shipment_id"],
            "producer_id": item["producer_id"],
            "milk_quantity_litres": milk_qty,
            "packaging_type": item.get("packaging_type", "Standard Canister"),
            "packaging_performance": item.get("packaging_performance", 0.8),
            "distance_km": dist_km,
            "travel_time_minutes": travel_min,
            "assigned_vehicle": assigned_v,
            "cumulative_travel_time_minutes": round(cum_min, 1) if cum_min is not None else None,
            "cumulative_travel_time_hours": round(cum_hours, 2) if cum_hours is not None else None,
            "number_of_stops": item.get("number_of_stops", 1),
            "maximum_safe_temperature_c": item.get("maximum_safe_temperature_c", 6.0),
            "initial_thermal_life_hours": item.get("initial_thermal_life_hours", 12.0),
            "temperature_history": item.get("temperature_history") or [],

            # Thermal evaluation
            "sensor_status": eval_result.sensor_status,
            "latest_temperature_c": eval_result.latest_temperature_c,
            "average_temperature_c": eval_result.average_temperature_c,
            "maximum_temperature_c": eval_result.maximum_temperature_c,
            "temperature_breach": eval_result.temperature_breach,
            "total_thermal_life_consumed_hours": eval_result.total_thermal_life_consumed_hours,
            "remaining_thermal_life_hours": eval_result.remaining_thermal_life_hours,
            "travel_time_hours": eval_result.travel_time_hours,
            "thermal_buffer_hours": eval_result.thermal_buffer_hours,
            "risk_level": eval_result.risk_level,
            "route_feasibility": eval_result.route_feasibility,
            "manual_review_required": eval_result.manual_review_required,
            "fallback_message": eval_result.fallback_message,
            "model_label": eval_result.model_label,

            # Prioritization
            "priority_score": score,
            "priority_rank": idx,
            "priority_reason": reason,
            "recommended_action": action,

            # Arrival metrics
            "will_arrive_before_expiry": arrives_before_expiry,
            "thermal_margin_at_delivery_hours": round(margin, 2) if margin is not None else None,
        }
        evaluated_stops.append(stop_record)

    total_time_min = sum(vehicle_times)
    total_time_hours = total_time_min / 60.0
    known_total = delivered_count + expired_count
    pct_delivered = round((delivered_count / known_total * 100.0), 1) if known_total > 0 else 0.0
    pct_expired = round((expired_count / known_total * 100.0), 1) if known_total > 0 else 0.0

    return RoutePlan(
        strategy_name=strategy_name,
        strategy_type=strategy_type,
        description=description,
        total_shipments=len(shipment_dicts),
        total_milk_volume_litres=round(total_volume, 1),
        total_travel_time_minutes=round(total_time_min, 1),
        total_travel_time_hours=round(total_time_hours, 2),
        total_distance_km=round(total_dist_km, 1),
        total_stops=len(shipment_dicts),
        delivered_before_expiry_count=delivered_count,
        delivered_before_expiry_percentage=pct_delivered,
        expired_shipments_count=expired_count,
        expired_shipments_percentage=pct_expired,
        at_risk_shipments_count=at_risk_count,
        unknown_feasibility_count=unknown_count,
        stops=evaluated_stops,
    )


def generate_baseline_route_plan(raw_shipments: List[Dict[str, Any]]) -> RoutePlan:
    """
    BASELINE STRATEGY:
    Traditional route priority based strictly on:
    1. shorter travel time
    2. shorter distance
    3. fewer stops
    (Completely ignores remaining thermal life)
    """
    sorted_shipments = sorted(
        raw_shipments,
        key=lambda s: (
            999999 if s.get("travel_time_minutes") is None else float(s["travel_time_minutes"]),
            999999 if s.get("distance_km") is None else float(s["distance_km"]),
            int(s.get("number_of_stops", 0)),
        ),
    )

    return simulate_fleet_route_schedule(
        shipment_dicts=sorted_shipments,
        strategy_type="BASELINE",
        strategy_name="Traditional (Distance/Time-Only)",
        description="Traditional route planning prioritizing nearest stops and shortest travel time without considering remaining thermal life.",
    )


def generate_proposed_route_plan(
    raw_shipments: List[Dict[str, Any]],
    overrides: Optional[Dict[str, Any]] = None,
) -> RoutePlan:
    """
    PROPOSED STRATEGY:
    Thermal-life-aware prioritization.
    Prioritizes shipments based on:
    1. Manual operator overrides
    2. Rescuable urgent shipments (positive thermal buffer <= 3.5h)
    3. Rescuable safe shipments (thermal buffer > 3.5h)
    4. Sensor / Location manual reviews
    5. Exhausted shipments
    """
    scored_items = []
    for item in raw_shipments:
        eval_result = evaluate_shipment_thermal_life(
            shipment_id=item["shipment_id"],
            temperature_history=item.get("temperature_history"),
            packaging_performance=float(item.get("packaging_performance", 0.8)),
            initial_thermal_life_hours=float(item.get("initial_thermal_life_hours", 12.0)),
            travel_time_minutes=item.get("travel_time_minutes"),
            distance_km=item.get("distance_km"),
            maximum_safe_temperature_c=float(item.get("maximum_safe_temperature_c", DEFAULT_MAX_SAFE_TEMPERATURE_C)),
        )
        score, reason, action = calculate_priority_score_and_reason(
            eval_result, item.get("travel_time_minutes")
        )

        is_overridden = False
        if overrides and item["shipment_id"] in overrides:
            override_entry = overrides[item["shipment_id"]]
            score = float(override_entry.get("new_priority_score", score))
            reason = f"[OPERATOR OVERRIDE] {override_entry.get('reason', reason)}"
            action = override_entry.get("new_action", action)
            is_overridden = True

        # Grouping for intelligent rescue sequencing:
        # Group 0: Overridden shipments
        # Group 1: Rescuable urgent shipments (remaining > 0 and buffer <= 3.5h)
        # Group 2: Rescuable safe shipments (remaining > 0 and buffer > 3.5h)
        # Group 3: Telemetry review (sensor or location missing)
        # Group 4: Exhausted shipments (remaining <= 0)
        if is_overridden:
            group = 0
            sort_val = -score
        elif (
            eval_result.remaining_thermal_life_hours > 0.0
            and eval_result.thermal_buffer_hours is not None
            and eval_result.thermal_buffer_hours > 0.0
            and eval_result.thermal_buffer_hours <= 3.5
        ):
            group = 1
            sort_val = eval_result.thermal_buffer_hours  # tightest buffer first
        elif (
            eval_result.remaining_thermal_life_hours > 0.0
            and eval_result.thermal_buffer_hours is not None
            and eval_result.thermal_buffer_hours > 3.5
        ):
            group = 2
            sort_val = -score
        elif eval_result.manual_review_required:
            group = 3
            sort_val = -score
        else:
            group = 4
            sort_val = -score

        scored_items.append(
            {
                "shipment": item,
                "group": group,
                "sort_val": sort_val,
                "score": score,
                "travel": float(item.get("travel_time_minutes", 999.0)) if item.get("travel_time_minutes") is not None else 999.0,
            }
        )

    scored_items.sort(key=lambda x: (x["group"], x["sort_val"], x["travel"]))
    ordered_shipments = [x["shipment"] for x in scored_items]

    return simulate_fleet_route_schedule(
        shipment_dicts=ordered_shipments,
        strategy_type="PROPOSED",
        strategy_name="Thermal-Life-Aware Prioritisation",
        description="Proposed route strategy prioritizing shipments based on remaining thermal life, thermal buffer after travel, and imminent risk.",
        overrides=overrides,
    )


def compare_route_plans(baseline: RoutePlan, proposed: RoutePlan) -> RouteComparison:
    """
    Computes comparative statistics between Baseline and Proposed route strategies.
    """
    improvement_delivered_count = (
        proposed.delivered_before_expiry_count - baseline.delivered_before_expiry_count
    )
    improvement_pct = round(
        proposed.delivered_before_expiry_percentage - baseline.delivered_before_expiry_percentage, 1
    )
    time_diff = round(proposed.total_travel_time_minutes - baseline.total_travel_time_minutes, 1)
    dist_diff = round(proposed.total_distance_km - baseline.total_distance_km, 1)

    if improvement_delivered_count > 0:
        verdict = (
            f"The Thermal-Life-Aware route successfully rescues {improvement_delivered_count} additional milk shipments "
            f"(+{improvement_pct}% deliverable before thermal life expiry) compared to traditional distance-only routing."
        )
    else:
        verdict = "Both routes achieved identical delivery outcomes under current simulation constraints."

    return RouteComparison(
        baseline_plan=baseline,
        proposed_plan=proposed,
        improvement_delivered_count=improvement_delivered_count,
        improvement_delivered_percentage=improvement_pct,
        time_difference_minutes=time_diff,
        distance_difference_km=dist_diff,
        summary_verdict=verdict,
    )
