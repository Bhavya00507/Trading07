import React, { useMemo } from 'react';
import { useAppStore } from '../store/appStore';

const containerStyle: React.CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  gap: '16px',
  overflowY: 'auto',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '11px',
  fontFamily: 'var(--font-sans)',
};

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: '9px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border-color)',
  background: 'var(--bg-secondary)',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--accent)',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '6px',
  letterSpacing: '0.04em',
};

const fmt = (val: number) =>
  val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SymbolAnalyticsPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);

  const symbolData = useMemo(() => {
    const groups: {
      [symbol: string]: {
        symbol: string;
        pnl: number;
        trades: number;
        wins: number;
        grossProfit: number;
        grossLoss: number;
      };
    } = {};

    history.forEach((t) => {
      if (!groups[t.symbol]) {
        groups[t.symbol] = {
          symbol: t.symbol,
          pnl: 0,
          trades: 0,
          wins: 0,
          grossProfit: 0,
          grossLoss: 0,
        };
      }

      const sym = groups[t.symbol];
      sym.pnl += t.pnl;
      sym.trades += 1;
      if (t.pnl > 0) {
        sym.wins += 1;
        sym.grossProfit += t.pnl;
      } else if (t.pnl < 0) {
        sym.grossLoss += Math.abs(t.pnl);
      }
    });

    return Object.values(groups).map((sym) => {
      const winRate = sym.trades > 0 ? (sym.wins / sym.trades) * 100 : 0;
      const profitFactor = sym.grossLoss > 0 ? sym.grossProfit / sym.grossLoss : sym.grossProfit > 0 ? 99.9 : 0;

      return {
        ...sym,
        winRate,
        profitFactor,
      };
    }).sort((a, b) => b.pnl - a.pnl);
  }, [history]);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <span style={titleStyle}>Performance by Symbol / Instrument</span>

        {symbolData.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px' }}>
            No trades history available to analyze symbol metrics.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Symbol</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Net Profit / Loss</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Win Rate</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Trade Count</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Profit Factor</th>
                </tr>
              </thead>
              <tbody>
                {symbolData.map((data) => {
                  const pnlColor = data.pnl > 0 ? 'var(--success)' : data.pnl < 0 ? 'var(--danger)' : 'var(--text-secondary)';
                  
                  return (
                    <tr key={data.symbol}>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{data.symbol}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: pnlColor, fontFamily: 'var(--font-mono)' }}>
                        {data.pnl > 0 ? '+' : ''}${fmt(data.pnl)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        {data.winRate.toFixed(1)}%
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {data.trades}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)', color: data.profitFactor >= 1.5 ? 'var(--success)' : data.profitFactor < 1 ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {data.profitFactor.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SymbolAnalyticsPanel;
