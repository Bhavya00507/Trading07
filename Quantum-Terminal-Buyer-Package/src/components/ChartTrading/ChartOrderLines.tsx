/**
 * ChartOrderLines.tsx
 * Professional SL / TP / Entry position lines on the chart.
 * - SL: Red glow, lock icon, shows price / distance / P/L / RR
 * - TP: Green glow, target icon, shows price / distance / P/L / RR
 * - Entry: Dashed, side-colored
 * Single click = select, double click = inline price edit,
 * Delete key = remove selected.
 * Drag = move price (calls onDrag* callback).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { modifySLTP } from '../../services/api';

export interface ChartOrderLineProps {
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  side: 'BUY' | 'SELL';
  quantity: number;
  symbol: string;
  positionId: string;
  accountBalance: number;
  priceToY: (price: number) => number;
  yToPrice: (y: number) => number;
  onAddSL: () => void;
  onAddTP: () => void;
  onSLChanged: (price: number) => void;
  onTPChanged: (price: number) => void;
  onClose: () => void;
}

type SelectedLine = 'sl' | 'tp' | 'entry' | null;

// ─── Icon helpers ───────────────────────────────────────────
const LockIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const TargetIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);

const EditIcon = () => (
  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// ─── Individual draggable line ───────────────────────────────
interface LineProps {
  price: number;
  type: 'sl' | 'tp' | 'entry';
  yPos: number;
  label: string;
  extra: string;
  icon: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onClose?: () => void;
}

const LINE_CONFIG = {
  sl:    { line: '#ff4d57', glow: '#ff4d5730', bg: 'rgba(40,8,12,0.95)', border: 'rgba(255,77,87,0.55)', text: '#ff7b84' },
  tp:    { line: '#00c076', glow: '#00c07630', bg: 'rgba(0,36,22,0.95)', border: 'rgba(0,192,118,0.55)', text: '#33e09a' },
  entry: { line: '#2962FF', glow: '#2962FF20', bg: 'rgba(8,22,60,0.92)', border: 'rgba(41,98,255,0.4)', text: '#5b8dfe' },
};

const OrderLine: React.FC<LineProps> = ({
  price, type, yPos, label, extra, icon,
  selected, onSelect, onDoubleClick, onMouseDown, onClose,
}) => {
  const [hovered, setHovered] = useState(false);
  const cfg = LINE_CONFIG[type];
  const active = hovered || selected;

  const lineStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: yPos,
    height: 0,
    borderTop: type === 'entry'
      ? `1.5px dashed ${cfg.line}`
      : `1.5px solid ${cfg.line}`,
    boxShadow: active ? `0 0 10px ${cfg.line}50` : undefined,
    transition: 'box-shadow 0.15s ease',
    pointerEvents: 'auto',
    cursor: type !== 'entry' ? 'row-resize' : 'pointer',
    zIndex: selected ? 36 : 30,
  };

  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    right: 4,
    top: '50%',
    transform: `translateY(-50%) scale(${active ? 1.05 : 1})`,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px 3px 6px',
    borderRadius: 6,
    background: cfg.bg,
    border: `1px solid ${active ? cfg.line : cfg.border}`,
    boxShadow: active ? `0 0 18px ${cfg.glow}, 0 2px 12px rgba(0,0,0,0.6)` : '0 2px 8px rgba(0,0,0,0.5)',
    transition: 'all 0.15s ease',
    fontFamily: 'Inter, monospace',
    whiteSpace: 'nowrap',
    cursor: type !== 'entry' ? 'row-resize' : 'pointer',
    userSelect: 'none',
  };

  return (
    <div
      style={lineStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onMouseDown={type !== 'entry' ? onMouseDown : undefined}
    >
      <div style={badgeStyle}>
        {/* Icon */}
        <span style={{ color: cfg.text, display: 'flex', alignItems: 'center' }}>{icon}</span>
        {/* Label */}
        <span style={{ fontSize: 9, color: cfg.text, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </span>
        {/* Price */}
        <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 900, fontFamily: 'monospace' }}>
          {price.toFixed(2)}
        </span>
        {/* Extra (dist/PnL/RR) */}
        {extra && (
          <span style={{ fontSize: 9, color: cfg.text, fontWeight: 600, opacity: active ? 1 : 0.75, transition: 'opacity 0.15s' }}>
            {extra}
          </span>
        )}
        {/* Edit on hover */}
        {active && (
          <span style={{ color: '#5a6680', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <EditIcon />
          </span>
        )}
        {/* Close button */}
        {onClose && active && (
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              background: 'rgba(255,77,87,0.15)',
              border: 'none',
              color: '#ff7b84',
              cursor: 'pointer',
              padding: '0 3px',
              fontSize: 11,
              lineHeight: '14px',
              borderRadius: 3,
              transition: 'background 0.12s',
            }}
            title="Remove"
          >×</button>
        )}
      </div>
    </div>
  );
};

