"""
Typed Data & API Request/Response Schemas

Provides strict dataclass type contracts matching frontend TypeScript interfaces.
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field, asdict


@dataclass
class TemperatureReading:
    hour: int
    temperature_c: float


@dataclass
class ShipmentBase:
    shipment_id: str
    producer_id: str
    milk_quantity_litres: float
    temperature_history: Optional[List[float]] = None
    packaging_type: str = "Standard Canister"
    packaging_performance: float = 0.8
    distance_km: Optional[float] = None
    travel_time_minutes: Optional[float] = None
    number_of_stops: int = 1
    maximum_safe_temperature_c: float = 6.0
    initial_thermal_life_hours: float = 12.0


@dataclass
class ThermalLifeResponse:
    shipment_id: str
    sensor_status: str  # "ONLINE" or "UNAVAILABLE"
    latest_temperature_c: Optional[float] = None
    average_temperature_c: Optional[float] = None
    maximum_temperature_c: Optional[float] = None
    temperature_breach: bool = False
    initial_thermal_life_hours: float = 12.0
    total_thermal_life_consumed_hours: float = 0.0
    remaining_thermal_life_hours: float = 12.0
    travel_time_hours: Optional[float] = None
    thermal_buffer_hours: Optional[float] = None
    risk_level: str = "LOW"  # "CRITICAL", "HIGH", "MEDIUM", "LOW", "MANUAL_REVIEW"
    route_feasibility: str = "FEASIBLE"  # "FEASIBLE", "INFEASIBLE", "UNKNOWN"
    manual_review_required: bool = False
    fallback_message: Optional[str] = None
    model_label: str = "Simulation-based thermal-life estimate"


@dataclass
class PrioritizedShipmentDetail:
    stop_number: int
    shipment_id: str
    producer_id: str
    milk_quantity_litres: float
    packaging_type: str
    packaging_performance: float
    distance_km: Optional[float] = None
    travel_time_minutes: Optional[float] = None
    cumulative_travel_time_minutes: Optional[float] = None
    cumulative_travel_time_hours: Optional[float] = None
    number_of_stops: int = 1
    maximum_safe_temperature_c: float = 6.0
    initial_thermal_life_hours: float = 12.0
    temperature_history: List[float] = field(default_factory=list)

    # Thermal evaluation
    sensor_status: str = "ONLINE"
    latest_temperature_c: Optional[float] = None
    average_temperature_c: Optional[float] = None
    maximum_temperature_c: Optional[float] = None
    temperature_breach: bool = False
    total_thermal_life_consumed_hours: float = 0.0
    remaining_thermal_life_hours: float = 12.0
    travel_time_hours: Optional[float] = None
    thermal_buffer_hours: Optional[float] = None
    risk_level: str = "LOW"
    route_feasibility: str = "FEASIBLE"
    manual_review_required: bool = False
    fallback_message: Optional[str] = None
    model_label: str = "Simulation-based thermal-life estimate"

    # Prioritization
    priority_score: float = 0.0
    priority_rank: int = 1
    priority_reason: str = ""
    recommended_action: str = "NORMAL"

    # Cumulative arrival metrics
    will_arrive_before_expiry: Optional[bool] = None
    thermal_margin_at_delivery_hours: Optional[float] = None


@dataclass
class RoutePlanResponse:
    strategy_name: str
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
    stops: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class RouteComparisonResponse:
    baseline_plan: Dict[str, Any]
    proposed_plan: Dict[str, Any]
    improvement_delivered_count: int
    improvement_delivered_percentage: float
    time_difference_minutes: float
    distance_difference_km: float
    summary_verdict: str


@dataclass
class OverrideRequest:
    shipment_id: str
    overridden_priority_score: float
    overridden_action: str  # "COLLECT NOW", "PRIORITIZE", "MONITOR", "NORMAL"
    reason: str


@dataclass
class OverrideRecord:
    shipment_id: str
    original_priority_score: float
    original_action: str
    new_priority_score: float
    new_action: str
    reason: str
    timestamp: str


@dataclass
class RiskCounts:
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    manual_review: int = 0


@dataclass
class SummaryResponse:
    total_shipments: int
    total_milk_volume_litres: float
    high_risk_shipments: int
    critical_risk_shipments: int
    average_remaining_thermal_life_hours: float
    shipments_at_risk_of_expiry: int
    deliverable_before_expiry_percentage: float
    baseline_deliverable_percentage: float
    deliverable_percentage_gain: float
    risk_distribution: Dict[str, int]
    sensor_unavailable_count: int
    location_unavailable_count: int
    total_overrides_applied: int
    simulation_label: str = "Simulation-based thermal-life estimate"


@dataclass
class HealthResponse:
    status: str = "healthy"
    service: str = "Remaining Thermal Life Route Prioritiser"
    total_shipments_loaded: int = 28
    version: str = "1.0.0"
    simulation_mode: bool = True
