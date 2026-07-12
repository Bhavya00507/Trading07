import React, { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useJournalStore } from '../store/journalStore';
import { analyzeMistakes } from '../services/journalAnalyzer';

const containerStyle: React.CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  gap: '16px',
  overflowY: 'auto',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '16px',
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
  padding: '6px 8px',
  textAlign: 'left',
  fontSize: '9px',
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border-color)',
  fontWeight: 700,
};

const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  color: 'var(--text-primary)',
};

const MistakeAnalyticsPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);
  const { entries, getOrCreateEntry } = useJournalStore();

  const journalList = useMemo(() => {
    return history.map((t) => getOrCreateEntry(t));
  }, [history, getOrCreateEntry]);

  const mistakeData = useMemo(() => {
    return analyzeMistakes(journalList);
  }, [journalList]);

  const maxCost = useMemo(() => {
    const costs = mistakeData.map((d) => Math.abs(d.totalCost));
    return Math.max(...costs, 100);
  }, [mistakeData]);

  const fmt = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        {/* Mistake statistics table */}
        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <span style={titleStyle}>Mistakes Analysis Breakdown</span>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Mistake</th>
                <th style={thStyle}>Frequency</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Losses Caused</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Average Loss</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Net Cost</th>
              </tr>
            </thead>
            <tbody>
              {mistakeData.map((d) => {
                const isNoTrades = d.count === 0;
                const costColor = d.totalCost < 0 ? 'var(--danger)' : d.totalCost > 0 ? 'var(--success)' : 'var(--text-secondary)';
                return (
                  <tr key={d.mistake} style={{ opacity: isNoTrades ? 0.45 : 1 }}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{d.mistake}</td>
                    <td style={tdStyle}>{d.count}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                      {!isNoTrades ? `-$${fmt(d.lossesCaused)}` : '-'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      {!isNoTrades ? `-$${fmt(d.avgLoss)}` : '-'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: costColor, fontFamily: 'var(--font-mono)' }}>
                      {!isNoTrades ? `${d.totalCost >= 0 ? '+' : ''}$${fmt(d.totalCost)}` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SVG Bar Chart representing Cost of Mistakes */}
      <div style={cardStyle}>
        <span style={titleStyle}>Total Net Cost of Mistakes ($)</span>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '180px', padding: '16px 0', width: '100%' }}>
          {mistakeData.filter((d) => d.count > 0).map((d) => {
            const heightPct = Math.max((Math.abs(d.totalCost) / maxCost) * 100, 4);
            const isLoss = d.totalCost < 0;

            return (
              <div key={d.mistake} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '80px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: isLoss ? 'var(--danger)' : 'var(--success)' }}>
                  {d.totalCost >= 0 ? '+' : ''}${d.totalCost.toFixed(0)}
                </span>
                <div style={{
                  width: '24px',
                  height: `${heightPct}px`,
                  backgroundColor: isLoss ? 'var(--danger)' : 'var(--success)',
                  borderRadius: '3px 3px 0 0',
                  opacity: 0.85
                }} />
                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'center' }}>
                  {d.mistake}
                </span>
              </div>
            );
          })}
          {mistakeData.filter((d) => d.count > 0).length === 0 && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>No mistakes logged to display cost chart.</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MistakeAnalyticsPanel;
