'use client';

import React from 'react';
import { Package, Droplets, AlertOctagon, Hourglass, ShieldAlert, TrendingUp } from 'lucide-react';
import { SummaryKPIs } from '../lib/types';

interface SummaryCardsProps {
  summary: SummaryKPIs;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  const cards = [
    {
      title: 'Total Shipments',
      value: summary.total_shipments,
      unit: 'shipments',
      subtext: '28 small dairy producers',
      icon: Package,
      color: 'text-sky-600',
      bg: 'bg-sky-50 border-sky-200',
    },
    {
      title: 'Total Milk Volume',
      value: summary.total_milk_volume_litres.toLocaleString(),
      unit: 'Litres',
      subtext: 'Total batch collection volume',
      icon: Droplets,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'High / Critical Risk',
      value: summary.high_risk_shipments + summary.critical_risk_shipments,
      unit: 'shipments',
      subtext: `${summary.critical_risk_shipments} Critical, ${summary.high_risk_shipments} High Risk`,
      icon: AlertOctagon,
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-200',
    },
    {
      title: 'Avg. Remaining Life',
      value: summary.average_remaining_thermal_life_hours.toFixed(1),
      unit: 'hours',
      subtext: 'Calculated simulation thermal buffer',
      icon: Hourglass,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
    },
    {
      title: 'At Risk of Expiry',
      value: summary.shipments_at_risk_of_expiry,
      unit: 'shipments',
      subtext: 'Thermal buffer ≤ 1.0 hr or breach',
      icon: ShieldAlert,
      color: 'text-orange-600',
      bg: 'bg-orange-50 border-orange-200',
    },
    {
      title: 'Deliverable Before Expiry',
      value: `${summary.deliverable_before_expiry_percentage}%`,
      unit: '',
      subtext: `+${summary.deliverable_percentage_gain}% vs Traditional (${summary.baseline_deliverable_percentage}%)`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200',
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`rounded-xl border p-4 bg-white shadow-xs transition-all hover:shadow-md ${
              card.highlight ? 'ring-2 ring-emerald-500/20 border-emerald-300' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 tracking-tight">{card.title}</span>
              <div className={`p-1.5 rounded-lg ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{card.value}</span>
              {card.unit && <span className="text-xs font-medium text-slate-500">{card.unit}</span>}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">{card.subtext}</p>
          </div>
        );
      })}
    </div>
  );
};
