'use client';

import React from 'react';
import { Thermometer, ShieldCheck, AlertCircle } from 'lucide-react';

interface TemperatureChartProps {
  temperatureHistory: number[] | null;
  maxSafeTemp: number;
  baselineTemp?: number;
  packagingType: string;
  packagingPerformance: number;
}

export const TemperatureChart: React.FC<TemperatureChartProps> = ({
  temperatureHistory,
  maxSafeTemp,
  baselineTemp = 4.0,
  packagingType,
  packagingPerformance,
}) => {
  if (!temperatureHistory || temperatureHistory.length === 0) {
    return (
      <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-6 text-center">
        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-amber-900">Telemetry Unavailable</h4>
        <p className="text-xs text-amber-700 mt-1 max-w-sm mx-auto">
          No live temperature sensor logs found for this shipment. Manual on-site thermometer verification is required.
        </p>
      </div>
    );
  }

  const readings = temperatureHistory;
  const minTemp = Math.min(...readings, baselineTemp - 0.5, 2.5);
  const maxTemp = Math.max(...readings, maxSafeTemp + 1.0, 8.5);

  const chartWidth = 540;
  const chartHeight = 180;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 30;

  const innerWidth = chartWidth - padLeft - padRight;
  const innerHeight = chartHeight - padTop - padBottom;

  const scaleX = (index: number) => {
    if (readings.length <= 1) return padLeft + innerWidth / 2;
    return padLeft + (index / (readings.length - 1)) * innerWidth;
  };

  const scaleY = (temp: number) => {
    const norm = (temp - minTemp) / (maxTemp - minTemp);
    return padTop + (1 - norm) * innerHeight;
  };

  // Generate path points
  const points = readings.map((temp, idx) => ({
    x: scaleX(idx),
    y: scaleY(temp),
    temp,
    hour: idx + 1,
  }));

  const pathString = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaString = `${pathString} L ${points[points.length - 1].x} ${padTop + innerHeight} L ${points[0].x} ${padTop + innerHeight} Z`;

  const baselineY = scaleY(baselineTemp);
  const safeY = scaleY(maxSafeTemp);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Thermometer className="h-4 w-4 text-sky-600" />
          <span className="text-xs font-bold text-slate-800">Hourly Temperature Telemetry</span>
          <span className="text-[11px] text-slate-500 font-medium">({readings.length} hours logged)</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-medium">
            {packagingType} (Perf: {(packagingPerformance * 100).toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto max-h-52 select-none">
          {/* Grid lines */}
          <line
            x1={padLeft}
            y1={padTop + innerHeight}
            x2={chartWidth - padRight}
            y2={padTop + innerHeight}
            stroke="#cbd5e1"
            strokeWidth="1"
          />

          {/* Baseline Ref Line (4.0°C) */}
          <line
            x1={padLeft}
            y1={baselineY}
            x2={chartWidth - padRight}
            y2={baselineY}
            stroke="#0284c7"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text x={chartWidth - padRight + 4} y={baselineY + 3} fill="#0284c7" fontSize="9" fontWeight="bold">
            4.0°C
          </text>

          {/* Safe Threshold Line (6.0°C) */}
          <line
            x1={padLeft}
            y1={safeY}
            x2={chartWidth - padRight}
            y2={safeY}
            stroke="#dc2626"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text x={chartWidth - padRight + 4} y={safeY + 3} fill="#dc2626" fontSize="9" fontWeight="bold">
            {maxSafeTemp.toFixed(1)}°C Max
          </text>

          {/* Gradient Fill under path */}
          <defs>
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaString} fill="url(#tempGradient)" />

          {/* Temperature Path Line */}
          <path d={pathString} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {points.map((pt, idx) => {
            const isBreach = pt.temp >= maxSafeTemp;
            return (
              <g key={idx}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isBreach ? 5.5 : 4}
                  fill={isBreach ? '#dc2626' : '#0284c7'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all hover:r-6"
                />
                <text
                  x={pt.x}
                  y={pt.y - 8}
                  fill={isBreach ? '#dc2626' : '#0f172a'}
                  fontSize="9.5"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {pt.temp.toFixed(1)}°
                </text>
                {/* X Axis Label */}
                <text
                  x={pt.x}
                  y={padTop + innerHeight + 14}
                  fill="#64748b"
                  fontSize="9"
                  textAnchor="middle"
                >
                  H{pt.hour}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-2 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-600"></span>
          <span>Logged Temp (°C)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 border-t-2 border-dashed border-sky-600"></span>
          <span>4.0°C Standard Baseline</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 border-t-2 border-dashed border-red-600"></span>
          <span>6.0°C Safety Threshold</span>
        </div>
      </div>
    </div>
  );
};
