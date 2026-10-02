"""
Shipment Service

Manages canonical dataset loading, routing computation orchestration,
persistent manual operator override audit trail, edge-case alert synthesis,
and delivery verification aggregation.
"""

import json
import uuid
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
    EdgeCaseAlert,
    DeliveryVerificationResponse,
)


class ShipmentService:
    def __init__(self, data_file_path: Optional[str] = None):
        if data_file_path is None:
            self.data_file = Path(__file__).parent.parent.parent / "data" / "shipments.json"
        else:
            self.data_file = Path(data_file_path)

        self.audit_file = self.data_file.parent / "override_audit.json"
        self._shipments_cache: List[Dict[str, Any]] = []
        self._overrides_audit_trail: List[Dict[str, Any]] = []
        self._active_overrides: Dict[str, Dict[str, Any]] = {}
        self.load_data()
        self.load_audit_trail()

    def load_data(self):
        """Loads canonical dataset from JSON file."""
        if not self.data_file.exists():
            raise FileNotFoundError(f"Canonical dataset file not found at: {self.data_file.resolve()}")

        with open(self.data_file, "r", encoding="utf-8") as f:
            self._shipments_cache = json.load(f)

    def load_audit_trail(self):
        """Loads persisted manual override audit records from disk."""
        if self.audit_file.exists():
            try:
                with open(self.audit_file, "r", encoding="utf-8") as f:
                    records = json.load(f)
                    if isinstance(records, list):
                        self._overrides_audit_trail = records
                        for rec in records:
                            sid = rec.get("shipment_id")
                            if sid:
                                self._active_overrides[sid] = {
                                    "new_priority_score": rec.get("new_priority_score"),
                                    "new_action": rec.get("new_action"),
                                    "reason": rec.get("reason"),
                                    "timestamp": rec.get("timestamp"),
                                    "operator_id": rec.get("operator_id", "DEMO-OPERATOR-1"),
                                }
            except Exception:
                self._overrides_audit_trail = []
                self._active_overrides = {}

    def _save_audit_trail(self):
        """Persists audit trail to JSON storage."""
        try:
            with open(self.audit_file, "w", encoding="utf-8") as f:
                json.dump(self._overrides_audit_trail, f, indent=2)
        except Exception as e:
            print(f"[WARN] Failed to persist audit trail: {e}")

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

    def get_all_thermal_evaluations(self) -> List[Dict[str, Any]]:
        """Returns thermal evaluations for all canonical shipments."""
        evaluations = []
        for s in self._shipments_cache:
            res = evaluate_shipment_thermal_life(
                shipment_id=s["shipment_id"],
                temperature_history=s.get("temperature_history"),
                packaging_performance=float(s.get("packaging_performance", 0.8)),
                initial_thermal_life_hours=float(s.get("initial_thermal_life_hours", 12.0)),
                travel_time_minutes=s.get("travel_time_minutes"),
                distance_km=s.get("distance_km"),
                maximum_safe_temperature_c=float(s.get("maximum_safe_temperature_c", DEFAULT_MAX_SAFE_TEMPERATURE_C)),
            )
            evaluations.append(asdict(res))
        return evaluations

    def get_baseline_route(self) -> RoutePlan:
        return generate_baseline_route_plan(self._shipments_cache)

    def get_proposed_route(self) -> RoutePlan:
        return generate_proposed_route_plan(self._shipments_cache, self._active_overrides)

    def get_priority_queue(self) -> List[Dict[str, Any]]:
        proposed = self.get_proposed_route()
        return proposed.stops

    def get_route_comparison(self) -> RouteComparison:
        baseline = self.get_baseline_route()
        proposed = self.get_proposed_route()
        return compare_route_plans(baseline, proposed)

    def get_delivery_results(self) -> Dict[str, Any]:
        """Delivery verification metrics across all stops."""
        proposed = self.get_proposed_route()
        return {
            "total_stops": proposed.total_stops,
            "delivered_before_expiry_count": proposed.delivered_before_expiry_count,
            "delivered_before_expiry_percentage": proposed.delivered_before_expiry_percentage,
            "expired_count": proposed.expired_shipments_count,
            "expired_percentage": proposed.expired_shipments_percentage,
            "at_risk_count": proposed.at_risk_shipments_count,
            "unknown_feasibility_count": proposed.unknown_feasibility_count,
            "stops": proposed.stops,
        }

    def get_edge_case_alerts(self) -> List[Dict[str, Any]]:
        """
        Synthesizes structured operational edge-case alerts:
        1. SENSOR_OFFLINE: Missing temperature telemetry
        2. LOCATION_MISSING: Missing GPS / distance / travel time
        3. THERMAL_EXHAUSTED: Remaining thermal life <= 0.0h
        4. TEMPERATURE_BREACH: Latest temp >= maximum safe temperature
        5. MANUAL_OVERRIDE: Active operator manual intervention
        """
        alerts = []
        proposed = self.get_proposed_route()

        for stop in proposed.stops:
            sid = stop["shipment_id"]

            # Alert 1: Active Manual Override
            if sid in self._active_overrides:
                ov = self._active_overrides[sid]
                alerts.append({
                    "alert_id": f"ALERT-OVR-{sid}",
                    "shipment_id": sid,
                    "alert_type": "MANUAL_OVERRIDE",
                    "severity": "WARNING",
                    "title": f"Manual Override Active: {sid}",
                    "description": f"Operator adjusted priority to {ov.get('new_priority_score')} ({ov.get('new_action')}). Reason: {ov.get('reason')}",
                    "recommended_action": f"Verify collection order for {sid}; operational authorization logged.",
                    "timestamp": ov.get("timestamp", datetime.now().isoformat()),
                })

            # Alert 2: Thermal Exhaustion
            if stop.get("is_thermal_exhausted") or stop.get("remaining_thermal_life_hours", 0) <= 0:
                alerts.append({
                    "alert_id": f"ALERT-EXH-{sid}",
                    "shipment_id": sid,
                    "alert_type": "THERMAL_EXHAUSTED",
                    "severity": "CRITICAL",
                    "title": f"Thermal Life Exhausted (0.0h): {sid}",
                    "description": f"Milk batch has exhausted all estimated thermal reserves before collection dispatch. Acidification and spoilage imminent.",
                    "recommended_action": "Quarantine batch immediately on arrival; perform mandatory alcohol and acidity testing.",
                    "timestamp": datetime.now().isoformat(timespec="seconds"),
                })

            # Alert 3: Missing Sensor Data
            if stop.get("sensor_status") == "UNAVAILABLE":
                alerts.append({
                    "alert_id": f"ALERT-SEN-{sid}",
                    "shipment_id": sid,
                    "alert_type": "SENSOR_OFFLINE",
                    "severity": "HIGH",
                    "title": f"Temperature Telemetry Offline: {sid}",
                    "description": "Chilling tank telemetry is unavailable. No temperature readings received from producer sensor node.",
                    "recommended_action": "Dispatch driver with handheld calibrated thermometer probe for on-site manual dip verification.",
                    "timestamp": datetime.now().isoformat(timespec="seconds"),
                })

            # Alert 4: Missing Location Data
            if stop.get("route_feasibility") == "UNKNOWN":
                alerts.append({
                    "alert_id": f"ALERT-LOC-{sid}",
                    "shipment_id": sid,
                    "alert_type": "LOCATION_MISSING",
                    "severity": "WARNING",
                    "title": f"Location Telemetry Missing: {sid}",
                    "description": "Road distance and travel time unavailable. Automated route arrival feasibility cannot be calculated.",
                    "recommended_action": "Contact driver for manual odometer/GPS check; assign stop sequence via manual override if feasible.",
                    "timestamp": datetime.now().isoformat(timespec="seconds"),
                })

            # Alert 5: Temperature Breach (Online sensor but breaching threshold)
            if stop.get("temperature_breach") and not stop.get("is_thermal_exhausted"):
                latest_t = stop.get("latest_temperature_c")
                max_t = stop.get("maximum_safe_temperature_c")
                alerts.append({
                    "alert_id": f"ALERT-BRC-{sid}",
                    "shipment_id": sid,
                    "alert_type": "TEMPERATURE_BREACH",
                    "severity": "HIGH",
                    "title": f"Temperature Limit Breach ({latest_t}°C > {max_t}°C): {sid}",
                    "description": f"Latest temperature reading {latest_t}°C exceeds safe regulatory threshold ({max_t}°C). Accelerated degradation underway.",
                    "recommended_action": "Expedite collection vehicle dispatch or inspect local cooler power supply immediately.",
                    "timestamp": datetime.now().isoformat(timespec="seconds"),
                })

        return alerts

    def apply_override(self, req: OverrideRequest) -> OverrideRecord:
        shipment = self.get_shipment_by_id(req.shipment_id)
        if not shipment:
            raise ValueError(f"Shipment {req.shipment_id} not found")

        eval_res = self.evaluate_shipment(req.shipment_id)
        orig_score, orig_reason, orig_action = calculate_priority_score_and_reason(
            eval_res, shipment.get("travel_time_minutes")
        )

        now_str = datetime.now().isoformat(timespec="seconds")
        audit_id = f"OVR-{uuid.uuid4().hex[:8].upper()}"
        operator = req.operator_id or "DEMO-OPERATOR-1"

        override_entry = {
            "audit_id": audit_id,
            "shipment_id": shipment["shipment_id"],
            "original_priority_score": orig_score,
            "original_action": orig_action,
            "new_priority_score": req.overridden_priority_score,
            "new_action": req.overridden_action,
            "reason": req.reason,
            "operator_id": operator,
            "timestamp": now_str,
        }

        self._active_overrides[shipment["shipment_id"]] = {
            "new_priority_score": req.overridden_priority_score,
            "new_action": req.overridden_action,
            "reason": req.reason,
            "operator_id": operator,
            "timestamp": now_str,
            "audit_id": audit_id,
        }
        self._overrides_audit_trail.append(override_entry)
        self._save_audit_trail()

        return OverrideRecord(
            shipment_id=shipment["shipment_id"],
            original_priority_score=orig_score,
            original_action=orig_action,
            new_priority_score=req.overridden_priority_score,
            new_action=req.overridden_action,
            reason=req.reason,
            timestamp=now_str,
            operator_id=operator,
            audit_id=audit_id,
        )

    def reset_overrides(self) -> Dict[str, Any]:
        """Clears all active manual overrides and resets to pure algorithmic schedule."""
        cleared_count = len(self._active_overrides)
        self._active_overrides.clear()
        self._overrides_audit_trail.clear()
        self._save_audit_trail()
        return {"status": "success", "cleared_count": cleared_count, "message": "Manual overrides cleared"}

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
        exhausted_count = 0

        for stop in proposed_plan.stops:
            r_level = stop["risk_level"].lower()
            if r_level in risk_counts:
                risk_counts[r_level] += 1
            else:
                risk_counts["manual_review"] += 1

            total_remaining_life += stop["remaining_thermal_life_hours"]

            if stop.get("is_thermal_exhausted") or stop.get("remaining_thermal_life_hours", 0) <= 0.0:
                exhausted_count += 1
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
            thermal_exhausted_shipments=exhausted_count,
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
            trade_off_summary=comparison.trade_off_analysis,
        )


# Singleton instance
shipment_service = ShipmentService()
