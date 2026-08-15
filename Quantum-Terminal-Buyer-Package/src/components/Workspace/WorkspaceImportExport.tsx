import React from 'react';

export const WorkspaceImportExport: React.FC<{
  workspaceId: string;
  workspaceName: string;
  onImport: (content: string) => void;
}> = ({ workspaceId, workspaceName, onImport }) => {
  const handleExport = async () => {
    try {
      const res = await fetch(`/api/workspace-sync/export/${workspaceId}`);
      if (res.ok) {
        const payload = await res.json();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${workspaceName.replace(/\s+/g, '_').toLowerCase()}.qtws`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {}
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImport(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        onClick={handleExport}
        style={{
          padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: '#1e293b',
          color: '#38bdf8', fontSize: 10, fontWeight: 800, cursor: 'pointer'
        }}
      >
        📤 Export .qtws
      </button>

      <label style={{
        padding: '4px 8px', borderRadius: 4, backgroundColor: '#38bdf8', color: '#0f172a',
        fontWeight: 800, cursor: 'pointer', fontSize: 10
      }}>
        📥 Import .qtws
        <input type="file" accept=".qtws,.json" onChange={handleFileUpload} style={{ display: 'none' }} />
      </label>
    </div>
  );
};
