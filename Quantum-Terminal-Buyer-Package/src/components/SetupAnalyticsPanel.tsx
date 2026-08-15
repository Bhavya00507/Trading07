import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useJournalStore, SetupType } from '../store/journalStore';
import { analyzeSetups, SetupStat } from '../services/journalAnalyzer';

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

const titleStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--accent)',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '6px',
  letterSpacing: '0.04em',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '11px',
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
  cursor: 'pointer',
  userSelect: 'none',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
};

type SortKey = 'setup' | 'count' | 'winRate' | 'netPnl' | 'profitFactor' | 'avgRR';

const SetupAnalyticsPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);
  const { entries, getOrCreateEntry } = useJournalStore();

  const [sortKey, setSortKey] = useState<SortKey>('netPnl');
  const [sortDesc, setSortDesc] = useState<boolean>(true);

  const journalList = useMemo(() => {
    return history.map((t) => getOrCreateEntry(t));
  }, [history, getOrCreateEntry]);

  const rawStats = useMemo(() => {
    return analyzeSetups(journalList);
  }, [journalList]);

  // Sort logic
  const sortedStats = useMemo(() => {
    const data = [...rawStats];
    data.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
      } else {
        const numA = valA as number;
        const numB = valB as number;
        return sortDesc ? numB - numA : numA - numB;
      }
    });
    return data;
  }, [rawStats, sortKey, sortDesc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const renderSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortDesc ? ' ▼' : ' ▲';
  };

  const fmt = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <span style={titleStyle}>Sortable Setup Analysis Matrix</span>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle} onClick={() => handleSort('setup')}>
                  Setup Type{renderSortIndicator('setup')}
                </th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('count')}>
                  Trade Count{renderSortIndicator('count')}
                </th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('winRate')}>
                  Win Rate{renderSortIndicator('winRate')}
                </th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('netPnl')}>
                  Net Profit / Loss{renderSortIndicator('netPnl')}
                </th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('profitFactor')}>
                  Profit Factor{renderSortIndicator('profitFactor')}
                </th>
                <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => handleSort('avgRR')}>
                  Average RR{renderSortIndicator('avgRR')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStats.map((d) => {
                const isNoTrades = d.count === 0;
                const pnlColor = d.netPnl > 0 ? 'var(--success)' : d.netPnl < 0 ? 'var(--danger)' : 'var(--text-secondary)';

                return (
                  <tr key={d.setup} style={{ opacity: isNoTrades ? 0.45 : 1 }}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{d.setup}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{d.count}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {!isNoTrades ? `${d.winRate.toFixed(1)}%` : '-'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: pnlColor, fontFamily: 'var(--font-mono)' }}>
                      {!isNoTrades ? `${d.netPnl >= 0 ? '+' : ''}$${fmt(d.netPnl)}` : '-'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {!isNoTrades ? d.profitFactor.toFixed(2) : '-'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {!isNoTrades ? d.avgRR.toFixed(2) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SetupAnalyticsPanel;
