import React, { useState, useEffect } from 'react';

export const ScannerPanel: React.FC<{ mode?: 'dark' | 'light' }> = ({ mode = 'dark' }) => {
  const [criteria, setCriteria] = useState<string>('unusual_volume');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/options/scan?criteria=${criteria}`)
      .then(res => res.json())
      .then(data => setResults(data.results || []))
      .catch(() => {});
  }, [criteria]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontWeight: 800, fontSize: 12, color: '#f59e0b' }}>INSTITUTIONAL OPTION SCANNER:</span>
        {['unusual_volume', 'gamma_squeeze', 'highest_iv', 'lowest_iv'].map(c => (
          <button
            key={c}
            onClick={() => setCriteria(c)}
            style={{
              padding: '3px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
              backgroundColor: criteria === c ? '#f59e0b' : '#1e293b',
              color: criteria === c ? '#0f172a' : '#fff'
            }}
          >
            {c.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #1e293b' }}>
            <th style={{ padding: 6 }}>Symbol</th><th>Price</th><th>Category</th><th>IV Rank</th><th>Unusual Vol</th><th>Trade Idea</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: 6, fontWeight: 800, color: '#38bdf8' }}>{r.symbol}</td>
              <td>${r.underlying_price}</td>
              <td><span style={{ padding: '2px 4px', borderRadius: 3, backgroundColor: '#1e293b', color: '#f59e0b', fontSize: 9 }}>{r.scan_category}</span></td>
              <td>{r.iv_rank}%</td>
              <td>{r.volume.toLocaleString()}</td>
              <td style={{ color: '#10b981', fontWeight: 700 }}>{r.recommended_strategy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
