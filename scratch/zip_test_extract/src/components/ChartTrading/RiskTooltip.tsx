import React from 'react';
import { IconShield, IconTarget, IconActivity } from './Icons';

export interface DragRiskMetrics {
  targetType: 'sl' | 'tp' | 'entry' | 'pending';
  dragPrice: number;
  entryPrice: number;
  currentPrice: number;
  side: 'buy' | 'sell';
  quantity: number;
  riskUsd: number;
  riskPct: number;
  rewardUsd: number;
  rewardPct: number;
  rrRatio: string;
  projectedPnl: number;
  distanceTicks: number;
  distancePct: number;
  x: number;
  y: number;
}

interface RiskTooltipProps {
  metrics: DragRiskMetrics;
}

export const RiskTooltip: React.FC<RiskTooltipProps> = ({ metrics }) => {
  const isSL = metrics.targetType === 'sl';
  const isTP = metrics.targetType === 'tp';
  const isBuy = metrics.side === 'buy';

  const badgeColor = isSL
    ? 'bg-red-950/90 border-red-500/70 text-red-300'
    : isTP
    ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-300'
    : 'bg-cyan-950/90 border-cyan-500/70 text-cyan-300';

  return (
    <div
      className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 w-64 p-3 rounded-xl border shadow-2xl backdrop-blur-md font-mono text-xs transition-all duration-75"
      style={{ left: `${metrics.x}px`, top: `${metrics.y}px` }}
    >
      <div className={`p-2 rounded-lg border mb-2 flex items-center justify-between font-bold ${badgeColor}`}>
        <div className="flex items-center space-x-1.5 uppercase">
          {isSL ? <IconShield className="w-3.5 h-3.5 text-red-400" /> : <IconTarget className="w-3.5 h-3.5 text-emerald-400" />}
          <span>{isSL ? 'Stop Loss Drag' : isTP ? 'Take Profit Drag' : 'Order Level Drag'}</span>
        </div>
        <span className="text-white text-sm">{metrics.dragPrice.toFixed(2)}</span>
      </div>

      <div className="space-y-1 text-[11px] text-slate-300 bg-slate-900/90 p-2 rounded-lg border border-slate-800">
        <div className="flex justify-between">
          <span className="text-slate-400">Side & Lots:</span>
          <span className={isBuy ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
            {metrics.side.toUpperCase()} ({metrics.quantity} lots)
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Entry Price:</span>
          <span className="text-white font-bold">{metrics.entryPrice.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Distance:</span>
          <span className="text-cyan-300 font-bold">
            {metrics.distanceTicks} ticks ({metrics.distancePct}%)
          </span>
        </div>

        <div className="flex justify-between border-t border-slate-800 pt-1 mt-1">
          <span className="text-slate-400">Projected P/L:</span>
          <span className={`font-extrabold ${metrics.projectedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {metrics.projectedPnl >= 0 ? `+$${metrics.projectedPnl.toFixed(2)}` : `-$${Math.abs(metrics.projectedPnl).toFixed(2)}`}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Equity Risk / Reward:</span>
          <span className="text-amber-300 font-bold">
            {isSL ? `${metrics.riskPct}%` : `${metrics.rewardPct}%`}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">R:R Ratio:</span>
          <span className="text-cyan-400 font-extrabold">{metrics.rrRatio}</span>
        </div>
      </div>
    </div>
  );
};
