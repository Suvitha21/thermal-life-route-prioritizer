'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Flame,
  AlertCircle,
  ShieldCheck,
  HelpCircle,
  Filter,
  Eye,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { PrioritizedShipmentDetail, RiskCounts, RiskLevel } from '../../lib/types';
import { RiskOverview } from '../RiskOverview';

interface RiskViewProps {
  stops: PrioritizedShipmentDetail[];
  riskCounts: RiskCounts;
  totalShipments: number;
  onSelectShipment: (shipment: PrioritizedShipmentDetail) => void;
}

export const RiskView: React.FC<RiskViewProps> = ({
  stops,
  riskCounts,
  totalShipments,
  onSelectShipment,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const filteredStops = useMemo(() => {
    if (activeFilter === 'ALL') return stops;
    return stops.filter((s) => s.risk_level === activeFilter);
  }, [stops, activeFilter]);

  const getRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'LOW':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>Thermal Risk Analysis & Classification</span>
            </h1>
            <p className="text-xs text-slate-500">
              Evaluating risk tiers based on calculated thermal buffers and temperature limits
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-md border border-amber-200 self-start sm:self-auto">
          Centralized Risk Engine
        </div>
      </div>

      {/* Main Risk Overview Progress Bar & Breakdown */}
      <RiskOverview riskCounts={riskCounts} totalShipments={totalShipments} />

      {/* Rule Criteria Matrix Explanation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Risk Tier Classification Logic & Safety Thresholds
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/50">
            <div className="flex items-center gap-2 text-red-800 font-bold mb-1.5">
              <Flame className="h-4 w-4" />
              <span>CRITICAL RISK</span>
            </div>
            <ul className="text-[11px] text-red-900 space-y-1 list-disc list-inside">
              <li>Thermal Buffer ≤ 0.0 hrs</li>
              <li>Remaining Life ≤ 0.0 hrs</li>
              <li>Latest Temp ≥ 7.0°C (Max+1°)</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl border border-orange-200 bg-orange-50/50">
            <div className="flex items-center gap-2 text-orange-800 font-bold mb-1.5">
              <AlertTriangle className="h-4 w-4" />
              <span>HIGH RISK</span>
            </div>
            <ul className="text-[11px] text-orange-900 space-y-1 list-disc list-inside">
              <li>Thermal Buffer ≤ 1.0 hr</li>
              <li>Latest Temp ≥ 6.0°C (Safe Limit)</li>
              <li>Imminent transit expiration</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50">
            <div className="flex items-center gap-2 text-amber-800 font-bold mb-1.5">
              <AlertCircle className="h-4 w-4" />
              <span>MEDIUM RISK</span>
            </div>
            <ul className="text-[11px] text-amber-900 space-y-1 list-disc list-inside">
              <li>1.0 hr &lt; Buffer ≤ 3.0 hrs</li>
              <li>Moderate degradation rate</li>
              <li>Monitored during transit</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <div className="flex items-center gap-2 text-emerald-800 font-bold mb-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span>LOW / NORMAL</span>
            </div>
            <ul className="text-[11px] text-emerald-900 space-y-1 list-disc list-inside">
              <li>Thermal Buffer &gt; 3.0 hrs</li>
              <li>Safe temperature history</li>
              <li>Ample collection leeway</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Risk Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">
            Shipments by Risk Classification ({filteredStops.length} Batches)
          </h3>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MANUAL_REVIEW'].map((tier) => (
              <button
                key={tier}
                onClick={() => setActiveFilter(tier)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeFilter === tier
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tier === 'ALL' ? 'All Tiers' : tier.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="py-2.5 px-3">Shipment ID</th>
                <th className="py-2.5 px-3">Producer</th>
                <th className="py-2.5 px-3">Latest Temp</th>
                <th className="py-2.5 px-3">Remaining Life</th>
                <th className="py-2.5 px-3">Travel Time</th>
                <th className="py-2.5 px-3">Thermal Buffer</th>
                <th className="py-2.5 px-3">Risk Tier</th>
                <th className="py-2.5 px-3">Reason / Rationale</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStops.map((stop) => (
                <tr key={stop.shipment_id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-sky-700">{stop.shipment_id}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{stop.producer_id}</td>
                  <td className="py-2.5 px-3">
                    {stop.latest_temperature_c !== null ? (
                      <span className={stop.temperature_breach ? 'text-red-600 font-bold' : 'text-slate-800'}>
                        {stop.latest_temperature_c.toFixed(1)}°C
                      </span>
                    ) : (
                      <span className="text-amber-600 italic">Offline</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-bold">{stop.remaining_thermal_life_hours.toFixed(1)}h</td>
                  <td className="py-2.5 px-3">
                    {stop.travel_time_minutes !== null ? `${stop.travel_time_minutes}m` : 'Unknown'}
                  </td>
                  <td className="py-2.5 px-3">
                    {stop.thermal_buffer_hours !== null ? (
                      <span className="font-bold font-mono">
                        {stop.thermal_buffer_hours > 0 ? `+${stop.thermal_buffer_hours.toFixed(1)}h` : `${stop.thermal_buffer_hours.toFixed(1)}h`}
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskBadge(stop.risk_level)}`}>
                      {stop.risk_level}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={stop.priority_reason}>
                    {stop.priority_reason}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => onSelectShipment(stop)}
                      className="px-2.5 py-1 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md border border-sky-200 transition-colors"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
