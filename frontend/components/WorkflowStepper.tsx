'use client';

import React from 'react';
import Link from 'next/link';
import {
  Database,
  Activity,
  AlertTriangle,
  ListOrdered,
  Navigation,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const workflowSteps = [
  {
    id: 'data',
    name: '1. DATA',
    desc: '28 Producer Telemetry Logs',
    hoverText: 'Open Data Explorer',
    href: '/data',
    icon: Database,
    color: 'text-sky-600',
    hoverBg: 'hover:border-sky-400 hover:bg-sky-50/70',
    badge: '28 Batches',
  },
  {
    id: 'thermal',
    name: '2. THERMAL ANALYSIS',
    desc: 'Degradation & Multipliers',
    hoverText: 'View Thermal Analysis',
    href: '/thermal-analysis',
    icon: Activity,
    color: 'text-blue-600',
    hoverBg: 'hover:border-blue-400 hover:bg-blue-50/70',
    badge: '4°C Baseline',
  },
  {
    id: 'risk',
    name: '3. RISK',
    desc: 'Thermal Buffer & Thresholds',
    hoverText: 'Analyze Thermal Risk',
    href: '/risk',
    icon: AlertTriangle,
    color: 'text-amber-600',
    hoverBg: 'hover:border-amber-400 hover:bg-amber-50/70',
    badge: '4 Risk Tiers',
  },
  {
    id: 'priority',
    name: '4. PRIORITY',
    desc: 'Urgency & Feasibility Rank',
    hoverText: 'Open Priority Queue',
    href: '/priority',
    icon: ListOrdered,
    color: 'text-orange-600',
    hoverBg: 'hover:border-orange-400 hover:bg-orange-50/70',
    badge: 'Ranked 1–28',
  },
  {
    id: 'route',
    name: '5. ROUTE',
    desc: '3-Truck Dispatch Planning',
    hoverText: 'Compare Routes',
    href: '/route',
    icon: Navigation,
    color: 'text-indigo-600',
    hoverBg: 'hover:border-indigo-400 hover:bg-indigo-50/70',
    badge: '3 Fleet Trucks',
  },
  {
    id: 'delivery',
    name: '6. DELIVERY',
    desc: 'Zero Spoilage Verification',
    hoverText: 'Verify Delivery',
    href: '/delivery',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    hoverBg: 'hover:border-emerald-400 hover:bg-emerald-50/70',
    badge: '+22.2% Gain',
  },
];

export const WorkflowStepper: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 mb-6">
      {/* Stepper Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 tracking-tight">
              End-to-End Decision Architecture Flow
            </h2>
            <p className="text-[11px] text-slate-500">
              Click any workflow stage to open its detailed operational view
            </p>
          </div>
        </div>
        <div className="text-[11px] text-sky-700 font-bold bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 self-start sm:self-auto">
          6 Interactive Modules
        </div>
      </div>

      {/* 6 Clickable Interactive Workflow Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {workflowSteps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.id}
              href={step.href}
              className={`group relative flex flex-col justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-200/90 transition-all duration-200 ${step.hoverBg} hover:shadow-md hover:-translate-y-0.5 focus:outline-hidden focus:ring-2 focus:ring-sky-500`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`h-8 w-8 rounded-lg bg-white shadow-xs border border-slate-200/70 flex items-center justify-center ${step.color} group-hover:scale-105 transition-transform`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 shadow-2xs font-mono">
                    {step.badge}
                  </span>
                </div>

                <div className="text-[11px] font-black text-slate-900 tracking-tight leading-tight group-hover:text-sky-700 transition-colors">
                  {step.name}
                </div>
                <div className="text-[10px] text-slate-500 font-medium leading-tight mt-1">
                  {step.desc}
                </div>
              </div>

              {/* Hover prompt footer */}
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold text-sky-600 opacity-90 group-hover:opacity-100">
                <span className="truncate">{step.hoverText}</span>
                <ArrowRight className="h-3 w-3 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
