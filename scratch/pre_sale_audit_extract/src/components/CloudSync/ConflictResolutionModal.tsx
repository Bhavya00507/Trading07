import React from 'react';

export const ConflictResolutionModal: React.FC<{
  isOpen: boolean;
  workspaceId: string;
  onResolve: (strategy: 'keep_local' | 'keep_cloud' | 'merge') => void;
}> = ({ isOpen, workspaceId, onResolve }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999,
      backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        width: 540, backgroundColor: '#090d16', border: '2px solid #ef4444',
        borderRadius: 8, display: 'flex', flexDirection: 'column', color: '#e2e8f0',
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, padding: 16, gap: 14
      }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚠️ WORKSPACE CLOUD SYNC CONFLICT DETECTED
        </div>

        <div style={{ color: '#cbd5e1', lineHeight: '1.5' }}>
          This workspace was modified concurrently on another logged-in device. Choose how you would like to resolve the conflict:
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => onResolve('merge')} style={{ padding: 10, borderRadius: 6, border: 'none', backgroundColor: '#10b981', color: '#0f172a', fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}>
            🔀 Merge Non-Conflicting Changes (Recommended)
            <div style={{ fontSize: 9, fontWeight: 500, opacity: 0.8 }}>Combines indicators, watchlists, and drawing tools automatically.</div>
          </button>

          <button onClick={() => onResolve('keep_local')} style={{ padding: 10, borderRadius: 6, border: 'none', backgroundColor: '#38bdf8', color: '#0f172a', fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}>
            💻 Keep Local Device Version
            <div style={{ fontSize: 9, fontWeight: 500, opacity: 0.8 }}>Overwrites cloud state with the layout on this computer.</div>
          </button>

          <button onClick={() => onResolve('keep_cloud')} style={{ padding: 10, borderRadius: 6, border: 'none', backgroundColor: '#f59e0b', color: '#0f172a', fontWeight: 800, cursor: 'pointer', textAlign: 'left' }}>
            ☁️ Overwrite with Cloud Version
            <div style={{ fontSize: 9, fontWeight: 500, opacity: 0.8 }}>Discards local changes and pulls latest cloud backup.</div>
          </button>
        </div>
      </div>
    </div>
  );
};
