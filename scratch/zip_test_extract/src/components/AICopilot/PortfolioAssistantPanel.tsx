import React, { useState, useEffect } from 'react';

export const PortfolioAssistantPanel: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/ai/portfolio-assistant?positions_count=4&total_equity=25000')
      .then(res => res.json())
      .then(d => setData(d))
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11, color: '#e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, fontSize: 12, color: '#38bdf8' }}>💼 PORTFOLIO RISK & CORRELATION ASSISTANT</span>
        <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#10b981', color: '#0f172a', fontWeight: 900, fontSize: 10 }}>
          Health Score: {data.portfolio_health_score}/100
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div style={{ padding: 8, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>MAX DRAWDOWN</div>
          <div style={{ fontWeight: 800, color: '#ef4444' }}>-{data.risk_exposure?.max_drawdown_pct}%</div>
        </div>
        <div style={{ padding: 8, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>VAR (95%)</div>
          <div style={{ fontWeight: 800, color: '#f59e0b' }}>{data.risk_exposure?.value_at_risk_95}</div>
        </div>
        <div style={{ padding: 8, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>BETA VS SPX</div>
          <div style={{ fontWeight: 800, color: '#38bdf8' }}>{data.risk_exposure?.beta_vs_spx}</div>
        </div>
      </div>

      <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
        <div style={{ color: '#f59e0b', fontWeight: 800, marginBottom: 4 }}>AI Optimization Recommendations:</div>
        {data.recommendations?.map((rec: string, idx: number) => (
          <div key={idx} style={{ color: '#cbd5e1', fontSize: 10, marginTop: 2 }}>• {rec}</div>
        ))}
      </div>
    </div>
  );
};
