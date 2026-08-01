import React, { useState, useEffect } from 'react';

export const PortfolioRiskLabPanel: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [mcResult, setMcResult] = useState<any>(null);
  const [kellyResult, setKellyResult] = useState<any>(null);
  const [winRate, setWinRate] = useState<number>(65);
  const [avgWin, setAvgWin] = useState<number>(450);
  const [avgLoss, setAvgLoss] = useState<number>(200);

  const fetchReport = () => {
    fetch('/api/portfolio-risk/report?equity=25000')
      .then(res => res.json())
      .then(d => {
        setReport(d);
        setMcResult(d.monte_carlo);
        setKellyResult(d.kelly_position_sizing);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleRunMonteCarlo = async () => {
    try {
      const res = await fetch('/api/portfolio-risk/monte-carlo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initial_equity: 25000, simulations_count: 1000, horizon_days: 252 })
      });
      if (res.ok) setMcResult(await res.json());
    } catch {}
  };

  const handleCalculateKelly = async () => {
    try {
      const res = await fetch('/api/portfolio-risk/kelly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ win_rate_pct: winRate, avg_win_usd: avgWin, avg_loss_usd: avgLoss, account_equity: 25000 })
      });
      if (res.ok) setKellyResult(await res.json());
    } catch {}
  };

  const handleExport = async (fmt: string) => {
    try {
      const res = await fetch(`/api/portfolio-risk/export/${fmt}`);
      if (res.ok) {
        const d = await res.json();
        alert(`Exported report: ${d.filename}`);
      }
    } catch {}
  };

  if (!report) return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#090d16',
      color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, padding: 16, gap: 14, overflowY: 'auto'
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 8 }}>
            💼 PORTFOLIO ANALYTICS & RISK LAB (v3.4)
          </span>
          <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
            Sharpe / Sortino Ratios | Monte Carlo Simulations | VaR & CVaR Models | Kelly Position Sizing | Stress Testing
          </div>
        </div>

        {/* Export Reports */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => handleExport('pdf')} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 10 }}>📄 PDF</button>
          <button onClick={() => handleExport('excel')} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#0f172a', fontWeight: 800, cursor: 'pointer', fontSize: 10 }}>📊 Excel</button>
          <button onClick={() => handleExport('csv')} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: '#38bdf8', color: '#0f172a', fontWeight: 800, cursor: 'pointer', fontSize: 10 }}>📑 CSV</button>
        </div>
      </div>

      {/* Institutional Ratios Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>SHARPE RATIO</div>
          <div style={{ fontWeight: 900, color: '#10b981', fontSize: 14 }}>{report.institutional_ratios?.sharpe_ratio}</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>SORTINO RATIO</div>
          <div style={{ fontWeight: 900, color: '#38bdf8', fontSize: 14 }}>{report.institutional_ratios?.sortino_ratio}</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>CALMAR RATIO</div>
          <div style={{ fontWeight: 900, color: '#f59e0b', fontSize: 14 }}>{report.institutional_ratios?.calmar_ratio}</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>ALPHA / BETA</div>
          <div style={{ fontWeight: 800, color: '#a78bfa', fontSize: 11 }}>+{report.institutional_ratios?.alpha}% / {report.institutional_ratios?.beta}</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>MAX DRAWDOWN</div>
          <div style={{ fontWeight: 800, color: '#ef4444', fontSize: 14 }}>{report.institutional_ratios?.max_drawdown_pct}%</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>ANNUAL RETURN</div>
          <div style={{ fontWeight: 900, color: '#10b981', fontSize: 14 }}>+{report.portfolio_summary?.annual_return_pct}%</div>
        </div>
      </div>

      {/* Monte Carlo & Value at Risk (VaR) Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Monte Carlo Simulation */}
        {mcResult && (
          <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 12, color: '#f59e0b' }}>🎲 MONTE CARLO PROJECTIONS (1,000 SIMS)</span>
              <button onClick={handleRunMonteCarlo} style={{ padding: '3px 8px', borderRadius: 4, border: 'none', backgroundColor: '#38bdf8', color: '#0f172a', fontWeight: 800, cursor: 'pointer', fontSize: 9 }}>Re-run</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 10 }}>
              <div style={{ padding: 6, backgroundColor: '#1e293b', borderRadius: 4 }}>Survival Prob: <strong style={{ color: '#10b981' }}>{mcResult.survival_probability_pct}%</strong></div>
              <div style={{ padding: 6, backgroundColor: '#1e293b', borderRadius: 4 }}>Median Equity: <strong style={{ color: '#38bdf8' }}>${mcResult.median_projected_equity}</strong></div>
              <div style={{ padding: 6, backgroundColor: '#1e293b', borderRadius: 4 }}>Worst 5% Case: <strong style={{ color: '#ef4444' }}>${mcResult.worst_case_5pct_equity}</strong></div>
            </div>
          </div>
        )}

        {/* Value at Risk (VaR) */}
        {report.value_at_risk && (
          <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 12, color: '#ef4444' }}>⚠️ VALUE AT RISK (VaR & CVaR EXPECTED SHORTFALL)</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 10 }}>
              <div style={{ padding: 6, backgroundColor: '#1e293b', borderRadius: 4 }}>VaR 95% Daily: <strong style={{ color: '#f59e0b' }}>-${report.value_at_risk.var_95_daily}</strong></div>
              <div style={{ padding: 6, backgroundColor: '#1e293b', borderRadius: 4 }}>VaR 99% Daily: <strong style={{ color: '#ef4444' }}>-${report.value_at_risk.var_99_daily}</strong></div>
              <div style={{ padding: 6, backgroundColor: '#1e293b', borderRadius: 4 }}>CVaR 95% Expected Shortfall: <strong style={{ color: '#ef4444' }}>-${report.value_at_risk.cvar_95_expected_shortfall}</strong></div>
              <div style={{ padding: 6, backgroundColor: '#1e293b', borderRadius: 4 }}>CVaR 99% Expected Shortfall: <strong style={{ color: '#ef4444' }}>-${report.value_at_risk.cvar_99_expected_shortfall}</strong></div>
            </div>
          </div>
        )}
      </div>

      {/* Kelly Criterion & Stress Testing Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Kelly Sizing */}
        {kellyResult && (
          <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 12, color: '#10b981' }}>📐 KELLY CRITERION & POSITION SIZING</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 9 }}>Win Rate %:</label>
                <input type="number" value={winRate} onChange={e => setWinRate(Number(e.target.value))} style={{ width: '100%', padding: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 9 }}>Avg Win ($):</label>
                <input type="number" value={avgWin} onChange={e => setAvgWin(Number(e.target.value))} style={{ width: '100%', padding: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 9 }}>Avg Loss ($):</label>
                <input type="number" value={avgLoss} onChange={e => setAvgLoss(Number(e.target.value))} style={{ width: '100%', padding: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
              </div>
            </div>
            <button onClick={handleCalculateKelly} style={{ padding: 4, borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#0f172a', fontWeight: 800, cursor: 'pointer', fontSize: 10 }}>Calculate Optimal Size</button>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 6, backgroundColor: '#1e293b', borderRadius: 4, fontSize: 10 }}>
              <span>Half Kelly Recommendation: <strong style={{ color: '#10b981' }}>{kellyResult.half_kelly_recommended_pct}% ({kellyResult.recommended_lot_size} Lots)</strong></span>
            </div>
          </div>
        )}

        {/* Stress Testing Table */}
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 12, color: '#f59e0b' }}>⚡ BLACK SWAN STRESS TESTING SCENARIOS</span>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ backgroundColor: '#111827', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: 4 }}>Scenario</th>
                <th style={{ padding: 4 }}>Impact %</th>
                <th style={{ padding: 4 }}>Loss ($)</th>
              </tr>
            </thead>
            <tbody>
              {report.stress_testing?.map((st: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: 4, fontWeight: 700 }}>{st.scenario}</td>
                  <td style={{ padding: 4, color: '#ef4444', fontWeight: 800 }}>{st.impact_pct}%</td>
                  <td style={{ padding: 4, color: '#ef4444' }}>-${st.loss_usd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
