import React, { useState, useEffect } from 'react';
import { WorkspaceSyncStatus } from './WorkspaceSyncStatus';
import { WorkspaceHistory } from './WorkspaceHistory';
import { WorkspaceShareDialog } from './WorkspaceShareDialog';
import { WorkspaceImportExport } from './WorkspaceImportExport';

export const WorkspaceManager: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('ws-sync-default');
  const [activeTab, setActiveTab] = useState<'workspaces' | 'history'>('workspaces');
  const [search, setSearch] = useState<string>('');
  const [newWsName, setNewWsName] = useState<string>('');
  const [shareWsId, setShareWsId] = useState<string | null>(null);
  const [conflictData, setConflictData] = useState<any | null>(null);

  const fetchWorkspaces = () => {
    fetch('/api/workspace-sync')
      .then(res => res.json())
      .then(d => {
        setWorkspaces(d.workspaces || []);
        if (d.workspaces?.length > 0 && !activeWorkspaceId) {
          setActiveWorkspaceId(d.workspaces[0].id);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen) fetchWorkspaces();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!newWsName.trim()) return;
    try {
      const res = await fetch('/api/workspace-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWsName.trim(),
          config_data: { theme: 'dark', timestamp: Date.now() }
        })
      });
      if (res.ok) {
        setNewWsName('');
        fetchWorkspaces();
      }
    } catch {}
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/workspace-sync/duplicate/${id}`, { method: 'POST' });
      if (res.ok) fetchWorkspaces();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/workspace-sync/${id}`, { method: 'DELETE' });
      if (res.ok) fetchWorkspaces();
    } catch {}
  };

  const handleRestore = async (versionNumber: number) => {
    try {
      const res = await fetch(`/api/workspace-sync/restore/${activeWorkspaceId}/${versionNumber}`, { method: 'POST' });
      if (res.ok) fetchWorkspaces();
    } catch {}
  };

  const handleImport = async (fileContent: string) => {
    try {
      const res = await fetch('/api/workspace-sync/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_content: fileContent })
      });
      if (res.ok) fetchWorkspaces();
    } catch {}
  };

  const handleResolveConflict = async (strategy: 'keep_local' | 'keep_cloud' | 'merge') => {
    try {
      const res = await fetch('/api/workspace-sync/conflict-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: activeWorkspaceId,
          strategy,
          local_config: { local_override: true, timestamp: Date.now() }
        })
      });
      if (res.ok) {
        setConflictData(null);
        fetchWorkspaces();
      }
    } catch {}
  };

  const filteredWorkspaces = workspaces.filter(w => w.name.toLowerCase().includes(search.toLowerCase()));
  const activeWs = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        width: 780, height: 540, backgroundColor: '#090d16', border: '1px solid #1e293b',
        borderRadius: 8, display: 'flex', flexDirection: 'column', color: '#e2e8f0',
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px',
          backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b'
        }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
            ☁️ CLOUD WORKSPACE SYNCHRONIZATION HUB (v2.6)
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <WorkspaceSyncStatus status="synced" />
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 16, cursor: 'pointer', fontWeight: 900 }}>✕</button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px',
          backgroundColor: '#111827', borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setActiveTab('workspaces')}
              style={{
                padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                backgroundColor: activeTab === 'workspaces' ? '#f59e0b' : '#1e293b',
                color: activeTab === 'workspaces' ? '#0f172a' : '#cbd5e1'
              }}
            >
              My Workspaces ({workspaces.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                backgroundColor: activeTab === 'history' ? '#f59e0b' : '#1e293b',
                color: activeTab === 'history' ? '#0f172a' : '#cbd5e1'
              }}
            >
              50-Version History
            </button>
          </div>

          {activeWs && (
            <WorkspaceImportExport
              workspaceId={activeWs.id}
              workspaceName={activeWs.name}
              onImport={handleImport}
            />
          )}
        </div>

        {/* Content View */}
        <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
          {activeTab === 'workspaces' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Search & Create Bar */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Search workspaces..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: 11 }}
                />
                <input
                  type="text"
                  placeholder="New Workspace Name..."
                  value={newWsName}
                  onChange={e => setNewWsName(e.target.value)}
                  style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: 11 }}
                />
                <button onClick={handleCreate} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                  + Create
                </button>
              </div>

              {/* Workspaces Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {filteredWorkspaces.map((ws) => {
                  const isActive = ws.id === activeWorkspaceId;
                  return (
                    <div key={ws.id} style={{
                      padding: 12, borderRadius: 6, backgroundColor: isActive ? '#0f172a' : '#111827',
                      border: isActive ? '2px solid #f59e0b' : '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 6
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 800, fontSize: 12, color: isActive ? '#f59e0b' : '#f8fafc' }}>
                          {ws.is_favorite ? '⭐ ' : ''}{ws.name}
                        </span>
                        <span style={{ fontSize: 9, color: '#64748b' }}>v{ws.version || 1}</span>
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: 10 }}>{ws.description || 'Cloud synced workspace layout'}</div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                        <button onClick={() => setActiveWorkspaceId(ws.id)} style={{ padding: '3px 8px', borderRadius: 3, border: 'none', backgroundColor: isActive ? '#f59e0b' : '#1e293b', color: isActive ? '#0f172a' : '#fff', fontWeight: 700, cursor: 'pointer' }}>
                          {isActive ? 'Active Workspace' : 'Load Workspace'}
                        </button>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => setShareWsId(ws.id)} style={{ padding: '3px 6px', borderRadius: 3, border: 'none', backgroundColor: '#1e293b', color: '#38bdf8', cursor: 'pointer' }}>🔗 Share</button>
                          <button onClick={() => handleDuplicate(ws.id)} style={{ padding: '3px 6px', borderRadius: 3, border: 'none', backgroundColor: '#1e293b', color: '#a78bfa', cursor: 'pointer' }}>📋 Copy</button>
                          <button onClick={() => handleDelete(ws.id)} style={{ padding: '3px 6px', borderRadius: 3, border: 'none', backgroundColor: '#1e293b', color: '#ef4444', cursor: 'pointer' }}>🗑️</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <WorkspaceHistory workspaceId={activeWorkspaceId} onRestore={handleRestore} />
          )}
        </div>
      </div>

      {shareWsId && <WorkspaceShareDialog workspaceId={shareWsId} onClose={() => setShareWsId(null)} />}

      {conflictData && (
        <div style={{ position: 'fixed', zIndex: 10001, padding: 20, borderRadius: 8, backgroundColor: '#090d16', border: '2px solid #ef4444', color: '#fff', width: 400 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#ef4444' }}>⚠️ CONFLICT DETECTED IN WORKSPACE</div>
          <div style={{ color: '#94a3b8', margin: '8px 0' }}>This workspace was modified on another device simultaneously. Choose a resolution:</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button onClick={() => handleResolveConflict('keep_local')} style={{ padding: 6, borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}>Keep Local</button>
            <button onClick={() => handleResolveConflict('keep_cloud')} style={{ padding: 6, borderRadius: 4, border: 'none', backgroundColor: '#38bdf8', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}>Keep Cloud</button>
            <button onClick={() => handleResolveConflict('merge')} style={{ padding: 6, borderRadius: 4, border: 'none', backgroundColor: '#f59e0b', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}>Merge</button>
          </div>
        </div>
      )}
    </div>
  );
};
