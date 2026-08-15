import React, { useState, useEffect } from 'react';

export const OptionsAssistantPanel: React.FC<{ symbol: string; livePrice: number }> = ({ symbol, livePrice }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/ai/options-assistant?symbol=${symbol}&price=${livePrice}`)
      .then(res => res.json())
      .then(d => setData(d))
      .catch(() => {});
  }, [symbol, livePrice]);

  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11, color: '#e2e8f0' }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#38bdf8' }}>🎯 OPTIONS GREEKS & VOLATILITY ASSISTANT</div>

      <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
        {data.explanation}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div style={{ padding: 8, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>IV RANK / PERCENTILE</div>
          <div style={{ fontWeight: 800, color: '#f59e0b' }}>{data.iv_rank}% / {data.iv_percentile}%</div>
        </div>
        <div style={{ padding: 8, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>EXPECTED 30D MOVE</div>
          <div style={{ fontWeight: 800, color: '#10b981' }}>±{data.expected_move_30d}</div>
        </div>
        <div style={{ padding: 8, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>RECOMMENDED STRATEGY</div>
          <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 10 }}>{data.recommended_strategy}</div>
        </div>
      </div>
    </div>
  );
};
