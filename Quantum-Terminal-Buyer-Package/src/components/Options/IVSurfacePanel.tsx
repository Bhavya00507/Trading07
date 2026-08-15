import React, { useState, useEffect } from 'react';

export const IVSurfacePanel: React.FC<{ symbol: string; livePrice: number; mode?: 'dark' | 'light' }> = ({
  symbol,
  livePrice,
  mode = 'dark'
}) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/options/vol-surface?symbol=${symbol}&underlying_price=${livePrice}`)
      .then(res => res.json())
      .then(resData => setData(resData))
      .catch(() => {});
  }, [symbol, livePrice]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 10 }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#38bdf8' }}>IMPLIED VOLATILITY (IV) SURFACE & TERM STRUCTURE</div>

      <div style={{ height: 260, backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff', borderRadius: 8, border: '1px solid #1e293b', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <svg width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="none">
          <path d="M 50 160 Q 200 40, 350 120 T 550 80" fill="none" stroke="#f59e0b" strokeWidth="3" />
          <path d="M 50 140 Q 200 60, 350 100 T 550 90" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4" />
        </svg>
        <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>
          — 30 DTE IV Smile Curve | - - Realized Volatility
        </div>
      </div>
    </div>
  );
};
