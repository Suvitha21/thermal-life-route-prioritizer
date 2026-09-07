'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Thermometer,
  Layers,
  Hourglass,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { PrioritizedShipmentDetail } from '../../lib/types';
import { TemperatureChart } from '../TemperatureChart';

interface ThermalAnalysisViewProps {
  stops: PrioritizedShipmentDetail[];
  onSelectShipment: (shipment: PrioritizedShipmentDetail) => void;
}

export const ThermalAnalysisView: React.FC<ThermalAnalysisViewProps> = ({
  stops,
  onSelectShipment,
}) => {
  const [selectedId, setSelectedId] = useState<string>(stops[0]?.shipment_id || 'SHIP-001');

  const selectedShipment = stops.find((s) => s.shipment_id === selectedId) || stops[0];

  // Mathematical breakdown calculations for selected shipment
  const baselineTemp = 4.0;
  const maxSafeTemp = selectedShipment?.maximum_safe_temperature_c || 6.0;
  const packagingPerf = selectedShipment?.packaging_performance || 0.8;
  const packagingMult = Math.max(1.0, 2.0 - packagingPerf);

  const history = selectedShipment?.temperature_history || [];

  const hourlyBreakdown = history.map((t, idx) => {
    const ratio = Math.max(0.5, t / baselineTemp);
    const hourlyConsumed = 1.0 * ratio * packagingMult;
    return {
      hour: idx + 1,
      temp: t,
      ratio: ratio,
      multiplier: packagingMult,
      consumption: hourlyConsumed,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span>Thermal Analysis & Degradation Modeling</span>
            </h1>
            <p className="text-xs text-slate-500">
              Transparent rule-based thermal degradation formulas and step-by-step simulation breakdown
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md border border-purple-200 self-start sm:self-auto">
          Simulation-based thermal-life estimate
        </div>
      </div>

      {/* Visual Model Flow Diagram */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Mathematical Degradation Flow
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center text-center">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">1. Telemetry Log</span>
            <span className="text-xs font-black text-slate-900">Hourly Temp (°C)</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Interval = 1.0 hr</span>
          </div>
          <div className="hidden sm:flex justify-center text-slate-400">
            <ChevronRight className="h-5 w-5" />
          </div>
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl">
            <span className="text-[10px] font-bold text-sky-700 uppercase block">2. Temp Ratio</span>
            <span className="text-xs font-black text-sky-950">max(0.5, T / 4.0°C)</span>
            <span className="text-[10px] text-sky-700 block mt-0.5">Baseline: 4.0°C</span>
          </div>
          <div className="hidden sm:flex justify-center text-slate-400">
            <ChevronRight className="h-5 w-5" />
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <span className="text-[10px] font-bold text-blue-700 uppercase block">3. Packaging Multiplier</span>
            <span className="text-xs font-black text-blue-950">max(1.0, 2.0 - Perf)</span>
            <span className="text-[10px] text-blue-700 block mt-0.5">Insulation Factor</span>
          </div>
        </div>
      </div>

      {/* Shipment Selector & Active Inspection */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Interactive Shipment Thermal Lifecycle Inspector
            </h3>
            <p className="text-xs text-slate-500">
              Select any shipment to review its step-by-step mathematical degradation log
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Select Shipment:</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-sky-500"
            >
              {stops.map((s) => (
                <option key={s.shipment_id} value={s.shipment_id}>
                  {s.shipment_id} ({s.producer_id}) — Rem: {s.remaining_thermal_life_hours.toFixed(1)}h [{s.risk_level}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedShipment && (
          <div className="space-y-4">
            {/* 4 Summary Stat Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold block">Initial Budget</span>
                <span className="text-lg font-black text-slate-900">
                  {selectedShipment.initial_thermal_life_hours.toFixed(1)} hrs
                </span>
              </div>
              <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                <span className="text-[11px] text-red-700 font-semibold block">Thermal Consumed</span>
                <span className="text-lg font-black text-red-700">
                  {selectedShipment.total_thermal_life_consumed_hours.toFixed(2)} hrs
                </span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[11px] text-emerald-800 font-semibold block">Remaining Life</span>
                <span className="text-lg font-black text-emerald-700">
                  {selectedShipment.remaining_thermal_life_hours.toFixed(2)} hrs
                </span>
              </div>
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200">
                <span className="text-[11px] text-sky-800 font-semibold block">Packaging Multiplier</span>
                <span className="text-lg font-black text-sky-700">
                  {packagingMult.toFixed(2)}x
                </span>
              </div>
            </div>

            {/* Temperature Chart */}
            <TemperatureChart
              temperatureHistory={selectedShipment.temperature_history}
              maxSafeTemp={selectedShipment.maximum_safe_temperature_c}
              packagingType={selectedShipment.packaging_type}
              packagingPerformance={selectedShipment.packaging_performance}
            />

            {/* Hourly Calculation Breakdown Table */}
            {hourlyBreakdown.length > 0 ? (
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Hourly Degradation Calculation Log ({selectedShipment.shipment_id})
                </h4>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                      <tr>
                        <th className="py-2 px-3">Hour Log</th>
                        <th className="py-2 px-3">Temperature (°C)</th>
                        <th className="py-2 px-3">Degradation Ratio</th>
                        <th className="py-2 px-3">Packaging Multiplier</th>
                        <th className="py-2 px-3 text-right">Thermal-Life Consumed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {hourlyBreakdown.map((row) => (
                        <tr key={row.hour} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-900">Hour {row.hour}</td>
                          <td className="py-2 px-3 font-mono font-bold">{row.temp.toFixed(1)}°C</td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {row.ratio.toFixed(2)} ({row.temp.toFixed(1)} / 4.0)
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">
                            {row.multiplier.toFixed(2)}x (2.0 - {packagingPerf})
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-red-600">
                            +{row.consumption.toFixed(2)} hrs
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t border-slate-200">
                        <td colSpan={4} className="py-2 px-3 text-right text-slate-900">
                          Total Thermal-Life Consumed:
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-red-700">
                          {selectedShipment.total_thermal_life_consumed_hours.toFixed(2)} hrs
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 inline mr-1" />
                Temperature history unavailable for this shipment (Case 1 fallback). Manual review required.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
