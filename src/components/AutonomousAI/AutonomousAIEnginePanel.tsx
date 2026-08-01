import React, { useState, useEffect } from 'react';

export const AutonomousAIEnginePanel: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [promptText, setPromptText] = useState<string>('Create a London session breakout strategy using EMA 200 and ATR with 1% risk');
  const [generatedStrategy, setGeneratedStrategy] = useState<any>(null);
  const [automationMode, setAutomationMode] = useState<string>('ADVISORY_ONLY');

  const fetchDashboard = () => {
    fetch('/api/autonomous-ai/dashboard')
      .then(res => res.json())
      .then(d => {
        setDashboard(d);
        setAutomationMode(d.active_mode || 'ADVISORY_ONLY');
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleModeChange = async (mode: string) => {
    try {
      const res = await fetch('/api/autonomous-ai/safety/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      if (res.ok) {
        setAutomationMode(mode);
        fetchDashboard();
      }
    } catch {}
  };

  const handleKillSwitch = async () => {
    try {
      const res = await fetch('/api/autonomous-ai/safety/kill-switch', { method: 'POST' });
      if (res.ok) {
        alert('🚨 EMERGENCY KILL SWITCH ACTIVATED! Automation Disabled.');
        fetchDashboard();
      }
    } catch {}
  };

  const handleGenerateStrategy = async () => {
    try {
      const res = await fetch('/api/autonomous-ai/generate-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });
      if (res.ok) setGeneratedStrategy(await res.json());
    } catch {}
  };

  if (!dashboard) return null;
  const signal = dashboard.latest_signal;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#090d16',
      color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, padding: 16, gap: 14, overflowY: 'auto'
    }}>
      {/* Header & Safety Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}>
            🤖 QUANTUM AI & AUTONOMOUS TRADING ENGINE (v5.0)
          </span>
          <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
            Explainable AI Signals | Natural Language Strategy Generator | Configurable Safety Controls
          </div>
        </div>

        {/* Safety Mode Controls & Kill Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={automationMode}
            onChange={e => handleModeChange(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', fontWeight: 800, fontSize: 10 }}
          >
            <option value="ADVISORY_ONLY">🛡️ Mode: ADVISORY ONLY</option>
            <option value="SEMI_AUTOMATIC">⚡ Mode: SEMI-AUTOMATIC</option>
            <option value="FULLY_AUTOMATIC">🤖 Mode: FULLY-AUTOMATIC</option>
          </select>

          <button
            onClick={handleKillSwitch}
            style={{
              padding: '6px 12px', borderRadius: 4, border: 'none', backgroundColor: '#ef4444', color: '#fff',
              fontWeight: 900, cursor: 'pointer', fontSize: 10, boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)'
            }}
          >
            🚨 KILL SWITCH
          </button>
        </div>
      </div>

      {/* Explainable AI Signal Card */}
      {signal && (
        <div style={{ padding: 14, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #10b981', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#10b981' }}>
              🎯 EXPLAINABLE AI SIGNAL: {signal.symbol} ({signal.action})
            </span>
            <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 900 }}>
              Confidence: {signal.confidence_score_pct}%
            </span>
          </div>

          <div style={{ padding: 8, backgroundColor: '#1e293b', borderRadius: 6, color: '#38bdf8', fontWeight: 700, fontSize: 10 }}>
            💡 Why Generated: {signal.why_generated}
          </div>

          {/* Supporting Indicators */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {signal.supporting_indicators?.map((ind: any, i: number) => (
              <div key={i} style={{ padding: 6, backgroundColor: '#111827', borderRadius: 4, border: '1px solid #1e293b' }}>
                <div style={{ color: '#94a3b8', fontSize: 9 }}>{ind.name}</div>
                <div style={{ fontWeight: 800, color: '#e2e8f0' }}>{ind.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Natural Language Strategy Generator */}
      <div style={{ padding: 14, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 12, color: '#a78bfa' }}>🧠 NATURAL LANGUAGE STRATEGY GENERATOR</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
            style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: 10 }}
          />
          <button onClick={handleGenerateStrategy} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', backgroundColor: '#a78bfa', color: '#0f172a', fontWeight: 900, cursor: 'pointer', fontSize: 10 }}>
            Generate Code
          </button>
        </div>

        {generatedStrategy && (
          <div style={{ padding: 8, backgroundColor: '#1e293b', borderRadius: 6, fontFamily: 'monospace', fontSize: 10, color: '#10b981', whiteSpace: 'pre-wrap' }}>
            {generatedStrategy.generated_code}
          </div>
        )}
      </div>
    </div>
  );
};
