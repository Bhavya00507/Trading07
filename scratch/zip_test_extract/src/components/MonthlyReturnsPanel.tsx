import React, { useMemo, useState, useEffect } from 'react';
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

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
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

const filterSelect: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: '11px',
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '3px',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  outline: 'none',
};

const MONTHS_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MonthlyReturnsPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);

  const availableYears = useMemo(() => {
    const years = history.map((t) => new Date(t.timestamp).getFullYear());
    const unique = Array.from(new Set(years)).sort((a, b) => b - a);
    return unique.length > 0 ? unique : [new Date().getFullYear()];
  }, [history]);

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('trading-monthly-returns-year');
      if (saved) return parseInt(saved);
    } catch {}
    return availableYears[0] || new Date().getFullYear();
  });

  useEffect(() => {
    localStorage.setItem('trading-monthly-returns-year', selectedYear.toString());
  }, [selectedYear]);

  // Aggregate monthly data for selected year
  const monthlyData = useMemo(() => {
    // Reconstruct list of 12 months with default empty stats
    const months = Array.from({ length: 12 }, (_, i) => ({
      index: i,
      name: MONTHS_NAMES[i],
      profit: 0,
      trades: 0,
      wins: 0,
    }));

    history.forEach((t) => {
      const date = new Date(t.timestamp);
      if (date.getFullYear() === selectedYear) {
        const mIdx = date.getMonth();
        months[mIdx].profit += t.pnl;
        months[mIdx].trades += 1;
        if (t.pnl > 0) {
          months[mIdx].wins += 1;
        }
      }
    });

    return months;
  }, [history, selectedYear]);

  // Annual Totals
  const annualSummary = useMemo(() => {
    let profit = 0;
    let trades = 0;
    let wins = 0;
    monthlyData.forEach((m) => {
      profit += m.profit;
      trades += m.trades;
      wins += m.wins;
    });
    const returnPct = (profit / 10000) * 100; // starting balance base 10k
    const winRate = trades > 0 ? (wins / trades) * 100 : 0;
    return { profit, returnPct, trades, winRate };
  }, [monthlyData]);

  const fmt = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={containerStyle}>
      {/* Year filter selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Select Year:</span>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          style={filterSelect}
        >
          {availableYears.map((yr) => (
            <option key={yr} value={yr}>
              {yr}
            </option>
          ))}
        </select>
      </div>

      {/* Monthly Returns Matrix Grid */}
      <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Month</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Net Profit</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Return %</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Trades Count</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((m) => {
              const returnPct = (m.profit / 10000) * 100;
              const winRate = m.trades > 0 ? (m.wins / m.trades) * 100 : 0;
              const profitColor = m.profit > 0 ? 'var(--success)' : m.profit < 0 ? 'var(--danger)' : 'var(--text-secondary)';

              return (
                <tr key={m.index}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{m.name}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: profitColor }}>
                    {m.profit > 0 ? '+' : ''}${fmt(m.profit)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: profitColor }}>
                    {m.profit > 0 ? '+' : ''}{returnPct.toFixed(2)}%
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{m.trades}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {m.trades > 0 ? `${winRate.toFixed(1)}%` : '-'}
                  </td>
                </tr>
              );
            })}

            {/* Annual summary row */}
            <tr style={{ background: 'var(--bg-tertiary)', borderTop: '2px solid var(--border-color)' }}>
              <td style={{ ...tdStyle, fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent)' }}>Yearly Summary</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: annualSummary.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {annualSummary.profit > 0 ? '+' : ''}${fmt(annualSummary.profit)}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: annualSummary.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {annualSummary.profit > 0 ? '+' : ''}{annualSummary.returnPct.toFixed(2)}%
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{annualSummary.trades}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>
                {annualSummary.trades > 0 ? `${annualSummary.winRate.toFixed(1)}%` : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonthlyReturnsPanel;
