'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Database,
  Search,
  Filter,
  ArrowLeft,
  ArrowUpDown,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Package,
  Droplets,
  Users,
  ThermometerSnowflake,
  MapPin,
  MapPinOff,
} from 'lucide-react';
import { Shipment, PrioritizedShipmentDetail } from '../../lib/types';

interface DataExplorerViewProps {
  shipments: Shipment[];
  proposedStops: PrioritizedShipmentDetail[];
  onSelectShipment: (shipment: PrioritizedShipmentDetail) => void;
}

export const DataExplorerView: React.FC<DataExplorerViewProps> = ({
  shipments,
  proposedStops,
  onSelectShipment,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [packagingFilter, setPackagingFilter] = useState<string>('ALL');
  const [sensorFilter, setSensorFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<keyof Shipment>('shipment_id');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Summary Metrics
  const totalShipments = shipments.length;
  const uniqueProducers = new Set(shipments.map((s) => s.producer_id)).size;
  const totalVolume = shipments.reduce((sum, s) => sum + s.milk_quantity_litres, 0);
  const sensorAvailableCount = shipments.filter(
    (s) => s.temperature_history && s.temperature_history.length > 0
  ).length;
  const sensorUnavailableCount = totalShipments - sensorAvailableCount;
  const locationAvailableCount = shipments.filter(
    (s) => s.distance_km !== null && s.travel_time_minutes !== null
  ).length;
  const locationUnavailableCount = totalShipments - locationAvailableCount;

  // Filtered & Sorted Shipments
  const filteredShipments = useMemo(() => {
    return shipments
      .filter((s) => {
        const matchSearch =
          s.shipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.producer_id.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchSearch) return false;

        if (packagingFilter !== 'ALL' && s.packaging_type !== packagingFilter) return false;

        if (sensorFilter === 'AVAILABLE' && (!s.temperature_history || s.temperature_history.length === 0))
          return false;
        if (sensorFilter === 'UNAVAILABLE' && s.temperature_history && s.temperature_history.length > 0)
          return false;
        if (sensorFilter === 'LOC_UNAVAILABLE' && s.travel_time_minutes !== null) return false;

        return true;
      })
      .sort((a, b) => {
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
  }, [shipments, searchTerm, packagingFilter, sensorFilter, sortField, sortAsc]);

  const handleSort = (field: keyof Shipment) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleInspect = (shipmentId: string) => {
    const detail = proposedStops.find((s) => s.shipment_id.toUpperCase() === shipmentId.toUpperCase());
    if (detail) {
      onSelectShipment(detail);
    }
  };

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
              <Database className="h-4 w-4 text-sky-600" />
              <span>Data Explorer: Canonical 28-Shipment Telemetry</span>
            </h1>
            <p className="text-xs text-slate-500">
              Raw operational data collected from small dairy producers across the district
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 bg-sky-50 text-sky-800 rounded-md border border-sky-200 self-start sm:self-auto">
          Single Source of Truth
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold">Total Shipments</span>
            <Package className="h-4 w-4 text-sky-600" />
          </div>
          <span className="text-xl font-black text-slate-900">{totalShipments}</span>
          <span className="text-[11px] text-slate-500 block">Simulated batch records</span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold">Total Producers</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-xl font-black text-slate-900">{uniqueProducers}</span>
          <span className="text-[11px] text-slate-500 block">Unique smallholder farms</span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold">Total Milk Volume</span>
            <Droplets className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-xl font-black text-slate-900">{totalVolume.toLocaleString()}</span>
          <span className="text-[11px] text-slate-500 block">Litres across collection</span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold">Telemetry Health</span>
            <ThermometerSnowflake className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900">{sensorAvailableCount}</span>
            <span className="text-xs text-slate-500">/ {totalShipments} Online</span>
          </div>
          <span className="text-[11px] text-amber-700 font-semibold block">
            {sensorUnavailableCount + locationUnavailableCount} Fallbacks Logged
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by shipment ID or producer ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={packagingFilter}
              onChange={(e) => setPackagingFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">All Packaging Types</option>
              <option value="Insulated Tank">Insulated Tank</option>
              <option value="Cooled Canister">Cooled Canister</option>
              <option value="Standard Canister">Standard Canister</option>
              <option value="Uninsulated Jug">Uninsulated Jug</option>
            </select>

            <select
              value={sensorFilter}
              onChange={(e) => setSensorFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">All Telemetry Statuses</option>
              <option value="AVAILABLE">Sensor Online</option>
              <option value="UNAVAILABLE">Sensor Offline (SHIP-027)</option>
              <option value="LOC_UNAVAILABLE">Location Offline (SHIP-028)</option>
            </select>

            {(searchTerm || packagingFilter !== 'ALL' || sensorFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setPackagingFilter('ALL');
                  setSensorFilter('ALL');
                }}
                className="px-2 py-1 text-xs text-sky-600 hover:underline font-bold"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Dataset Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
              <tr>
                <th onClick={() => handleSort('shipment_id')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">
                    <span>Shipment ID</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('producer_id')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">
                    <span>Producer</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('milk_quantity_litres')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">
                    <span>Volume (L)</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Packaging</th>
                <th onClick={() => handleSort('packaging_performance')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">
                    <span>Insulation</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Temperature Log (°C)</th>
                <th onClick={() => handleSort('distance_km')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">
                    <span>Distance</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('travel_time_minutes')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">
                    <span>Travel Time</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Stops</th>
                <th onClick={() => handleSort('initial_thermal_life_hours')} className="py-2.5 px-3 cursor-pointer hover:bg-slate-100">
                  <div className="flex items-center gap-1">
                    <span>Budget Life</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredShipments.map((s) => {
                const hasTemp = s.temperature_history && s.temperature_history.length > 0;
                const hasLoc = s.travel_time_minutes !== null;
                return (
                  <tr key={s.shipment_id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-700">
                      {s.shipment_id}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{s.producer_id}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{s.milk_quantity_litres} L</td>
                    <td className="py-2.5 px-3 text-slate-700">{s.packaging_type}</td>
                    <td className="py-2.5 px-3 font-medium">
                      {(s.packaging_performance * 100).toFixed(0)}%
                    </td>
                    <td className="py-2.5 px-3">
                      {hasTemp ? (
                        <span className="font-mono text-[11px] text-slate-800">
                          {s.temperature_history?.join(' → ')}°C
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                          SENSOR DATA UNAVAILABLE — MANUAL REVIEW
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {s.distance_km !== null ? (
                        `${s.distance_km} km`
                      ) : (
                        <span className="text-purple-700 font-bold text-[10px]">UNAVAILABLE</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {hasLoc ? (
                        `${s.travel_time_minutes} min`
                      ) : (
                        <span className="text-purple-700 font-bold text-[10px]">UNAVAILABLE</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">{s.number_of_stops}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{s.initial_thermal_life_hours}h</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleInspect(s.shipment_id)}
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
