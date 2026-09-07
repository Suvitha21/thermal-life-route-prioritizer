'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ArrowLeft,
  XCircle,
  AlertTriangle,
  Clock,
  Hourglass,
  ShieldCheck,
  Truck,
  Filter,
  Eye,
  Info,
} from 'lucide-react';
import { PrioritizedShipmentDetail, RoutePlan } from '../../lib/types';

interface DeliveryViewProps {
  proposedPlan: RoutePlan;
  onSelectShipment: (shipment: PrioritizedShipmentDetail) => void;
}

export const DeliveryView: React.FC<DeliveryViewProps> = ({
  proposedPlan,
  onSelectShipment,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { stops, delivered_before_expiry_count, delivered_before_expiry_percentage, expired_shipments_count, at_risk_shipments_count, unknown_feasibility_count } = proposedPlan;

  const totalEvaluated = stops.length - unknown_feasibility_count;
  const safeCount = delivered_before_expiry_count - at_risk_shipments_count;

  const filteredStops = useMemo(() => {
    if (statusFilter === 'ALL') return stops;
    if (statusFilter === 'SAFE') return stops.filter((s) => s.will_arrive_before_expiry === true && s.risk_level === 'LOW');
    if (statusFilter === 'AT_RISK') return stops.filter((s) => s.will_arrive_before_expiry === true && ['HIGH', 'MEDIUM'].includes(s.risk_level));
    if (statusFilter === 'EXPIRED') return stops.filter((s) => s.will_arrive_before_expiry === false);
    if (statusFilter === 'MANUAL_REVIEW') return stops.filter((s) => s.manual_review_required);
    return stops;
  }, [stops, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
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
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Delivery Feasibility & Zero-Spoilage Verification</span>
            </h1>
            <p className="text-xs text-slate-500">
              Verifying whether prioritized milk shipments arrive at chilling depots before thermal-life expiration
            </p>
          </div>
        </div>

        <div className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200 self-start sm:self-auto">
          {delivered_before_expiry_percentage}% Success Rate
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs mb-1 font-bold">
            <span>Delivered Safe</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-700">{delivered_before_expiry_count}</span>
          <span className="text-[11px] text-emerald-800 font-semibold block">
            {delivered_before_expiry_percentage}% of known batches
          </span>
        </div>

        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-orange-800 text-xs mb-1 font-bold">
            <span>At-Risk (Rescued)</span>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </div>
          <span className="text-2xl font-black text-orange-700">{at_risk_shipments_count}</span>
          <span className="text-[11px] text-orange-800 font-semibold block">
            Tight margin, delivered safe
          </span>
        </div>

        <div className="p-4 bg-red-50 border border-red-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-red-800 text-xs mb-1 font-bold">
            <span>Expired in Transit</span>
            <XCircle className="h-4 w-4 text-red-600" />
          </div>
          <span className="text-2xl font-black text-red-700">{expired_shipments_count}</span>
          <span className="text-[11px] text-red-800 font-semibold block">
            Unrescuable pre-collection
          </span>
        </div>

        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-indigo-800 text-xs mb-1 font-bold">
            <span>Telemetry Reviews</span>
            <Clock className="h-4 w-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-black text-indigo-700">{unknown_feasibility_count}</span>
          <span className="text-[11px] text-indigo-800 font-semibold block">
            Manual verification needed
          </span>
        </div>
      </div>

      {/* Visual Delivery Verification Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Stop-by-Stop Thermal Margin & Arrival Feasibility
            </h3>
            <p className="text-xs text-slate-500">
              Comparison between shipment Remaining Thermal Life and cumulative arrival transit time
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            {['ALL', 'SAFE', 'AT_RISK', 'EXPIRED', 'MANUAL_REVIEW'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'All' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Verification Grid */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="py-2.5 px-3">Stop</th>
                <th className="py-2.5 px-3">Shipment</th>
                <th className="py-2.5 px-3">Vehicle</th>
                <th className="py-2.5 px-3">Arrival Time</th>
                <th className="py-2.5 px-3">Remaining Life</th>
                <th className="py-2.5 px-3">Visual Thermal Comparison</th>
                <th className="py-2.5 px-3 text-center">Delivery Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStops.map((stop) => {
                const isArrivedSafe = stop.will_arrive_before_expiry === true;
                const isExpired = stop.will_arrive_before_expiry === false;
                const isManual = stop.manual_review_required;

                const maxScale = 16.0;
                const remWidth = Math.min(100, (stop.remaining_thermal_life_hours / maxScale) * 100);
                const arrWidth = stop.cumulative_travel_time_hours ? Math.min(100, (stop.cumulative_travel_time_hours / maxScale) * 100) : 0;

                return (
                  <tr key={stop.shipment_id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">#{stop.stop_number}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-700">{stop.shipment_id}</td>
                    <td className="py-2.5 px-3 text-slate-600">{stop.assigned_vehicle || 'Truck A'}</td>
                    <td className="py-2.5 px-3 font-semibold">
                      {stop.cumulative_travel_time_hours !== null ? `${stop.cumulative_travel_time_hours.toFixed(1)} hrs` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      {stop.remaining_thermal_life_hours.toFixed(1)} hrs
                    </td>
                    <td className="py-2.5 px-3 min-w-[200px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="w-16 text-slate-500 shrink-0">Thermal Life:</span>
                          <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div style={{ width: `${remWidth}%` }} className="h-full bg-sky-500 rounded-full" />
                          </div>
                          <span className="font-mono font-bold w-10 text-right">{stop.remaining_thermal_life_hours.toFixed(1)}h</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className="w-16 text-slate-500 shrink-0">Transit Arr:</span>
                          <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div style={{ width: `${arrWidth}%` }} className="h-full bg-slate-700 rounded-full" />
                          </div>
                          <span className="font-mono font-bold w-10 text-right">
                            {stop.cumulative_travel_time_hours ? `${stop.cumulative_travel_time_hours.toFixed(1)}h` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isArrivedSafe ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          SAFE TO DELIVER
                        </span>
                      ) : isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                          <XCircle className="h-3 w-3 text-red-600" />
                          EXPIRED IN TRANSIT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          <Clock className="h-3 w-3 text-indigo-600" />
                          MANUAL REVIEW
                        </span>
                      )}
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
