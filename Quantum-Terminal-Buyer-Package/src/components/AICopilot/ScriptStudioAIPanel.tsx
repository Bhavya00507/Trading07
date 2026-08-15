import React, { useState } from 'react';

export const ScriptStudioAIPanel: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [generated, setGenerated] = useState<string>('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Generate QScript for: ${prompt}` })
      });
      if (res.ok) {
        const data = await res.json();
        setGenerated(data.response);
      }
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11, color: '#e2e8f0' }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#a78bfa' }}>💻 SCRIPT STUDIO QUANT COPILOT</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          placeholder="Describe indicator or strategy to generate..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: 11 }}
        />
        <button onClick={handleGenerate} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', backgroundColor: '#a78bfa', color: '#0f172a', fontWeight: 900, cursor: 'pointer' }}>
          Generate
        </button>
      </div>

      {generated && (
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #a78bfa', fontFamily: 'monospace', fontSize: 10 }}>
          {generated}
        </div>
      )}
    </div>
  );
};
