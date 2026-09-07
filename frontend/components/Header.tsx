'use client';

import React from 'react';
import { Milk, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';
import { Navbar } from './Navbar';

interface HeaderProps {
  isOnline: boolean;
  lastUpdated: string;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isOnline,
  lastUpdated,
  onRefresh,
  isLoading,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Left: Project Branding */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-sky-500/20 ring-2 ring-sky-100 shrink-0">
              <Milk className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Remaining Thermal Life Route Prioritiser
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Thermal-Life-Aware Milk Collection & Dispatch Route Planner
              </p>
            </div>
          </div>

          {/* Right: Operational Status Badges & Controls */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Simulation Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
              Simulation-based thermal-life estimate
            </span>

            {/* Connection Status */}
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                ONLINE — FASTAPI BACKEND
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 shadow-xs animate-pulse">
                <WifiOff className="h-3.5 w-3.5 text-amber-600" />
                OFFLINE — USING LOCAL SIMULATION DATA
              </span>
            )}

            {/* Last Updated & Refresh */}
            <div className="flex items-center gap-1.5 pl-1 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{lastUpdated}</span>
              <button
                onClick={onRefresh}
                disabled={isLoading}
                title="Refresh telemetry and recalculate route priority"
                className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Top Navigation Bar */}
      <Navbar />
    </header>
  );
};
