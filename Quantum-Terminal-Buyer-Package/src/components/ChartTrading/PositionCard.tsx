/**
 * PositionCard.tsx
 * Quantum Terminal – Professional Floating Position Card
 * Sleek, high-density, glassmorphism floating position box for institutional chart trading.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface PositionCardData {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  floatingPnl: number;
  marginUsed: number;
  accountBalance: number;
}

interface PositionCardProps {
  position: PositionCardData;
  onClose?: () => void;
  onReverse?: () => void;
  onBreakEven?: () => void;
  onPartialClose?: (pct: number) => void;
  onAddSL?: () => void;
  onAddTP?: () => void;
  onTrail?: () => void;
}

export const PositionCard: React.FC<PositionCardProps> = React.memo(({ position, onClose }) => {
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Dragging state
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initialX: number; initialY: number }>({
    mouseX: 0, mouseY: 0, initialX: 0, initialY: 0,
  });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: rect.left,
      initialY: rect.top,
    };
    isDraggingRef.current = true;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setDragPos({
        x: dragStartRef.current.initialX + dx,
        y: dragStartRef.current.initialY + dy,
      });
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (hidden || !position) return null;

  const { side, symbol, quantity, entryPrice, currentPrice, stopLoss, takeProfit, floatingPnl, accountBalance } = position;

  const isBuy = side.toUpperCase() === 'BUY';
  const isPnlPos = floatingPnl >= 0;
  const pnlPct = accountBalance > 0 ? ((floatingPnl / accountBalance) * 100).toFixed(2) : '0.00';
  const pnlColor = isPnlPos ? '#00c076' : '#ff4d57';

  // R:R Calculation
  const riskUsd = stopLoss && stopLoss > 0 ? Math.abs(entryPrice - stopLoss) * quantity : 0;
  const rewardUsd = takeProfit && takeProfit > 0 ? Math.abs(takeProfit - entryPrice) * quantity : 0;
  const rrRatio = riskUsd > 0 && rewardUsd > 0 ? `1:${(rewardUsd / riskUsd).toFixed(1)}` : null;

  // Format prices helper
  const fmtPrice = (p?: number) => {
    if (p == null || p === 0) return null;
    return p >= 1000 ? p.toFixed(2) : p.toFixed(4);
  };

  const formattedEntry = fmtPrice(entryPrice);
  const formattedCurrent = fmtPrice(currentPrice);
  const formattedSL = fmtPrice(stopLoss);
  const formattedTP = fmtPrice(takeProfit);

  // Position style
  const cardStyle: React.CSSProperties = {
    position: dragPos ? 'fixed' : 'absolute',
    top: dragPos ? dragPos.y : 42,
    right: dragPos ? undefined : 12,
    left: dragPos ? dragPos.x : undefined,
    zIndex: 140,
    width: 170,
    maxHeight: expanded ? 90 : 42,
    borderRadius: 12,
    background: 'rgba(12, 18, 28, 0.88)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 215, 0, 0.25)',
    boxShadow: `0 8px 32px rgba(0,0,0,0.65), 0 0 12px ${isPnlPos ? 'rgba(0,192,118,0.15)' : 'rgba(255,77,87,0.15)'}`,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    userSelect: 'none',
    pointerEvents: 'auto',
    overflow: 'hidden',
    transition: 'max-height 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
    cursor: 'pointer',
  };

  return (
    <div
      ref={cardRef}
      style={cardStyle}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName !== 'BUTTON') {
          setExpanded((v) => !v);
        }
      }}
      title="Click to toggle expanded metrics | Drag to reposition"
    >
      {/* ── COLLAPSED HEADER (42px) ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          height: 42,
          padding: '4px 8px',
          boxSizing: 'border-box',
        }}
      >
        {/* Row 1: Status Pill + Symbol + PnL */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', lineHeight: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: isBuy ? '#00c076' : '#ff4d57',
                background: isBuy ? 'rgba(0,192,118,0.18)' : 'rgba(255,77,87,0.18)',
                padding: '2px 5px',
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                letterSpacing: '0.4px',
              }}
            >
              <span>{isBuy ? '🟢' : '🔴'}</span>
              <span>{isBuy ? 'LONG' : 'SHORT'}</span>
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>
              {symbol}
            </span>
          </div>

          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: pnlColor,
              fontFamily: 'monospace',
              letterSpacing: '-0.3px',
            }}
          >
            {floatingPnl >= 0 ? '+' : ''}${floatingPnl.toFixed(2)}
          </span>
        </div>

        {/* Row 2: Lot Size + PnL % + Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3, lineHeight: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>
            {quantity}L · <span style={{ color: pnlColor }}>{isPnlPos ? '+' : ''}{pnlPct}%</span>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 8, color: '#64748b' }}>
              {expanded ? '▲' : '▼'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onClose) onClose();
                else setHidden(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: 11,
                lineHeight: 1,
                padding: '0 2px',
              }}
              title="Close card"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* ── EXPANDED BODY (up to 90px total height) ────────────────── */}
      {expanded && (
        <div
          style={{
            padding: '2px 8px 6px',
            borderTop: '1px dashed rgba(255, 215, 0, 0.15)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2px 6px',
            fontSize: 10,
            fontFamily: 'monospace',
          }}
        >
          {formattedEntry && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Entry</span>
              <span style={{ color: '#cbd5e1', fontWeight: 700 }}>{formattedEntry}</span>
            </div>
          )}

          {formattedCurrent && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Now</span>
              <span style={{ color: pnlColor, fontWeight: 700 }}>{formattedCurrent}</span>
            </div>
          )}

          {formattedSL && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#ff4d57', fontWeight: 600 }}>SL</span>
              <span style={{ color: '#ff7b84', fontWeight: 700 }}>{formattedSL}</span>
            </div>
          )}

          {formattedTP && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#00c076', fontWeight: 600 }}>TP</span>
              <span style={{ color: '#33e09a', fontWeight: 700 }}>{formattedTP}</span>
            </div>
          )}

          {rrRatio && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gridColumn: 'span 2' }}>
              <span style={{ color: '#d4af37', fontWeight: 600 }}>R:R Ratio</span>
              <span style={{ color: '#d4af37', fontWeight: 700 }}>{rrRatio}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

PositionCard.displayName = 'PositionCard';

