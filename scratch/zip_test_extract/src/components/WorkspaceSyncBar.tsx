import React from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';

export const WorkspaceSyncBar: React.FC = () => {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const syncStatus = useWorkspaceStore((s) => s.syncStatus);
  const lastSavedAt = useWorkspaceStore((s) => s.lastSavedAt);
  const setManagerOpen = useWorkspaceStore((s) => s.setManagerOpen);

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'synced': return '#10b981';
      case 'saving': return '#f59e0b';
      case 'syncing': return '#38bdf8';
      case 'offline': return '#94a3b8';
      case 'error': return '#ef4444';
      default: return '#10b981';
    }
  };

  const formatLastSaved = () => {
    if (!lastSavedAt) return 'Never';
    const diffSec = Math.round((Date.now() - lastSavedAt) / 1000);
    if (diffSec < 5) return 'Just now';
    return `${diffSec}s ago`;
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '2px 8px',
      backgroundColor: '#0f172a', borderRadius: 4, border: '1px solid #1e293b', fontSize: 10, color: '#e2e8f0'
    }}>
      {/* Cloud Sync Icon */}
      <span style={{ color: getStatusColor(), fontSize: 12 }} title={`Cloud Sync: ${syncStatus.toUpperCase()}`}>
        {syncStatus === 'saving' || syncStatus === 'syncing' ? '🔄' : (syncStatus === 'offline' ? '📡' : '☁️')}
      </span>

      {/* Workspace Name */}
      <span style={{ fontWeight: 700, color: '#38bdf8' }}>
        {currentWorkspace?.name || 'Default Workspace'}
      </span>

      {/* Sync Status Badge */}
      <span style={{ color: '#64748b', fontSize: 9 }}>
        Saved {formatLastSaved()}
      </span>

      {/* Workspace Manager Trigger Button */}
      <button
        onClick={() => setManagerOpen(true)}
        style={{
          padding: '2px 6px', borderRadius: 3, border: 'none', cursor: 'pointer',
          backgroundColor: '#1e293b', color: '#f59e0b', fontSize: 9, fontWeight: 800
        }}
      >
        ⚙️ Layouts
      </button>
    </div>
  );
};
