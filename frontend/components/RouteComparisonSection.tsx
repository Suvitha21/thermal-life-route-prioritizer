'use client';

import React, { useState } from 'react';
import {
  GitCompare,
  TrendingUp,
  Clock,
  Navigation,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
} from 'lucide-react';
import { RouteComparison, RoutePlan, PrioritizedShipmentDetail } from '../lib/types';

interface RouteComparisonSectionProps {
  comparison: RouteComparison;
  onSelectShipment: (shipment: PrioritizedShipmentDetail) => void;
}

export const RouteComparisonSection: React.FC<RouteComparisonSectionProps> = ({
  comparison,
  onSelectShipment,
}) => {
  const [activeTab, setActiveTab] = useState<'SIDE_BY_SIDE' | 'PROPOSED_TIMELINE' | 'BASELINE_TIMELINE'>('SIDE_BY_SIDE');

  const { baseline_plan, proposed_plan, improvement_delivered_count, improvement_delivered_percentage, summary_verdict } = comparison;

  const baseExpired = comparison.baseline_expired_count ?? baseline_plan.expired_shipments_count;
  const propExpired = comparison.proposed_expired_count ?? proposed_plan.expired_shipments_count;
  const spoilageReductionPct =
    comparison.spoilage_reduction_percentage ??
    (baseExpired > 0 ? Math.round(((baseExpired - propExpired) / baseExpired) * 1000) / 10 : 0);
  const timePctChange =
    comparison.time_difference_percentage ??
    (baseline_plan.total_travel_time_minutes > 0
      ? Math.round((comparison.time_difference_minutes / baseline_plan.total_travel_time_minutes) * 1000) / 10
      : 0);
  const distPctChange =
    comparison.distance_difference_percentage ??
    (baseline_plan.total_distance_km > 0
      ? Math.round((comparison.distance_difference_km / baseline_plan.total_distance_km) * 1000) / 10
      : 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 mb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-600 text-white shadow-md shadow-sky-500/20">
            <GitCompare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Route Strategy Comparison: Traditional vs. Thermal-Life-Aware
            </h2>
            <p className="text-xs text-slate-500">
              Evaluating milk rescue efficacy and delivery feasibility across the 3-truck collection fleet
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('SIDE_BY_SIDE')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'SIDE_BY_SIDE'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Side-by-Side KPI Matrix
          </button>
          <button
            onClick={() => setActiveTab('PROPOSED_TIMELINE')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'PROPOSED_TIMELINE'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Proposed Route Dispatch
          </button>
          <button
            onClick={() => setActiveTab('BASELINE_TIMELINE')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'BASELINE_TIMELINE'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Traditional Route Baseline
          </button>
        </div>
      </div>

      {/* Main KPI Highlight Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-blue-500/10 border border-emerald-200 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Core Academic Outcome & Value Proposition
            </span>
            <p className="text-xs font-semibold text-slate-800 leading-snug">
              {summary_verdict}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0 text-center">
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">Baseline Delivery</span>
            <span className="text-xl font-bold text-slate-700">
              {baseline_plan.delivered_before_expiry_percentage}%
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-emerald-600" />
          <div>
            <span className="text-[11px] text-emerald-700 font-bold block">Proposed Delivery</span>
            <span className="text-2xl font-black text-emerald-600">
              {proposed_plan.delivered_before_expiry_percentage}%
            </span>
          </div>
          <div className="pl-3 border-l border-emerald-300">
            <span className="text-[11px] text-emerald-800 font-semibold block">Gain</span>
            <span className="text-base font-black text-emerald-700">
              +{improvement_delivered_percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Tab 1: Side-by-Side Comparison */}
      {activeTab === 'SIDE_BY_SIDE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Traditional Route (Baseline) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Strategy A (Conventional)
                </span>
                <h3 className="text-sm font-bold text-slate-900">{baseline_plan.strategy_name}</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-200 text-slate-700">
                Ignores Thermal Life
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Sorts strictly by nearest distance and shortest travel time. Fails to protect shipments with high temperature exposure.
            </p>

            {/* Visual Delivery Bar */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Shipments Delivered Before Expiry:</span>
                <span className="text-slate-900 font-bold">
                  {baseline_plan.delivered_before_expiry_count} / {baseline_plan.total_shipments - baseline_plan.unknown_feasibility_count} ({baseline_plan.delivered_before_expiry_percentage}%)
                </span>
              </div>
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${baseline_plan.delivered_before_expiry_percentage}%` }}
                  className="bg-slate-600"
                />
                <div
                  style={{ width: `${baseline_plan.expired_shipments_percentage}%` }}
                  className="bg-red-500"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>🟢 {baseline_plan.delivered_before_expiry_count} Delivered Safe</span>
                <span className="text-red-600 font-semibold">🔴 {baseline_plan.expired_shipments_count} Expired in Transit</span>
              </div>
            </div>

            {/* Metrics List */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                <span className="text-[11px] text-slate-500 block">Total Travel Time:</span>
                <span className="font-bold text-slate-900">{baseline_plan.total_travel_time_minutes} min ({baseline_plan.total_travel_time_hours}h)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                <span className="text-[11px] text-slate-500 block">Total Distance:</span>
                <span className="font-bold text-slate-900">{baseline_plan.total_distance_km} km</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                <span className="text-[11px] text-slate-500 block">Collection Fleet:</span>
                <span className="font-bold text-slate-900">3 Vehicles • {baseline_plan.total_stops} stops</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                <span className="text-[11px] text-slate-500 block">Telemetry Reviews:</span>
                <span className="font-bold text-indigo-700">{baseline_plan.unknown_feasibility_count} fallback items</span>
              </div>
            </div>
          </div>

          {/* Card 2: Thermal-Life-Aware Route (Proposed) */}
          <div className="rounded-xl border-2 border-sky-300 bg-sky-50/30 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-sky-200">
              <div>
                <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">
                  Strategy B (Proposed CoE System)
                </span>
                <h3 className="text-sm font-bold text-slate-900">{proposed_plan.strategy_name}</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Rescues Urgent Batches
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Dispatches vehicles to collect shipments with tight thermal buffers first, saving high-risk batches before degradation expires.
            </p>

            {/* Visual Delivery Bar */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-700">Shipments Delivered Before Expiry:</span>
                <span className="text-emerald-700 font-bold">
                  {proposed_plan.delivered_before_expiry_count} / {proposed_plan.total_shipments - proposed_plan.unknown_feasibility_count} ({proposed_plan.delivered_before_expiry_percentage}%)
                </span>
              </div>
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${proposed_plan.delivered_before_expiry_percentage}%` }}
                  className="bg-emerald-600"
                />
                <div
                  style={{ width: `${proposed_plan.expired_shipments_percentage}%` }}
                  className="bg-red-500"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span className="text-emerald-700 font-bold">🟢 {proposed_plan.delivered_before_expiry_count} Delivered Safe (+{improvement_delivered_count} Rescued)</span>
                <span className="text-slate-500">🔴 {proposed_plan.expired_shipments_count} Expired</span>
              </div>
            </div>

            {/* Metrics List */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-sky-200">
              <div className="p-2.5 rounded-lg bg-white border border-sky-200">
                <span className="text-[11px] text-slate-500 block">Total Travel Time:</span>
                <span className="font-bold text-slate-900">{proposed_plan.total_travel_time_minutes} min ({proposed_plan.total_travel_time_hours}h)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-sky-200">
                <span className="text-[11px] text-slate-500 block">Total Distance:</span>
                <span className="font-bold text-slate-900">{proposed_plan.total_distance_km} km</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-sky-200">
                <span className="text-[11px] text-slate-500 block">Collection Fleet:</span>
                <span className="font-bold text-slate-900">3 Vehicles • {proposed_plan.total_stops} stops</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-sky-200">
                <span className="text-[11px] text-slate-500 block">At-Risk Collected Safe:</span>
                <span className="font-bold text-orange-600">{proposed_plan.at_risk_shipments_count} shipments protected</span>
              </div>
            </div>
          </div>

          {/* Trade-Off Analysis & Competing Objectives Card */}
          <div className="md:col-span-2 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/60 to-indigo-50/60 p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-blue-200/80">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-700" />
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                  Competing Objectives Evaluation: Thermal Safety vs. Fleet Operational Efficiency
                </h4>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                Multi-Objective Trade-Off
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              {comparison.trade_off_analysis ||
                'Objective A prioritizes thermal preservation and milk rescue; Objective B prioritizes shortest vehicle travel distance and operational fleet transit time. A small detour investment enables significant spoilage reduction.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 text-center text-xs">
              <div className="p-3 bg-white rounded-lg border border-blue-100 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Rescued Milk Batches</span>
                <span className="text-lg font-black text-emerald-600">+{improvement_delivered_count} Shipments</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">+{improvement_delivered_percentage}% deliverable safe</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-blue-100 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Spoilage Reduction</span>
                <span className="text-lg font-black text-emerald-700">
                  {spoilageReductionPct > 0 ? `-${spoilageReductionPct}%` : '0%'} Expired
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {baseExpired} expired down to {propExpired}
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-blue-100 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Travel Time Investment</span>
                <span className="text-lg font-black text-slate-800">+{comparison.time_difference_minutes} min</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  +{timePctChange}% detour overhead
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-blue-100 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Distance Investment</span>
                <span className="text-lg font-black text-slate-800">+{comparison.distance_difference_km} km</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  +{distPctChange}% route detour
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Proposed Timeline Dispatch */}
      {activeTab === 'PROPOSED_TIMELINE' && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-600 mb-2">
            Sequential Fleet Stops Ordered by Thermal Urgency & Feasibility:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {proposed_plan.stops.map((stop) => {
              const isDelivered = stop.will_arrive_before_expiry;
              return (
                <div
                  key={stop.shipment_id}
                  onClick={() => onSelectShipment(stop)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                    isDelivered ? 'bg-white border-slate-200' : 'bg-red-50/40 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold font-mono px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                      Stop #{stop.stop_number}
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-mono">{stop.shipment_id}</span>
                    <span className="text-[11px] font-semibold text-slate-500">{stop.assigned_vehicle || 'Truck A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
                    <span>Arr: {stop.cumulative_travel_time_hours?.toFixed(1)}h ({stop.travel_time_minutes}m leg)</span>
                    <span>Rem: {stop.remaining_thermal_life_hours.toFixed(1)}h</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold mt-1.5 pt-1.5 border-t border-slate-100">
                    <span className="text-slate-500">{stop.packaging_type}</span>
                    <span className={isDelivered ? 'text-emerald-700' : 'text-red-600'}>
                      {isDelivered ? '✅ Arrives Safe' : '❌ Expired'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Baseline Timeline Dispatch */}
      {activeTab === 'BASELINE_TIMELINE' && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-600 mb-2">
            Traditional Sequential Fleet Stops (Shortest Distance First):
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {baseline_plan.stops.map((stop) => {
              const isDelivered = stop.will_arrive_before_expiry;
              return (
                <div
                  key={stop.shipment_id}
                  onClick={() => onSelectShipment(stop)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                    isDelivered ? 'bg-white border-slate-200' : 'bg-red-50/40 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                      Stop #{stop.stop_number}
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-mono">{stop.shipment_id}</span>
                    <span className="text-[11px] font-semibold text-slate-500">{stop.assigned_vehicle || 'Truck A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
                    <span>Arr: {stop.cumulative_travel_time_hours?.toFixed(1)}h ({stop.travel_time_minutes}m leg)</span>
                    <span>Rem: {stop.remaining_thermal_life_hours.toFixed(1)}h</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold mt-1.5 pt-1.5 border-t border-slate-100">
                    <span className="text-slate-500">{stop.packaging_type}</span>
                    <span className={isDelivered ? 'text-emerald-700' : 'text-red-600'}>
                      {isDelivered ? '✅ Arrives Safe' : '❌ Expired'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
