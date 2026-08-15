import React, { useState, useEffect } from 'react';

export const TemplateBrowser: React.FC<{ onSelectTemplate: (tpl: any) => void }> = ({ onSelectTemplate }) => {
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/scripts/marketplace')
      .then(res => res.json())
      .then(d => setTemplates(d.marketplace_scripts || []))
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 10, color: '#e2e8f0' }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#38bdf8' }}>OFFICIAL STARTER TEMPLATES LIBRARY</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {templates.map((tpl) => (
          <div key={tpl.id} style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: 11 }}>{tpl.name}</div>
            <div style={{ color: '#94a3b8', fontSize: 9 }}>{tpl.description}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{ color: '#a78bfa', fontSize: 9, fontWeight: 700 }}>{tpl.language.toUpperCase()}</span>
              <button onClick={() => onSelectTemplate(tpl)} style={{ padding: '3px 8px', borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}>
                Load Template
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
