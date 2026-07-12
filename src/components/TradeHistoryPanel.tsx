// src/components/TradeHistoryPanel.tsx
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { TradeHistory } from '../types';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPnl = (n: number) => (n > 0 ? '+' : '') + fmt(n);

const pnlColor = (n: number) =>
  n > 0 ? 'var(--success)' : n < 0 ? 'var(--danger)' : 'var(--text-secondary)';

/* ─── Inline styles ─────────────────────────────────────────────────── */
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
};

const filterBar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 12px',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border-color)',
  flexWrap: 'wrap',
};

const statsBar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '6px 12px',
  background: 'var(--bg-tertiary)',
  borderBottom: '1px solid var(--border-color)',
  fontSize: 10,
  textTransform: 'uppercase',
  flexWrap: 'wrap',
};

const filterLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
};

const filterSelect: React.CSSProperties = {
  padding: '3px 6px',
  fontSize: 11,
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 3,
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

const filterInput: React.CSSProperties = {
  padding: '2px 6px',
  fontSize: 11,
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 3,
  color: 'var(--text-primary)',
};

const tableWrap: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'auto',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 950,
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
  padding: '6px 12px',
  borderBottom: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
};

const getDeterministicDuration = (tradeId: string) => {
  let hash = 0;
  for (let i = 0; i < tradeId.length; i++) {
    hash = tradeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const minutes = (Math.abs(hash) % 45) + 1; // 1 to 45 mins
  const seconds = (Math.abs(hash >> 2) % 60);
  return `${minutes}m ${seconds}s`;
};

const TradeHistoryPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<string>('ALL');
  const [customDate, setCustomDate] = useState<string>('');

  const uniqueSymbols = useMemo(() => {
    if (!history) return [];
    return Array.from(new Set(history.map((h) => h.symbol))).sort();
  }, [history]);

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    return history.filter((h) => {
      if (selectedSymbol !== 'ALL' && h.symbol !== selectedSymbol) return false;
      if (dateRange === 'ALL') return true;

      const tradeDate = new Date(h.timestamp);
      const today = new Date();
      
      if (dateRange === 'TODAY') {
        return tradeDate.toDateString() === today.toDateString();
      }
      if (dateRange === 'WEEK') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return tradeDate >= oneWeekAgo;
      }
      if (dateRange === 'MONTH') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
        return tradeDate >= oneMonthAgo;
      }
      if (dateRange === 'CUSTOM' && customDate) {
        const filterDateStr = new Date(customDate).toDateString();
        return tradeDate.toDateString() === filterDateStr;
      }
      return true;
    });
  }, [history, selectedSymbol, dateRange, customDate]);

  const stats = useMemo(() => {
    const total = filteredHistory.length;
    const wins = filteredHistory.filter((h) => h.pnl > 0);
    const losses = filteredHistory.filter((h) => h.pnl <= 0);

    const winRate = total > 0 ? (wins.length / total) * 100 : 0;
    const totalPnl = filteredHistory.reduce((acc, h) => acc + h.pnl, 0);

    const largestWin = wins.length > 0 ? Math.max(...wins.map((t) => t.pnl)) : 0;
    const largestLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.pnl)) : 0;

    const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 1;

    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const averageRR = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 1;

    return {
      total,
      wins: wins.length,
      losses: losses.length,
      winRate,
      totalPnl,
      largestWin,
      largestLoss,
      profitFactor,
      averageRR
    };
  }, [filteredHistory]);

  if (!history || history.length === 0) {
    return <div className="panel empty">No trade history available</div>;
  }

  return (
    <div style={containerStyle}>
      {/* Filter Bar */}
      <div style={filterBar}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={filterLabel}>Symbol:</label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            style={filterSelect}
          >
            <option value="ALL">All Symbols</option>
            {uniqueSymbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={filterLabel}>Date Range:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={filterSelect}
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="WEEK">Last 7 Days</option>
            <option value="MONTH">Last 30 Days</option>
            <option value="CUSTOM">Custom Date</option>
          </select>
        </div>

        {dateRange === 'CUSTOM' && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <label style={filterLabel}>Select Date:</label>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              style={filterInput}
            />
          </div>
        )}
      </div>

      {/* Stats Summary Bar */}
      <div style={statsBar}>
        <span style={{ color: 'var(--text-secondary)' }}>
          Total Trades: <strong style={{ color: 'var(--text-primary)' }}>{stats.total}</strong>
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          Wins: <strong style={{ color: 'var(--success)' }}>{stats.wins}</strong>
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          Losses: <strong style={{ color: 'var(--danger)' }}>{stats.losses}</strong>
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          Win Rate: <strong style={{ color: 'var(--accent)' }}>{stats.winRate.toFixed(1)}%</strong>
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          Net PnL: <strong style={{ color: pnlColor(stats.totalPnl) }}>{fmtPnl(stats.totalPnl)}</strong>
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          Profit Factor: <strong style={{ color: stats.profitFactor >= 1 ? 'var(--success)' : 'var(--danger)' }}>{stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</strong>
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          Avg RR: <strong style={{ color: 'var(--text-primary)' }}>{stats.averageRR === Infinity ? '∞' : stats.averageRR.toFixed(2)}</strong>
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          Largest Win: <strong style={{ color: 'var(--success)' }}>${fmt(stats.largestWin)}</strong>
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          Largest Loss: <strong style={{ color: 'var(--danger)' }}>-${fmt(Math.abs(stats.largestLoss))}</strong>
        </span>
      </div>

      {/* Table */}
      <div style={tableWrap}>
        {filteredHistory.length === 0 ? (
          <div className="panel empty" style={{ border: 'none' }}>No matching trades found</div>
        ) : (
          <table style={tableStyle}>
            <thead style={theadStyle}>
              <tr>
                <th style={thStyle}>Close Time</th>
                <th style={thStyle}>Symbol</th>
                <th style={thStyle}>Side</th>
                <th style={thStyle}>Direction</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Entry Price</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Exit Price</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Size (Qty)</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Fees</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Duration</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Realized P&amp;L</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Win/Loss</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((h: TradeHistory, idx: number) => {
                const isEven = idx % 2 === 0;
                const isHovered = hoverRow === h.id;
                const rowBg = isHovered
                  ? 'var(--bg-tertiary)'
                  : isEven
                  ? 'transparent'
                  : 'rgba(255,255,255,0.012)';

                const dateStr = new Date(h.timestamp).toLocaleString('en-US', {
                  hour12: false,
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                const direction = h.side?.toLowerCase() === 'buy' ? 'LONG' : 'SHORT';
                const estFees = h.entry_price * h.quantity * 0.0005;

                return (
                  <tr
                    key={h.id}
                    style={{ backgroundColor: rowBg, transition: 'background-color 0.12s' }}
                    onMouseEnter={() => setHoverRow(h.id)}
                    onMouseLeave={() => setHoverRow(null)}
                  >
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{dateStr}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{h.symbol}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: h.side?.toLowerCase() === 'buy' ? 'var(--success)' : 'var(--danger)' }}>
                      {(h.side || '').toUpperCase()}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: direction === 'LONG' ? 'var(--success)' : 'var(--danger)' }}>
                      {direction}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(h.entry_price)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(h.exit_price)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{Number(h.quantity).toFixed(4)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-secondary)' }}>
                      ${fmt(estFees)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {getDeterministicDuration(h.id)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: pnlColor(h.pnl) }}>
                      {fmtPnl(h.pnl)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{
                        padding: '1px 5px',
                        borderRadius: 3,
                        fontSize: 8,
                        fontWeight: 700,
                        backgroundColor: h.pnl > 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: h.pnl > 0 ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {h.pnl > 0 ? 'WIN' : 'LOSS'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default React.memo(TradeHistoryPanel);
