/**
 * ChartTradeButtons.tsx
 * Professional BUY / SELL buttons with:
 * - gradient fills  
 * - hover glow + scale
 * - pressed animation (active:scale-95)
 * - keyboard focus ring
 * - optional loading spinner
 * - disabled state
 * - tooltip
 * Designed to embed in chart header (not floating).
 */
import React, { useState } from 'react';

interface ChartTradeButtonsProps {
  onBuy: () => void;
  onSell: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const spin: React.CSSProperties = {
  display: 'inline-block',
  width: 10,
  height: 10,
  border: '2px solid rgba(255,255,255,0.3)',
  borderTopColor: '#ffffff',
  borderRadius: '50%',
  animation: 'chart-btn-spin 0.6s linear infinite',
};

// Inject keyframes once
if (typeof document !== 'undefined') {
  if (!document.getElementById('chart-btn-style')) {
    const s = document.createElement('style');
    s.id = 'chart-btn-style';
    s.textContent = `
      @keyframes chart-btn-spin { to { transform: rotate(360deg); } }
      .chart-buy-btn:active { transform: scale(0.93) !important; }
      .chart-sell-btn:active { transform: scale(0.93) !important; }
      .chart-buy-btn:focus-visible { outline: 2px solid #00c076; outline-offset: 2px; }
      .chart-sell-btn:focus-visible { outline: 2px solid #ff4d57; outline-offset: 2px; }
    `;
    document.head.appendChild(s);
  }
}

export const ChartTradeButtons: React.FC<ChartTradeButtonsProps> = ({
  onBuy, onSell, loading = false, disabled = false,
}) => {
  const [buyHover, setBuyHover] = useState(false);
  const [sellHover, setSellHover] = useState(false);

  const makeBtn = (side: 'buy' | 'sell', hovered: boolean): React.CSSProperties => {
    const isBuy = side === 'buy';
    const base = isBuy ? '#00c076' : '#ff4d57';
    const dark = isBuy ? '#007a4a' : '#a01420';
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '4px 16px',
      borderRadius: 5,
      border: `1px solid ${base}60`,
      background: hovered
        ? `linear-gradient(135deg, ${base}, ${dark})`
        : `linear-gradient(135deg, ${base}dd, ${dark}bb)`,
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: '0.8px',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transition: 'all 0.15s ease',
      transform: hovered && !disabled ? 'scale(1.04)' : 'scale(1)',
      boxShadow: hovered && !disabled
        ? `0 0 22px ${base}70, 0 4px 16px rgba(0,0,0,0.4)`
        : `0 0 10px ${base}30, 0 2px 8px rgba(0,0,0,0.3)`,
      whiteSpace: 'nowrap',
      userSelect: 'none',
    };
  };

  return (
    <>
      <button
        id="chart-buy-btn"
        className="chart-buy-btn"
        style={makeBtn('buy', buyHover)}
        onMouseEnter={() => setBuyHover(true)}
        onMouseLeave={() => setBuyHover(false)}
        onClick={!disabled && !loading ? onBuy : undefined}
        disabled={disabled || loading}
        title="Buy Market (B)"
      >
        {loading ? <span style={spin} /> : '▲'}
        BUY
      </button>
      <button
        id="chart-sell-btn"
        className="chart-sell-btn"
        style={makeBtn('sell', sellHover)}
        onMouseEnter={() => setSellHover(true)}
        onMouseLeave={() => setSellHover(false)}
        onClick={!disabled && !loading ? onSell : undefined}
        disabled={disabled || loading}
        title="Sell Market (S)"
      >
        {loading ? <span style={spin} /> : '▼'}
        SELL
      </button>
    </>
  );
};
