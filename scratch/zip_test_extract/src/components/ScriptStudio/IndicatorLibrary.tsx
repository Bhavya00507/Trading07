import React from 'react';

export const IndicatorLibrary: React.FC<{ scripts: any[]; onSelect: (s: any) => void }> = ({ scripts, onSelect }) => {
  const indicators = scripts.filter(s => s.script_type === 'indicator' || s.script_type === 'pyindicator');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 10 }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#38bdf8' }}>CUSTOM & BUILT-IN INDICATOR LIBRARY ({indicators.length})</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {indicators.map((ind) => (
          <div key={ind.id} style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: 11 }}>📊 {ind.name}</span>
              <span style={{ fontSize: 9, color: '#64748b' }}>v{ind.version || 1}</span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 9 }}>{ind.description || 'Custom Technical Analysis Indicator'}</div>
            <button onClick={() => onSelect(ind)} style={{ marginTop: 6, padding: '3px 8px', borderRadius: 4, border: 'none', backgroundColor: '#38bdf8', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}>
              Edit in Studio
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
