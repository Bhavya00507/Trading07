import React from 'react';

export const GreeksPanel: React.FC<{ mode?: 'dark' | 'light' }> = ({ mode = 'dark' }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 10 }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#38bdf8' }}>BLACK-SCHOLES 1ST & 2ND ORDER GREEKS TELEMETRY</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>DELTA (Δ)</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>+0.5420</div>
          <div style={{ fontSize: 9, color: '#64748b' }}>Rate of change vs underlying</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>GAMMA (Γ)</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>+0.0185</div>
          <div style={{ fontSize: 9, color: '#64748b' }}>Rate of change of Delta</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>THETA (Θ)</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>-$14.50/day</div>
          <div style={{ fontSize: 9, color: '#64748b' }}>Daily time decay</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>VEGA (ν)</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>+$28.40/1% IV</div>
          <div style={{ fontSize: 9, color: '#64748b' }}>Sensitivity to IV shift</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>RHO (ρ)</div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>+0.0410</div>
          <div style={{ fontSize: 9, color: '#64748b' }}>Interest rate sensitivity</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>CHARM</div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>-0.0024</div>
          <div style={{ fontSize: 9, color: '#64748b' }}>Delta decay per day</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>VOMMA (Volga)</div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>+0.1450</div>
          <div style={{ fontSize: 9, color: '#64748b' }}>Vega sensitivity to IV</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8' }}>VANNA</div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>-0.0380</div>
          <div style={{ fontSize: 9, color: '#64748b' }}>Delta sensitivity to IV</div>
        </div>
      </div>
    </div>
  );
};
