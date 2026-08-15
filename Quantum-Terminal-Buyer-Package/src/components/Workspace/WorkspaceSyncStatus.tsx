import React, { useState, useEffect } from 'react';

export interface WorkspaceSyncStatusProps {
  status?: 'synced' | 'saving' | 'syncing' | 'offline' | 'conflict' | 'error';
  lastSavedAt?: number | null;
  onOpenManager?: () => void;
}

export const WorkspaceSyncStatus: React.FC<WorkspaceSyncStatusProps> = ({
  status = 'synced',
  lastSavedAt = Date.now(),
  onOpenManager
}) => {
  const [deviceId, setDeviceId] = useState<string>('Desktop Web');

  useEffect(() => {
    const isDesktop = window.navigator.userAgent.includes('Electron');
    setDeviceId(isDesktop ? 'Desktop App' : 'Browser Web');
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'synced': return '#10b981';
      case 'saving': return '#f59e0b';
      case 'syncing': return '#38bdf8';
      case 'offline': return '#94a3b8';
      case 'conflict': return '#ef4444';
      default: return '#10b981';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'synced': return 'Saved';
      case 'saving': return 'Saving...';
      case 'syncing': return 'Syncing...';
      case 'offline': return 'Offline Mode';
      case 'conflict': return 'Conflict';
      default: return 'Saved';
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '3px 10px',
      backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
      borderRadius: 6, border: '1px solid #1e293b', fontSize: 10, color: '#f8fafc'
    }}>
      <span style={{ color: getStatusColor(), fontSize: 12 }} title={`Cloud Sync Status: ${status.toUpperCase()}`}>
        {status === 'saving' || status === 'syncing' ? '🔄' : (status === 'conflict' ? '⚠️' : (status === 'offline' ? '📡' : '☁️'))}
      </span>

      <span style={{ fontWeight: 800, color: getStatusColor() }}>
        {getStatusLabel()}
      </span>

      <span style={{ color: '#64748b', fontSize: 9 }}>
        ({deviceId})
      </span>

      {onOpenManager && (
        <button
          onClick={onOpenManager}
          style={{
            padding: '2px 6px', borderRadius: 4, border: 'none', cursor: 'pointer',
            backgroundColor: '#1e293b', color: '#f59e0b', fontSize: 9, fontWeight: 800
          }}
        >
          ⚙️ Workspaces
        </button>
      )}
    </div>
  );
};
