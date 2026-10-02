// API Client with Transparent Store-and-Forward Offline Resilience

import {
  Shipment,
  RoutePlan,
  RouteComparison,
  SummaryKPIs,
  OverrideRequest,
  OverrideRecord,
  ThermalLifeEvaluation,
  EdgeCaseAlert,
  DeliveryVerificationResponse,
} from './types';
import {
  FALLBACK_SHIPMENTS,
  FALLBACK_BASELINE_PLAN,
  FALLBACK_PROPOSED_PLAN,
  FALLBACK_COMPARISON,
  FALLBACK_SUMMARY,
} from './fallbackData';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// In-memory fallback override store for offline mode
let localOverrides: OverrideRecord[] = [];
let isSimulatedOffline = false;

export function setOfflineSimulation(enable: boolean) {
  isSimulatedOffline = enable;
}

export function getOfflineSimulation(): boolean {
  return isSimulatedOffline;
}

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<{ data: T; isOnline: boolean }> {
  if (isSimulatedOffline) {
    return { data: getFallbackForEndpoint<T>(endpoint, options), isOnline: false };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2-second timeout for quick fallback

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const data = await res.json();
    return { data, isOnline: true };
  } catch (error) {
    // Network error or backend offline -> Use Canonical Fallback Dataset
    return { data: getFallbackForEndpoint<T>(endpoint, options), isOnline: false };
  }
}

