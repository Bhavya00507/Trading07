import React, { useState } from 'react';

export const VoiceAssistantPanel: React.FC = () => {
  const [voiceInput, setVoiceInput] = useState<string>('');
  const [voiceResult, setVoiceResult] = useState<any>(null);

  const handleVoiceSubmit = async (text: string) => {
    if (!text.trim()) return;
    try {
      const res = await fetch('/api/ai/voice-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_input: text })
      });
      if (res.ok) {
        const data = await res.json();
        setVoiceResult(data);
      }
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11, color: '#e2e8f0' }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#a78bfa' }}>🎙️ AI VOICE & DIRECTIVE COMMAND CENTER</div>

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          placeholder='Try: "Buy 2 lots", "Reverse", "Close half", "Analyze EURUSD"'
          value={voiceInput}
          onChange={e => setVoiceInput(e.target.value)}
          style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: 11 }}
        />
        <button onClick={() => handleVoiceSubmit(voiceInput)} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', backgroundColor: '#a78bfa', color: '#0f172a', fontWeight: 900, cursor: 'pointer' }}>
          Execute Directive
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['Buy 1 lot BTCUSDT', 'Reverse Position', 'Close All Positions', 'Analyze EURUSD'].map(sample => (
          <button
            key={sample}
            onClick={() => { setVoiceInput(sample); handleVoiceSubmit(sample); }}
            style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #334155', backgroundColor: '#0f172a', color: '#cbd5e1', cursor: 'pointer', fontSize: 10 }}
          >
            "{sample}"
          </button>
        ))}
      </div>

      {voiceResult && (
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #a78bfa', marginTop: 4 }}>
          <div style={{ color: '#a78bfa', fontWeight: 800 }}>{voiceResult.confirmation}</div>
          <div style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>Action: {voiceResult.action_executed}</div>
        </div>
      )}
    </div>
  );
};
