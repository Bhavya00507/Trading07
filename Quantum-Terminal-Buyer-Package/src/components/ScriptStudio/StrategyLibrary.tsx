import React from 'react';

export const StrategyLibrary: React.FC<{ scripts: any[]; onSelect: (s: any) => void }> = ({ scripts, onSelect }) => {
  const strategies = scripts.filter(s => s.script_type === 'strategy' || s.script_type === 'pystrategy');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 10 }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#10b981' }}>QUANTITATIVE STRATEGY RUNTIME LIBRARY ({strategies.length})</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {strategies.map((strat) => (
          <div key={strat.id} style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: '#10b981', fontSize: 11 }}>📈 {strat.name}</span>
              <span style={{ fontSize: 9, color: '#64748b' }}>v{strat.version || 1}</span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 9 }}>{strat.description || 'Automated Quantitative Trading Strategy'}</div>
            <button onClick={() => onSelect(strat)} style={{ marginTop: 6, padding: '3px 8px', borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}>
              Run Strategy Backtest
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