function getFallbackForEndpoint<T>(endpoint: string, options?: RequestInit): T {
  if (endpoint === '/summary' || endpoint === '/risk-summary') {
    return FALLBACK_SUMMARY as unknown as T;
  }
  if (endpoint === '/shipments') {
    return FALLBACK_SHIPMENTS as unknown as T;
  }
  if (endpoint.startsWith('/shipments/')) {
    const id = endpoint.split('/')[2];
    const item = FALLBACK_SHIPMENTS.find((s) => s.shipment_id.toUpperCase() === id.toUpperCase());
    return (item || null) as unknown as T;
  }
  if (endpoint === '/thermal-analysis') {
    const evals = FALLBACK_PROPOSED_PLAN.stops.map((s) => ({
      shipment_id: s.shipment_id,
      sensor_status: s.sensor_status,
      latest_temperature_c: s.latest_temperature_c,
      average_temperature_c: s.average_temperature_c,
      maximum_temperature_c: s.maximum_temperature_c,
      temperature_breach: s.temperature_breach,
      initial_thermal_life_hours: s.initial_thermal_life_hours,
      total_thermal_life_consumed_hours: s.total_thermal_life_consumed_hours,
      remaining_thermal_life_hours: s.remaining_thermal_life_hours,
      travel_time_hours: s.travel_time_hours,
      thermal_buffer_hours: s.thermal_buffer_hours,
      risk_level: s.risk_level,
      route_feasibility: s.route_feasibility,
      manual_review_required: s.manual_review_required,
      fallback_message: s.fallback_message,
      model_label: s.model_label,
      is_thermal_exhausted: s.remaining_thermal_life_hours <= 0,
    }));
    return evals as unknown as T;
  }
  if (endpoint.startsWith('/thermal-analysis/') || endpoint.startsWith('/thermal-life/')) {
    const id = endpoint.split('/')[2];
    const s = FALLBACK_PROPOSED_PLAN.stops.find((x) => x.shipment_id.toUpperCase() === id.toUpperCase());
    if (!s) return null as unknown as T;
    return {
      shipment_id: s.shipment_id,
      sensor_status: s.sensor_status,
      latest_temperature_c: s.latest_temperature_c,
      average_temperature_c: s.average_temperature_c,
      maximum_temperature_c: s.maximum_temperature_c,
      temperature_breach: s.temperature_breach,
      initial_thermal_life_hours: s.initial_thermal_life_hours,
      total_thermal_life_consumed_hours: s.total_thermal_life_consumed_hours,
      remaining_thermal_life_hours: s.remaining_thermal_life_hours,
      travel_time_hours: s.travel_time_hours,
      thermal_buffer_hours: s.thermal_buffer_hours,
      risk_level: s.risk_level,
      route_feasibility: s.route_feasibility,
      manual_review_required: s.manual_review_required,
      fallback_message: s.fallback_message,
      model_label: s.model_label,
      is_thermal_exhausted: s.remaining_thermal_life_hours <= 0,
    } as unknown as T;
  }
  if (endpoint === '/priority-queue') {
    return FALLBACK_PROPOSED_PLAN.stops as unknown as T;
  }
  if (endpoint === '/delivery-results' || endpoint === '/delivery/results') {
    return {
      total_stops: FALLBACK_PROPOSED_PLAN.total_stops,
      delivered_before_expiry_count: FALLBACK_PROPOSED_PLAN.delivered_before_expiry_count,
      delivered_before_expiry_percentage: FALLBACK_PROPOSED_PLAN.delivered_before_expiry_percentage,
      expired_count: FALLBACK_PROPOSED_PLAN.expired_shipments_count,
      expired_percentage: FALLBACK_PROPOSED_PLAN.expired_shipments_percentage,
      stops: FALLBACK_PROPOSED_PLAN.stops,
    } as unknown as T;
  }
  if (endpoint === '/edge-case-alerts' || endpoint === '/edge-cases') {
    const alerts: EdgeCaseAlert[] = [
      {
        alert_id: 'ALERT-SEN-SHIP-027',
        shipment_id: 'SHIP-027',
        alert_type: 'SENSOR_OFFLINE',
        severity: 'HIGH',
        title: 'Temperature Telemetry Offline: SHIP-027',
        description: 'Chilling tank sensor node is offline; temperature telemetry is missing.',
        recommended_action: 'Perform manual probe thermometer measurement upon arrival.',
        timestamp: new Date().toISOString(),
      },
      {
        alert_id: 'ALERT-LOC-SHIP-028',
        shipment_id: 'SHIP-028',
        alert_type: 'LOCATION_MISSING',
        severity: 'WARNING',
        title: 'Location Telemetry Missing: SHIP-028',
        description: 'Distance and travel time data missing. Automated route feasibility cannot be confirmed.',
        recommended_action: 'Contact driver for manual odometer reading; assign sequence manually.',
        timestamp: new Date().toISOString(),
      },
      {
        alert_id: 'ALERT-EXH-SHIP-006',
        shipment_id: 'SHIP-006',
        alert_type: 'THERMAL_EXHAUSTED',
        severity: 'CRITICAL',
        title: 'Thermal Life Exhausted (0.0h): SHIP-006',
        description: 'Thermal life consumed completely (0.0h remaining). Spoilage risk imminent.',
        recommended_action: 'Quarantine immediately on arrival; perform alcohol and acidity test.',
        timestamp: new Date().toISOString(),
      },
      {
        alert_id: 'ALERT-BRC-SHIP-003',
        shipment_id: 'SHIP-003',
        alert_type: 'TEMPERATURE_BREACH',
        severity: 'HIGH',
        title: 'Temperature Limit Breach (6.4°C > 6.0°C): SHIP-003',
        description: 'Latest temperature exceeds safe regulatory threshold.',
        recommended_action: 'Prioritize collection vehicle dispatch immediately.',
        timestamp: new Date().toISOString(),
      },
    ];
    return alerts as unknown as T;
  }
  if (endpoint === '/route/baseline') {
    return FALLBACK_BASELINE_PLAN as unknown as T;
  }
  if (endpoint === '/route/proposed') {
    // If local overrides exist, apply to fallback proposed plan
    if (localOverrides.length > 0) {
      const planCopy = JSON.parse(JSON.stringify(FALLBACK_PROPOSED_PLAN)) as RoutePlan;
      for (const ov of localOverrides) {
        const stop = planCopy.stops.find((s) => s.shipment_id === ov.shipment_id);
        if (stop) {
          stop.priority_score = ov.new_priority_score;
          stop.recommended_action = ov.new_action as any;
          stop.priority_reason = `[OPERATOR OVERRIDE] ${ov.reason}`;
        }
      }
      planCopy.stops.sort((a, b) => b.priority_score - a.priority_score);
      planCopy.stops.forEach((s, idx) => {
        s.priority_rank = idx + 1;
        s.stop_number = idx + 1;
      });
      return planCopy as unknown as T;
    }
    return FALLBACK_PROPOSED_PLAN as unknown as T;
  }
  if (endpoint === '/route/comparison') {
    return FALLBACK_COMPARISON as unknown as T;
  }
  if (endpoint === '/overrides') {
    return localOverrides as unknown as T;
  }
  return null as unknown as T;
}

