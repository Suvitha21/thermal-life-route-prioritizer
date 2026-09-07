"""
Shipment Service

Manages canonical dataset loading, routing computation orchestration,
manual operator override audit trail, and summary KPI aggregation.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import asdict

from algorithms.thermal_life import (
    evaluate_shipment_thermal_life,
    ThermalLifeEvaluation,
    DEFAULT_MAX_SAFE_TEMPERATURE_C,
)
from algorithms.route_prioritizer import (
    generate_baseline_route_plan,
    generate_proposed_route_plan,
    compare_route_plans,
    calculate_priority_score_and_reason,
    RoutePlan,
    RouteComparison,
)
from backend.models import (
    OverrideRequest,
    OverrideRecord,
    SummaryResponse,
    RoutePlanResponse,
    RouteComparisonResponse,
)


class ShipmentService:
    def __init__(self, data_file_path: Optional[str] = None):
        if data_file_path is None:
            self.data_file = Path(__file__).parent.parent.parent / "data" / "shipments.json"
        else:
            self.data_file = Path(data_file_path)

        self._shipments_cache: List[Dict[str, Any]] = []
        self._overrides_audit_trail: List[Dict[str, Any]] = []
        self._active_overrides: Dict[str, Dict[str, Any]] = {}
        self.load_data()

    def load_data(self):
        """Loads canonical dataset from JSON file."""
        if not self.data_file.exists():
            raise FileNotFoundError(f"Canonical dataset file not found at: {self.data_file.resolve()}")

        with open(self.data_file, "r", encoding="utf-8") as f:
            self._shipments_cache = json.load(f)

    def get_all_raw_shipments(self) -> List[Dict[str, Any]]:
        return self._shipments_cache

    def get_shipment_by_id(self, shipment_id: str) -> Optional[Dict[str, Any]]:
        for s in self._shipments_cache:
            if s["shipment_id"].upper() == shipment_id.upper():
                return s
        return None

    def evaluate_shipment(self, shipment_id: str) -> Optional[ThermalLifeEvaluation]:
        shipment = self.get_shipment_by_id(shipment_id)
        if not shipment:
            return None
        return evaluate_shipment_thermal_life(
            shipment_id=shipment["shipment_id"],
            temperature_history=shipment.get("temperature_history"),
            packaging_performance=float(shipment.get("packaging_performance", 0.8)),
            initial_thermal_life_hours=float(shipment.get("initial_thermal_life_hours", 12.0)),
            travel_time_minutes=shipment.get("travel_time_minutes"),
            distance_km=shipment.get("distance_km"),
            maximum_safe_temperature_c=float(shipment.get("maximum_safe_temperature_c", DEFAULT_MAX_SAFE_TEMPERATURE_C)),
        )

    def get_baseline_route(self) -> RoutePlan:
        return generate_baseline_route_plan(self._shipments_cache)

    def get_proposed_route(self) -> RoutePlan:
        return generate_proposed_route_plan(self._shipments_cache, self._active_overrides)

    def get_route_comparison(self) -> RouteComparison:
        baseline = self.get_baseline_route()
        proposed = self.get_proposed_route()
        return compare_route_plans(baseline, proposed)

    def apply_override(self, req: OverrideRequest) -> OverrideRecord:
        shipment = self.get_shipment_by_id(req.shipment_id)
        if not shipment:
            raise ValueError(f"Shipment {req.shipment_id} not found")

        eval_res = self.evaluate_shipment(req.shipment_id)
        orig_score, orig_reason, orig_action = calculate_priority_score_and_reason(
            eval_res, shipment.get("travel_time_minutes")
        )

        now_str = datetime.now().isoformat(timespec="seconds")

        override_entry = {
            "shipment_id": shipment["shipment_id"],
            "original_priority_score": orig_score,
            "original_action": orig_action,
            "new_priority_score": req.overridden_priority_score,
            "new_action": req.overridden_action,
            "reason": req.reason,
            "timestamp": now_str,
        }

        self._active_overrides[shipment["shipment_id"]] = {
            "new_priority_score": req.overridden_priority_score,
            "new_action": req.overridden_action,
            "reason": req.reason,
            "timestamp": now_str,
        }
        self._overrides_audit_trail.append(override_entry)

        return OverrideRecord(
            shipment_id=shipment["shipment_id"],
            original_priority_score=orig_score,
            original_action=orig_action,
            new_priority_score=req.overridden_priority_score,
            new_action=req.overridden_action,
            reason=req.reason,
            timestamp=now_str,
        )

    def get_all_overrides(self) -> List[Dict[str, Any]]:
        return self._overrides_audit_trail

    def get_summary(self) -> SummaryResponse:
        comparison = self.get_route_comparison()
        proposed_plan = comparison.proposed_plan
        baseline_plan = comparison.baseline_plan

        total_shipments = len(self._shipments_cache)
        total_volume = sum(float(s.get("milk_quantity_litres", 0.0)) for s in self._shipments_cache)

        risk_counts = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "manual_review": 0,
        }

        total_remaining_life = 0.0
        sensor_unavail = 0
        loc_unavail = 0
        at_risk_expiry = 0

        for stop in proposed_plan.stops:
            r_level = stop["risk_level"].lower()
            if r_level in risk_counts:
                risk_counts[r_level] += 1
            else:
                risk_counts["manual_review"] += 1

            total_remaining_life += stop["remaining_thermal_life_hours"]

            if stop["sensor_status"] == "UNAVAILABLE":
                sensor_unavail += 1
            if stop["route_feasibility"] == "UNKNOWN":
                loc_unavail += 1
            if stop["risk_level"] in ["HIGH", "CRITICAL"] or (
                stop["thermal_buffer_hours"] is not None and stop["thermal_buffer_hours"] <= 1.0
            ):
                at_risk_expiry += 1

        avg_remaining_life = (
            round(total_remaining_life / total_shipments, 2) if total_shipments > 0 else 0.0
        )

        gain = round(
            proposed_plan.delivered_before_expiry_percentage
            - baseline_plan.delivered_before_expiry_percentage,
            1,
        )

        return SummaryResponse(
            total_shipments=total_shipments,
            total_milk_volume_litres=round(total_volume, 1),
            high_risk_shipments=risk_counts["high"],
            critical_risk_shipments=risk_counts["critical"],
            average_remaining_thermal_life_hours=avg_remaining_life,
            shipments_at_risk_of_expiry=at_risk_expiry,
            deliverable_before_expiry_percentage=proposed_plan.delivered_before_expiry_percentage,
            baseline_deliverable_percentage=baseline_plan.delivered_before_expiry_percentage,
            deliverable_percentage_gain=gain,
            risk_distribution=risk_counts,
            sensor_unavailable_count=sensor_unavail,
            location_unavailable_count=loc_unavail,
            total_overrides_applied=len(self._overrides_audit_trail),
            simulation_label="Simulation-based thermal-life estimate",
        )


# Singleton instance
shipment_service = ShipmentService()
