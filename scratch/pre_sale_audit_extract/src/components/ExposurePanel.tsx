import React, { useMemo } from 'react';
import { usePositionStore } from '../store/positionStore';
import { useMarketStore } from '../store/marketStore';
import { useAppStore } from '../store/appStore';
import { formatPrice } from './Watchlist';
import { useActivePrices } from '../hooks/useActivePrices';

const tableWrap: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'auto',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
};

const theadStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 2,
  background: 'var(--bg-secondary)',
};

const thStyle: React.CSSProperties = {
  padding: '6px 12px',
  textAlign: 'left',
  fontSize: 9,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border-color)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
};

const ExposurePanel: React.FC = () => {
  const positions = usePositionStore((s) => s.positions);
  const account = useAppStore((s) => s.account);

  const activePositions = useMemo(() => {
    return positions.filter((p) => p.quantity !== 0);
  }, [positions]);

  const activeSymbols = useMemo(() => activePositions.map((p) => p.symbol), [activePositions]);
  const activePrices = useActivePrices(activeSymbols);

  const totalEquity = account?.equity || account?.balance || 10000;

  const exposureList = useMemo(() => {
    return activePositions.map((p) => {
      const livePrice = activePrices[p.symbol] ?? p.average_price;
      const size = Math.abs(p.quantity);
      const value = size * livePrice;
      const pct = totalEquity > 0 ? (value / totalEquity) * 100 : 0;
      return {
        symbol: p.symbol,
        side: p.quantity > 0 ? 'LONG' : 'SHORT',
        quantity: size,
        price: livePrice,
        value,
        pct,
      };
    });
  }, [activePositions, activePrices, totalEquity]);

  if (exposureList.length === 0) {
    return <div className="panel empty">No asset exposure. All positions closed.</div>;
  }

  return (
    <div style={tableWrap}>
      <table style={tableStyle}>
        <thead style={theadStyle}>
          <tr>
            <th style={thStyle}>Symbol</th>
            <th style={thStyle}>Direction</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Size (Qty)</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Current Price</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Total Value</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Portfolio %</th>
          </tr>
        </thead>
        <tbody>
          {exposureList.map((exp, idx) => {
            const isEven = idx % 2 === 0;
            const rowBg = isEven ? 'transparent' : 'rgba(255,255,255,0.012)';
            return (
              <tr key={exp.symbol} style={{ backgroundColor: rowBg }}>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{exp.symbol}</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: exp.side === 'LONG' ? 'var(--success)' : 'var(--danger)' }}>
                  {exp.side}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{exp.quantity.toFixed(4)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{formatPrice(exp.price, exp.symbol)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                  ${exp.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--accent)', fontWeight: 700 }}>
                  {exp.pct.toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ExposurePanel;
