'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Flame,
  AlertTriangle,
  ShieldCheck,
  Eye,
  Edit2,
  Package,
  CheckCircle2,
  XCircle,
  Thermometer,
} from 'lucide-react';
import { PrioritizedShipmentDetail, RiskLevel } from '../lib/types';

interface PriorityQueueTableProps {
  stops: PrioritizedShipmentDetail[];
  onSelectShipment: (shipment: PrioritizedShipmentDetail) => void;
  onOpenOverride: (shipment: PrioritizedShipmentDetail) => void;
}

export const PriorityQueueTable: React.FC<PriorityQueueTableProps> = ({
  stops,
  onSelectShipment,
  onOpenOverride,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [selectedPackaging, setSelectedPackaging] = useState<string>('ALL');
  const [highRiskOnly, setHighRiskOnly] = useState<boolean>(false);
  const [tempBreachOnly, setTempBreachOnly] = useState<boolean>(false);
  const [canReachOnly, setCanReachOnly] = useState<boolean>(false);
  const [sortField, setSortField] = useState<keyof PrioritizedShipmentDetail>('priority_rank');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Filter and sort
  const filteredStops = useMemo(() => {
    return stops.filter((item) => {
      // Search
      const matchSearch =
        item.shipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.producer_id.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      // Risk filter
      if (selectedRisk !== 'ALL' && item.risk_level !== selectedRisk) return false;

      // Packaging filter
      if (selectedPackaging !== 'ALL' && item.packaging_type !== selectedPackaging) return false;

      // High risk toggle
      if (highRiskOnly && !['HIGH', 'CRITICAL'].includes(item.risk_level)) return false;

      // Temp breach toggle
      if (tempBreachOnly && !item.temperature_breach) return false;

      // Can reach before expiry toggle
      if (canReachOnly && item.will_arrive_before_expiry !== true) return false;

      return true;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null || valA === undefined) valA = sortAsc ? 999999 : -999999;
      if (valB === null || valB === undefined) valB = sortAsc ? 999999 : -999999;

      if (typeof valA === 'string') {
        return sortAsc
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [
    stops,
    searchTerm,
    selectedRisk,
    selectedPackaging,
    highRiskOnly,
    tempBreachOnly,
    canReachOnly,
    sortField,
    sortAsc,
  ]);

  const handleSort = (field: keyof PrioritizedShipmentDetail) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

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

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'COLLECT NOW':
        return 'bg-red-600 text-white animate-pulse';
      case 'PRIORITIZE':
        return 'bg-orange-600 text-white';
      case 'MONITOR':
        return 'bg-amber-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Table Header & Search/Filters Toolbar */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Proposed Thermal-Life Route Priority Queue</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                {filteredStops.length} of {stops.length} Shipments
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Shipments ordered dynamically to prevent thermal-life expiry and maximize rescuable volume.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[240px]">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search shipment or producer ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>

          {/* Risk Filter */}
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 text-xs font-medium focus:ring-1 focus:ring-sky-500"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Risk Only</option>
            <option value="MEDIUM">Medium Risk Only</option>
            <option value="LOW">Low / Normal Only</option>
            <option value="MANUAL_REVIEW">Manual Review Only</option>
          </select>

          {/* Packaging Filter */}
          <select
            value={selectedPackaging}
            onChange={(e) => setSelectedPackaging(e.target.value)}
            className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 text-xs font-medium focus:ring-1 focus:ring-sky-500"
          >
            <option value="ALL">All Packaging Types</option>
            <option value="Insulated Tank">Insulated Tank</option>
            <option value="Cooled Canister">Cooled Canister</option>
            <option value="Standard Canister">Standard Canister</option>
            <option value="Uninsulated Jug">Uninsulated Jug</option>
          </select>

          {/* Quick Toggle Badges */}
          <button
            onClick={() => setHighRiskOnly(!highRiskOnly)}
            className={`px-2.5 py-1 rounded-md border text-xs font-semibold transition-colors ${
              highRiskOnly
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            🔥 High & Critical Only
          </button>

          <button
            onClick={() => setTempBreachOnly(!tempBreachOnly)}
            className={`px-2.5 py-1 rounded-md border text-xs font-semibold transition-colors ${
              tempBreachOnly
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            ⚠️ Temp Breach (≥6°C)
          </button>

          <button
            onClick={() => setCanReachOnly(!canReachOnly)}
            className={`px-2.5 py-1 rounded-md border text-xs font-semibold transition-colors ${
              canReachOnly
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            ✅ Deliverable Before Expiry
          </button>

          {(searchTerm ||
            selectedRisk !== 'ALL' ||
            selectedPackaging !== 'ALL' ||
            highRiskOnly ||
            tempBreachOnly ||
            canReachOnly) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedRisk('ALL');
                setSelectedPackaging('ALL');
                setHighRiskOnly(false);
                setTempBreachOnly(false);
                setCanReachOnly(false);
              }}
              className="px-2 py-1 text-xs text-sky-600 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
            <tr>
              <th
                onClick={() => handleSort('priority_rank')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center gap-1">
                  <span>Rank</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('shipment_id')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center gap-1">
                  <span>Shipment ID</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3">Producer</th>
              <th
                onClick={() => handleSort('milk_quantity_litres')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center gap-1">
                  <span>Volume</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('latest_temperature_c')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center gap-1">
                  <span>Latest Temp</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('remaining_thermal_life_hours')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center gap-1">
                  <span>Remaining Life</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('travel_time_minutes')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center gap-1">
                  <span>Travel Time</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('thermal_buffer_hours')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center gap-1">
                  <span>Thermal Buffer</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('risk_level')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center gap-1">
                  <span>Risk Level</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('priority_score')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-100"
              >
                <div className="flex items-center gap-1">
                  <span>Score</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-center">Action</th>
              <th className="py-3 px-3 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStops.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-8 text-center text-slate-500">
                  <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-sm">No shipments match active filter criteria</p>
                  <p className="text-xs mt-1">Try resetting filters to view all 28 milk shipments.</p>
                </td>
              </tr>
            ) : (
              filteredStops.map((stop) => {
                const isBreach = stop.temperature_breach;
                const isCritical = stop.risk_level === 'CRITICAL';
                return (
                  <tr
                    key={stop.shipment_id}
                    className={`hover:bg-sky-50/40 transition-colors ${
                      isCritical ? 'bg-red-50/30' : isBreach ? 'bg-orange-50/20' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-3 font-bold text-slate-900">
                      <span className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-mono">
                        #{stop.priority_rank}
                      </span>
                    </td>

                    {/* Shipment ID */}
                    <td className="py-3 px-3 font-mono font-bold text-sky-700">
                      <button
                        onClick={() => onSelectShipment(stop)}
                        className="hover:underline text-left"
                      >
                        {stop.shipment_id}
                      </button>
                    </td>

                    {/* Producer */}
                    <td className="py-3 px-3 font-medium text-slate-700">
                      <span className="font-mono text-slate-600">{stop.producer_id}</span>
                    </td>

                    {/* Volume */}
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {stop.milk_quantity_litres} L
                    </td>

                    {/* Latest Temp */}
                    <td className="py-3 px-3">
                      {stop.latest_temperature_c !== null ? (
                        <span
                          className={`font-semibold ${
                            stop.latest_temperature_c >= stop.maximum_safe_temperature_c
                              ? 'text-red-600 font-bold'
                              : 'text-slate-800'
                          }`}
                        >
                          {stop.latest_temperature_c.toFixed(1)}°C
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium italic text-[11px]">
                          Offline
                        </span>
                      )}
                    </td>

                    {/* Remaining Life */}
                    <td className="py-3 px-3">
                      <span
                        className={`font-bold ${
                          stop.remaining_thermal_life_hours <= 1.0
                            ? 'text-red-600'
                            : stop.remaining_thermal_life_hours <= 3.0
                            ? 'text-amber-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {stop.remaining_thermal_life_hours.toFixed(1)} hrs
                      </span>
                    </td>

                    {/* Travel Time */}
                    <td className="py-3 px-3 text-slate-600">
                      {stop.travel_time_minutes !== null ? (
                        <span>{stop.travel_time_minutes} min ({stop.travel_time_hours?.toFixed(1)}h)</span>
                      ) : (
                        <span className="text-indigo-600 italic">Unknown</span>
                      )}
                    </td>

                    {/* Thermal Buffer */}
                    <td className="py-3 px-3">
                      {stop.thermal_buffer_hours !== null ? (
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            stop.thermal_buffer_hours <= 0
                              ? 'bg-red-100 text-red-800'
                              : stop.thermal_buffer_hours <= 1.0
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {stop.thermal_buffer_hours > 0
                            ? `+${stop.thermal_buffer_hours.toFixed(1)}h`
                            : `${stop.thermal_buffer_hours.toFixed(1)}h`}
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>

                    {/* Risk Level */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskBadge(
                          stop.risk_level
                        )}`}
                      >
                        {stop.risk_level}
                      </span>
                    </td>

                    {/* Priority Score */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {stop.priority_score.toFixed(1)}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-tight ${getActionBadge(
                          stop.recommended_action
                        )}`}
                      >
                        {stop.recommended_action}
                      </span>
                    </td>

                    {/* Inspect Button */}
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectShipment(stop)}
                        className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors"
                        title="View Detailed Thermal Life Analysis"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
