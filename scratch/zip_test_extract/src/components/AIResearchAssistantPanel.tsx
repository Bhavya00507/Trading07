// src/components/AIResearchAssistantPanel.tsx
import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';

interface QAHistory {
  query: string;
  response: string;
}

const AIResearchAssistantPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<QAHistory[]>([
    {
      query: 'Identify my primary behavioral bias during London open.',
      response: 'Based on your execution logs, you exhibit a minor Over-Trading bias during the first 30 minutes of the London session, typically forcing breakout positions on GBPUSD before volume stabilizes. Preserving patience yields 1.4x higher average R:R.'
    }
  ]);
  const [asking, setAsking] = useState(false);
  const addToast = useAppStore((state) => state.addToast);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setAsking(true);
    setTimeout(() => {
      setAsking(false);

      let response = 'I scanned your trade logs. You display strong consistency in Gold mean-reversion setups, but struggle with indices breakout trades on Friday afternoons. Focus on tight trailing stops during NY session.';
      const q = query.toLowerCase();
      if (q.includes('bias')) {
        response = 'Cognitive Bias Detected: Recency Bias. Following a losing trade, you tend to reduce position size too aggressively on the next high-probability setup, missing recovery curves. Standardize sizes using the Kelly calculator.';
      } else if (q.includes('worst') || q.includes('weakness')) {
        response = 'Weakness identified: Friday Afternoon trading on NAS100. Win rate drops to 28.5% after 19:00 UTC due to weekend position squaring volatility. Recommend closing all pending index orders by Friday 18:00 UTC.';
      }

      setHistory((prev) => [{ query, response }, ...prev]);
      setQuery('');
      addToast('success', 'AI scan complete. Behavioral analysis refreshed.');
    }, 900);
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: '14px', color: '#f5f5f7' }}>AI Research Assistant &amp; Coach</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Natural language query engine scanning trade logs for cognitive biases, strengths, and weaknesses</span>
        </div>
      </div>

      {/* Query Search Form */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask AI: 'Identify my worst performing setups' or 'Explain my trading biases'..."
          style={{
            flex: 1,
            background: '#070b14',
            border: '1px solid #1b2235',
            color: '#f5f5f7',
            padding: '6px 12px',
            fontSize: '11px',
            borderRadius: '4px',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          disabled={asking}
          style={{
            background: '#d4af37',
            color: '#070b14',
            fontSize: '11px',
            fontWeight: 700,
            border: 'none',
            padding: '6px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {asking ? 'SCANNING...' : 'ASK AI'}
        </button>
      </form>

      {/* Main split */}
      <div style={{ flex: 1, display: 'flex', gap: '12px', overflow: 'hidden' }}>
        
        {/* Left: Chat history log */}
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ background: '#0d1322', padding: '6px 10px', borderBottom: '1px solid #1b2235', fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
            Assistant Conversation
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.map((h, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', borderBottom: '1px solid rgba(27,34,53,0.3)', paddingBottom: '8px' }}>
                <div style={{ color: '#d4af37', fontWeight: 600 }}>Q: {h.query}</div>
                <div style={{ color: '#f5f5f7', lineHeight: '1.4', paddingLeft: '8px', borderLeft: '2px solid #00c076' }}>
                  {h.response}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: AI strengths, weaknesses checklist */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', gap: '8px', overflowY: 'auto' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
            Behavioral strengths &amp; biases
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
            <div style={{ padding: '6px', background: 'rgba(0,192,118,0.06)', border: '1px solid rgba(0,192,118,0.15)', borderRadius: '3px' }}>
              <span style={{ color: '#00c076', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase' }}>🟢 Core Strength</span>
              <div style={{ color: '#f5f5f7', marginTop: '2px' }}>High Sharpe ratio on Gold (XAUUSD) breakout executions. Focus here.</div>
            </div>

            <div style={{ padding: '6px', background: 'rgba(255,77,87,0.06)', border: '1px solid rgba(255,77,87,0.15)', borderRadius: '3px' }}>
              <span style={{ color: '#ff4d57', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase' }}>🔴 System Bias</span>
              <div style={{ color: '#f5f5f7', marginTop: '2px' }}>Chasing breakouts post-CPI news. Triggers poor average fill prices.</div>
            </div>

            <div style={{ padding: '6px', background: 'rgba(234,115,23,0.06)', border: '1px solid rgba(234,115,23,0.15)', borderRadius: '3px' }}>
              <span style={{ color: '#ea7317', fontWeight: 700, fontSize: '9px', textTransform: 'uppercase' }}>🟠 Improvement Plan</span>
              <div style={{ color: '#f5f5f7', marginTop: '2px' }}>Use OCO pending orders during high impact news instead of manual market entries.</div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default AIResearchAssistantPanel;
