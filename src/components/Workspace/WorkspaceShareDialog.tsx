import React, { useState } from 'react';

export const WorkspaceShareDialog: React.FC<{ workspaceId: string; onClose: () => void }> = ({
  workspaceId,
  onClose
}) => {
  const [shareUrl, setShareUrl] = useState<string>('');

  const handleGenerateShare = async () => {
    try {
      const res = await fetch(`/api/workspace-sync/share/${workspaceId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setShareUrl(`${window.location.origin}${data.share_url}`);
      }
    } catch {}
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000,
      backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        width: 480, padding: 20, borderRadius: 8, backgroundColor: '#090d16', border: '1px solid #1e293b',
        color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 11
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#f59e0b' }}>SHARE WORKSPACE LINK</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{ color: '#94a3b8' }}>
          Generate a public share link so team members or traders can clone your layout.
        </div>

        {!shareUrl ? (
          <button onClick={handleGenerateShare} style={{ padding: 8, borderRadius: 4, border: 'none', backgroundColor: '#38bdf8', color: '#0f172a', fontWeight: 900, cursor: 'pointer' }}>
            🔗 Generate Public Share Link
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <input type="text" readOnly value={shareUrl} style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
            <button onClick={() => navigator.clipboard.writeText(shareUrl)} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
              Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
