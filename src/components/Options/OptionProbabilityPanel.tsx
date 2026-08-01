import React, { useState, useEffect } from 'react';

export const OptionProbabilityPanel: React.FC<{ symbol: string; livePrice: number; mode?: 'dark' | 'light' }> = ({
  symbol,
  livePrice,
  mode = 'dark'
}) => {
  const [probData, setProbData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/options/probability?symbol=${symbol}&underlying_price=${livePrice}&strike=${livePrice}&expiry_days=30`)
      .then(res => res.json())
      .then(d => setProbData(d))
      .catch(() => {});
  }, [symbol, livePrice]);

  if (!probData) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 10 }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#38bdf8' }}>PROBABILITY ANALYSIS & EXPECTED MOVE (1σ, 2σ, 3σ)</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>PROBABILITY ITM</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>{probData.prob_itm_pct}%</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>PROBABILITY OTM</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#38bdf8' }}>{probData.prob_otm_pct}%</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>EXPECTED MOVE (±)</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#f59e0b' }}>${probData.expected_move}</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>IV RANK / PERCENTILE</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#a78bfa' }}>{probData.iv_rank}% / {probData.iv_percentile}%</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 }}>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontWeight: 700 }}>1-SIGMA RANGE (68.2%)</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#10b981', marginTop: 4 }}>
            ${probData.one_sigma_range[0]} — ${probData.one_sigma_range[1]}
          </div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontWeight: 700 }}>2-SIGMA RANGE (95.4%)</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>
            ${probData.two_sigma_range[0]} — ${probData.two_sigma_range[1]}
          </div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontWeight: 700 }}>3-SIGMA RANGE (99.7%)</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#ef4444', marginTop: 4 }}>
            ${probData.three_sigma_range[0]} — ${probData.three_sigma_range[1]}
          </div>
        </div>
      </div>
    </div>
  );
};
