import React, { useState, useEffect } from 'react';

export const OptionBacktestPanel: React.FC<{ symbol: string; livePrice: number; mode?: 'dark' | 'light' }> = ({
  symbol,
  livePrice,
  mode = 'dark'
}) => {
  const [daysSimulated, setDaysSimulated] = useState<number>(30);
  const [backtestData, setBacktestData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/options/backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        underlyingPrice: livePrice,
        daysSimulated,
        legs: [
          { strike: Math.round(livePrice), type: 'call', action: 'buy', quantity: 1, premium: 12.0 },
          { strike: Math.round(livePrice * 1.05), type: 'call', action: 'sell', quantity: 1, premium: 5.0 }
        ]
      })
    })
      .then(res => res.json())
      .then(d => setBacktestData(d))
      .catch(() => {});
  }, [livePrice, daysSimulated]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, fontSize: 12, color: '#38bdf8' }}>OPTIONS STRATEGY BACKTEST & THETA DECAY SIMULATOR</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Days Simulated:</span>
          {[7, 14, 30, 60, 90].map(d => (
            <button
              key={d}
              onClick={() => setDaysSimulated(d)}
              style={{
                padding: '3px 6px', borderRadius: 3, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                backgroundColor: daysSimulated === d ? '#38bdf8' : '#1e293b',
                color: daysSimulated === d ? '#0f172a' : '#fff'
              }}
            >
              {d}D
            </button>
          ))}
        </div>
      </div>

      {backtestData && (
        <div style={{ border: '1px solid #1e293b', borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #1e293b' }}>
                <th style={{ padding: 6 }}>Day</th>
                <th>DTE Remaining</th>
                <th>Theta Decay %</th>
                <th>PnL Evolution ($)</th>
              </tr>
            </thead>
            <tbody>
              {backtestData.timeline?.map((step: any) => (
                <tr key={step.day} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: 6, fontWeight: 700 }}>Day #{step.day}</td>
                  <td>{step.dte_remaining} DTE</td>
                  <td style={{ color: '#ef4444' }}>-{step.theta_decay_pct}%</td>
                  <td style={{ fontWeight: 800, color: step.pnl_evolution >= 0 ? '#10b981' : '#ef4444' }}>
                    ${step.pnl_evolution}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
