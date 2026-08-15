/**
 * ChartToolbar.tsx
 * Trading toolbar that embeds in the chart header row.
 * Layout mirrors TradingView / Quantower:
 *   [BUY] [SELL] | Qty±  | Risk% | [REV] [FLAT] [CNCL] | [PREVIEW]
 *
 * Compact, no floating box, reserved space in header.
 * Never overlaps the price canvas.
 */
import React, { useCallback, useState } from 'react';
import { ChartTradeButtons } from './ChartTradeButtons';

export interface ChartToolbarProps {
  symbol: string;
  lotSize: number;
  riskPct: number;
  oneClickEnabled: boolean;
  previewMode: boolean;
  isLoading?: boolean;
  hasPosition: boolean;
  onBuy: () => void;
  onSell: () => void;
  onLotChange: (v: number) => void;
  onRiskChange: (v: number) => void;
  onReverse: () => void;
  onFlatten: () => void;
  onCancelAll: () => void;
  onToggleOneClick: () => void;
  onTogglePreview: () => void;
}

// ─── Style helpers ──────────────────────────────────────────────────────────
const divider: React.CSSProperties = {
  width: 1, height: 16, background: 'rgba(255,255,255,0.07)', margin: '0 3px',
};

const qtyWrap: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 1,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 4, padding: '1px 2px',
};

const qtyBtn = (hover: boolean): React.CSSProperties => ({
  width: 16, height: 16, borderRadius: 3, border: 'none',
  background: hover ? 'rgba(41,98,255,0.25)' : 'rgba(255,255,255,0.05)',
  color: hover ? '#5b8dfe' : '#6b7280',
  fontSize: 11, fontWeight: 900,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 0, lineHeight: 1, transition: 'all 0.12s ease',
});

const qtyInput: React.CSSProperties = {
  width: 36, textAlign: 'center', background: 'transparent',
  border: 'none', color: '#e2e8f0',
  fontFamily: 'Inter, monospace', fontSize: 11, fontWeight: 700, outline: 'none',
};

const riskLabel: React.CSSProperties = {
  fontSize: 9, color: '#4a5568', fontWeight: 700, letterSpacing: '0.5px',
};

const riskInput: React.CSSProperties = {
  width: 28, background: 'transparent', border: 'none',
  color: '#d4af37', fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
  textAlign: 'center', outline: 'none',
};

function makeIconBtn(color = '#8e8e93', active = false): React.CSSProperties {
  return {
    padding: '3px 7px', borderRadius: 4,
    border: `1px solid ${active ? color + '50' : 'rgba(255,255,255,0.07)'}`,
    background: active ? color + '20' : 'rgba(255,255,255,0.03)',
    color: active ? color : '#6b7280',
    fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.12s ease', whiteSpace: 'nowrap',
  };
}

export const ChartToolbar: React.FC<ChartToolbarProps> = ({
  symbol: _symbol,
  lotSize, riskPct, oneClickEnabled, previewMode, isLoading, hasPosition,
  onBuy, onSell, onLotChange, onRiskChange,
  onReverse, onFlatten, onCancelAll, onToggleOneClick, onTogglePreview,
}) => {
  const [qMinHover, setQMinHover] = useState(false);
  const [qPlusHover, setQPlusHover] = useState(false);

  const handleQtyWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.01 : -0.01;
    onLotChange(Math.max(0.01, parseFloat((lotSize + delta).toFixed(2))));
  }, [lotSize, onLotChange]);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '0 4px',
        height: '100%',
        flexShrink: 0,
      }}
    >
      {/* BUY / SELL */}
      <ChartTradeButtons onBuy={onBuy} onSell={onSell} loading={isLoading} disabled={false} />

      <div style={divider} />

      {/* QTY */}
      <div style={qtyWrap} onWheel={handleQtyWheel} title="Lot size (scroll to change)">
        <button
          style={qtyBtn(qMinHover)}
          onMouseEnter={() => setQMinHover(true)}
          onMouseLeave={() => setQMinHover(false)}
          onClick={() => onLotChange(Math.max(0.01, parseFloat((lotSize - 0.01).toFixed(2))))}
        >−</button>
        <input
          style={qtyInput}
          value={lotSize}
          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) onLotChange(v); }}
          type="number" step={0.01} min={0.01}
        />
        <button
          style={qtyBtn(qPlusHover)}
          onMouseEnter={() => setQPlusHover(true)}
          onMouseLeave={() => setQPlusHover(false)}
          onClick={() => onLotChange(parseFloat((lotSize + 0.01).toFixed(2)))}
        >+</button>
      </div>

      {/* RISK % */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '1px 5px',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 4 }} title="Risk % of equity">
        <span style={riskLabel}>R%</span>
        <input
          style={riskInput}
          value={riskPct}
          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0 && v <= 100) onRiskChange(v); }}
          type="number" step={0.1} min={0.1} max={100}
          title="Risk % of account equity"
        />
      </div>

      <div style={divider} />

      {/* Position actions — only show if there's an open position */}
      {hasPosition && (
        <>
          <button style={makeIconBtn('#a78bfa')} onClick={onReverse} title="Reverse Position (R)">⇄ REV</button>
          <button style={makeIconBtn('#d4af37')} onClick={onFlatten} title="Flatten All (F)">◼ FLAT</button>
        </>
      )}
      <button style={makeIconBtn('#6b7280')} onClick={onCancelAll} title="Cancel All Pending (ESC)">⊘ CNCL</button>

      <div style={divider} />

      {/* Execution mode toggle */}
      <button
        id="chart-oneclick-toggle"
        style={makeIconBtn('#00c076', oneClickEnabled)}
        onClick={onToggleOneClick}
        title={oneClickEnabled ? 'Click to switch to Preview Mode' : 'Click to enable 1-Click mode'}
      >
        {oneClickEnabled ? '1-CLK' : 'PREV'}
      </button>

      {/* Preview toggle (explicit) */}
      {!oneClickEnabled && (
        <button
          id="chart-preview-toggle"
          style={makeIconBtn('#2962FF', previewMode)}
          onClick={onTogglePreview}
          title="Toggle Preview Mode"
        >
          {previewMode ? '◉' : '○'} PREV
        </button>
      )}
    </div>
  );
};
