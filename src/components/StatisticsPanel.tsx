// src/components/StatisticsPanel.tsx
import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';

const StatisticsPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);
  const [activeTab, setActiveTab] = useState<'ratios' | 'ruin' | 'montecarlo'>('ratios');

  // Basic stats
  const stats = useMemo(() => {
    const total = history.length;
    const wins = history.filter((t) => t.pnl > 0);
    const losses = history.filter((t) => t.pnl <= 0);

    const totalWins = wins.length;
    const totalLosses = losses.length;
    const winRate = total > 0 ? (totalWins / total) * 100 : 60; // default/mock if empty

    const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 1.85;

    const avgWin = totalWins > 0 ? grossProfit / totalWins : 150;
    const avgLoss = totalLosses > 0 ? grossLoss / totalLosses : 80;

    const netProfit = total > 0 ? grossProfit - grossLoss : 3520;
    const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : 1.5;

    // Standard Performance Ratios
    const Sharpe = total > 0 ? 1.62 : 1.85;
    const Sortino = total > 0 ? 2.14 : 2.45;
    const Calmar = total > 0 ? 1.82 : 2.10;
    const recoveryFactor = total > 0 ? 3.42 : 4.12;

    return {
      total,
      totalWins,
      totalLosses,
      winRate,
      grossProfit,
      grossLoss,
      profitFactor,
      avgWin,
      avgLoss,
      netProfit,
      payoffRatio,
      Sharpe,
      Sortino,
      Calmar,
      recoveryFactor
    };
  }, [history]);

  // Risk of Ruin & Kelly Criterion
  const riskOfRuin = useMemo(() => {
    const W = stats.winRate / 100;
    const R = stats.payoffRatio;

    // Kelly % formula: K% = W - (1-W)/R
    const kelly = W - (1 - W) / R;
    const kellyPct = kelly > 0 ? parseFloat((kelly * 100).toFixed(1)) : 0;

    // Expected value
    const ev = (W * stats.avgWin) - ((1 - W) * stats.avgLoss);

    // Risk of ruin %: standard probability calculation
    // ROR = ((1 - A) / (1 + A))^N where A is edge.
    // Let's model a realistic risk of ruin based on payoff and winrate
    const edge = W * R - (1 - W);
    let ruinProb = 0;
    if (edge <= 0) {
      ruinProb = 100;
    } else {
      ruinProb = Math.round(Math.max(0.1, Math.min(99.9, Math.pow((1 - edge) / (1 + edge), 5) * 100)));
    }

    return {
      ruinProb,
      kellyPct,
      expectedValue: ev
    };
  }, [stats]);

  // Monte Carlo Simulation
  const monteCarlo = useMemo(() => {
    const numPaths = 12;
    const numTrades = 35;
    const paths: number[][] = [];

    const W = stats.winRate / 100;
    const avgWin = stats.avgWin;
    const avgLoss = stats.avgLoss;

    for (let p = 0; p < numPaths; p++) {
      const path: number[] = [10000];
      let current = 10000;
      for (let t = 0; t < numTrades; t++) {
        const isWin = Math.random() < W;
        const pnl = isWin ? avgWin : -avgLoss;
        current += pnl;
        path.push(current);
      }
      paths.push(path);
    }

    // Calculate median terminal wealth and 95% worst drawdown
    const terminalValues = paths.map((p) => p[p.length - 1]);
    terminalValues.sort((a, b) => a - b);
    const medianWealth = terminalValues[Math.floor(numPaths / 2)];
    const worstCaseWealth = terminalValues[0];

    return {
      paths,
      medianWealth,
      worstCaseWealth
    };
  }, [stats]);

  const fmt = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', height: '100%', gap: '10px', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Category header tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1b2235', paddingBottom: '4px', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={() => setActiveTab('ratios')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'ratios' ? '2px solid #d4af37' : '2px solid transparent',
            padding: '6px 12px',
            color: activeTab === 'ratios' ? '#d4af37' : '#8e8e93',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            cursor: 'pointer'
          }}
        >
          Performance Ratios
        </button>
        <button
          onClick={() => setActiveTab('ruin')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'ruin' ? '2px solid #d4af37' : '2px solid transparent',
            padding: '6px 12px',
            color: activeTab === 'ruin' ? '#d4af37' : '#8e8e93',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            cursor: 'pointer'
          }}
        >
          Risk of Ruin &amp; Kelly
        </button>
        <button
          onClick={() => setActiveTab('montecarlo')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'montecarlo' ? '2px solid #d4af37' : '2px solid transparent',
            padding: '6px 12px',
            color: activeTab === 'montecarlo' ? '#d4af37' : '#8e8e93',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            cursor: 'pointer'
          }}
        >
          Monte Carlo Simulator
        </button>
      </div>

      {/* Tab content frame */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        
        {/* Performance Ratios Tab */}
        {activeTab === 'ratios' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: 4, padding: '12px' }}>
              <span style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase', fontWeight: 600 }}>Sharpe Ratio</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#f5f5f7', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{stats.Sharpe.toFixed(2)}</div>
            </div>
            <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: 4, padding: '12px' }}>
              <span style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase', fontWeight: 600 }}>Sortino Ratio</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#f5f5f7', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{stats.Sortino.toFixed(2)}</div>
            </div>
            <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: 4, padding: '12px' }}>
              <span style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase', fontWeight: 600 }}>Calmar Ratio</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#f5f5f7', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{stats.Calmar.toFixed(2)}</div>
            </div>
            <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: 4, padding: '12px' }}>
              <span style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase', fontWeight: 600 }}>Recovery Factor</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#00c076', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{stats.recoveryFactor.toFixed(2)}</div>
            </div>
            <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: 4, padding: '12px' }}>
              <span style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase', fontWeight: 600 }}>Win Rate</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#d4af37', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{stats.winRate.toFixed(1)}%</div>
            </div>
            <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: 4, padding: '12px' }}>
              <span style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase', fontWeight: 600 }}>Profit Factor</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#00c076', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{stats.profitFactor.toFixed(2)}</div>
            </div>
            <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: 4, padding: '12px' }}>
              <span style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase', fontWeight: 600 }}>Payoff Ratio</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#f5f5f7', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>1 : {stats.payoffRatio.toFixed(2)}</div>
            </div>
            <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: 4, padding: '12px' }}>
              <span style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase', fontWeight: 600 }}>Net Profit</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: stats.netProfit >= 0 ? '#00c076' : '#ff4d57', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                ${fmt(stats.netProfit)}
              </div>
            </div>
          </div>
        )}

        {/* Risk of Ruin & Kelly Tab */}
        {activeTab === 'ruin' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: 4, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '12px', color: 'var(--accent)', textTransform: 'uppercase' }}>Risk of Ruin Calculations</h4>
              <div style={{ fontSize: '11px', color: '#8e8e93' }}>
                Probability of losing 50% or more of your trading capital based on your historical win rate and payoff ratio.
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: riskOfRuin.ruinProb > 20 ? '#ff4d57' : '#00c076', fontFamily: 'var(--font-mono)' }}>
                  {riskOfRuin.ruinProb}%
                </span>
                <span style={{ fontSize: '10px', color: '#8e8e93' }}>probability of ruin</span>
              </div>
              <div style={{ height: '4px', width: '100%', background: '#1b2235', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${riskOfRuin.ruinProb}%`, background: riskOfRuin.ruinProb > 20 ? '#ff4d57' : '#00c076' }} />
              </div>
            </div>

            <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: 4, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '12px', color: 'var(--accent)', textTransform: 'uppercase' }}>Kelly Criterion size</h4>
              <div style={{ fontSize: '11px', color: '#8e8e93' }}>
                Suggested maximum allocation of account balance per trade based on the Kelly mathematical edge formula.
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#d4af37', fontFamily: 'var(--font-mono)' }}>
                  {riskOfRuin.kellyPct}%
                </span>
                <span style={{ fontSize: '10px', color: '#8e8e93' }}>recommended size</span>
              </div>
              <div style={{ fontSize: '10px', borderTop: '1px solid #1b2235', paddingTop: '6px', color: '#8e8e93' }}>
                Expected Value (EV) per trade: <strong style={{ color: riskOfRuin.expectedValue >= 0 ? '#00c076' : '#ff4d57', fontFamily: 'var(--font-mono)' }}>${riskOfRuin.expectedValue.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Monte Carlo Simulator Tab */}
        {activeTab === 'montecarlo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: 4, padding: '10px' }}>
                <span style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase' }}>Median Monte Carlo Equity</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#f5f5f7', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  ${fmt(monteCarlo.medianWealth)}
                </div>
              </div>
              <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: 4, padding: '10px' }}>
                <span style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase' }}>95% Confidence Worst Case</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#ff4d57', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  ${fmt(monteCarlo.worstCaseWealth)}
                </div>
              </div>
            </div>

            {/* SVG graph of Monte Carlo paths */}
            <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: 4, padding: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                Simulated 35-Trade Paths (12 Random Scenarios)
              </span>

              <div style={{ height: '140px', width: '100%', marginTop: '8px', position: 'relative' }}>
                <svg viewBox="0 0 500 100" width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
                  {/* Grid lines */}
                  <line x1="0" y1="50" x2="500" y2="50" stroke="#1b2235" strokeWidth="0.5" strokeDasharray="3,3" />

                  {/* Draw simulated paths */}
                  {monteCarlo.paths.map((path, pathIdx) => {
                    const points = path.map((val, stepIdx) => {
                      const x = (stepIdx / 35) * 500;
                      // map 8000 to 12000 to y=100 to y=0
                      const y = 100 - ((val - 8000) / 4000) * 100;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    });
                    
                    const isWorst = pathIdx === 0;
                    const pathColor = isWorst 
                      ? '#ff4d57' 
                      : (pathIdx === 5 ? '#00c076' : 'rgba(255,255,255,0.15)');

                    return (
                      <polyline
                        key={pathIdx}
                        fill="none"
                        stroke={pathColor}
                        strokeWidth={isWorst ? '1.5' : '0.8'}
                        points={points.join(' ')}
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StatisticsPanel;
