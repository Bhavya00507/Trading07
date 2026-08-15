import React, { useState } from 'react';
import { useWorkspaceStore, WorkspaceItem } from '../store/workspaceStore';

export const WorkspaceManagerModal: React.FC = () => {
  const isOpen = useWorkspaceStore((s) => s.isManagerOpen);
  const setManagerOpen = useWorkspaceStore((s) => s.setManagerOpen);
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const templates = useWorkspaceStore((s) => s.templates);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const versionHistory = useWorkspaceStore((s) => s.versionHistory);

  const selectWorkspace = useWorkspaceStore((s) => s.selectWorkspace);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const deleteWorkspace = useWorkspaceStore((s) => s.deleteWorkspace);
  const toggleFavorite = useWorkspaceStore((s) => s.toggleFavorite);
  const restoreVersion = useWorkspaceStore((s) => s.restoreVersion);
  const importWorkspaceFile = useWorkspaceStore((s) => s.importWorkspaceFile);

  const [activeTab, setActiveTab] = useState<'my_workspaces' | 'templates' | 'history'>('my_workspaces');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newWsName, setNewWsName] = useState<string>('');
  const [newWsDesc, setNewWsDesc] = useState<string>('');

  if (!isOpen) return null;

  const handleCreateNew = async () => {
    if (!newWsName.trim()) return;
    await createWorkspace(newWsName.trim(), newWsDesc.trim(), {});
    setNewWsName('');
    setNewWsDesc('');
  };

  const handleExport = (ws: WorkspaceItem) => {
    const payload = JSON.stringify({
      quantum_terminal_version: 'v2.5',
      file_format: 'workspace.qt',
      id: ws.id,
      name: ws.name,
      exported_at: Date.now(),
      layout: ws.layout || {}
    }, null, 2);

    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ws.name.replace(/\s+/g, '_').toLowerCase()}_workspace.qt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importWorkspaceFile(content);
      }
    };
    reader.readAsText(file);
  };

  const filteredWorkspaces = workspaces.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        width: 760, height: 520, backgroundColor: '#090d16', border: '1px solid #1e293b',
        borderRadius: 8, display: 'flex', flexDirection: 'column', color: '#e2e8f0',
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px',
          backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b'
        }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
            ☁️ CLOUD WORKSPACE MANAGER & SYNCHRONIZATION
          </span>
          <button onClick={() => setManagerOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 16, cursor: 'pointer', fontWeight: 900 }}>
            ✕
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px',
          backgroundColor: '#111827', borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'my_workspaces', label: 'My Workspaces' },
              { id: 'templates', label: 'Official Templates' },
              { id: 'history', label: 'Version History (Last 20)' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                style={{
                  padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                  backgroundColor: activeTab === t.id ? '#f59e0b' : '#1e293b',
                  color: activeTab === t.id ? '#0f172a' : '#cbd5e1'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <label style={{
            padding: '4px 8px', borderRadius: 4, backgroundColor: '#38bdf8', color: '#0f172a',
            fontWeight: 800, cursor: 'pointer', fontSize: 10
          }}>
            📥 Import .qt File
            <input type="file" accept=".qt,.json" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {/* Content View */}
        <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>

          {/* TAB 1: MY WORKSPACES */}
          {activeTab === 'my_workspaces' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Create New Form */}
              <div style={{ display: 'flex', gap: 8, padding: 10, backgroundColor: '#0f172a', borderRadius: 6, border: '1px solid #1e293b' }}>
                <input
                  type="text"
                  placeholder="New Workspace Name..."
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: 11 }}
                />
                <input
                  type="text"
                  placeholder="Description..."
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: 11 }}
                />
                <button onClick={handleCreateNew} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                  + Create Workspace
                </button>
              </div>

              {/* Workspaces List Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {filteredWorkspaces.map((ws) => {
                  const isActive = ws.id === currentWorkspaceId;
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
                      <div style={{ color: '#94a3b8', fontSize: 10 }}>{ws.description || 'Custom layout'}</div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                        <button onClick={() => selectWorkspace(ws.id)} style={{ padding: '3px 8px', borderRadius: 3, border: 'none', backgroundColor: isActive ? '#f59e0b' : '#1e293b', color: isActive ? '#0f172a' : '#fff', fontWeight: 700, cursor: 'pointer' }}>
                          {isActive ? 'Current Active' : 'Load Workspace'}
                        </button>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => toggleFavorite(ws.id)} style={{ padding: '3px 6px', borderRadius: 3, border: 'none', backgroundColor: '#1e293b', color: '#f59e0b', cursor: 'pointer' }}>⭐</button>
                          <button onClick={() => handleExport(ws)} style={{ padding: '3px 6px', borderRadius: 3, border: 'none', backgroundColor: '#1e293b', color: '#38bdf8', cursor: 'pointer' }}>📤</button>
                          {!ws.is_default && (
                            <button onClick={() => deleteWorkspace(ws.id)} style={{ padding: '3px 6px', borderRadius: 3, border: 'none', backgroundColor: '#1e293b', color: '#ef4444', cursor: 'pointer' }}>🗑️</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: OFFICIAL TEMPLATES */}
          {activeTab === 'templates' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {templates.map((tpl: any) => (
                <div key={tpl.id} style={{ padding: 12, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800, fontSize: 12, color: '#38bdf8' }}>{tpl.name}</span>
                    <span style={{ padding: '1px 5px', borderRadius: 3, backgroundColor: '#1e293b', color: '#f59e0b', fontSize: 9, fontWeight: 700 }}>{tpl.category}</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 10 }}>{tpl.description}</div>
                  <button onClick={() => createWorkspace(tpl.name, tpl.description, tpl.layout)} style={{ marginTop: 6, padding: '4px 10px', borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: VERSION HISTORY */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: '#94a3b8', marginBottom: 4 }}>Last 20 Auto-Save Cloud Versions for current workspace:</div>
              {versionHistory.map((h) => (
                <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderRadius: 4, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
                  <span>Version #{h.version} — Saved on {new Date(h.created_at * 1000).toLocaleString()} ({h.device_info})</span>
                  <button onClick={() => restoreVersion(currentWorkspaceId, h.version)} style={{ padding: '3px 8px', borderRadius: 3, border: 'none', backgroundColor: '#f59e0b', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}>
                    Restore v{h.version}
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
