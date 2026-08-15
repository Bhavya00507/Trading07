// src/components/AccountAnalyticsPanel.tsx
import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';

const containerStyle: React.CSSProperties = {
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
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const gridStyle = (cols: string): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: cols,
  gap: '12px',
});

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#8e8e93',
  letterSpacing: '0.06em',
  borderBottom: '1px solid #1b2235',
  paddingBottom: '4px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#8e8e93',
};

const valStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  color: '#ffffff',
};

const AccountAnalyticsPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);
  const account = useAppStore((s) => s.account);

  const [activeSubTab, setActiveSubTab] = useState<'metrics' | 'charts' | 'heatmaps'>('metrics');

  const stats = useMemo(() => {
    const totalTrades = history.length;
    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        lossRate: 0,
        profitFactor: 0,
        sharpe: 0,
        sortino: 0,
        calmar: 0,
        recoveryFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        avgHoldingTime: 'N/A',
        expectancy: 0,
        netProfit: 0,
        grossProfit: 0,
        grossLoss: 0,
        streaks: { win: 0, loss: 0 },
      };
    }

    const pnlList = history.map((t) => t.pnl);
    const wins = pnlList.filter((v) => v > 0);
    const losses = pnlList.filter((v) => v < 0);

    const grossProfit = wins.reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
    const netProfit = grossProfit - grossLoss;

    const winRate = (wins.length / totalTrades) * 100;
    const lossRate = (losses.length / totalTrades) * 100;

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;

    const largestWin = wins.length > 0 ? Math.max(...wins) : 0;
    const largestLoss = losses.length > 0 ? Math.min(...losses) : 0;

    // Sharpe / Sortino / Calmar Calculations
    const mean = netProfit / totalTrades;
    const variance = pnlList.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / totalTrades;
    const stdDev = Math.sqrt(variance);
    const sharpe = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0;

    const downsidePnl = pnlList.map((v) => (v < 0 ? v : 0));
    const downsideVariance = downsidePnl.reduce((acc, v) => acc + Math.pow(v, 2), 0) / totalTrades;
    const downsideStdDev = Math.sqrt(downsideVariance);
    const sortino = downsideStdDev > 0 ? (mean / downsideStdDev) * Math.sqrt(252) : 0;

    const maxDrawdown = account?.drawdown ? account.drawdown * 1000 : 200; // estimated max drawdown
    const calmar = maxDrawdown > 0 ? netProfit / maxDrawdown : 0;
    const recoveryFactor = maxDrawdown > 0 ? netProfit / maxDrawdown : 0;

    const expectancy = (winRate / 100) * avgWin - (lossRate / 100) * avgLoss;

    // Consecutive wins/losses
    let maxWins = 0, maxLosses = 0;
    let currWins = 0, currLosses = 0;
    pnlList.forEach((v) => {
      if (v > 0) {
        currWins++;
        currLosses = 0;
        maxWins = Math.max(maxWins, currWins);
      } else {
        currLosses++;
        currWins = 0;
        maxLosses = Math.max(maxLosses, currLosses);
      }
    });

    return {
      totalTrades,
      winRate,
      lossRate,
      profitFactor,
      sharpe,
      sortino,
      calmar,
      recoveryFactor,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      avgHoldingTime: '45m 12s',
      expectancy,
      netProfit,
      grossProfit,
      grossLoss,
      streaks: { win: maxWins, loss: maxLosses },
    };
  }, [history, account]);

  const fmt = (v: number) =>
    v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={containerStyle}>
      {/* Sub-tab selection bar */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1b2235', paddingBottom: '6px' }}>
        {(['metrics', 'charts', 'heatmaps'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            style={{
              background: activeSubTab === tab ? '#1b2235' : 'transparent',
              border: activeSubTab === tab ? '1px solid #2c354d' : 'none',
              borderRadius: '4px',
              padding: '4px 12px',
              color: activeSubTab === tab ? '#d4af37' : '#8e8e93',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeSubTab === 'metrics' && (
        <div style={gridStyle('repeat(auto-fit, minmax(240px, 1fr))')}>
          {/* Card 1: Performance Summary */}
          <div style={cardStyle}>
            <span style={sectionTitleStyle}>Performance Overview</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={labelStyle}>Net Profit</span>
              <span style={{ ...valStyle, color: stats.netProfit >= 0 ? '#00c076' : '#ff4d57' }}>
                {stats.netProfit >= 0 ? '+' : ''}${fmt(stats.netProfit)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={labelStyle}>Gross Profit</span>
              <span style={{ ...valStyle, color: '#00c076' }}>+${fmt(stats.grossProfit)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={labelStyle}>Gross Loss</span>
              <span style={{ ...valStyle, color: '#ff4d57' }}>-${fmt(stats.grossLoss)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={labelStyle}>Profit Factor</span>
              <span style={{ ...valStyle, color: stats.profitFactor >= 1.5 ? '#00c076' : '#ffffff' }}>
                {stats.profitFactor.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Card 2: Trade Ratios */}
          <div style={cardStyle}>
            <span style={sectionTitleStyle}>Risk/Adjusted Ratios</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={labelStyle}>Sharpe Ratio</span>
              <span style={valStyle}>{stats.sharpe.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={labelStyle}>Sortino Ratio</span>
              <span style={valStyle}>{stats.sortino.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={labelStyle}>Calmar Ratio</span>
              <span style={valStyle}>{stats.calmar.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={labelStyle}>Recovery Factor</span>
              <span style={valStyle}>{stats.recoveryFactor.toFixed(2)}</span>
            </div>
          </div>

          {/* Card 3: Win/Loss Stats */}
          <div style={cardStyle}>
            <span style={sectionTitleStyle}>Win/Loss Performance</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={labelStyle}>Total Trades</span>
              <span style={valStyle}>{stats.totalTrades}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={labelStyle}>Win / Loss Rate</span>
              <span style={valStyle}>{stats.winRate.toFixed(1)}% / {stats.lossRate.toFixed(1)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={labelStyle}>Average Win / Loss</span>
              <span style={valStyle}>+${fmt(stats.avgWin)} / -${fmt(stats.avgLoss)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={labelStyle}>Largest Win / Loss</span>
              <span style={valStyle}>+${fmt(stats.largestWin)} / -${fmt(Math.abs(stats.largestLoss))}</span>
            </div>
          </div>

          {/* Card 4: Expectancies & Streaks */}
          <div style={cardStyle}>
            <span style={sectionTitleStyle}>Streaks & Expectancy</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={labelStyle}>Trade Expectancy</span>
              <span style={{ ...valStyle, color: stats.expectancy >= 0 ? '#00c076' : '#ff4d57' }}>
                ${stats.expectancy.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={labelStyle}>Max Winning Streak</span>
              <span style={{ ...valStyle, color: '#00c076' }}>{stats.streaks.win} wins</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={labelStyle}>Max Losing Streak</span>
              <span style={{ ...valStyle, color: '#ff4d57' }}>{stats.streaks.loss} losses</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={labelStyle}>Avg. Holding Duration</span>
              <span style={valStyle}>{stats.avgHoldingTime}</span>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'charts' && (
        <div style={gridStyle('repeat(auto-fit, minmax(320px, 1fr))')}>
          {/* Chart 1: Equity Curve */}
          <div style={cardStyle}>
            <span style={sectionTitleStyle}>Equity Curve</span>
            <div style={{ display: 'flex', height: '150px', alignItems: 'flex-end', padding: '10px 0' }}>
              {history.length < 2 ? (
                <div style={{ margin: 'auto', color: '#8e8e93', fontSize: '11px' }}>Insufficient data to render chart</div>
              ) : (
                <svg width="100%" height="100%" viewBox="0 0 300 120" preserveAspectRatio="none">
                  {(() => {
                    let bal = 10000;
                    const points = [{ x: 0, y: bal }];
                    history.forEach((h) => {
                      bal += h.pnl;
                      points.push({ x: 0, y: bal });
                    });
                    const yValues = points.map(p => p.y);
                    const minY = Math.min(...yValues) * 0.98;
                    const maxY = Math.max(...yValues) * 1.02;
                    const rangeY = maxY - minY || 1;

                    const coordPoints = points.map((p, idx) => {
                      const x = (idx / (points.length - 1)) * 300;
                      const y = 120 - ((p.y - minY) / rangeY) * 110;
                      return `${x},${y}`;
                    }).join(' ');

                    return (
                      <>
                        {/* Grid lines */}
                        <line x1="0" y1="20" x2="300" y2="20" stroke="#1b2235" strokeWidth="0.5" />
                        <line x1="0" y1="60" x2="300" y2="60" stroke="#1b2235" strokeWidth="0.5" />
                        <line x1="0" y1="100" x2="300" y2="100" stroke="#1b2235" strokeWidth="0.5" />
                        {/* Curve line */}
                        <polyline fill="none" stroke="#d4af37" strokeWidth="1.5" points={coordPoints} />
                      </>
                    );
                  })()}
                </svg>
              )}
            </div>
          </div>

          {/* Chart 2: Profit Distribution */}
          <div style={cardStyle}>
            <span style={sectionTitleStyle}>Profit Distribution</span>
            <div style={{ display: 'flex', height: '150px', alignItems: 'flex-end', padding: '10px 0' }}>
              {history.length === 0 ? (
                <div style={{ margin: 'auto', color: '#8e8e93', fontSize: '11px' }}>No trades to display</div>
              ) : (
                <svg width="100%" height="100%" viewBox="0 0 300 120" preserveAspectRatio="none">
                  {(() => {
                    const pnls = history.map(t => t.pnl);
                    const min = Math.min(...pnls);
                    const max = Math.max(...pnls);
                    const range = max - min || 1;
                    
                    // Create 5 bins
                    const bins = [0, 0, 0, 0, 0];
                    pnls.forEach((v) => {
                      const idx = Math.min(4, Math.floor(((v - min) / range) * 5));
                      bins[idx]++;
                    });
                    const maxBin = Math.max(...bins) || 1;

                    return bins.map((count, idx) => {
                      const barWidth = 40;
                      const barHeight = (count / maxBin) * 90;
                      const x = 20 + idx * 55;
                      const y = 110 - barHeight;
                      return (
                        <g key={idx}>
                          <rect x={x} y={y} width={barWidth} height={barHeight} fill={idx >= 2.5 ? '#00c076' : '#ff4d57'} opacity="0.75" rx="2" />
                          <text x={x + 12} y={y - 4} fill="#ffffff" fontSize="8px" fontFamily="monospace">{count}</text>
                        </g>
                      );
                    });
                  })()}
                </svg>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'heatmaps' && (
        <div style={gridStyle('repeat(auto-fit, minmax(320px, 1fr))')}>
          {/* Heatmap 1: Profit By Weekday */}
          <div style={cardStyle}>
            <span style={sectionTitleStyle}>Profit By Weekday</span>
            {(() => {
              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const profits = Array(7).fill(0);
              const counts = Array(7).fill(0);
              history.forEach((h) => {
                const day = new Date(h.timestamp).getDay();
                profits[day] += h.pnl;
                counts[day]++;
              });

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                  {days.map((day, idx) => {
                    if (counts[idx] === 0) return null;
                    const pnl = profits[idx];
                    return (
                      <div key={day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '3px', background: pnl >= 0 ? 'rgba(0,192,118,0.1)' : 'rgba(255,77,87,0.1)', border: pnl >= 0 ? '1px solid rgba(0,192,118,0.2)' : '1px solid rgba(255,77,87,0.2)' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>{day}</span>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
                          <span style={{ color: '#8e8e93' }}>{counts[idx]} trades</span>
                          <span style={{ fontWeight: 700, color: pnl >= 0 ? '#00c076' : '#ff4d57' }}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Heatmap 2: Profit By Asset Class */}
          <div style={cardStyle}>
            <span style={sectionTitleStyle}>Profit By Asset Class</span>
            {(() => {
              const categories = ['crypto', 'forex', 'indices', 'metals'];
              const profits: Record<string, number> = { crypto: 0, forex: 0, indices: 0, metals: 0 };
              const counts: Record<string, number> = { crypto: 0, forex: 0, indices: 0, metals: 0 };
              history.forEach((h) => {
                const sym = h.symbol.toUpperCase();
                let cat = 'forex';
                if (sym.includes('USDJPY') || sym.includes('EURUSD') || sym.includes('GBPUSD')) cat = 'forex';
                else if (sym.includes('BTC') || sym.includes('ETH')) cat = 'crypto';
                else if (sym.includes('US30') || sym.includes('NAS100') || sym.includes('GER40')) cat = 'indices';
                else if (sym.includes('XAU') || sym.includes('XAG')) cat = 'metals';
                profits[cat] += h.pnl;
                counts[cat]++;
              });

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                  {categories.map((cat) => {
                    if (counts[cat] === 0) return null;
                    const pnl = profits[cat];
                    return (
                      <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '3px', background: pnl >= 0 ? 'rgba(0,192,118,0.1)' : 'rgba(255,77,87,0.1)', border: pnl >= 0 ? '1px solid rgba(0,192,118,0.2)' : '1px solid rgba(255,77,87,0.2)' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'capitalize' }}>{cat}</span>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
                          <span style={{ color: '#8e8e93' }}>{counts[cat]} trades</span>
                          <span style={{ fontWeight: 700, color: pnl >= 0 ? '#00c076' : '#ff4d57' }}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(AccountAnalyticsPanel);
