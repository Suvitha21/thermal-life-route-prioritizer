"""
Remaining Thermal Life Calculation Module (Simulation Model)

IMPORTANT DISCLAIMER:
This is a simulation-based thermal-life estimate for an academic prototype.
It is NOT a scientifically validated microbiological shelf-life prediction model.
"""

from typing import List, Optional, Tuple, Dict, Any
from dataclasses import dataclass

# Configurable Simulation Constants
BASELINE_TEMPERATURE_C: float = 4.0
DEFAULT_MAX_SAFE_TEMPERATURE_C: float = 6.0
DEFAULT_READING_INTERVAL_HOURS: float = 1.0
MODEL_DESCRIPTION: str = "Simulation-based thermal-life estimate"


@dataclass
class ThermalLifeEvaluation:
    shipment_id: str
    sensor_status: str  # "ONLINE" or "UNAVAILABLE"
    latest_temperature_c: Optional[float]
    average_temperature_c: Optional[float]
    maximum_temperature_c: Optional[float]
    temperature_breach: bool
    initial_thermal_life_hours: float
    total_thermal_life_consumed_hours: float
    remaining_thermal_life_hours: float
    travel_time_hours: Optional[float]
    thermal_buffer_hours: Optional[float]
    risk_level: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW", "MANUAL_REVIEW"
    route_feasibility: str  # "FEASIBLE", "INFEASIBLE", "UNKNOWN"
    manual_review_required: bool
    fallback_message: Optional[str]
    model_label: str = MODEL_DESCRIPTION


def calculate_temperature_ratio(temperature_c: float, baseline_temp_c: float = BASELINE_TEMPERATURE_C) -> float:
    """
    temperature_ratio = max(0.5, temperature / baseline_temperature)
    """
    if baseline_temp_c <= 0:
        baseline_temp_c = BASELINE_TEMPERATURE_C
    return max(0.5, temperature_c / baseline_temp_c)


def calculate_packaging_multiplier(packaging_performance: float) -> float:
    """
    packaging_multiplier = max(1.0, 2.0 - packaging_performance)
    packaging_performance should normally be between 0.0 and 1.0.
    """
    # Sanitize invalid/negative packaging performance
    safe_performance = max(0.0, min(1.0, float(packaging_performance)))
    return max(1.0, 2.0 - safe_performance)


def calculate_hourly_consumption(
    temperature_c: float,
    packaging_performance: float,
    reading_interval_hours: float = DEFAULT_READING_INTERVAL_HOURS,
    baseline_temp_c: float = BASELINE_TEMPERATURE_C,
) -> float:
    """
    hourly_consumption = reading_interval_hours * temperature_ratio * packaging_multiplier
    """
    ratio = calculate_temperature_ratio(temperature_c, baseline_temp_c)
    multiplier = calculate_packaging_multiplier(packaging_performance)
    return reading_interval_hours * ratio * multiplier


def calculate_total_thermal_consumed(
    temperature_history: List[float],
    packaging_performance: float,
    reading_interval_hours: float = DEFAULT_READING_INTERVAL_HOURS,
    baseline_temp_c: float = BASELINE_TEMPERATURE_C,
) -> float:
    """
    Total thermal life consumed = sum(hourly_consumption)
    """
    if not temperature_history:
        return 0.0
    return sum(
        calculate_hourly_consumption(
            temp, packaging_performance, reading_interval_hours, baseline_temp_c
        )
        for temp in temperature_history
    )


def calculate_remaining_thermal_life(
    initial_thermal_life_hours: float,
    total_consumed_hours: float,
) -> float:
    """
    remaining_thermal_life = max(0, initial_thermal_life_hours - total_consumed)
    """
    safe_initial = max(0.0, float(initial_thermal_life_hours))
    return max(0.0, safe_initial - total_consumed_hours)


def calculate_thermal_buffer(
    remaining_thermal_life_hours: float,
    travel_time_minutes: Optional[float],
) -> Tuple[Optional[float], Optional[float]]:
    """
    travel_time_hours = travel_time_minutes / 60
    thermal_buffer = remaining_thermal_life_hours - travel_time_hours
    Returns (travel_time_hours, thermal_buffer)
    """
    if travel_time_minutes is None:
        return None, None
    travel_time_hours = max(0.0, float(travel_time_minutes)) / 60.0
    thermal_buffer = remaining_thermal_life_hours - travel_time_hours
    return travel_time_hours, thermal_buffer


