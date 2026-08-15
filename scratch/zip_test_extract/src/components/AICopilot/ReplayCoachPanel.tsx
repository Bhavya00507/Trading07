import React from 'react';

export const ReplayCoachPanel: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11, color: '#e2e8f0' }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#10b981' }}>🎬 HISTORICAL MARKET REPLAY COACH & MENTOR</div>
      <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b', lineHeight: 1.5 }}>
        Replay Coach (OpenAI GPT-5): During replay step #1,420, price tapped liquidity below $64,800 before a 400-point expansion. Ideal entry was scaling in at the VWAP delta reversal.
      </div>
    </div>
  );
};
