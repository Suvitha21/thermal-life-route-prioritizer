'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ListOrdered,
  ArrowLeft,
  Search,
  Filter,
  Flame,
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
  Edit2,
  Eye,
  CheckCircle2,
  History,
} from 'lucide-react';
import { PrioritizedShipmentDetail, OverrideRecord } from '../../lib/types';
import { PriorityQueueTable } from '../PriorityQueueTable';

interface PriorityViewProps {
  stops: PrioritizedShipmentDetail[];
  overrides?: OverrideRecord[];
  onSelectShipment: (shipment: PrioritizedShipmentDetail) => void;
  onOpenOverride: (shipment: PrioritizedShipmentDetail) => void;
}

export const PriorityView: React.FC<PriorityViewProps> = ({
  stops,
  overrides = [],
  onSelectShipment,
  onOpenOverride,
}) => {
  const [showAudit, setShowAudit] = useState<boolean>(false);

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
              <ListOrdered className="h-4 w-4 text-orange-600" />
              <span>Thermal-Life-Aware Priority Queue</span>
            </h1>
            <p className="text-xs text-slate-500">
              Dynamic collection dispatch ranking based on remaining thermal life and delivery feasibility
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {overrides.length > 0 && (
            <button
              onClick={() => setShowAudit(!showAudit)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              <History className="h-3.5 w-3.5" />
              <span>Audit Trail ({overrides.length})</span>
            </button>
          )}
          <div className="text-xs font-semibold px-2.5 py-1 bg-orange-50 text-orange-800 rounded-md border border-orange-200">
            Ranked 1 to {stops.length}
          </div>
        </div>
      </div>

      {/* Operator Override Audit Log (if toggled) */}
      {showAudit && overrides.length > 0 && (
        <div className="bg-white rounded-xl border border-indigo-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-600" />
              <span>Operator Manual Override Audit History</span>
            </h3>
            <span className="text-[11px] text-indigo-600 font-semibold">{overrides.length} Recorded Overrides</span>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {overrides.map((ov, idx) => (
              <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-slate-900 mr-2">{ov.shipment_id}</span>
                  <span className="text-slate-500 mr-2">
                    Score: {ov.original_priority_score} → <strong className="text-indigo-700">{ov.new_priority_score}</strong> ({ov.new_action})
                  </span>
                  <p className="text-[11px] text-slate-600 italic mt-0.5">
                    Reason: “{ov.reason}” • Operator: <span className="font-semibold text-slate-700">{ov.operator_id || 'DISPATCH-OPERATOR-1'}</span> • Audit ID: <span className="font-mono text-slate-700">{ov.audit_id || 'OVR-LOG'}</span>
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">{ov.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision Rationale Callout Card */}
      <div className="bg-gradient-to-r from-sky-50 to-blue-50 p-4 rounded-xl border border-sky-200 flex items-start gap-3 shadow-xs">
        <Lightbulb className="h-5 w-5 text-sky-700 shrink-0 mt-0.5" />
        <div className="text-xs">
          <strong className="font-bold text-sky-950 block">
            Explainable Decision-Making Principle:
          </strong>
          <span className="text-slate-700">
            Unlike static distance-based routing, every dispatch priority rank in this queue is dynamically calculated using remaining thermal life, direct transit duration, and thermal buffer margin ($Buffer = Remaining - Travel$). Shipments nearing thermal expiration are elevated to the front of the queue.
          </span>
        </div>
      </div>

      {/* Full Priority Queue Table */}
      <PriorityQueueTable
        stops={stops}
        onSelectShipment={onSelectShipment}
        onOpenOverride={onOpenOverride}
      />
    </div>
  );
};
