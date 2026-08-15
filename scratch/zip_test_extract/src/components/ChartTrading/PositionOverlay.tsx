/**
 * PositionOverlay.tsx
 * Professional chart position lines for Entry, SL, TP.
 * Each line shows: Price | P/L | Lots | Ticket | RR | Drag Handle | Close Btn | Edit Btn.
 * Hover animation: soft glow + scale.
 * Pure inline CSS — no Tailwind.
 */
import React, { useState } from 'react';

export interface PositionOverlayData {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entry_price: number;
  current_price: number;
  stop_loss?: number;
  take_profit?: number;
  floating_pnl: number;
  color_state: 'profit_green' | 'loss_red';
  leverage: number;
  margin_used: number;
}

interface PositionOverlayProps {
  position: PositionOverlayData;
  priceToY: (price: number) => number;
  onStartDrag: (type: 'sl' | 'tp' | 'entry', startPrice: number) => void;
  onQuickAction: (action: string, payload?: any) => void;
}

const COLORS = {
  profit: { line: '#00c076', bg: 'rgba(0,32,20,0.92)', border: 'rgba(0,192,118,0.5)', text: '#00c076', glow: '#00c07640' },
  loss:   { line: '#ff4d57', bg: 'rgba(40,8,12,0.92)', border: 'rgba(255,77,87,0.5)', text: '#ff4d57', glow: '#ff4d5740' },
  sl:     { line: '#ff4d57', bg: 'rgba(50,10,14,0.93)', border: 'rgba(255,77,87,0.5)', text: '#ff7b84', glow: '#ff4d5730' },
  tp:     { line: '#00c076', bg: 'rgba(0,40,24,0.93)', border: 'rgba(0,192,118,0.5)', text: '#33e09a', glow: '#00c07630' },
};

// Reusable inline badge/label pill for lines
const LineBadge: React.FC<{
  label: string;
  price: number;
  extra?: string;
  color: typeof COLORS.profit;
  onDrag?: () => void;
  onClose?: () => void;
  onEdit?: () => void;
  side?: 'left' | 'right';
}> = ({ label, price, extra, color, onDrag, onClose, onEdit, side = 'right' }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        [side]: side === 'right' ? 4 : 4,
        top: '50%',
        transform: `translateY(-50%) scale(${hovered ? 1.04 : 1})`,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px 3px 6px',
        borderRadius: 6,
        background: color.bg,
        border: `1px solid ${color.border}`,
        boxShadow: hovered ? `0 0 20px ${color.glow}, 0 2px 12px rgba(0,0,0,0.5)` : `0 2px 8px rgba(0,0,0,0.4)`,
        transition: 'all 0.15s ease',
        cursor: onDrag ? 'row-resize' : 'pointer',
        fontFamily: 'Inter, monospace',
        pointerEvents: 'auto',
        whiteSpace: 'nowrap',
        zIndex: 10,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Drag grip */}
      {onDrag && (
        <span
          style={{ color: color.text, fontSize: 9, opacity: 0.7, cursor: 'row-resize', marginRight: 2 }}
          onMouseDown={onDrag}
          title="Drag to move"
        >⠿</span>
      )}

      {/* Main label */}
      <span style={{ fontSize: 9, color: color.text, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 900, fontFamily: 'monospace' }}>
        {price.toFixed(2)}
      </span>

      {/* Extra info */}
      {extra && (
        <span style={{ fontSize: 9, color: color.text, fontWeight: 700, opacity: 0.85 }}>
          {extra}
        </span>
      )}

      {/* Edit button */}
      {onEdit && hovered && (
        <button
          onClick={onEdit}
          style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', padding: '0 2px', fontSize: 10, lineHeight: 1 }}
          title="Edit"
        >✎</button>
      )}

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: hovered ? 'rgba(255,77,87,0.2)' : 'none',
            border: 'none',
            color: hovered ? '#ff4d57' : '#5a6680',
            cursor: 'pointer',
            padding: '0 2px',
            fontSize: 11,
            lineHeight: 1,
            borderRadius: 3,
            transition: 'all 0.12s ease',
          }}
          title="Close position"
        >×</button>
      )}
    </div>
  );
};

