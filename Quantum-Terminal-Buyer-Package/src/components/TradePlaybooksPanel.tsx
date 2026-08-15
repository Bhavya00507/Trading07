// src/components/TradePlaybooksPanel.tsx
import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';

interface SetupPattern {
  id: string;
  name: string;
  type: string;
  winRate: number;
  tradeCount: number;
  avgReturn: number;
  tags: string[];
}

const PLAYBOOK_SETUPS: SetupPattern[] = [
  { id: '1', name: 'Double Bottom Reversal', type: 'Reversal', winRate: 72.4, tradeCount: 42, avgReturn: 2.45, tags: ['S/R', 'Rejection'] },
  { id: '2', name: 'Bull Flag Continuation', type: 'Continuation', winRate: 64.8, tradeCount: 58, avgReturn: 1.82, tags: ['Breakout', 'Volume'] },
  { id: '3', name: 'Golden Cross Trend Ema', type: 'Trend Following', winRate: 59.1, tradeCount: 74, avgReturn: 1.65, tags: ['Moving Average'] },
  { id: '4', name: 'VIX Volatility Arbitrage', type: 'Arbitrage', winRate: 81.5, tradeCount: 15, avgReturn: 3.82, tags: ['Volatility', 'Option'] }
];

const TradePlaybooksPanel: React.FC = () => {
  const [setups, setSetups] = useState<SetupPattern[]>(PLAYBOOK_SETUPS);
  const [activeTab, setActiveTab] = useState<'patterns' | 'checklist' | 'postreview'>('patterns');
  
  // Pre-trade checklist states
  const [checklist, setChecklist] = useState({
    regime: false,
    boundaries: false,
    risk: false,
    news: false,
    tpsl: false
  });

  const addToast = useAppStore((state) => state.addToast);

  const handleToggleCheck = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    const allChecked = Object.values(checklist).every(Boolean);
    if (allChecked) {
      addToast('success', 'Pre-trade checklist validated. Order entry is safe.');
    } else {
      addToast('error', 'Checklist incomplete. Verify risk and S/R boundaries before placing order.');
    }
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: '14px', color: '#f5f5f7' }}>Trade Playbook &amp; Setup Library</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Manage pre-trade checklists, post-trade reviews, and performance logs grouped by setup patterns</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1b2235', paddingBottom: '4px', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={() => setActiveTab('patterns')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'patterns' ? '2px solid #d4af37' : '2px solid transparent',
            padding: '6px 12px',
            color: activeTab === 'patterns' ? '#d4af37' : '#8e8e93',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            cursor: 'pointer'
          }}
        >
          Setup Pattern Library
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'checklist' ? '2px solid #d4af37' : '2px solid transparent',
            padding: '6px 12px',
            color: activeTab === 'checklist' ? '#d4af37' : '#8e8e93',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            cursor: 'pointer'
          }}
        >
          Pre-Trade Checklist
        </button>
        <button
          onClick={() => setActiveTab('postreview')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'postreview' ? '2px solid #d4af37' : '2px solid transparent',
            padding: '6px 12px',
            color: activeTab === 'postreview' ? '#d4af37' : '#8e8e93',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            cursor: 'pointer'
          }}
        >
          Post-Trade Review
        </button>
      </div>

      {/* Content Frame */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        
        {/* Pattern Library Tab */}
        {activeTab === 'patterns' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {setups.map((setup) => (
              <div key={setup.id} style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '12px', color: '#f5f5f7' }}>{setup.name}</strong>
                  <span style={{ fontSize: '8px', padding: '1px 4px', background: '#1b2235', color: '#8e8e93', borderRadius: '2px', fontWeight: 700 }}>
                    {setup.type}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px', color: '#8e8e93' }}>
                  <div>Win Rate: <strong style={{ color: '#00c076', fontFamily: 'var(--font-mono)' }}>{setup.winRate}%</strong></div>
                  <div>Trades logged: <strong style={{ color: '#f5f5f7', fontFamily: 'var(--font-mono)' }}>{setup.tradeCount}</strong></div>
                  <div>Avg Return: <strong style={{ color: '#00c076', fontFamily: 'var(--font-mono)' }}>+{setup.avgReturn}%</strong></div>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {setup.tags.map((t, idx) => (
                    <span key={idx} style={{ fontSize: '8px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', color: '#d4af37', padding: '1px 4px', borderRadius: '2px' }}>
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pre-trade checklist Tab */}
        {activeTab === 'checklist' && (
          <div style={{ maxWidth: '400px', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '16px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', display: 'block', borderBottom: '1px solid #1b2235', paddingBottom: '6px', marginBottom: '12px' }}>
              Execution pre-flight Checklist
            </span>
            <form onSubmit={handleSaveChecklist} style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px', color: '#f5f5f7' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={checklist.regime} onChange={() => handleToggleCheck('regime')} />
                Market Regime classified (high/low volatility identified)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={checklist.boundaries} onChange={() => handleToggleCheck('boundaries')} />
                Support / Resistance boundaries defined on chart
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={checklist.risk} onChange={() => handleToggleCheck('risk')} />
                Kelly/VaR risk allocations computed (Max 2% risk)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={checklist.news} onChange={() => handleToggleCheck('news')} />
                No high-impact economic news events within next 30 mins
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={checklist.tpsl} onChange={() => handleToggleCheck('tpsl')} />
                Target Stop Loss and Take Profit levels registered
              </label>

              <button
                type="submit"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--bg-primary)',
                  fontWeight: 700,
                  fontSize: '11px',
                  border: 'none',
                  padding: '6px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  marginTop: '8px'
                }}
              >
                Validate Checklist
              </button>
            </form>
          </div>
        )}

        {/* Post-trade review Tab */}
        {activeTab === 'postreview' && (
          <div style={{ fontSize: '11px', color: '#8e8e93', padding: '12px', textAlign: 'center' }}>
            Select a closed trade from history to write playbooks notes, emocional tags, and setup performance reviews.
          </div>
        )}

      </div>

    </div>
  );
};

export default TradePlaybooksPanel;
