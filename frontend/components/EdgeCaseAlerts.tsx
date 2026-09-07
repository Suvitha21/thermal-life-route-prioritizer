'use client';

import React from 'react';
import { AlertTriangle, WifiOff, ThermometerSnowflake, MapPinOff, Flame } from 'lucide-react';
import { SummaryKPIs } from '../lib/types';

interface EdgeCaseAlertsProps {
  isOnline: boolean;
  summary: SummaryKPIs;
  onSelectShipmentId?: (id: string) => void;
}

export const EdgeCaseAlerts: React.FC<EdgeCaseAlertsProps> = ({
  isOnline,
  summary,
  onSelectShipmentId,
}) => {
  return (
    <div className="space-y-2.5 mb-6">
      {/* Case 3: Offline Mode Banner */}
      {!isOnline && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-900 shadow-xs">
          <WifiOff className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <strong className="font-bold block text-amber-950">
              OFFLINE — USING LOCAL SIMULATION DATA (Store-and-Forward Mode)
            </strong>
            <span>
              Backend connection is currently unreachable. The dashboard is operating seamlessly using the canonical 28-shipment simulation dataset with local state persistence.
            </span>
          </div>
        </div>
      )}

      {/* Case 1: Missing Sensor Data Banner */}
      {summary.sensor_unavailable_count > 0 && (
        <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-3 text-indigo-900 shadow-xs">
          <ThermometerSnowflake className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs flex-1">
            <strong className="font-bold block text-indigo-950">
              CASE 1: Temperature Sensor Telemetry Offline (SHIP-027)
            </strong>
            <span>
              Temperature data unavailable — using last known operational state / manual review required. Sensor readings were not silently fabricated.
            </span>
          </div>
          {onSelectShipmentId && (
            <button
              onClick={() => onSelectShipmentId('SHIP-027')}
              className="px-2.5 py-1 bg-indigo-600 text-white rounded-md text-[11px] font-bold hover:bg-indigo-700 transition-colors shrink-0"
            >
              Inspect SHIP-027
            </button>
          )}
        </div>
      )}

      {/* Case 2: Missing Location Data Banner */}
      {summary.location_unavailable_count > 0 && (
        <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-3 text-purple-900 shadow-xs">
          <MapPinOff className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
          <div className="text-xs flex-1">
            <strong className="font-bold block text-purple-950">
              CASE 2: Location / Travel-Time Telemetry Offline (SHIP-028)
            </strong>
            <span>
              Location unavailable — route feasibility cannot be confirmed automatically. Manual review required.
            </span>
          </div>
          {onSelectShipmentId && (
            <button
              onClick={() => onSelectShipmentId('SHIP-028')}
              className="px-2.5 py-1 bg-purple-600 text-white rounded-md text-[11px] font-bold hover:bg-purple-700 transition-colors shrink-0"
            >
              Inspect SHIP-028
            </button>
          )}
        </div>
      )}

      {/* Case 4: Thermal Life Exhausted Alert */}
      {summary.critical_risk_shipments > 0 && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-900 shadow-xs">
          <Flame className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs flex-1">
            <strong className="font-bold block text-red-950">
              CASE 4: CRITICAL — Thermal Life Exhausted Batches Detected ({summary.critical_risk_shipments} Shipments)
            </strong>
            <span>
              Shipments with zero remaining thermal life or critical thermal buffer deficits are flagged for immediate quarantine / expedite protocol.
            </span>
          </div>
          {onSelectShipmentId && (
            <button
              onClick={() => onSelectShipmentId('SHIP-013')}
              className="px-2.5 py-1 bg-red-600 text-white rounded-md text-[11px] font-bold hover:bg-red-700 transition-colors shrink-0"
            >
              Inspect SHIP-013
            </button>
          )}
        </div>
      )}
    </div>
  );
};