// ─── Inline price edit dialog ─────────────────────────────
const PriceEditDialog: React.FC<{
  price: number;
  type: 'sl' | 'tp';
  yPos: number;
  onConfirm: (price: number) => void;
  onCancel: () => void;
}> = ({ price, type, yPos, onConfirm, onCancel }) => {
  const [val, setVal] = useState(price.toFixed(2));
  const inputRef = useRef<HTMLInputElement>(null);
  const color = type === 'sl' ? '#ff4d57' : '#00c076';

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onConfirm(parseFloat(val));
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div style={{
      position: 'absolute',
      right: 60,
      top: yPos - 18,
      zIndex: 300,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      borderRadius: 6,
      background: 'rgba(9,13,25,0.97)',
      border: `1px solid ${color}60`,
      boxShadow: `0 4px 20px rgba(0,0,0,0.7)`,
      pointerEvents: 'auto',
    }}>
      <span style={{ fontSize: 9, color, fontWeight: 800 }}>{type.toUpperCase()}</span>
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={handleKey}
        type="number"
        step="0.01"
        style={{
          width: 80,
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${color}40`,
          borderRadius: 4,
          color: '#e2e8f0',
          fontFamily: 'monospace',
          fontSize: 11,
          fontWeight: 700,
          padding: '2px 6px',
          outline: 'none',
        }}
      />
      <button onClick={() => onConfirm(parseFloat(val))} style={{
        padding: '2px 6px', borderRadius: 4, border: 'none',
        background: color, color: '#fff', fontSize: 9, fontWeight: 800, cursor: 'pointer',
      }}>✓</button>
      <button onClick={onCancel} style={{
        padding: '2px 6px', borderRadius: 4, border: 'none',
        background: 'rgba(255,255,255,0.08)', color: '#8e8e93', fontSize: 9, fontWeight: 800, cursor: 'pointer',
      }}>✕</button>
    </div>
  );
};

// ─── Main export ─────────────────────────────────────────────
export const ChartOrderLines: React.FC<ChartOrderLineProps> = ({
  entryPrice,
  currentPrice,
  stopLoss,
  takeProfit,
  side,
  quantity,
  symbol,
  positionId,
  accountBalance,
  priceToY,
  yToPrice,
  onAddSL,
  onAddTP,
  onSLChanged,
  onTPChanged,
  onClose,
}) => {
  const [selected, setSelected] = useState<SelectedLine>(null);
  const [editing, setEditing] = useState<'sl' | 'tp' | null>(null);
  const isDragging = useRef(false);

  const entryY = priceToY(entryPrice);
  const slY = stopLoss != null ? priceToY(stopLoss) : null;
  const tpY = takeProfit != null ? priceToY(takeProfit) : null;

  const isPnlPos = side === 'BUY' ? currentPrice > entryPrice : currentPrice < entryPrice;
  const pip = currentPrice > 1000 ? 1 : 0.0001;
  const mult = currentPrice > 1000 ? 1 : 100000;

  // ─── Computed display metrics ────────────────
  const slDist = stopLoss != null ? Math.abs(entryPrice - stopLoss).toFixed(2) : null;
  const tpDist = takeProfit != null ? Math.abs(takeProfit - entryPrice).toFixed(2) : null;
  const slPnl = stopLoss != null ? -(Math.abs(entryPrice - stopLoss) * quantity) : null;
  const tpPnl = takeProfit != null ? Math.abs(takeProfit - entryPrice) * quantity : null;
  const rrRatio = slPnl != null && tpPnl != null && Math.abs(slPnl) > 0
    ? (tpPnl / Math.abs(slPnl)).toFixed(2)
    : null;

  const entryExtra = `${side} ${quantity}L · P/L: ${isPnlPos ? '+' : ''}$${((side === 'BUY' ? currentPrice - entryPrice : entryPrice - currentPrice) * quantity).toFixed(2)}`;
  const slExtra = slDist ? `−${slDist} · $${Math.abs(slPnl!).toFixed(0)}${rrRatio ? ' · RR ' + rrRatio : ''}` : '';
  const tpExtra = tpDist ? `+${tpDist} · +$${tpPnl!.toFixed(0)}${rrRatio ? ' · RR ' + rrRatio : ''}` : '';

  // ─── Keyboard: Delete removes selected ───────
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.key !== 'Delete' || !selected || selected === 'entry') return;
      try {
        if (selected === 'sl') { await modifySLTP(symbol, null, undefined, positionId); onSLChanged(0); }
        if (selected === 'tp') { await modifySLTP(symbol, undefined, null, positionId); onTPChanged(0); }
      } catch (err) { console.error(err); }
      setSelected(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, symbol, positionId, onSLChanged, onTPChanged]);

  // ─── Drag handler ────────────────────────────
  const startDrag = useCallback((type: 'sl' | 'tp', e: React.MouseEvent) => {
    e.stopPropagation();
    isDragging.current = true;
    const overlay = (e.target as HTMLElement).closest('[data-chart-overlay]');
    if (!overlay) return;

    const onMove = (me: MouseEvent) => {
      const rect = overlay.getBoundingClientRect();
      const y = me.clientY - rect.top;
      const price = yToPrice(y);
      if (type === 'sl') onSLChanged(price);
      else onTPChanged(price);
    };

    const onUp = async (me: MouseEvent) => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const rect = overlay.getBoundingClientRect();
      const y = me.clientY - rect.top;
      const price = yToPrice(y);
      try {
        if (type === 'sl') {
          await modifySLTP(symbol, price, undefined, positionId);
          onSLChanged(price);
        } else {
          await modifySLTP(symbol, undefined, price, positionId);
          onTPChanged(price);
        }
      } catch (err) {
        console.error('[ChartOrderLines] Drag error:', err);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [yToPrice, symbol, positionId, onSLChanged, onTPChanged]);

  const handleEditConfirm = useCallback(async (price: number) => {
    setEditing(null);
    if (!editing) return;
    try {
      if (editing === 'sl') { await modifySLTP(symbol, price, undefined, positionId); onSLChanged(price); }
      else { await modifySLTP(symbol, undefined, price, positionId); onTPChanged(price); }
    } catch (err) { console.error(err); }
  }, [editing, symbol, positionId, onSLChanged, onTPChanged]);

  // ─── "Add SL/TP" prompt when missing ─────────
  const addButtonStyle = (color: string): React.CSSProperties => ({
    padding: '2px 8px',
    borderRadius: 4,
    border: `1px solid ${color}40`,
    background: `${color}12`,
    color,
    fontSize: 9,
    fontWeight: 700,
    fontFamily: 'Inter, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    letterSpacing: '0.3px',
  });

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30 }} data-chart-overlay>
      {/* ── ENTRY LINE ── */}
      <OrderLine
        price={entryPrice}
        type="entry"
        yPos={entryY}
        label={side}
        extra={entryExtra}
        icon={<span style={{ fontSize: 8, fontWeight: 900 }}>{side === 'BUY' ? '▲' : '▼'}</span>}
        selected={selected === 'entry'}
        onSelect={() => setSelected(selected === 'entry' ? null : 'entry')}
        onDoubleClick={() => {}}
        onMouseDown={() => {}}
        onClose={onClose}
      />

      {/* ── ADD SL prompt (if no SL yet) ── */}
      {stopLoss == null && (
        <div style={{
          position: 'absolute', left: 12, top: entryY + 4,
          display: 'flex', gap: 4, pointerEvents: 'auto', zIndex: 35,
        }}>
          <button style={addButtonStyle('#ff4d57')} onClick={onAddSL} title="Click to place Stop Loss">
            + Add SL
          </button>
        </div>
      )}

      {/* ── ADD TP prompt (if no TP yet) ── */}
      {takeProfit == null && (
        <div style={{
          position: 'absolute', left: stopLoss == null ? 76 : 12, top: entryY + 4,
          display: 'flex', gap: 4, pointerEvents: 'auto', zIndex: 35,
        }}>
          <button style={addButtonStyle('#00c076')} onClick={onAddTP} title="Click to place Take Profit">
            + Add TP
          </button>
        </div>
      )}

      {/* ── STOP LOSS LINE ── */}
      {slY !== null && stopLoss != null && (
        <>
          <OrderLine
            price={stopLoss}
            type="sl"
            yPos={slY}
            label="SL"
            extra={slExtra}
            icon={<LockIcon />}
            selected={selected === 'sl'}
            onSelect={() => setSelected(selected === 'sl' ? null : 'sl')}
            onDoubleClick={() => { setEditing('sl'); setSelected('sl'); }}
            onMouseDown={(e) => startDrag('sl', e)}
            onClose={async () => {
              try { await modifySLTP(symbol, null, undefined, positionId); onSLChanged(0); } catch {}
              setSelected(null);
            }}
          />
          {editing === 'sl' && (
            <PriceEditDialog
              price={stopLoss}
              type="sl"
              yPos={slY}
              onConfirm={handleEditConfirm}
              onCancel={() => setEditing(null)}
            />
          )}
        </>
      )}

      {/* ── TAKE PROFIT LINE ── */}
      {tpY !== null && takeProfit != null && (
        <>
          <OrderLine
            price={takeProfit}
            type="tp"
            yPos={tpY}
            label="TP"
            extra={tpExtra}
            icon={<TargetIcon />}
            selected={selected === 'tp'}
            onSelect={() => setSelected(selected === 'tp' ? null : 'tp')}
            onDoubleClick={() => { setEditing('tp'); setSelected('tp'); }}
            onMouseDown={(e) => startDrag('tp', e)}
            onClose={async () => {
              try { await modifySLTP(symbol, undefined, null, positionId); onTPChanged(0); } catch {}
              setSelected(null);
            }}
          />
          {editing === 'tp' && (
            <PriceEditDialog
              price={takeProfit}
              type="tp"
              yPos={tpY}
              onConfirm={handleEditConfirm}
              onCancel={() => setEditing(null)}
            />
          )}
        </>
      )}
    </div>
  );
};
