'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getRouteComparison, submitOverride } from '../../lib/api';
import { RouteComparison, PrioritizedShipmentDetail, OverrideRequest } from '../../lib/types';
import { FALLBACK_COMPARISON } from '../../lib/fallbackData';
import { Header } from '../../components/Header';
import { RouteView } from '../../components/views/RouteView';
import { ShipmentDetailModal } from '../../components/ShipmentDetailModal';

export default function RoutePage() {
  const [comparison, setComparison] = useState<RouteComparison>(FALLBACK_COMPARISON);
  const [selectedShipment, setSelectedShipment] = useState<PrioritizedShipmentDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const compRes = await getRouteComparison();
      if (compRes.data) setComparison(compRes.data);
      setIsOnline(compRes.isOnline);
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

  const handleSubmitOverride = async (req: OverrideRequest) => {
    await submitOverride(req);
    await loadData();
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
        <RouteView
          comparison={comparison}
          onSelectShipment={handleSelectShipment}
        />
      </main>

      <ShipmentDetailModal
        shipment={selectedShipment}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onSubmitOverride={handleSubmitOverride}
      />

      <footer className="bg-white border-t border-slate-200 py-4 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <span className="font-semibold text-slate-700">Remaining Thermal Life Route Prioritiser</span>
          <span className="text-slate-400">Route Strategy Planning Module</span>
        </div>
      </footer>
    </div>
  );
}
