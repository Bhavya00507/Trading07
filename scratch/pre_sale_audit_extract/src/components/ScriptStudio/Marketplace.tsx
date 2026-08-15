import React, { useState, useEffect } from 'react';

export const Marketplace: React.FC<{ onInstall: (id: string) => void }> = ({ onInstall }) => {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/scripts/marketplace')
      .then(res => res.json())
      .then(d => setItems(d.marketplace_scripts || []))
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 10, color: '#e2e8f0' }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#f59e0b' }}>🌐 QUANTUM SCRIPT COMMUNITY MARKETPLACE</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {items.map((item) => (
          <div key={item.id} style={{ padding: 12, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: 11 }}>{item.name}</span>
              <span style={{ color: '#f59e0b', fontSize: 9 }}>★ {item.rating}</span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 9 }}>{item.description || 'Community algorithmic trading script'}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{ color: '#64748b', fontSize: 9 }}>By {item.author} ({item.downloads} DLs)</span>
              <button onClick={() => onInstall(item.id)} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', backgroundColor: '#f59e0b', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}>
                Install Script
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
