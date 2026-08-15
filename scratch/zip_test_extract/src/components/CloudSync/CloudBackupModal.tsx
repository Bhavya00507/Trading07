import React, { useState, useEffect } from 'react';

export const CloudBackupModal: React.FC<{ isOpen: boolean; onClose: () => void; workspaceId: string }> = ({
  isOpen,
  onClose,
  workspaceId
}) => {
  const [backups, setBackups] = useState<any[]>([]);

  const fetchBackups = () => {
    fetch(`/api/workspace-sync/backups/${workspaceId}`)
      .then(res => res.json())
      .then(d => setBackups(d.backups || []))
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen) fetchBackups();
  }, [isOpen, workspaceId]);

  if (!isOpen) return null;

  const handleCreateManualBackup = async () => {
    try {
      await fetch('/api/workspace-sync/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, backup_type: 'MANUAL' })
      });
      fetchBackups();
    } catch {}
  };

  const handleRestoreBackup = async (backupId: string) => {
    try {
      await fetch('/api/workspace-sync/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, backup_id: backupId })
      });
      onClose();
    } catch {}
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        width: 680, backgroundColor: '#090d16', border: '1px solid #1e293b',
        borderRadius: 8, display: 'flex', flexDirection: 'column', color: '#e2e8f0',
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, padding: 16, gap: 14
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#f59e0b' }}>
            💾 CLOUD BACKUPS & VERSION HISTORY
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={handleCreateManualBackup} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#0f172a', fontWeight: 800, cursor: 'pointer', fontSize: 10 }}>
              + Create Manual Backup
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 16, cursor: 'pointer', fontWeight: 900 }}>✕</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
          {backups.map((b) => (
            <div key={b.backup_id} style={{
              padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontWeight: 800, color: '#38bdf8' }}>Version #{b.version_number} ({b.backup_type})</span>
                <div style={{ color: '#94a3b8', fontSize: 9, marginTop: 2 }}>
                  Backed up on {new Date(b.timestamp * 1000).toLocaleString()}
                </div>
              </div>

              <button onClick={() => handleRestoreBackup(b.backup_id)} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', backgroundColor: '#f59e0b', color: '#0f172a', fontWeight: 800, cursor: 'pointer', fontSize: 10 }}>
                Rollback to this Version
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
