// API Client with Transparent Store-and-Forward Offline Resilience

import {
  Shipment,
  RoutePlan,
  RouteComparison,
  SummaryKPIs,
  OverrideRequest,
  OverrideRecord,
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

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<{ data: T; isOnline: boolean }> {
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
  if (endpoint === '/summary') {
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

export async function getBaselineRoute(): Promise<{ data: RoutePlan; isOnline: boolean }> {
  return apiFetch<RoutePlan>('/route/baseline');
}

export async function getProposedRoute(): Promise<{ data: RoutePlan; isOnline: boolean }> {
  return apiFetch<RoutePlan>('/route/proposed');
}

export async function getRouteComparison(): Promise<{ data: RouteComparison; isOnline: boolean }> {
  return apiFetch<RouteComparison>('/route/comparison');
}

export async function getOverrides(): Promise<{ data: OverrideRecord[]; isOnline: boolean }> {
  return apiFetch<OverrideRecord[]>('/overrides');
}

export async function submitOverride(
  req: OverrideRequest
): Promise<{ data: OverrideRecord; isOnline: boolean }> {
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
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    localOverrides.push(record);
    return { data: record, isOnline: false };
  }
}
