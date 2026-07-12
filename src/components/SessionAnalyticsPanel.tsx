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

const metricRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 0',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  fontSize: '11px',
};

const valueStyle: React.CSSProperties = {
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  color: 'var(--text-primary)',
};

const labelStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
};

const fmt = (val: number) =>
  val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SessionAnalyticsPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);

  const sessionData = useMemo(() => {
    const sessions = {
      asian: { name: 'Asian Session (00:00 - 08:00 UTC)', trades: 0, wins: 0, profit: 0, avgRR: 0, winsList: [] as number[], lossesList: [] as number[] },
      london: { name: 'London Session (08:00 - 16:00 UTC)', trades: 0, wins: 0, profit: 0, avgRR: 0, winsList: [] as number[], lossesList: [] as number[] },
      newYork: { name: 'New York Session (16:00 - 24:00 UTC)', trades: 0, wins: 0, profit: 0, avgRR: 0, winsList: [] as number[], lossesList: [] as number[] },
    };

    history.forEach((t) => {
      const hour = new Date(t.timestamp).getUTCHours();
      let target: typeof sessions.asian;

      if (hour >= 0 && hour < 8) {
        target = sessions.asian;
      } else if (hour >= 8 && hour < 16) {
        target = sessions.london;
      } else {
        target = sessions.newYork;
      }

      target.trades += 1;
      target.profit += t.pnl;
      if (t.pnl > 0) {
        target.wins += 1;
        target.winsList.push(t.pnl);
      } else if (t.pnl < 0) {
        target.lossesList.push(Math.abs(t.pnl));
      }
    });

    // Calculate Average Risk/Reward (as Avg Win / Avg Loss) for each session
    Object.values(sessions).forEach((s) => {
      const avgWin = s.winsList.length > 0 ? s.winsList.reduce((a, b) => a + b, 0) / s.winsList.length : 0;
      const avgLoss = s.lossesList.length > 0 ? s.lossesList.reduce((a, b) => a + b, 0) / s.lossesList.length : 0;
      s.avgRR = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 99.9 : 0;
    });

    return sessions;
  }, [history]);

  // Compute maximum profit for SVG bar heights
  const maxProfit = useMemo(() => {
    const profits = [
      Math.abs(sessionData.asian.profit),
      Math.abs(sessionData.london.profit),
      Math.abs(sessionData.newYork.profit)
    ];
    return Math.max(...profits, 100);
  }, [sessionData]);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        {/* Asian Session Stats */}
        <div style={cardStyle}>
          <span style={titleStyle}>{sessionData.asian.name}</span>
          
          <div style={metricRowStyle}>
            <span style={labelStyle}>Trades Count</span>
            <span style={valueStyle}>{sessionData.asian.trades}</span>
          </div>
          <div style={metricRowStyle}>
            <span style={labelStyle}>Win Rate</span>
            <span style={valueStyle}>
              {sessionData.asian.trades > 0 
                ? `${((sessionData.asian.wins / sessionData.asian.trades) * 100).toFixed(1)}%` 
                : '0.0%'}
            </span>
          </div>
          <div style={metricRowStyle}>
            <span style={labelStyle}>Net Profit</span>
            <span style={{ ...valueStyle, color: sessionData.asian.profit > 0 ? 'var(--success)' : sessionData.asian.profit < 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
              {sessionData.asian.profit > 0 ? '+' : ''}${fmt(sessionData.asian.profit)}
            </span>
          </div>
          <div style={{ ...metricRowStyle, borderBottom: 'none' }}>
            <span style={labelStyle}>Average Risk/Reward</span>
            <span style={valueStyle}>{sessionData.asian.avgRR.toFixed(2)}</span>
          </div>
        </div>

        {/* London Session Stats */}
        <div style={cardStyle}>
          <span style={titleStyle}>{sessionData.london.name}</span>
          
          <div style={metricRowStyle}>
            <span style={labelStyle}>Trades Count</span>
            <span style={valueStyle}>{sessionData.london.trades}</span>
          </div>
          <div style={metricRowStyle}>
            <span style={labelStyle}>Win Rate</span>
            <span style={valueStyle}>
              {sessionData.london.trades > 0 
                ? `${((sessionData.london.wins / sessionData.london.trades) * 100).toFixed(1)}%` 
                : '0.0%'}
            </span>
          </div>
          <div style={metricRowStyle}>
            <span style={labelStyle}>Net Profit</span>
            <span style={{ ...valueStyle, color: sessionData.london.profit > 0 ? 'var(--success)' : sessionData.london.profit < 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
              {sessionData.london.profit > 0 ? '+' : ''}${fmt(sessionData.london.profit)}
            </span>
          </div>
          <div style={{ ...metricRowStyle, borderBottom: 'none' }}>
            <span style={labelStyle}>Average Risk/Reward</span>
            <span style={valueStyle}>{sessionData.london.avgRR.toFixed(2)}</span>
          </div>
        </div>

        {/* New York Session Stats */}
        <div style={cardStyle}>
          <span style={titleStyle}>{sessionData.newYork.name}</span>
          
          <div style={metricRowStyle}>
            <span style={labelStyle}>Trades Count</span>
            <span style={valueStyle}>{sessionData.newYork.trades}</span>
          </div>
          <div style={metricRowStyle}>
            <span style={labelStyle}>Win Rate</span>
            <span style={valueStyle}>
              {sessionData.newYork.trades > 0 
                ? `${((sessionData.newYork.wins / sessionData.newYork.trades) * 100).toFixed(1)}%` 
                : '0.0%'}
            </span>
          </div>
          <div style={metricRowStyle}>
            <span style={labelStyle}>Net Profit</span>
            <span style={{ ...valueStyle, color: sessionData.newYork.profit > 0 ? 'var(--success)' : sessionData.newYork.profit < 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
              {sessionData.newYork.profit > 0 ? '+' : ''}${fmt(sessionData.newYork.profit)}
            </span>
          </div>
          <div style={{ ...metricRowStyle, borderBottom: 'none' }}>
            <span style={labelStyle}>Average Risk/Reward</span>
            <span style={valueStyle}>{sessionData.newYork.avgRR.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* SVG Bar Chart Session PnL Comparisons */}
      <div style={cardStyle}>
        <span style={titleStyle}>Session Profit/Loss Comparison</span>

        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '180px', padding: '16px 0', width: '100%' }}>
          {/* Asian Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '80px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: sessionData.asian.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {sessionData.asian.profit > 0 ? '+' : ''}${fmt(sessionData.asian.profit)}
            </span>
            <div style={{
              width: '40px',
              height: `${Math.max((Math.abs(sessionData.asian.profit) / maxProfit) * 100, 4)}px`,
              background: sessionData.asian.profit >= 0 ? 'var(--success)' : 'var(--danger)',
              borderRadius: '4px 4px 0 0',
              opacity: 0.85
            }} />
            <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-secondary)' }}>Asian</span>
          </div>

          {/* London Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '80px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: sessionData.london.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {sessionData.london.profit > 0 ? '+' : ''}${fmt(sessionData.london.profit)}
            </span>
            <div style={{
              width: '40px',
              height: `${Math.max((Math.abs(sessionData.london.profit) / maxProfit) * 100, 4)}px`,
              background: sessionData.london.profit >= 0 ? 'var(--success)' : 'var(--danger)',
              borderRadius: '4px 4px 0 0',
              opacity: 0.85
            }} />
            <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-secondary)' }}>London</span>
          </div>

          {/* New York Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '80px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: sessionData.newYork.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {sessionData.newYork.profit > 0 ? '+' : ''}${fmt(sessionData.newYork.profit)}
            </span>
            <div style={{
              width: '40px',
              height: `${Math.max((Math.abs(sessionData.newYork.profit) / maxProfit) * 100, 4)}px`,
              background: sessionData.newYork.profit >= 0 ? 'var(--success)' : 'var(--danger)',
              borderRadius: '4px 4px 0 0',
              opacity: 0.85
            }} />
            <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-secondary)' }}>New York</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionAnalyticsPanel;
