import React from 'react';

export interface PayoffGraphProps {
  payoffData: any;
  mode?: 'dark' | 'light';
}

export const PayoffGraph: React.FC<PayoffGraphProps> = ({ payoffData, mode = 'dark' }) => {
  if (!payoffData) {
    return <div style={{ fontSize: 10, color: '#64748b' }}>Select option legs to compute risk graph...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Metrics Header Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, fontSize: 10 }}>
        <div style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', padding: 6, borderRadius: 4 }}>
          <div style={{ color: '#94a3b8' }}>Max Profit</div>
          <div style={{ fontWeight: 800, color: '#10b981' }}>${payoffData.max_profit}</div>
        </div>
        <div style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', padding: 6, borderRadius: 4 }}>
          <div style={{ color: '#94a3b8' }}>Max Loss</div>
          <div style={{ fontWeight: 800, color: '#ef4444' }}>${payoffData.max_loss}</div>
        </div>
        <div style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', padding: 6, borderRadius: 4 }}>
          <div style={{ color: '#94a3b8' }}>POP (%)</div>
          <div style={{ fontWeight: 800, color: '#f59e0b' }}>{payoffData.probability_of_profit_pct}%</div>
        </div>
        <div style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', padding: 6, borderRadius: 4 }}>
          <div style={{ color: '#94a3b8' }}>Net Debit/Credit</div>
          <div style={{ fontWeight: 800 }}>${payoffData.net_credit_debit}</div>
        </div>
      </div>

      {/* SVG Payoff Curve Canvas */}
      <div style={{ flex: 1, minHeight: 180, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="100%" height="100%" viewBox="0 0 500 180" preserveAspectRatio="none">
          <line x1="0" y1="90" x2="500" y2="90" stroke="#475569" strokeDasharray="3" />
          <path d="M 0 160 L 180 160 L 320 20 L 500 20" fill="none" stroke="#10b981" strokeWidth="3" />
        </svg>
      </div>
    </div>
  );
};
