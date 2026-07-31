/**
 * ChartTradingToolbar.tsx
 * Institutional trading toolbar — comparable to Quantower / Sierra Chart.
 * Replaces simple Buy/Sell buttons.
 */
import React, { useCallback, useState } from 'react';

interface ChartTradingToolbarProps {
  symbol: string;
  lotSize: number;
  riskPct: number;
  oneClickEnabled: boolean;
  previewMode: boolean;
  onBuy: () => void;
  onSell: () => void;
  onLotChange: (v: number) => void;
  onRiskChange: (v: number) => void;
  onReverse: () => void;
  onClose: () => void;
  onFlatten: () => void;
  onCancelAll: () => void;
  onToggleOneClick: () => void;
  onTogglePreview: () => void;
}

const toolbar: React.CSSProperties = {
  position: 'absolute',
  top: 36,
  left: 8,
  zIndex: 120,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 6px',
  background: 'rgba(10, 14, 26, 0.93)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 8,
  backdropFilter: 'blur(12px)',
  boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
  userSelect: 'none',
  pointerEvents: 'auto',
  flexWrap: 'wrap',
  maxWidth: 'calc(100% - 16px)',
};

const divider: React.CSSProperties = {
  width: 1,
  height: 20,
  background: 'rgba(255,255,255,0.08)',
  margin: '0 2px',
};

const qtyWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  background: 'rgba(20,26,46,0.9)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 5,
  padding: '1px 2px',
};

const qtyBtn: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 3,
  border: 'none',
  background: 'rgba(40,55,90,0.8)',
  color: '#c0c8e0',
  fontSize: 12,
  fontWeight: 900,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.12s',
  padding: 0,
  lineHeight: 1,
};

const qtyInput: React.CSSProperties = {
  width: 36,
  textAlign: 'center',
  background: 'transparent',
  border: 'none',
  color: '#e2e8f0',
  fontFamily: 'Inter, monospace',
  fontSize: 11,
  fontWeight: 700,
  outline: 'none',
};

const riskWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(20,26,46,0.7)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 5,
  padding: '2px 6px',
  fontSize: 10,
  color: '#8e8e93',
  fontFamily: 'Inter, sans-serif',
  fontWeight: 700,
};

const riskInput: React.CSSProperties = {
  width: 28,
  background: 'transparent',
  border: 'none',
  color: '#d4af37',
  fontFamily: 'Inter, monospace',
  fontSize: 11,
  fontWeight: 700,
  textAlign: 'center',
  outline: 'none',
};

function makeToggle(active: boolean, activeColor = '#2962FF'): React.CSSProperties {
  return {
    padding: '3px 8px',
    borderRadius: 5,
    border: `1px solid ${active ? activeColor + '80' : 'rgba(255,255,255,0.07)'}`,
    background: active ? activeColor + '28' : 'rgba(30,40,65,0.7)',
    color: active ? activeColor : '#8e8e93',
    fontFamily: 'Inter, sans-serif',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  };
}

function makeIconBtn(col = '#8e8e93'): React.CSSProperties {
  return {
    padding: '3px 8px',
    borderRadius: 5,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(30,40,65,0.8)',
    color: col,
    fontFamily: 'Inter, sans-serif',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.4px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  };
}

