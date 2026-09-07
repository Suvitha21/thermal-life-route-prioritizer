// Strict TypeScript definitions matching Backend Pydantic/Dataclass Contracts

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'MANUAL_REVIEW';
export type ActionType = 'COLLECT NOW' | 'PRIORITIZE' | 'MONITOR' | 'NORMAL';
export type RouteFeasibility = 'FEASIBLE' | 'INFEASIBLE' | 'UNKNOWN';
export type SensorStatus = 'ONLINE' | 'UNAVAILABLE';
export type StrategyType = 'BASELINE' | 'PROPOSED';

export interface Shipment {
  shipment_id: string;
  producer_id: string;
  milk_quantity_litres: number;
  temperature_history: number[] | null;
  packaging_type: string;
  packaging_performance: number;
  distance_km: number | null;
  travel_time_minutes: number | null;
  number_of_stops: number;
  maximum_safe_temperature_c: number;
  initial_thermal_life_hours: number;
}

export interface ThermalLifeEvaluation {
  shipment_id: string;
  sensor_status: SensorStatus;
  latest_temperature_c: number | null;
  average_temperature_c: number | null;
  maximum_temperature_c: number | null;
  temperature_breach: boolean;
  initial_thermal_life_hours: number;
  total_thermal_life_consumed_hours: number;
  remaining_thermal_life_hours: number;
  travel_time_hours: number | null;
  thermal_buffer_hours: number | null;
  risk_level: RiskLevel;
  route_feasibility: RouteFeasibility;
  manual_review_required: boolean;
  fallback_message: string | null;
  model_label: string;
}

export interface PrioritizedShipmentDetail {
  stop_number: number;
  shipment_id: string;
  producer_id: string;
  milk_quantity_litres: number;
  packaging_type: string;
  packaging_performance: number;
  distance_km: number | null;
  travel_time_minutes: number | null;
  assigned_vehicle?: string;
  cumulative_travel_time_minutes: number | null;
  cumulative_travel_time_hours: number | null;
  number_of_stops: number;
  maximum_safe_temperature_c: number;
  initial_thermal_life_hours: number;
  temperature_history: number[];

  // Thermal evaluation
  sensor_status: SensorStatus;
  latest_temperature_c: number | null;
  average_temperature_c: number | null;
  maximum_temperature_c: number | null;
  temperature_breach: boolean;
  total_thermal_life_consumed_hours: number;
  remaining_thermal_life_hours: number;
  travel_time_hours: number | null;
  thermal_buffer_hours: number | null;
  risk_level: RiskLevel;
  route_feasibility: RouteFeasibility;
  manual_review_required: boolean;
  fallback_message: string | null;
  model_label: string;

  // Prioritization
  priority_score: number;
  priority_rank: number;
  priority_reason: string;
  recommended_action: ActionType;

  // Arrival metrics
  will_arrive_before_expiry: boolean | null;
  thermal_margin_at_delivery_hours: number | null;
}

export interface RoutePlan {
  strategy_name: string;
  strategy_type: StrategyType;
  description: string;
  total_shipments: number;
  total_milk_volume_litres: number;
  total_travel_time_minutes: number;
  total_travel_time_hours: number;
  total_distance_km: number;
  total_stops: number;
  delivered_before_expiry_count: number;
  delivered_before_expiry_percentage: number;
  expired_shipments_count: number;
  expired_shipments_percentage: number;
  at_risk_shipments_count: number;
  unknown_feasibility_count: number;
  stops: PrioritizedShipmentDetail[];
}

export interface RouteComparison {
  baseline_plan: RoutePlan;
  proposed_plan: RoutePlan;
  improvement_delivered_count: number;
  improvement_delivered_percentage: number;
  time_difference_minutes: number;
  distance_difference_km: number;
  summary_verdict: string;
}

export interface OverrideRequest {
  shipment_id: string;
  overridden_priority_score: number;
  overridden_action: ActionType;
  reason: string;
}

export interface OverrideRecord {
  shipment_id: string;
  original_priority_score: number;
  original_action: string;
  new_priority_score: number;
  new_action: string;
  reason: string;
  timestamp: string;
}

export interface RiskCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  manual_review: number;
}

export interface SummaryKPIs {
  total_shipments: number;
  total_milk_volume_litres: number;
  high_risk_shipments: number;
  critical_risk_shipments: number;
  average_remaining_thermal_life_hours: number;
  shipments_at_risk_of_expiry: number;
  deliverable_before_expiry_percentage: number;
  baseline_deliverable_percentage: number;
  deliverable_percentage_gain: number;
  risk_distribution: RiskCounts;
  sensor_unavailable_count: number;
  location_unavailable_count: number;
  total_overrides_applied: number;
  simulation_label: string;
}

export interface HealthStatus {
  status: string;
  service: string;
  total_shipments_loaded: number;
  version: string;
  simulation_mode: boolean;
}
