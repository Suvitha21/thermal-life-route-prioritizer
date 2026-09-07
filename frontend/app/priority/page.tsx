'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getProposedRoute, getOverrides, submitOverride } from '../../lib/api';
import { RoutePlan, PrioritizedShipmentDetail, OverrideRecord, OverrideRequest } from '../../lib/types';
import { FALLBACK_PROPOSED_PLAN } from '../../lib/fallbackData';
import { Header } from '../../components/Header';
import { PriorityView } from '../../components/views/PriorityView';
import { ShipmentDetailModal } from '../../components/ShipmentDetailModal';
import { ManualOverrideModal } from '../../components/ManualOverrideModal';

export default function PriorityPage() {
  const [proposedPlan, setProposedPlan] = useState<RoutePlan>(FALLBACK_PROPOSED_PLAN);
  const [overrides, setOverrides] = useState<OverrideRecord[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<PrioritizedShipmentDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [overrideTarget, setOverrideTarget] = useState<PrioritizedShipmentDetail | null>(null);
  const [isOverrideOpen, setIsOverrideOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [propRes, ovRes] = await Promise.all([getProposedRoute(), getOverrides()]);
      if (propRes.data) setProposedPlan(propRes.data);
      if (ovRes.data) setOverrides(ovRes.data);
      setIsOnline(propRes.isOnline);
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error(err);
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
      <Header
        isOnline={isOnline}
        lastUpdated={lastUpdated}
        onRefresh={loadData}
        isLoading={isLoading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PriorityView
          stops={proposedPlan.stops}
          overrides={overrides}
          onSelectShipment={handleSelectShipment}
          onOpenOverride={handleOpenOverride}
        />
      </main>

      <ShipmentDetailModal
        shipment={selectedShipment}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onSubmitOverride={handleSubmitOverride}
      />

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

      <footer className="bg-white border-t border-slate-200 py-4 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <span className="font-semibold text-slate-700">Remaining Thermal Life Route Prioritiser</span>
          <span className="text-slate-400">Priority Queue Dispatch Module</span>
        </div>
      </footer>
    </div>
  );
}
