import React, { useState, useEffect } from 'react';

export const InstitutionalScannerPanel: React.FC = () => {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [assetClass, setAssetClass] = useState<string>('ALL');
  const [minScore, setMinScore] = useState<number>(75);

  const fetchOpportunities = () => {
    fetch('/api/institutional-scanner/opportunities?limit=20')
      .then(res => res.json())
      .then(d => setOpportunities(d.opportunities || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchOpportunities();
    const interval = setInterval(fetchOpportunities, 4000);
    return () => clearInterval(interval);
  }, []);

  const filtered = opportunities.filter(o => o.score >= minScore);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#090d16',
      color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, padding: 16, gap: 14, overflowY: 'auto'
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
            🎯 INSTITUTIONAL SCANNER (AI + SMC + FOOTPRINT + DOM) (v3.3)
          </span>
          <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
            Real-Time Multi-Timeframe Confluence | Smart Money Concepts (BOS / CHOCH / FVG / OB) | Footprint Cumulative Delta
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 9, marginRight: 4 }}>Asset Class:</label>
            <select value={assetClass} onChange={e => setAssetClass(e.target.value)} style={{ padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: 10 }}>
              <option value="ALL">All Asset Classes</option>
              <option value="Crypto">Crypto</option>
              <option value="Forex">Forex</option>
              <option value="Futures">Futures</option>
              <option value="Stocks">Stocks</option>
            </select>
          </div>

          <div>
            <label style={{ color: '#94a3b8', fontSize: 9, marginRight: 4 }}>Min Score ({minScore}):</label>
            <input type="range" min="50" max="95" value={minScore} onChange={e => setMinScore(Number(e.target.value))} style={{ cursor: 'pointer' }} />
          </div>
        </div>
      </div>

      {/* Opportunities Table */}
      <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 12, color: '#38bdf8' }}>
          🔥 RANKED HIGH-PROBABILITY INSTITUTIONAL OPPORTUNITIES ({filtered.length})
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr style={{ backgroundColor: '#111827', color: '#94a3b8', textAlign: 'left' }}>
              <th style={{ padding: 6 }}>Score</th>
              <th style={{ padding: 6 }}>Symbol</th>
              <th style={{ padding: 6 }}>Price</th>
              <th style={{ padding: 6 }}>SMC Pattern</th>
              <th style={{ padding: 6 }}>Footprint Delta</th>
              <th style={{ padding: 6 }}>DOM Liquidity</th>
              <th style={{ padding: 6 }}>MTF Confluence</th>
              <th style={{ padding: 6 }}>Entry / SL / TP</th>
              <th style={{ padding: 6 }}>AI R:R</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((opp) => (
              <tr key={opp.opportunity_id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: 6 }}>
                  <span style={{
                    padding: '2px 6px', borderRadius: 3, fontWeight: 900, fontSize: 10,
                    backgroundColor: opp.score >= 85 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: opp.score >= 85 ? '#10b981' : '#f59e0b'
                  }}>
                    {opp.score}
                  </span>
                </td>
                <td style={{ padding: 6, fontWeight: 800, color: '#f8fafc' }}>{opp.symbol}</td>
                <td style={{ padding: 6, fontWeight: 700 }}>${opp.price}</td>
                <td style={{ padding: 6, color: '#a78bfa', fontWeight: 700 }}>
                  {opp.smc_patterns?.smc_signal} ({opp.smc_patterns?.structure})
                </td>
                <td style={{ padding: 6, color: '#10b981' }}>{opp.orderflow_analytics?.cumulative_delta}</td>
                <td style={{ padding: 6, color: '#38bdf8' }}>
                  Wall @ ${opp.orderflow_analytics?.dom_liquidity_wall?.price}
                </td>
                <td style={{ padding: 6, fontWeight: 700, color: '#10b981' }}>{opp.multi_timeframe?.confluence_score_pct}% MTF</td>
                <td style={{ padding: 6, fontSize: 9, color: '#cbd5e1' }}>
                  E: ${opp.suggested_entry} | SL: ${opp.stop_loss} | TP: ${opp.take_profit_1}
                </td>
                <td style={{ padding: 6, fontWeight: 800, color: '#f59e0b' }}>1:{opp.risk_reward_ratio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
