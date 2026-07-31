import React, { useState } from 'react';
import { IconActivity, IconRefreshCw } from './Icons';

export interface CVDPoint {
  timestamp: number;
  time: number;
  delta: number;
  cvd: number;
  session_delta: number;
  daily_delta: number;
  total_volume: number;
  color: string;
  close: number;
}

interface DeltaPanelProps {
  cvdSeries: CVDPoint[];
  mode?: 'session' | 'daily' | 'weekly' | 'monthly' | 'continuous';
  onModeChange?: (mode: 'session' | 'daily' | 'weekly' | 'monthly' | 'continuous') => void;
  height?: number;
}

export const DeltaPanel: React.FC<DeltaPanelProps> = ({
  cvdSeries,
  mode = 'session',
  onModeChange,
  height = 180,
}) => {
  if (!cvdSeries || cvdSeries.length === 0) return null;

  const latest = cvdSeries[cvdSeries.length - 1];
  const maxAbsDelta = Math.max(
    1,
    ...cvdSeries.map((d) => Math.max(Math.abs(d.delta), Math.abs(d.cvd)))
  );

  return (
    <div className="relative w-full rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-xl font-sans">
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-cyan-400">
            <IconActivity className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Cumulative Volume Delta (CVD)
            </h4>
          </div>

          {/* Metrics summary */}
          <div className="flex items-center space-x-3 text-xs font-mono">
            <div>
              <span className="text-slate-500 mr-1">Candle Delta:</span>
              <span className={latest.delta >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {latest.delta > 0 ? `+${latest.delta.toFixed(1)}` : latest.delta.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">Running CVD:</span>
              <span className={latest.cvd >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {latest.cvd > 0 ? `+${latest.cvd.toFixed(1)}` : latest.cvd.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">Daily Delta:</span>
              <span className={latest.daily_delta >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {latest.daily_delta > 0 ? `+${latest.daily_delta.toFixed(1)}` : latest.daily_delta.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Mode Selector Buttons */}
        <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {(['session', 'daily', 'weekly', 'monthly'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange && onModeChange(m)}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded capitalize transition ${
                mode === m
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart Rendering */}
      <div className="relative w-full overflow-hidden" style={{ height: `${height}px` }}>
        <svg className="w-full h-full">
          {/* Zero Line */}
          <line
            x1="0"
            y1={height / 2}
            x2="100%"
            y2={height / 2}
            stroke="rgba(71, 85, 105, 0.4)"
            strokeDasharray="4,4"
          />

          {/* Delta Bars & CVD Line */}
          {cvdSeries.map((pt, idx) => {
            const widthPct = 100 / cvdSeries.length;
            const x = `${idx * widthPct}%`;
            const barWidth = `${Math.max(1, widthPct * 0.7)}%`;

            const deltaRatio = pt.delta / maxAbsDelta;
            const barH = Math.abs(deltaRatio * (height / 2 - 10));
            const isPos = pt.delta >= 0;
            const y = isPos ? height / 2 - barH : height / 2;

            const cvdY = height / 2 - (pt.cvd / maxAbsDelta) * (height / 2 - 10);

            return (
              <g key={`cvd_pt_${idx}`}>
                {/* Individual Delta Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(2, barH)}
                  fill={isPos ? '#10b981' : '#ef4444'}
                  opacity={0.8}
                  rx="1"
                />
              </g>
            );
          })}

          {/* CVD Line Path Overlay */}
          <path
            d={cvdSeries
              .map((pt, idx) => {
                const widthPct = 100 / cvdSeries.length;
                const x = (idx + 0.5) * (100 / cvdSeries.length);
                const cvdY = height / 2 - (pt.cvd / maxAbsDelta) * (height / 2 - 10);
                return `${idx === 0 ? 'M' : 'L'} ${x}% ${cvdY}`;
              })
              .join(' ')}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};