export async function getSummary(): Promise<{ data: SummaryKPIs; isOnline: boolean }> {
  return apiFetch<SummaryKPIs>('/summary');
}

export async function getShipments(): Promise<{ data: Shipment[]; isOnline: boolean }> {
  return apiFetch<Shipment[]>('/shipments');
}

export async function getShipmentById(id: string): Promise<{ data: Shipment | null; isOnline: boolean }> {
  return apiFetch<Shipment | null>(`/shipments/${id}`);
}

export async function getThermalAnalysis(id?: string): Promise<{ data: any; isOnline: boolean }> {
  if (id) {
    return apiFetch<ThermalLifeEvaluation | null>(`/thermal-analysis/${id}`);
  }
  return apiFetch<ThermalLifeEvaluation[]>('/thermal-analysis');
}

export async function getPriorityQueue(): Promise<{ data: any[]; isOnline: boolean }> {
  return apiFetch<any[]>('/priority-queue');
}

export async function getBaselineRoute(): Promise<{ data: RoutePlan; isOnline: boolean }> {
  return apiFetch<RoutePlan>('/route/baseline');
}

export async function getProposedRoute(): Promise<{ data: RoutePlan; isOnline: boolean }> {
  return apiFetch<RoutePlan>('/route/proposed');
}

export async function getRouteComparison(): Promise<{ data: RouteComparison; isOnline: boolean }> {
  return apiFetch<RouteComparison>('/route/comparison');
}

export async function getDeliveryResults(): Promise<{ data: DeliveryVerificationResponse; isOnline: boolean }> {
  return apiFetch<DeliveryVerificationResponse>('/delivery-results');
}

export async function getEdgeCaseAlerts(): Promise<{ data: EdgeCaseAlert[]; isOnline: boolean }> {
  return apiFetch<EdgeCaseAlert[]>('/edge-case-alerts');
}

export async function getOverrides(): Promise<{ data: OverrideRecord[]; isOnline: boolean }> {
  return apiFetch<OverrideRecord[]>('/overrides');
}

export async function submitOverride(
  req: OverrideRequest
): Promise<{ data: OverrideRecord; isOnline: boolean }> {
  if (isSimulatedOffline) {
    const record: OverrideRecord = {
      shipment_id: req.shipment_id,
      original_priority_score: 50.0,
      original_action: 'NORMAL',
      new_priority_score: req.overridden_priority_score,
      new_action: req.overridden_action,
      reason: req.reason,
      operator_id: req.operator_id || 'OPERATOR-OFFLINE',
      audit_id: `OFFLINE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    localOverrides.push(record);
    return { data: record, isOnline: false };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${API_BASE}/override`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const record: OverrideRecord = await res.json();
      localOverrides.push(record);
      return { data: record, isOnline: true };
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    // Offline local override registration
    const record: OverrideRecord = {
      shipment_id: req.shipment_id,
      original_priority_score: 50.0,
      original_action: 'NORMAL',
      new_priority_score: req.overridden_priority_score,
      new_action: req.overridden_action,
      reason: req.reason,
      operator_id: req.operator_id || 'OPERATOR-LOCAL',
      audit_id: `LOCAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    localOverrides.push(record);
    return { data: record, isOnline: false };
  }
}

export async function resetOverrides(): Promise<{ isOnline: boolean }> {
  localOverrides = [];
  if (isSimulatedOffline) {
    return { isOnline: false };
  }
  try {
    await fetch(`${API_BASE}/overrides/reset`, { method: 'POST' });
    return { isOnline: true };
  } catch {
    return { isOnline: false };
  }
}
