// src/components/ChartOrderMenu.tsx
import React, { useEffect } from 'react';

export interface ChartOrderMenuProps {
  x: number;
  y: number;
  price: number;
  symbol: string;
  precision: number;
  onSelect: (side: 'buy' | 'sell', type: 'market' | 'limit' | 'stop') => void;
  onClose: () => void;
}

interface MenuItemConfig {
  label: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  color: string;
  bg: string;
  icon: string;
}

const MENU_ITEMS: MenuItemConfig[] = [
  { label: 'Buy Market',  side: 'buy',  type: 'market', color: '#00c076', bg: 'rgba(0,192,118,0.12)',  icon: '▲' },
  { label: 'Sell Market', side: 'sell', type: 'market', color: '#ff4d57', bg: 'rgba(255,77,87,0.12)',  icon: '▼' },
  { label: 'Buy Limit',   side: 'buy',  type: 'limit',  color: '#00c076', bg: 'rgba(0,192,118,0.06)',  icon: '→' },
  { label: 'Sell Limit',  side: 'sell', type: 'limit',  color: '#ff4d57', bg: 'rgba(255,77,87,0.06)',  icon: '→' },
  { label: 'Buy Stop',    side: 'buy',  type: 'stop',   color: '#ff9800', bg: 'rgba(255,152,0,0.06)',  icon: '⊲' },
  { label: 'Sell Stop',   side: 'sell', type: 'stop',   color: '#ff9800', bg: 'rgba(255,152,0,0.06)',  icon: '⊲' },
];

export const ChartOrderMenu: React.FC<ChartOrderMenuProps> = ({
  x,
  y,
  price,
  symbol,
  precision,
  onSelect,
  onClose,
}) => {
  // Close on any click outside
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('click', handler, { once: true });
    return () => window.removeEventListener('click', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Adjust menu position to stay on screen
  const menuW = 180;
  const menuH = 260;
  const adjustedX = x + menuW > window.innerWidth ? x - menuW : x;
  const adjustedY = y + menuH > window.innerHeight ? y - menuH : y;

  return (
    <div
      style={{
        position: 'fixed',
        top: adjustedY,
        left: adjustedX,
        zIndex: 99998,
        background: '#0d1322',
        border: '1px solid #1b2235',
        borderRadius: '6px',
        padding: '4px 0',
        boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        minWidth: `${menuW}px`,
        fontFamily: "'Inter', -apple-system, sans-serif",
        userSelect: 'none',
        animation: 'fadeInScale 0.1s ease-out',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Price Header */}
      <div style={{
        padding: '6px 12px 8px',
        borderBottom: '1px solid #1b2235',
        marginBottom: '2px',
      }}>
        <div style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Chart Order · {symbol}
        </div>
        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#d4af37',
          fontFamily: 'monospace',
          marginTop: '2px',
        }}>
          @ {price.toFixed(precision)}
        </div>
      </div>

      {/* Order Options */}
      {MENU_ITEMS.map((item) => (
        <button
          key={`${item.side}-${item.type}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item.side, item.type);
            onClose();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '7px 12px',
            background: 'transparent',
            border: 'none',
            color: item.color,
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.1s',
            fontFamily: "'Inter', sans-serif",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = item.bg; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <span style={{
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: item.bg,
            borderRadius: '3px',
            fontSize: '10px',
            flexShrink: 0,
          }}>
            {item.icon}
          </span>
          <span>{item.label}</span>
          {item.type !== 'market' && (
            <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#555', fontWeight: 400 }}>
              Pending
            </span>
          )}
        </button>
      ))}

      {/* Divider + Cancel */}
      <div style={{ borderTop: '1px solid #1b2235', margin: '4px 0 2px' }} />
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          display: 'block',
          width: '100%',
          padding: '6px 12px',
          background: 'transparent',
          border: 'none',
          color: '#555',
          fontSize: '10px',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: "'Inter', sans-serif",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#8e8e93'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; }}
      >
        Cancel
      </button>
    </div>
  );
};

export default ChartOrderMenu;