export const ChartTradingToolbar: React.FC<ChartTradingToolbarProps> = ({
  symbol: _symbol,
  lotSize,
  riskPct,
  oneClickEnabled,
  previewMode,
  onBuy,
  onSell,
  onLotChange,
  onRiskChange,
  onReverse,
  onClose,
  onFlatten,
  onCancelAll,
  onToggleOneClick,
  onTogglePreview,
}) => {
  const [buyHover, setBuyHover] = useState(false);
  const [sellHover, setSellHover] = useState(false);

  const handleQtyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v > 0) onLotChange(v);
  }, [onLotChange]);

  const handleQtyWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.01 : -0.01;
    onLotChange(Math.max(0.01, parseFloat((lotSize + delta).toFixed(2))));
  }, [lotSize, onLotChange]);

  const handleRiskChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v) && v > 0 && v <= 100) onRiskChange(v);
  }, [onRiskChange]);

  const buyBtnStyle: React.CSSProperties = {
    padding: '4px 14px',
    borderRadius: 5,
    border: '1px solid #00c07650',
    background: 'linear-gradient(135deg, #00c076, #00a060)',
    color: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: buyHover ? '0 0 24px #00c07680' : '0 0 12px #00c07640',
    transform: buyHover ? 'scale(1.04)' : 'scale(1)',
    whiteSpace: 'nowrap',
  };

  const sellBtnStyle: React.CSSProperties = {
    padding: '4px 14px',
    borderRadius: 5,
    border: '1px solid #ff4d5750',
    background: 'linear-gradient(135deg, #ff4d57, #cc2d36)',
    color: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: sellHover ? '0 0 24px #ff4d5780' : '0 0 12px #ff4d5740',
    transform: sellHover ? 'scale(1.04)' : 'scale(1)',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={toolbar}>
      {/* BUY */}
      <button
        id="chart-buy-btn"
        style={buyBtnStyle}
        onMouseEnter={() => setBuyHover(true)}
        onMouseLeave={() => setBuyHover(false)}
        onClick={onBuy}
        title="Buy Market (B)"
      >
        ▲ BUY
      </button>

      {/* SELL */}
      <button
        id="chart-sell-btn"
        style={sellBtnStyle}
        onMouseEnter={() => setSellHover(true)}
        onMouseLeave={() => setSellHover(false)}
        onClick={onSell}
        title="Sell Market (S)"
      >
        ▼ SELL
      </button>

      <div style={divider} />

      {/* QTY CONTROL */}
      <div style={qtyWrap} onWheel={handleQtyWheel}>
        <button
          style={qtyBtn}
          onClick={() => onLotChange(Math.max(0.01, parseFloat((lotSize - 0.01).toFixed(2))))}
          title="Decrease qty"
        >−</button>
        <input
          style={qtyInput}
          value={lotSize}
          onChange={handleQtyChange}
          type="number"
          step={0.01}
          min={0.01}
          title="Lot Size"
        />
        <button
          style={qtyBtn}
          onClick={() => onLotChange(parseFloat((lotSize + 0.01).toFixed(2)))}
          title="Increase qty"
        >+</button>
      </div>

      {/* RISK % */}
      <div style={riskWrap} title="Risk % of account equity">
        <span style={{ color: '#8e8e93', fontSize: 9 }}>RISK</span>
        <input
          style={riskInput}
          value={riskPct}
          onChange={handleRiskChange}
          type="number"
          step={0.1}
          min={0.1}
          max={100}
        />
        <span style={{ color: '#8e8e93', fontSize: 9 }}>%</span>
      </div>

      <div style={divider} />

      <button style={makeIconBtn('#c0c8e0')} onClick={onReverse} title="Reverse Position (R)">⇄ REV</button>
      <button style={makeIconBtn('#ff7b84')} onClick={onClose} title="Close Active Position (Delete)">✕ CLOSE</button>
      <button style={makeIconBtn('#d4af37')} onClick={onFlatten} title="Flatten All (F)">◼ FLAT</button>
      <button style={makeIconBtn('#8e8e93')} onClick={onCancelAll} title="Cancel All Pending (ESC)">⊘ CNCL</button>

      <div style={divider} />

      <button
        id="chart-oneclick-toggle"
        style={makeToggle(oneClickEnabled, '#00c076')}
        onClick={onToggleOneClick}
        title="Toggle one-click mode"
      >
        {oneClickEnabled ? '1-CLICK ON' : '1-CLICK OFF'}
      </button>

      <button
        id="chart-preview-toggle"
        style={makeToggle(previewMode, '#2962FF')}
        onClick={onTogglePreview}
        title="Toggle order preview mode"
      >
        {previewMode ? '◉ PREVIEW' : '○ PREVIEW'}
      </button>
    </div>
  );
};
