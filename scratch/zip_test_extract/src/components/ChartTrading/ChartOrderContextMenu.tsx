/**
 * ChartOrderContextMenu.tsx
 * Right-click context menu for chart canvas.
 * Includes full institutional order type list: Market, Limit, Stop, Stop Limit,
 * OCO, Bracket, TWAP, VWAP, Iceberg, Trailing Stop, Hidden Order.
 * Pure inline CSS — no Tailwind.
 */
import React, { useEffect, useRef } from 'react';

export interface ChartOrderContextMenuProps {
  x: number;
  y: number;
  price: number;
  symbol: string;
  onSelectAction: (action: string, price: number) => void;
  onClose: () => void;
}

interface MenuItem {
  key?: string;
  label?: string;
  color?: string;
  sub?: string;
  divider?: boolean;
  section?: string;
}

const ITEMS: MenuItem[] = [
  { section: 'MARKET' },
  { key: 'buy_market',    label: '▲ Buy Market',         color: '#00c076' },
  { key: 'sell_market',   label: '▼ Sell Market',        color: '#ff4d57' },
  { divider: true },
  { section: 'LIMIT / STOP' },
  { key: 'buy_limit',     label: '▲ Buy Limit Here',     color: '#00c076', sub: 'at price' },
  { key: 'sell_limit',    label: '▼ Sell Limit Here',    color: '#ff4d57', sub: 'at price' },
  { key: 'buy_stop',      label: '▲ Buy Stop Here',      color: '#00b8d9', sub: 'at price' },
  { key: 'sell_stop',     label: '▼ Sell Stop Here',     color: '#fbbf24', sub: 'at price' },
  { key: 'buy_stop_limit', label: '▲ Buy Stop Limit',    color: '#34d399', sub: 'at price' },
  { key: 'sell_stop_limit', label: '▼ Sell Stop Limit',  color: '#f97316', sub: 'at price' },
  { divider: true },
  { section: 'ADVANCED' },
  { key: 'oco',           label: '⊕ OCO Order',          color: '#a78bfa', sub: 'one-cancels-other' },
  { key: 'bracket',       label: '⊞ Bracket Order',      color: '#60a5fa', sub: 'entry + SL + TP' },
  { key: 'twap',          label: '⊟ TWAP',               color: '#94a3b8', sub: 'time-weighted avg' },
  { key: 'vwap',          label: '⊠ VWAP',               color: '#94a3b8', sub: 'volume-weighted avg' },
  { key: 'iceberg',       label: '◈ Iceberg',            color: '#818cf8', sub: 'hidden quantity' },
  { key: 'trailing_stop', label: '⇣ Trailing Stop',      color: '#fb923c', sub: 'dynamic SL' },
  { key: 'hidden_order',  label: '◑ Hidden Order',       color: '#6b7280', sub: 'dark pool style' },
  { divider: true },
  { section: 'POSITION MANAGEMENT' },
  { key: 'add_sl',           label: '🛡️ Add Stop Loss',    color: '#ff4d57', sub: 'set SL target' },
  { key: 'add_tp',           label: '🎯 Add Take Profit',  color: '#00c076', sub: 'set TP target' },
  { key: 'breakeven',        label: '⚖️ Move to Break Even', color: '#d4af37' },
  { key: 'trailing_stop',    label: '⇣ Trailing Stop',     color: '#fb923c', sub: 'dynamic SL' },
  { key: 'partial_close',    label: '✂️ Partial Close',    color: '#60a5fa', sub: 'close portion' },
  { key: 'reverse_position', label: '⇄ Reverse Position', color: '#a78bfa' },
  { key: 'close_position',   label: '✕ Close Position',    color: '#ff4d57' },
  { key: 'cancel_pending',   label: '⊘ Cancel Pending',   color: '#8e8e93' },
];

const ITEM_STYLE = (color = '#c0c8e0', hovered: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '5px 10px',
  borderRadius: 5,
  cursor: 'pointer',
  transition: 'background 0.1s ease',
  background: hovered ? 'rgba(41,98,255,0.12)' : 'transparent',
  border: hovered ? '1px solid rgba(41,98,255,0.2)' : '1px solid transparent',
  color,
  fontFamily: 'Inter, sans-serif',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.2px',
  userSelect: 'none',
  marginBottom: 1,
});

export const ChartOrderContextMenu: React.FC<ChartOrderContextMenuProps> = ({
  x, y, price, symbol, onSelectAction, onClose,
}) => {
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-flip if menu would go off screen
  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 99998,
    left: Math.min(x, window.innerWidth - 260),
    top: Math.min(y, window.innerHeight - 560),
    width: 248,
    borderRadius: 10,
    background: 'rgba(9,13,25,0.97)',
    border: '1px solid rgba(255,255,255,0.09)',
    boxShadow: '0 16px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)',
    padding: '6px',
    fontFamily: 'Inter, sans-serif',
    overflow: 'hidden',
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const kh = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', kh);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', kh); };
  }, [onClose]);

  return (
    <div ref={menuRef} style={style} onClick={e => e.stopPropagation()}>
      {/* Price header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 8px 6px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 4,
      }}>
        <span style={{ fontSize: 9, color: '#4a5568', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          CHART ORDER MENU
        </span>
        <span style={{ fontSize: 12, color: '#d4af37', fontWeight: 900, fontFamily: 'monospace' }}>
          {price.toFixed(2)}
        </span>
      </div>

      {ITEMS.map((item, idx) => {
        if (item.divider) {
          return <div key={`div_${idx}`} style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />;
        }
        if (item.section) {
          return (
            <div key={item.section} style={{
              padding: '2px 8px',
              fontSize: 8,
              color: '#3a4560',
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: 2,
            }}>
              {item.section}
            </div>
          );
        }
        return (
          <div
            key={item.key}
            style={ITEM_STYLE(item.color, hoveredKey === item.key)}
            onMouseEnter={() => setHoveredKey(item.key!)}
            onMouseLeave={() => setHoveredKey(null)}
            onClick={() => { onSelectAction(item.key!, price); onClose(); }}
          >
            <span>{item.label}</span>
            {item.sub && (
              <span style={{ fontSize: 9, color: '#3a4560', fontWeight: 600 }}>{item.sub}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};
