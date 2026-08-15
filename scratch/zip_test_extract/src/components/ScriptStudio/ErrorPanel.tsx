import React from 'react';

export const ErrorPanel: React.FC<{ errors: string[]; warnings: string[] }> = ({ errors, warnings }) => {
  if (!errors.length && !warnings.length) {
    return (
      <div style={{ color: '#10b981', fontSize: 10, padding: 8, backgroundColor: '#0f172a', borderRadius: 4, border: '1px solid #1e293b' }}>
        ✓ 0 Errors, 0 Warnings — Script compiled clean!
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10 }}>
      {errors.map((err, idx) => (
        <div key={idx} style={{ padding: 6, borderRadius: 4, backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5' }}>
          ❌ {err}
        </div>
      ))}
      {warnings.map((warn, idx) => (
        <div key={idx} style={{ padding: 6, borderRadius: 4, backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', color: '#fde68a' }}>
          ⚠️ {warn}
        </div>
      ))}
    </div>
  );
};
