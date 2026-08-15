/**
 * DragTooltip.tsx
 * Floating rich tooltip shown while dragging SL/TP lines.
 * Displays Entry, Current, Risk $, Reward $, Risk %, Reward %, RR, Expected P/L.
 * Pure inline CSS — no Tailwind dependency.
 */
import React from 'react';

export interface DragTooltipMetrics {
  targetType: 'sl' | 'tp' | 'pending';
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
  distancePips: number;
  x: number;
  y: number;
}

interface DragTooltipProps {
  metrics: DragTooltipMetrics;
}

const COLORS = {
  sl: { accent: '#ff4d57', bg: 'rgba(80,12,20,0.95)', border: 'rgba(255,77,87,0.4)' },
  tp: { accent: '#00c076', bg: 'rgba(5,45,28,0.95)', border: 'rgba(0,192,118,0.4)' },
  pending: { accent: '#2962FF', bg: 'rgba(8,22,60,0.95)', border: 'rgba(41,98,255,0.4)' },
};

export const DragTooltip: React.FC<DragTooltipProps> = ({ metrics }) => {
  const c = COLORS[metrics.targetType];
  const isPnlPos = metrics.projectedPnl >= 0;

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 99999,
        pointerEvents: 'none',
        left: metrics.x + 16,
        top: metrics.y - 80,
        width: 218,
        borderRadius: 10,
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 24px ${c.accent}20`,
        fontFamily: 'Inter, monospace',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header badge */}
      <div style={{
        background: c.accent,
        padding: '4px 10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {metrics.targetType === 'sl' ? '⛛ Stop Loss' : metrics.targetType === 'tp' ? '◎ Take Profit' : '⦿ Pending Order'}
        </span>
        <span style={{ fontSize: 12, fontWeight: 900, color: '#ffffff', fontFamily: 'monospace' }}>
          {metrics.dragPrice.toFixed(2)}
        </span>
      </div>

      {/* Metrics grid */}
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {[
          { label: 'Entry Price', value: metrics.entryPrice.toFixed(2), color: '#c0c8e0' },
          { label: 'Current Price', value: metrics.currentPrice.toFixed(2), color: '#c0c8e0' },
          { label: 'Side', value: metrics.side.toUpperCase(), color: metrics.side === 'buy' ? '#00c076' : '#ff4d57' },
          { label: 'Distance', value: `${metrics.distancePips} pips`, color: '#a0aec0' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, color: '#4a5568', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
            <span style={{ fontSize: 10, color, fontWeight: 700, fontFamily: 'monospace' }}>{value}</span>
          </div>
        ))}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />

        {[
          { label: 'Risk $', value: `-$${metrics.riskUsd.toFixed(2)}`, color: '#ff7b84' },
          { label: 'Risk %', value: `${metrics.riskPct.toFixed(2)}%`, color: '#ff7b84' },
          { label: 'Reward $', value: `+$${metrics.rewardUsd.toFixed(2)}`, color: '#00c076' },
          { label: 'Reward %', value: `${metrics.rewardPct.toFixed(2)}%`, color: '#00c076' },
          { label: 'R:R Ratio', value: metrics.rrRatio, color: '#d4af37' },
          { label: 'Exp. P/L', value: `${isPnlPos ? '+' : ''}$${metrics.projectedPnl.toFixed(2)}`, color: isPnlPos ? '#00c076' : '#ff4d57' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, color: '#4a5568', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
            <span style={{ fontSize: 10, color, fontWeight: 800, fontFamily: 'monospace' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
