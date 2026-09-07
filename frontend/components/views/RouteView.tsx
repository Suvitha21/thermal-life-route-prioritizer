'use client';

import React from 'react';
import Link from 'next/link';
import {
  Navigation,
  ArrowLeft,
  GitCompare,
  TrendingUp,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { RouteComparison, PrioritizedShipmentDetail } from '../../lib/types';
import { RouteComparisonSection } from '../RouteComparisonSection';

interface RouteViewProps {
  comparison: RouteComparison;
  onSelectShipment: (shipment: PrioritizedShipmentDetail) => void;
}

export const RouteView: React.FC<RouteViewProps> = ({
  comparison,
  onSelectShipment,
}) => {
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
              <Navigation className="h-4 w-4 text-indigo-600" />
              <span>Route Planning & Fleet Strategy Comparison</span>
            </h1>
            <p className="text-xs text-slate-500">
              Comparative simulation between conventional distance-only routing and thermal-life-aware dispatch
            </p>
          </div>
        </div>

        <div className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-md border border-indigo-200 self-start sm:self-auto">
          3-Truck District Fleet
        </div>
      </div>

      {/* Main Route Comparison Component */}
      <RouteComparisonSection
        comparison={comparison}
        onSelectShipment={onSelectShipment}
      />
    </div>
  );
};
