import React from 'react';

export const PortfolioGreeksPanel: React.FC<{ mode?: 'dark' | 'light' }> = ({ mode = 'dark' }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 10 }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#38bdf8' }}>AGGREGATE PORTFOLIO GREEKS RISK DESK</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>Net Delta (Δ)</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>+145.20</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>Net Gamma (Γ)</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>+4.8500</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>Net Theta (Θ)</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>+$48.50/day</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>Net Vega (ν)</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>-$32.10/1% IV</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>Net Rho (ρ)</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>+12.40</div>
        </div>
      </div>
    </div>
  );
};
