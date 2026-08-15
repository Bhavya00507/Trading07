// src/components/CorrelationPanel.tsx
import React, { useState, useMemo } from 'react';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'US30', 'NAS100'];

// Static baseline correlation values for each timeframe
const CORRELATIONS_7D: Record<string, Record<string, number>> = {
  BTCUSDT: { BTCUSDT: 1.00, ETHUSDT: 0.88, EURUSD: 0.15, GBPUSD: 0.12, USDJPY: -0.05, XAUUSD: 0.22, US30: 0.45, NAS100: 0.62 },
  ETHUSDT: { BTCUSDT: 0.88, ETHUSDT: 1.00, EURUSD: 0.12, GBPUSD: 0.10, USDJPY: -0.02, XAUUSD: 0.20, US30: 0.40, NAS100: 0.58 },
  EURUSD: { BTCUSDT: 0.15, ETHUSDT: 0.12, EURUSD: 1.00, GBPUSD: 0.92, USDJPY: -0.74, XAUUSD: 0.45, US30: 0.28, NAS100: 0.20 },
  GBPUSD: { BTCUSDT: 0.12, ETHUSDT: 0.10, EURUSD: 0.92, GBPUSD: 1.00, USDJPY: -0.68, XAUUSD: 0.41, US30: 0.25, NAS100: 0.18 },
  USDJPY: { BTCUSDT: -0.05, ETHUSDT: -0.02, EURUSD: -0.74, GBPUSD: -0.68, USDJPY: 1.00, XAUUSD: -0.38, US30: -0.15, NAS100: -0.10 },
  XAUUSD: { BTCUSDT: 0.22, ETHUSDT: 0.20, EURUSD: 0.45, GBPUSD: 0.41, USDJPY: -0.38, XAUUSD: 1.00, US30: 0.12, NAS100: 0.08 },
  US30: { BTCUSDT: 0.45, ETHUSDT: 0.40, EURUSD: 0.28, GBPUSD: 0.25, USDJPY: -0.15, XAUUSD: 0.12, US30: 1.00, NAS100: 0.85 },
  NAS100: { BTCUSDT: 0.62, ETHUSDT: 0.58, EURUSD: 0.20, GBPUSD: 0.18, USDJPY: -0.10, XAUUSD: 0.08, US30: 0.85, NAS100: 1.00 }
};

const CORRELATIONS_30D: Record<string, Record<string, number>> = {
  BTCUSDT: { BTCUSDT: 1.00, ETHUSDT: 0.90, EURUSD: 0.18, GBPUSD: 0.14, USDJPY: -0.08, XAUUSD: 0.25, US30: 0.42, NAS100: 0.58 },
  ETHUSDT: { BTCUSDT: 0.90, ETHUSDT: 1.00, EURUSD: 0.15, GBPUSD: 0.11, USDJPY: -0.06, XAUUSD: 0.24, US30: 0.38, NAS100: 0.55 },
  EURUSD: { BTCUSDT: 0.18, ETHUSDT: 0.15, EURUSD: 1.00, GBPUSD: 0.94, USDJPY: -0.76, XAUUSD: 0.48, US30: 0.32, NAS100: 0.24 },
  GBPUSD: { BTCUSDT: 0.14, ETHUSDT: 0.11, EURUSD: 0.94, GBPUSD: 1.00, USDJPY: -0.70, XAUUSD: 0.44, US30: 0.28, NAS100: 0.21 },
  USDJPY: { BTCUSDT: -0.08, ETHUSDT: -0.06, EURUSD: -0.76, GBPUSD: -0.70, USDJPY: 1.00, XAUUSD: -0.42, US30: -0.18, NAS100: -0.12 },
  XAUUSD: { BTCUSDT: 0.25, ETHUSDT: 0.24, EURUSD: 0.48, GBPUSD: 0.44, USDJPY: -0.42, XAUUSD: 1.00, US30: 0.15, NAS100: 0.10 },
  US30: { BTCUSDT: 0.42, ETHUSDT: 0.38, EURUSD: 0.32, GBPUSD: 0.28, USDJPY: -0.18, XAUUSD: 0.15, US30: 1.00, NAS100: 0.88 },
  NAS100: { BTCUSDT: 0.58, ETHUSDT: 0.55, EURUSD: 0.24, GBPUSD: 0.21, USDJPY: -0.12, XAUUSD: 0.10, US30: 0.88, NAS100: 1.00 }
};

