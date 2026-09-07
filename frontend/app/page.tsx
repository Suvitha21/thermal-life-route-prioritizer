'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getSummary,
  getProposedRoute,
  getRouteComparison,
  submitOverride,
} from '../lib/api';
import {
  SummaryKPIs,
  RoutePlan,
  RouteComparison,
  PrioritizedShipmentDetail,
  OverrideRequest,
} from '../lib/types';
import {
  FALLBACK_SUMMARY,
  FALLBACK_PROPOSED_PLAN,
  FALLBACK_COMPARISON,
} from '../lib/fallbackData';

import { Header } from '../components/Header';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { SummaryCards } from '../components/SummaryCards';
import { RiskOverview } from '../components/RiskOverview';
import { EdgeCaseAlerts } from '../components/EdgeCaseAlerts';
import { PriorityQueueTable } from '../components/PriorityQueueTable';
import { RouteComparisonSection } from '../components/RouteComparisonSection';
import { ShipmentDetailModal } from '../components/ShipmentDetailModal';
import { ManualOverrideModal } from '../components/ManualOverrideModal';
import {
  ListOrdered,
  GitCompare,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Database,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export default function DashboardPage() {
  const [summary, setSummary] = useState<SummaryKPIs>(FALLBACK_SUMMARY);
  const [proposedPlan, setProposedPlan] = useState<RoutePlan>(FALLBACK_PROPOSED_PLAN);
  const [comparison, setComparison] = useState<RouteComparison>(FALLBACK_COMPARISON);

  const [selectedShipment, setSelectedShipment] = useState<PrioritizedShipmentDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  const [overrideTarget, setOverrideTarget] = useState<PrioritizedShipmentDetail | null>(null);
  const [isOverrideOpen, setIsOverrideOpen] = useState<boolean>(false);

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('Initializing...');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sumRes, propRes, compRes] = await Promise.all([
        getSummary(),
        getProposedRoute(),
        getRouteComparison(),
      ]);

      if (sumRes.data) setSummary(sumRes.data);
      if (propRes.data) setProposedPlan(propRes.data);
      if (compRes.data) setComparison(compRes.data);

      setIsOnline(sumRes.isOnline);
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectShipment = (shipment: PrioritizedShipmentDetail) => {
    setSelectedShipment(shipment);
    setIsDetailOpen(true);
  };

  const handleSelectShipmentById = (id: string) => {
    const found = proposedPlan.stops.find((s) => s.shipment_id.toUpperCase() === id.toUpperCase());
    if (found) {
      setSelectedShipment(found);
      setIsDetailOpen(true);
    }
  };

  const handleOpenOverride = (shipment: PrioritizedShipmentDetail) => {
    setOverrideTarget(shipment);
    setIsOverrideOpen(true);
  };

  const handleSubmitOverride = async (req: OverrideRequest) => {
    await submitOverride(req);
    await loadData();
    if (selectedShipment && selectedShipment.shipment_id === req.shipment_id) {
      const updated = proposedPlan.stops.find((s) => s.shipment_id === req.shipment_id);
      if (updated) setSelectedShipment(updated);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 text-slate-900">
      {/* Sticky Top Header & Navbar */}
      <Header
        isOnline={isOnline}
        lastUpdated={lastUpdated}
        onRefresh={loadData}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Clickable 6-Step Workflow Stepper Navigation Banner */}
        <WorkflowStepper />

        {/* Operational Fallback & Telemetry Alerts */}
        <EdgeCaseAlerts
          isOnline={isOnline}
          summary={summary}
          onSelectShipmentId={handleSelectShipmentById}
        />

        {/* 6 Summary KPI Cards */}
        <SummaryCards summary={summary} />

        {/* Risk Overview Distribution with Link to /risk */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Thermal Risk Overview
            </span>
            <Link
              href="/risk"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>Explore Full Risk Breakdown</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <RiskOverview riskCounts={summary.risk_distribution} totalShipments={summary.total_shipments} />
        </div>

        {/* Route Strategy Comparison Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Route Strategy Comparison Matrix
            </span>
            <Link
              href="/route"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>Open Dedicated Route View</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <RouteComparisonSection comparison={comparison} onSelectShipment={handleSelectShipment} />
        </div>

        {/* Proposed Priority Queue Interactive Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Thermal-Life-Aware Priority Queue
            </span>
            <Link
              href="/priority"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>View Full Priority Queue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <PriorityQueueTable
            stops={proposedPlan.stops}
            onSelectShipment={handleSelectShipment}
            onOpenOverride={handleOpenOverride}
          />
        </div>
      </main>

      {/* Shipment Detail Drawer/Modal */}
      <ShipmentDetailModal
        shipment={selectedShipment}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onSubmitOverride={handleSubmitOverride}
      />

      {/* Standalone Manual Override Modal */}
      {overrideTarget && (
        <ManualOverrideModal
          shipment={overrideTarget}
          isOpen={isOverrideOpen}
          onClose={() => {
            setIsOverrideOpen(false);
            setOverrideTarget(null);
          }}
          onSubmitOverride={handleSubmitOverride}
        />
      )}

      {/* Clean, Professional Minimal Footer (Unwanted text completely removed) */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Remaining Thermal Life Route Prioritiser</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">Dairy Cold-Chain Fleet Operations</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            Real-time Milk Collection & Route Dispatch System
          </div>
        </div>
      </footer>
    </div>
  );
}
