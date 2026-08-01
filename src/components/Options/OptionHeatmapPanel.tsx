import React, { useState, useEffect } from 'react';

export const OptionHeatmapPanel: React.FC<{ symbol: string; livePrice: number; mode?: 'dark' | 'light' }> = ({
  symbol,
  livePrice,
  mode = 'dark'
}) => {
  const [metric, setMetric] = useState<'volume' | 'open_interest' | 'gamma' | 'delta'>('volume');
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/options/heatmap?symbol=${symbol}&underlying_price=${livePrice}`)
      .then(res => res.json())
      .then(d => setData(d.heatmaps || []))
      .catch(() => {});
  }, [symbol, livePrice]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, fontSize: 12, color: '#f59e0b' }}>OPTIONS STRIKE & GREEKS HEATMAP</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['volume', 'open_interest', 'gamma', 'delta'].map(m => (
            <button
              key={m}
              onClick={() => setMetric(m as any)}
              style={{
                padding: '3px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                backgroundColor: metric === m ? '#f59e0b' : '#1e293b',
                color: metric === m ? '#0f172a' : '#fff'
              }}
            >
              {m.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {data.map(item => {
          const val = item[metric];
          const intensity = metric === 'gamma' ? Math.min(1.0, val * 20) : (metric === 'delta' ? val : item.intensity);

          return (
            <div key={item.strike} style={{
              padding: 10, borderRadius: 6,
              backgroundColor: item.is_atm ? 'rgba(245, 158, 11, 0.3)' : `rgba(56, 189, 248, ${Math.max(0.1, intensity)})`,
              border: item.is_atm ? '2px solid #f59e0b' : '1px solid #1e293b',
              color: '#fff', textAlign: 'center'
            }}>
              <div style={{ fontWeight: 800, fontSize: 11 }}>${item.strike} {item.is_atm ? 'ATM' : ''}</div>
              <div style={{ fontSize: 13, fontWeight: 900, marginTop: 4 }}>
                {metric === 'gamma' || metric === 'delta' ? val : val.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
