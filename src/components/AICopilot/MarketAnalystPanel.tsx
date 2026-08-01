import React, { useState, useEffect } from 'react';

export const MarketAnalystPanel: React.FC<{ symbol: string; livePrice: number }> = ({ symbol, livePrice }) => {
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/ai/market-analyst?symbol=${symbol}&price=${livePrice}&timeframe=15m`)
      .then(res => res.json())
      .then(d => setAnalysis(d))
      .catch(() => {});
  }, [symbol, livePrice]);

  if (!analysis) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11, color: '#e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, fontSize: 12, color: '#f59e0b' }}>📊 MARKET STRUCTURE & ORDER FLOW ANALYST</span>
        <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#10b981', color: '#0f172a', fontWeight: 900, fontSize: 10 }}>
          {analysis.bias} ({analysis.confidence_pct}%)
        </span>
      </div>

      <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b', lineHeight: '1.5' }}>
        {analysis.ai_summary}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div style={{ padding: 8, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>VWAP ANCHOR</div>
          <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 12 }}>${analysis.key_levels?.vwap}</div>
        </div>
        <div style={{ padding: 8, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>SUPPORT ZONE</div>
          <div style={{ fontWeight: 800, color: '#10b981', fontSize: 11 }}>${analysis.key_levels?.support[0]}</div>
        </div>
        <div style={{ padding: 8, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>RESISTANCE ZONE</div>
          <div style={{ fontWeight: 800, color: '#ef4444', fontSize: 11 }}>${analysis.key_levels?.resistance[0]}</div>
        </div>
      </div>
    </div>
  );
};