def classify_risk(
    thermal_buffer_hours: Optional[float],
    remaining_thermal_life_hours: float,
    latest_temperature_c: Optional[float],
    maximum_safe_temperature_c: float = DEFAULT_MAX_SAFE_TEMPERATURE_C,
    sensor_unavailable: bool = False,
    location_unavailable: bool = False,
) -> str:
    """
    ONE centralized risk classification function:

    CRITICAL:
        thermal_buffer <= 0
        OR remaining_thermal_life <= 0
        OR latest_temperature >= maximum_safe_temperature + 1

    HIGH:
        thermal_buffer <= 1
        OR latest_temperature >= maximum_safe_temperature

    MEDIUM:
        thermal_buffer <= 3

    LOW:
        thermal_buffer > 3
    """
    if sensor_unavailable or location_unavailable:
        # If missing critical sensor readings or location, flag manual review / high caution
        if remaining_thermal_life_hours <= 0:
            return "CRITICAL"
        return "MANUAL_REVIEW"

    # CRITICAL check
    if (
        (thermal_buffer_hours is not None and thermal_buffer_hours <= 0.0)
        or remaining_thermal_life_hours <= 0.0
        or (latest_temperature_c is not None and latest_temperature_c >= maximum_safe_temperature_c + 1.0)
    ):
        return "CRITICAL"

    # HIGH check
    if (
        (thermal_buffer_hours is not None and thermal_buffer_hours <= 1.0)
        or (latest_temperature_c is not None and latest_temperature_c >= maximum_safe_temperature_c)
    ):
        return "HIGH"

    # MEDIUM check
    if thermal_buffer_hours is not None and thermal_buffer_hours <= 3.0:
        return "MEDIUM"

    # LOW check
    if thermal_buffer_hours is not None and thermal_buffer_hours > 3.0:
        return "LOW"

    # Fallback if buffer cannot be evaluated
    if remaining_thermal_life_hours <= 2.0:
        return "HIGH"
    elif remaining_thermal_life_hours <= 5.0:
        return "MEDIUM"
    return "LOW"


def evaluate_shipment_thermal_life(
    shipment_id: str,
    temperature_history: Optional[List[float]],
    packaging_performance: float,
    initial_thermal_life_hours: float,
    travel_time_minutes: Optional[float],
    distance_km: Optional[float],
    maximum_safe_temperature_c: float = DEFAULT_MAX_SAFE_TEMPERATURE_C,
    reading_interval_hours: float = DEFAULT_READING_INTERVAL_HOURS,
    baseline_temp_c: float = BASELINE_TEMPERATURE_C,
) -> ThermalLifeEvaluation:
    """
    Complete thermal life evaluation for a single shipment with robust edge case handling.
    """
    # Validation & Fallback Check: Sensor data
    sensor_unavailable = temperature_history is None or len(temperature_history) == 0
    location_unavailable = travel_time_minutes is None or distance_km is None

    fallback_messages = []
    if sensor_unavailable:
        sensor_status = "UNAVAILABLE"
        latest_temp = None
        avg_temp = None
        max_temp = None
        temp_breach = False
        consumed = 0.0
        remaining_life = initial_thermal_life_hours
        fallback_messages.append(
            "Temperature data unavailable — using last known operational state / manual review required."
        )
    else:
        sensor_status = "ONLINE"
        clean_history = [float(t) for t in temperature_history]
        latest_temp = clean_history[-1]
        avg_temp = sum(clean_history) / len(clean_history)
        max_temp = max(clean_history)
        temp_breach = latest_temp >= maximum_safe_temperature_c
        consumed = calculate_total_thermal_consumed(
            clean_history, packaging_performance, reading_interval_hours, baseline_temp_c
        )
        remaining_life = calculate_remaining_thermal_life(initial_thermal_life_hours, consumed)

    # Validation & Fallback Check: Location & Travel data
    if location_unavailable:
        travel_time_hours = None
        thermal_buffer = None
        route_feasibility = "UNKNOWN"
        fallback_messages.append("Location unavailable — route feasibility cannot be confirmed.")
    else:
        travel_time_hours, thermal_buffer = calculate_thermal_buffer(
            remaining_life, travel_time_minutes
        )
        if thermal_buffer is not None:
            route_feasibility = "FEASIBLE" if thermal_buffer > 0.0 else "INFEASIBLE"
        else:
            route_feasibility = "UNKNOWN"

    manual_review = sensor_unavailable or location_unavailable or (remaining_life <= 0.0)

    risk_level = classify_risk(
        thermal_buffer_hours=thermal_buffer,
        remaining_thermal_life_hours=remaining_life,
        latest_temperature_c=latest_temp,
        maximum_safe_temperature_c=maximum_safe_temperature_c,
        sensor_unavailable=sensor_unavailable,
        location_unavailable=location_unavailable,
    )

    fallback_str = " | ".join(fallback_messages) if fallback_messages else None

    return ThermalLifeEvaluation(
        shipment_id=shipment_id,
        sensor_status=sensor_status,
        latest_temperature_c=round(latest_temp, 2) if latest_temp is not None else None,
        average_temperature_c=round(avg_temp, 2) if avg_temp is not None else None,
        maximum_temperature_c=round(max_temp, 2) if max_temp is not None else None,
        temperature_breach=temp_breach,
        initial_thermal_life_hours=round(float(initial_thermal_life_hours), 2),
        total_thermal_life_consumed_hours=round(consumed, 2),
        remaining_thermal_life_hours=round(remaining_life, 2),
        travel_time_hours=round(travel_time_hours, 2) if travel_time_hours is not None else None,
        thermal_buffer_hours=round(thermal_buffer, 2) if thermal_buffer is not None else None,
        risk_level=risk_level,
        route_feasibility=route_feasibility,
        manual_review_required=manual_review,
        fallback_message=fallback_str,
        model_label=MODEL_DESCRIPTION,
    )
