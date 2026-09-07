'use client';

import React from 'react';
import { RiskCounts } from '../lib/types';
import { ShieldCheck, AlertCircle, AlertTriangle, Flame, HelpCircle } from 'lucide-react';

interface RiskOverviewProps {
  riskCounts: RiskCounts;
  totalShipments: number;
}

export const RiskOverview: React.FC<RiskOverviewProps> = ({ riskCounts, totalShipments }) => {
  const items = [
    {
      label: 'Critical Risk',
      count: riskCounts.critical,
      desc: 'Buffer ≤ 0h, Life Exhausted, or Temp ≥ 7.0°C',
      color: 'bg-red-500 text-white',
      badgeBg: 'bg-red-50 text-red-700 border-red-200',
      barColor: 'bg-red-500',
      icon: Flame,
    },
    {
      label: 'High Risk',
      count: riskCounts.high,
      desc: 'Buffer ≤ 1.0h or Temp ≥ 6.0°C',
      color: 'bg-orange-500 text-white',
      badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
      barColor: 'bg-orange-500',
      icon: AlertTriangle,
    },
    {
      label: 'Medium Risk',
      count: riskCounts.medium,
      desc: '1.0h < Buffer ≤ 3.0h',
      color: 'bg-amber-500 text-white',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      barColor: 'bg-amber-500',
      icon: AlertCircle,
    },
    {
      label: 'Low / Normal Risk',
      count: riskCounts.low,
      desc: 'Buffer > 3.0h (Safe Cold Chain)',
      color: 'bg-emerald-500 text-white',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      barColor: 'bg-emerald-500',
      icon: ShieldCheck,
    },
    {
      label: 'Manual Review',
      count: riskCounts.manual_review,
      desc: 'Sensor or Location telemetry offline',
      color: 'bg-indigo-500 text-white',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      barColor: 'bg-indigo-500',
      icon: HelpCircle,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Thermal Risk Distribution & Classification
          </h2>
          <p className="text-xs text-slate-500">
            Real-time classification based on calculated thermal buffer and maximum temperature thresholds
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
          {totalShipments} Total Active Shipments
        </span>
      </div>

      {/* Multi-Segment Colored Progress Bar */}
      <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex mb-4 border border-slate-200/60 shadow-inner">
        {items.map((item) => {
          if (item.count === 0) return null;
          const pct = (item.count / totalShipments) * 100;
          return (
            <div
              key={item.label}
              style={{ width: `${pct}%` }}
              className={`${item.barColor} transition-all duration-500 relative group`}
              title={`${item.label}: ${item.count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Risk Category Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          const pct = totalShipments > 0 ? ((item.count / totalShipments) * 100).toFixed(0) : '0';
          return (
            <div
              key={item.label}
              className={`p-3 rounded-lg border ${item.badgeBg} flex flex-col justify-between transition-transform hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold tracking-tight">{item.label}</span>
                <Icon className="h-4 w-4 opacity-80" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black">{item.count}</span>
                <span className="text-[11px] font-semibold opacity-75">{pct}%</span>
              </div>
              <p className="text-[10px] opacity-75 mt-1 leading-tight">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
