import React, { useState, useEffect } from 'react';

export const WorkspaceHistory: React.FC<{ workspaceId: string; onRestore: (versionNumber: number) => void }> = ({
  workspaceId,
  onRestore
}) => {
  const [versions, setVersions] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/workspace-sync/history/${workspaceId}`)
      .then(res => res.json())
      .then(d => setVersions(d.versions || []))
      .catch(() => {});
  }, [workspaceId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 10, color: '#e2e8f0' }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#f59e0b' }}>
        VERSION HISTORY TIMELINE (LAST 50 VERSIONS)
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
        {versions.map((ver) => (
          <div key={ver.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8,
            borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b'
          }}>
            <div>
              <span style={{ fontWeight: 800, color: '#38bdf8' }}>Version #{ver.version_number}</span>
              <span style={{ color: '#94a3b8', marginLeft: 8 }}>
                Saved: {new Date(ver.timestamp * 1000).toLocaleString()} ({ver.device_id})
              </span>
            </div>
            <button
              onClick={() => onRestore(ver.version_number)}
              style={{
                padding: '3px 8px', borderRadius: 4, border: 'none', backgroundColor: '#f59e0b',
                color: '#0f172a', fontWeight: 800, cursor: 'pointer', fontSize: 10
              }}
            >
              Restore v{ver.version_number}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
