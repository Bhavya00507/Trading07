import React, { useState, useEffect } from 'react';
import { MarketAnalystPanel } from './MarketAnalystPanel';
import { TradeAssistantPanel } from './TradeAssistantPanel';
import { PortfolioAssistantPanel } from './PortfolioAssistantPanel';
import { JournalAssistantPanel } from './JournalAssistantPanel';
import { ReplayCoachPanel } from './ReplayCoachPanel';
import { OptionsAssistantPanel } from './OptionsAssistantPanel';
import { ScriptStudioAIPanel } from './ScriptStudioAIPanel';
import { VoiceAssistantPanel } from './VoiceAssistantPanel';

export const UnifiedAICopilotWindow: React.FC<{ isOpen: boolean; onClose: () => void; symbol?: string; livePrice?: number }> = ({
  isOpen,
  onClose,
  symbol = 'BTCUSDT',
  livePrice = 65000.0
}) => {
  const [providers, setProviders] = useState<any[]>([]);
  const [activeProvider, setActiveProvider] = useState<string>('OpenAI GPT-5 / GPT-4o');
  const [activeTab, setActiveTab] = useState<
    'market' | 'trade' | 'portfolio' | 'journal' | 'replay' | 'options' | 'script' | 'voice'
  >('market');

  const fetchProviders = () => {
    fetch('/api/ai/providers')
      .then(res => res.json())
      .then(d => {
        setProviders(d.providers || []);
        setActiveProvider(d.active_provider);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen) fetchProviders();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSwitchProvider = async (pid: string) => {
    try {
      const res = await fetch('/api/ai/provider/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: pid })
      });
      if (res.ok) fetchProviders();
    } catch {}
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        width: 920, height: 600, backgroundColor: '#090d16', border: '1px solid #1e293b',
        borderRadius: 8, display: 'flex', flexDirection: 'column', color: '#e2e8f0',
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px',
          backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
              🤖 QUANTUM AI COPILOT ENTERPRISE (v2.9)
            </span>
            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, backgroundColor: '#1e293b', color: '#38bdf8', fontWeight: 800 }}>
              Active Model: {activeProvider}
            </span>
          </div>

          {/* Model Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              onChange={e => handleSwitchProvider(e.target.value)}
              style={{ padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: 10 }}
            >
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.latency_ms}ms)</option>
              ))}
            </select>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 16, cursor: 'pointer', fontWeight: 900 }}>✕</button>
          </div>
        </div>

        {/* Tab Navbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px',
          backgroundColor: '#111827', borderBottom: '1px solid #1e293b', flexWrap: 'wrap'
        }}>
          {[
            { id: 'market', label: '📊 Market Analyst' },
            { id: 'trade', label: '⚡ Trade Assistant' },
            { id: 'portfolio', label: '💼 Portfolio Risk' },
            { id: 'journal', label: '📓 Journal Auditor' },
            { id: 'replay', label: '🎬 Replay Coach' },
            { id: 'options', label: '🎯 Options Analytics' },
            { id: 'script', label: '💻 Script Studio AI' },
            { id: 'voice', label: '🎙️ Voice Directives' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                padding: '4px 9px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                backgroundColor: activeTab === t.id ? '#f59e0b' : '#1e293b',
                color: activeTab === t.id ? '#0f172a' : '#cbd5e1'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Main Body */}
        <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
          {activeTab === 'market' && <MarketAnalystPanel symbol={symbol} livePrice={livePrice} />}
          {activeTab === 'trade' && <TradeAssistantPanel symbol={symbol} livePrice={livePrice} />}
          {activeTab === 'portfolio' && <PortfolioAssistantPanel />}
          {activeTab === 'journal' && <JournalAssistantPanel />}
          {activeTab === 'replay' && <ReplayCoachPanel />}
          {activeTab === 'options' && <OptionsAssistantPanel symbol={symbol} livePrice={livePrice} />}
          {activeTab === 'script' && <ScriptStudioAIPanel />}
          {activeTab === 'voice' && <VoiceAssistantPanel />}
        </div>
      </div>
    </div>
  );
};