export const PositionOverlay: React.FC<PositionOverlayProps> = ({
  position,
  priceToY,
  onStartDrag,
  onQuickAction,
}) => {
  const [showQuickPopup, setShowQuickPopup] = useState(false);

  const entryY = priceToY(position.entry_price);
  const slY = position.stop_loss != null ? priceToY(position.stop_loss) : null;
  const tpY = position.take_profit != null ? priceToY(position.take_profit) : null;

  const isProfitable = position.floating_pnl >= 0;
  const entryColor = isProfitable ? COLORS.profit : COLORS.loss;

  const pnlText = position.floating_pnl >= 0
    ? `+$${position.floating_pnl.toFixed(2)}`
    : `-$${Math.abs(position.floating_pnl).toFixed(2)}`;

  const riskUsd = position.stop_loss
    ? Math.abs(position.entry_price - position.stop_loss) * position.quantity
    : 0;
  const rewardUsd = position.take_profit
    ? Math.abs(position.take_profit - position.entry_price) * position.quantity
    : 0;
  const rrText = riskUsd > 0 && rewardUsd > 0 ? `RR ${(rewardUsd / riskUsd).toFixed(2)}` : '';

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30 }}>

      {/* ── ENTRY LINE ─────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: entryY,
          height: 0,
          borderTop: `1.5px dashed ${entryColor.line}`,
          pointerEvents: 'auto',
          cursor: 'pointer',
        }}
        onClick={() => setShowQuickPopup(!showQuickPopup)}
      >
        <LineBadge
          label={`${position.side} ${position.quantity}L`}
          price={position.entry_price}
          extra={`${pnlText}${rrText ? ' · ' + rrText : ''}`}
          color={entryColor}
          onClose={() => onQuickAction('partial_close', { pct: 1.0 })}
          onEdit={() => setShowQuickPopup(true)}
        />

        {/* Quick popup */}
        {showQuickPopup && (
          <div
            style={{
              position: 'absolute',
              right: 4,
              top: '100%',
              marginTop: 4,
              width: 200,
              background: 'rgba(9,13,25,0.97)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 8,
              padding: 8,
              zIndex: 50,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              fontFamily: 'Inter, sans-serif',
              pointerEvents: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 6, marginBottom: 6,
              fontSize: 9, color: '#4a5568', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px',
            }}>
              <span>POSITION ACTIONS</span>
              <button
                onClick={() => setShowQuickPopup(false)}
                style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}
              >×</button>
            </div>
            {[
              { label: '✕ Close 100%', action: 'partial_close', payload: { pct: 1.0 }, color: '#ff4d57' },
              { label: '✕ Close 50%',  action: 'partial_close', payload: { pct: 0.5 }, color: '#ff7b84' },
              { label: '✕ Close 25%',  action: 'partial_close', payload: { pct: 0.25 }, color: '#fca5a5' },
              { label: '◆ Break Even', action: 'break_even', payload: undefined, color: '#d4af37' },
              { label: '⇄ Reverse',   action: 'reverse', payload: undefined, color: '#a78bfa' },
              { label: '⊕ Duplicate', action: 'duplicate', payload: undefined, color: '#00c076' },
            ].map(({ label, action, payload, color }) => (
              <button
                key={action + label}
                onClick={() => { onQuickAction(action, payload); setShowQuickPopup(false); }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  color,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 6px',
                  borderRadius: 4,
                  fontFamily: 'Inter, sans-serif',
                  marginBottom: 2,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >{label}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── STOP LOSS LINE ─────────────────────────────────── */}
      {slY !== null && position.stop_loss != null && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: slY,
            height: 0,
            borderTop: `1.5px solid ${COLORS.sl.line}`,
            pointerEvents: 'auto',
            cursor: 'row-resize',
          }}
          onMouseDown={() => onStartDrag('sl', position.stop_loss!)}
        >
          <LineBadge
            label="SL"
            price={position.stop_loss}
            extra={`-$${riskUsd.toFixed(0)}`}
            color={COLORS.sl}
            onDrag={() => onStartDrag('sl', position.stop_loss!)}
          />
        </div>
      )}

      {/* ── TAKE PROFIT LINE ───────────────────────────────── */}
      {tpY !== null && position.take_profit != null && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: tpY,
            height: 0,
            borderTop: `1.5px solid ${COLORS.tp.line}`,
            pointerEvents: 'auto',
            cursor: 'row-resize',
          }}
          onMouseDown={() => onStartDrag('tp', position.take_profit!)}
        >
          <LineBadge
            label="TP"
            price={position.take_profit}
            extra={`+$${rewardUsd.toFixed(0)}`}
            color={COLORS.tp}
            onDrag={() => onStartDrag('tp', position.take_profit!)}
          />
        </div>
      )}
    </div>
  );
};
