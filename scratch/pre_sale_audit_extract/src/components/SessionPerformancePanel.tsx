// src/components/SessionPerformancePanel.tsx
import React, { useMemo } from 'react';
import { useAppStore } from '../store/appStore';

const panelStyle: React.CSSProperties = {
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  gap: '12px',
  overflowY: 'auto',
  backgroundColor: '#070b14',
  color: '#e0e0e0',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#0d1322',
  border: '1px solid #1b2235',
  borderRadius: '6px',
  padding: '12px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#8e8e93',
  letterSpacing: '0.06em',
  borderBottom: '1px solid #1b2235',
  paddingBottom: '4px',
  marginBottom: '8px',
};

const gridStyle = (cols: string): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: cols,
  gap: '12px',
});

const SessionPerformancePanel: React.FC = () => {
  const history = useAppStore((s) => s.history);

  const sessionStats = useMemo(() => {
    const sessions = [
      { name: 'Sydney Session', hours: [22, 23, 0, 1, 2, 3, 4, 5, 6], count: 0, wins: 0, pnl: 0 },
      { name: 'Tokyo Session', hours: [0, 1, 2, 3, 4, 5, 6, 7, 8], count: 0, wins: 0, pnl: 0 },
      { name: 'London Session', hours: [8, 9, 10, 11, 12, 13, 14, 15, 16], count: 0, wins: 0, pnl: 0 },
      { name: 'New York Session', hours: [13, 14, 15, 16, 17, 18, 19, 20, 21], count: 0, wins: 0, pnl: 0 },
      { name: 'London/NY Overlap', hours: [13, 14, 15, 16], count: 0, wins: 0, pnl: 0 }
    ];

    history.forEach((h) => {
      const hour = new Date(h.timestamp).getUTCHours();
      sessions.forEach((s) => {
        if (s.hours.includes(hour)) {
          s.count++;
          s.pnl += h.pnl;
          if (h.pnl > 0) s.wins++;
        }
      });
    });

    return sessions;
  }, [history]);

  // Find best/worst session
  const { best, worst } = useMemo(() => {
    let bestS = 'N/A', worstS = 'N/A';
    let maxP = -Infinity, minP = Infinity;
    
    sessionStats.forEach((s) => {
      if (s.count > 0) {
        if (s.pnl > maxP) { maxP = s.pnl; bestS = s.name; }
        if (s.pnl < minP) { minP = s.pnl; worstS = s.name; }
      }
    });

    return {
      best: bestS,
      worst: worstS === 'N/A' && bestS !== 'N/A' ? 'None' : worstS,
    };
  }, [sessionStats]);

  return (
    <div style={panelStyle}>
      <div style={gridStyle('repeat(auto-fit, minmax(280px, 1fr))')}>
        {/* Session performance Overview */}
        <div style={cardStyle}>
          <span style={titleStyle}>Trading Session Overview</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: '#8e8e93' }}>Best Performing Session:</span>
              <span style={{ fontWeight: 700, color: '#00c076' }}>{best}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}>
              <span style={{ color: '#8e8e93' }}>Worst Performing Session:</span>
              <span style={{ fontWeight: 700, color: '#ff4d57' }}>{worst}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={gridStyle('repeat(auto-fit, minmax(320px, 1fr))')}>
        {/* Session Stats Table */}
        <div style={cardStyle}>
          <span style={titleStyle}>Session Breakdown</span>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1b2235' }}>
                <th style={{ padding: '6px 0', color: '#8e8e93' }}>Session</th>
                <th style={{ color: '#8e8e93', textAlign: 'right' }}>Trades</th>
                <th style={{ color: '#8e8e93', textAlign: 'right' }}>Win Rate</th>
                <th style={{ color: '#8e8e93', textAlign: 'right' }}>Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {sessionStats.map((s) => {
                const winRate = s.count > 0 ? (s.wins / s.count) * 100 : 0;
                return (
                  <tr key={s.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px 0', fontWeight: 600 }}>{s.name}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{s.count}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{winRate.toFixed(1)}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: s.pnl >= 0 ? '#00c076' : '#ff4d57', fontFamily: 'monospace' }}>
                      {s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Visual Bar chart for session performance */}
        <div style={cardStyle}>
          <span style={titleStyle}>Profit By Session</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
            {sessionStats.map((s) => {
              const maxPnl = Math.max(...sessionStats.map(s => Math.abs(s.pnl))) || 1;
              const fillPct = Math.min(100, (Math.abs(s.pnl) / maxPnl) * 100);
              return (
                <div key={s.name} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                    <span>{s.name}</span>
                    <span style={{ fontWeight: 700, color: s.pnl >= 0 ? '#00c076' : '#ff4d57' }}>
                      {s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: '6px', background: '#1b2235', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${fillPct}%`, background: s.pnl >= 0 ? '#00c076' : '#ff4d57', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionPerformancePanel;