const CORRELATIONS_90D: Record<string, Record<string, number>> = {
  BTCUSDT: { BTCUSDT: 1.00, ETHUSDT: 0.92, EURUSD: 0.20, GBPUSD: 0.16, USDJPY: -0.10, XAUUSD: 0.28, US30: 0.38, NAS100: 0.52 },
  ETHUSDT: { BTCUSDT: 0.92, ETHUSDT: 1.00, EURUSD: 0.18, GBPUSD: 0.13, USDJPY: -0.08, XAUUSD: 0.26, US30: 0.35, NAS100: 0.50 },
  EURUSD: { BTCUSDT: 0.20, ETHUSDT: 0.18, EURUSD: 1.00, GBPUSD: 0.95, USDJPY: -0.78, XAUUSD: 0.50, US30: 0.35, NAS100: 0.26 },
  GBPUSD: { BTCUSDT: 0.16, ETHUSDT: 0.13, EURUSD: 0.95, GBPUSD: 1.00, USDJPY: -0.72, XAUUSD: 0.46, US30: 0.30, NAS100: 0.23 },
  USDJPY: { BTCUSDT: -0.10, ETHUSDT: -0.08, EURUSD: -0.78, GBPUSD: -0.72, USDJPY: 1.00, XAUUSD: -0.45, US30: -0.22, NAS100: -0.15 },
  XAUUSD: { BTCUSDT: 0.28, ETHUSDT: 0.26, EURUSD: 0.50, GBPUSD: 0.46, USDJPY: -0.45, XAUUSD: 1.00, US30: 0.18, NAS100: 0.12 },
  US30: { BTCUSDT: 0.38, ETHUSDT: 0.35, EURUSD: 0.35, GBPUSD: 0.30, USDJPY: -0.22, XAUUSD: 0.18, US30: 1.00, NAS100: 0.90 },
  NAS100: { BTCUSDT: 0.52, ETHUSDT: 0.50, EURUSD: 0.26, GBPUSD: 0.23, USDJPY: -0.15, XAUUSD: 0.12, US30: 0.90, NAS100: 1.00 }
};

const CorrelationPanel: React.FC = () => {
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const activeMatrix = useMemo(() => {
    if (days === 7) return CORRELATIONS_7D;
    if (days === 90) return CORRELATIONS_90D;
    return CORRELATIONS_30D;
  }, [days]);

  // Color cell helper: Strong positive = Green, Strong negative = Red
  const getCellColor = (val: number) => {
    if (val === 1.00) return 'rgba(255,255,255,0.05)';
    if (val > 0) {
      // Scale positive Green color
      return `rgba(0, 192, 118, ${val * 0.4})`;
    } else {
      // Scale negative Red color
      return `rgba(255, 77, 87, ${Math.abs(val) * 0.4})`;
    }
  };

  const getTextColor = (val: number) => {
    if (val === 1.00) return '#8e8e93';
    if (val > 0.6) return '#00c076';
    if (val < -0.5) return '#ff4d57';
    return '#f5f5f7';
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', height: '100%', gap: '10px', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Title Header / Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '8px' }}>
        <div>
          <strong style={{ fontSize: '15px', color: '#f5f5f7' }}>Correlation Matrix</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Pearson correlation coefficients across major instruments</span>
        </div>

        {/* Days Period Selectors */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {([7, 30, 90] as const).map((period) => (
            <button
              key={period}
              onClick={() => setDays(period)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '3px',
                border: '1px solid #1b2235',
                background: days === period ? '#d4af37' : '#070b14',
                color: days === period ? '#070b14' : '#8e8e93',
                cursor: 'pointer',
              }}
            >
              {period} Days
            </button>
          ))}
        </div>
      </div>

      {/* Grid Table Heatmap */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px', background: '#0d1322', borderBottom: '1px solid #1b2235', borderRight: '1px solid #1b2235' }} />
              {SYMBOLS.map((sym) => (
                <th
                  key={sym}
                  style={{
                    padding: '8px',
                    color: '#8e8e93',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '10px',
                    borderBottom: '1px solid #1b2235',
                    background: '#0d1322',
                  }}
                >
                  {sym.replace('USDT', '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SYMBOLS.map((rowSym) => (
              <tr key={rowSym}>
                {/* Row Header */}
                <td
                  style={{
                    padding: '8px',
                    color: '#8e8e93',
                    fontWeight: 700,
                    fontSize: '10px',
                    borderRight: '1px solid #1b2235',
                    borderBottom: '1px solid #1b2235',
                    background: '#0d1322',
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                  }}
                >
                  {rowSym.replace('USDT', '')}
                </td>
                
                {/* Matrix Columns */}
                {SYMBOLS.map((colSym) => {
                  const val = activeMatrix[rowSym]?.[colSym] ?? 0;
                  return (
                    <td
                      key={colSym}
                      style={{
                        padding: '8px',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        borderBottom: '1px solid #1b2235',
                        background: getCellColor(val),
                        color: getTextColor(val),
                      }}
                    >
                      {val === 1.0 ? '1.00' : (val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend Information */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '9px', color: '#8e8e93', borderTop: '1px solid #1b2235', paddingTop: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '10px', height: '10px', background: 'rgba(0, 192, 118, 0.4)', borderRadius: '2px' }} />
          <span>Strong Positive (&gt; 0.7)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '10px', height: '10px', background: 'rgba(255, 77, 87, 0.4)', borderRadius: '2px' }} />
          <span>Strong Negative (&lt; -0.6)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '10px', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }} />
          <span>Perfect / Neutral</span>
        </div>
      </div>

    </div>
  );
};

export default CorrelationPanel;
