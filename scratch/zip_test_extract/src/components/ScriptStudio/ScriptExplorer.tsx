import React from 'react';

export const ScriptExplorer: React.FC<{
  scripts: any[];
  activeScriptId: string;
  onSelectScript: (id: string) => void;
  onCreateNew: (type: string) => void;
}> = ({ scripts, activeScriptId, onSelectScript, onCreateNew }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 220, backgroundColor: '#090d16', borderRight: '1px solid #1e293b', padding: 10, fontSize: 10, color: '#e2e8f0' }}>
      <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>📂 SCRIPT EXPLORER</span>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => onCreateNew('indicator')} style={{ flex: 1, padding: 4, borderRadius: 3, border: 'none', backgroundColor: '#1e293b', color: '#38bdf8', fontWeight: 700, cursor: 'pointer', fontSize: 9 }}>
          + Indicator
        </button>
        <button onClick={() => onCreateNew('strategy')} style={{ flex: 1, padding: 4, borderRadius: 3, border: 'none', backgroundColor: '#1e293b', color: '#10b981', fontWeight: 700, cursor: 'pointer', fontSize: 9 }}>
          + Strategy
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1 }}>
        {scripts.map((s) => {
          const isActive = s.id === activeScriptId;
          const ext = s.language === 'qscript' ? '.qscript' : (s.script_type === 'indicator' ? '.pyindicator' : '.pystrategy');
          const icon = s.script_type === 'strategy' ? '📈' : '📊';

          return (
            <div
              key={s.id}
              onClick={() => onSelectScript(s.id)}
              style={{
                padding: '6px 8px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: isActive ? '#1e293b' : 'transparent',
                color: isActive ? '#f59e0b' : '#cbd5e1',
                borderLeft: isActive ? '3px solid #f59e0b' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                <span>{icon}</span>
                <span style={{ fontWeight: isActive ? 800 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
              </div>
              <span style={{ color: '#64748b', fontSize: 8 }}>{ext}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
