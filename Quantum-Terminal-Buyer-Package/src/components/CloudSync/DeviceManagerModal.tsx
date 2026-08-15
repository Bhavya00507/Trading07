import React, { useState, useEffect } from 'react';

export const DeviceManagerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [devices, setDevices] = useState<any[]>([]);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>('');

  const fetchDevices = () => {
    fetch('/api/workspace-sync/devices')
      .then(res => res.json())
      .then(d => setDevices(d.devices || []))
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen) fetchDevices();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRename = async (devId: string) => {
    if (!newName.trim()) return;
    try {
      await fetch('/api/workspace-sync/devices/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: devId, new_name: newName })
      });
      setRenameId(null);
      setNewName('');
      fetchDevices();
    } catch {}
  };

  const handleSignout = async (devId: string) => {
    try {
      await fetch('/api/workspace-sync/devices/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: devId })
      });
      fetchDevices();
    } catch {}
  };

  const handleSignoutAll = async () => {
    try {
      await fetch('/api/workspace-sync/devices/signout-all', { method: 'POST' });
      fetchDevices();
    } catch {}
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        width: 720, backgroundColor: '#090d16', border: '1px solid #1e293b',
        borderRadius: 8, display: 'flex', flexDirection: 'column', color: '#e2e8f0',
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, padding: 16, gap: 14
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#38bdf8' }}>
            📱 LOGGED-IN DEVICES & CLOUD SESSIONS
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={handleSignoutAll} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 10 }}>
              Sign Out All Devices
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 16, cursor: 'pointer', fontWeight: 900 }}>✕</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
          {devices.map((dev) => (
            <div key={dev.id} style={{
              padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {renameId === dev.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input type="text" value={newName} onChange={e => setNewName(e.target.value)} style={{ padding: 2, fontSize: 10, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
                      <button onClick={() => handleRename(dev.id)} style={{ padding: '2px 6px', fontSize: 9, backgroundColor: '#10b981', border: 'none', borderRadius: 3, cursor: 'pointer' }}>Save</button>
                    </div>
                  ) : (
                    <span style={{ fontWeight: 800, color: dev.is_current ? '#10b981' : '#f8fafc', fontSize: 12 }}>
                      {dev.name} {dev.is_current && '(This Device)'}
                    </span>
                  )}
                  <button onClick={() => { setRenameId(dev.id); setNewName(dev.name); }} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 10, cursor: 'pointer' }}>✏️</button>
                </div>
                <div style={{ color: '#94a3b8', fontSize: 9, marginTop: 4 }}>
                  {dev.platform} | {dev.browser} | IP: {dev.ip_location}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 800,
                  backgroundColor: dev.status === 'ONLINE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                  color: dev.status === 'ONLINE' ? '#10b981' : '#94a3b8'
                }}>
                  {dev.status}
                </span>

                {!dev.is_current && (
                  <button onClick={() => handleSignout(dev.id)} style={{ padding: '3px 8px', borderRadius: 4, border: 'none', backgroundColor: '#1e293b', color: '#ef4444', fontWeight: 800, cursor: 'pointer', fontSize: 10 }}>
                    Sign Out
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
