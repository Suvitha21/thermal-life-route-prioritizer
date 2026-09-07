'use client';

import React, { useState } from 'react';
import {
  X,
  Thermometer,
  ShieldAlert,
  Clock,
  Navigation,
  CheckCircle,
  Package,
  Layers,
  HelpCircle,
  Edit3,
  Lightbulb,
  Truck,
  AlertTriangle,
} from 'lucide-react';
import { PrioritizedShipmentDetail, OverrideRequest } from '../lib/types';
import { TemperatureChart } from './TemperatureChart';
import { ManualOverrideModal } from './ManualOverrideModal';

interface ShipmentDetailModalProps {
  shipment: PrioritizedShipmentDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitOverride: (req: OverrideRequest) => Promise<void>;
}

export const ShipmentDetailModal: React.FC<ShipmentDetailModalProps> = ({
  shipment,
  isOpen,
  onClose,
  onSubmitOverride,
}) => {
  const [isOverrideOpen, setIsOverrideOpen] = useState<boolean>(false);

  if (!isOpen || !shipment) return null;

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'LOW':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'COLLECT NOW':
        return 'bg-red-600 text-white shadow-xs';
      case 'PRIORITIZE':
        return 'bg-orange-600 text-white shadow-xs';
      case 'MONITOR':
        return 'bg-amber-500 text-white shadow-xs';
      default:
        return 'bg-slate-700 text-white shadow-xs';
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
          {/* Header */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {shipment.shipment_id}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700 font-mono">
                    Producer {shipment.producer_id}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getRiskBadge(shipment.risk_level)}`}>
                    {shipment.risk_level} RISK
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${getActionBadge(shipment.recommended_action)}`}>
                    {shipment.recommended_action}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Detailed Thermal Life Evaluation & Route Priority Breakdown
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOverrideOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Manual Override
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Fallback Notice if active */}
            {shipment.fallback_message && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Operational Alert:</strong> {shipment.fallback_message}
                </div>
              </div>
            )}

            {/* EXPLANATION PANEL: Why is this shipment prioritized? */}
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-sky-700" />
                <h4 className="text-xs font-bold text-sky-900 tracking-tight uppercase">
                  Why is this shipment prioritized?
                </h4>
              </div>
              <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                {shipment.priority_reason}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-sky-200/60 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">Remaining Thermal Life:</span>
                  <span className="font-bold text-slate-900">{shipment.remaining_thermal_life_hours.toFixed(1)} hrs</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Est. Travel Transit Time:</span>
                  <span className="font-bold text-slate-900">
                    {shipment.travel_time_hours !== null ? `${shipment.travel_time_hours.toFixed(1)} hrs (${shipment.travel_time_minutes}m)` : 'Unavailable'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Thermal Buffer Margin:</span>
                  <span className={`font-bold ${shipment.thermal_buffer_hours !== null && shipment.thermal_buffer_hours <= 1.0 ? 'text-red-600' : 'text-slate-900'}`}>
                    {shipment.thermal_buffer_hours !== null ? `${shipment.thermal_buffer_hours.toFixed(1)} hrs` : 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Priority Score Rank:</span>
                  <span className="font-bold text-sky-700">#{shipment.priority_rank} ({shipment.priority_score.toFixed(1)}/100)</span>
                </div>
              </div>
            </div>

            {/* 3-Column Telemetry & Operational Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Box 1: Milk & Packaging */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-xs font-bold text-slate-800">
                  <Package className="h-4 w-4 text-sky-600" />
                  Milk & Packaging Specs
                </div>
                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Volume:</span>
                    <span className="font-bold text-slate-900">{shipment.milk_quantity_litres} Litres</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Packaging Type:</span>
                    <span className="font-semibold text-slate-800">{shipment.packaging_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Insulation Rating:</span>
                    <span className="font-semibold text-slate-800">
                      {(shipment.packaging_performance * 100).toFixed(0)}% (Mult: {(2.0 - shipment.packaging_performance).toFixed(2)}x)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Initial Budget Life:</span>
                    <span className="font-semibold text-slate-800">{shipment.initial_thermal_life_hours} hours</span>
                  </div>
                </div>
              </div>

              {/* Box 2: Temperature Exposure */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-xs font-bold text-slate-800">
                  <Thermometer className="h-4 w-4 text-amber-600" />
                  Temperature History
                </div>
                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Latest Temp:</span>
                    <span className={`font-bold ${shipment.temperature_breach ? 'text-red-600' : 'text-slate-900'}`}>
                      {shipment.latest_temperature_c !== null ? `${shipment.latest_temperature_c}°C` : 'Offline'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Average Temp:</span>
                    <span className="font-semibold text-slate-800">
                      {shipment.average_temperature_c !== null ? `${shipment.average_temperature_c}°C` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Peak Temp:</span>
                    <span className="font-semibold text-slate-800">
                      {shipment.maximum_temperature_c !== null ? `${shipment.maximum_temperature_c}°C` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Thermal Life Consumed:</span>
                    <span className="font-bold text-red-600">
                      {shipment.total_thermal_life_consumed_hours.toFixed(2)} hours
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 3: Logistics & Route Assignment */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-xs font-bold text-slate-800">
                  <Truck className="h-4 w-4 text-emerald-600" />
                  Route Dispatch Telemetry
                </div>
                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned Truck:</span>
                    <span className="font-semibold text-sky-700">{shipment.assigned_vehicle || 'Vehicle A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transit Distance:</span>
                    <span className="font-semibold text-slate-800">
                      {shipment.distance_km !== null ? `${shipment.distance_km} km` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Stops along Leg:</span>
                    <span className="font-semibold text-slate-800">{shipment.number_of_stops} stops</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Arrives Before Expiry:</span>
                    <span className={`font-bold ${shipment.will_arrive_before_expiry ? 'text-emerald-600' : 'text-red-600'}`}>
                      {shipment.will_arrive_before_expiry === null ? 'Unknown' : shipment.will_arrive_before_expiry ? 'YES (Safe Delivery)' : 'EXPIRED IN TRANSIT'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Temperature History Visual Chart */}
            <div>
              <TemperatureChart
                temperatureHistory={shipment.temperature_history}
                maxSafeTemp={shipment.maximum_safe_temperature_c}
                packagingType={shipment.packaging_type}
                packagingPerformance={shipment.packaging_performance}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Model: Simulation-based thermal-life estimate</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>

      {/* Manual Override Dialog */}
      <ManualOverrideModal
        shipment={shipment}
        isOpen={isOverrideOpen}
        onClose={() => setIsOverrideOpen(false)}
        onSubmitOverride={onSubmitOverride}
      />
    </>
  );
};
