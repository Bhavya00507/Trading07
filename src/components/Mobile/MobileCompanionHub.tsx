import React, { useState, useEffect } from 'react';

export const MobileCompanionHub: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'watchlist' | 'chart' | 'trade' | 'portfolio' | 'ai' | 'settings'>('dashboard');
  const [summary, setSummary] = useState<any>(null);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const fetchSummary = () => {
    fetch('/api/mobile/dashboard')
      .then(res => res.json())
      .then(d => setSummary(d))
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen) fetchSummary();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        width: orientation === 'portrait' ? 380 : 700,
        height: orientation === 'portrait' ? 740 : 420,
        backgroundColor: '#070b14', border: '3px solid #1e293b',
        borderRadius: 28, display: 'flex', flexDirection: 'column', color: '#e2e8f0',
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.8)', transition: 'all 0.3s ease'
      }}>
        {/* Mobile Top Status Bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px',
          backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b'
        }}>
          <span style={{ fontWeight: 800, fontSize: 11, color: '#38bdf8' }}>📱 QUANTUM MOBILE PRO</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={() => setOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')}
              style={{ background: '#1e293b', border: 'none', borderRadius: 4, color: '#f59e0b', fontSize: 9, padding: '2px 6px', cursor: 'pointer', fontWeight: 800 }}
            >
              🔄 {orientation.toUpperCase()}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 14, cursor: 'pointer', fontWeight: 900 }}>✕</button>
          </div>
        </div>

        {/* Main Body Content */}
        <div style={{ flex: 1, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeTab === 'dashboard' && summary && (
            <>
              {/* Account Summary Card */}
              <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ color: '#94a3b8', fontSize: 9 }}>PORTFOLIO EQUITY</div>
                <div style={{ fontWeight: 900, fontSize: 20, color: '#10b981' }}>${summary.equity?.toLocaleString()}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, color: '#cbd5e1', fontSize: 10, marginTop: 4 }}>
                  <div>Balance: <strong>${summary.balance}</strong></div>
                  <div>Today P&L: <strong style={{ color: '#10b981' }}>+${summary.realized_pnl_today}</strong></div>
                  <div>Free Margin: <strong>${summary.free_margin}</strong></div>
                  <div>Margin Level: <strong style={{ color: '#38bdf8' }}>{summary.margin_level_pct}%</strong></div>
                </div>
              </div>

              {/* AI Bulletin */}
              <div style={{ padding: 10, borderRadius: 6, backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', color: '#38bdf8', fontSize: 10 }}>
                🤖 {summary.ai_market_bulletin}
              </div>

              {/* Quick Watchlist Snapshot */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: 11 }}>🔥 TOP GAINERS</div>
                {summary.top_gainers?.map((g: any) => (
                  <div key={g.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, backgroundColor: '#0f172a', borderRadius: 6, border: '1px solid #1e293b' }}>
                    <span style={{ fontWeight: 800 }}>{g.symbol}</span>
                    <span style={{ color: '#10b981', fontWeight: 800 }}>+${g.price} (+{g.change_pct}%)</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'trade' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: '#10b981' }}>⚡ ONE-TAP MOBILE EXECUTION</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button style={{ padding: 16, borderRadius: 8, border: 'none', backgroundColor: '#10b981', color: '#0f172a', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                  BUY MARKET
                </button>
                <button style={{ padding: 16, borderRadius: 8, border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                  SELL MARKET
                </button>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #a78bfa' }}>
              <div style={{ fontWeight: 800, color: '#a78bfa', marginBottom: 6 }}>🤖 MOBILE AI VOICE COPILOT</div>
              <input type="text" placeholder="Ask AI: 'Analyze BTC', 'Close Half'..." style={{ width: '100%', padding: 6, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: 10 }} />
            </div>
          )}

          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontWeight: 800, color: '#38bdf8' }}>⚙️ MOBILE SECURITY & BIOMETRICS</div>
              <div style={{ padding: 8, backgroundColor: '#0f172a', borderRadius: 4 }}>Face ID / Fingerprint Login: <strong style={{ color: '#10b981' }}>ENABLED</strong></div>
              <div style={{ padding: 8, backgroundColor: '#0f172a', borderRadius: 4 }}>One-Tap Trading: <strong style={{ color: '#10b981' }}>ACTIVE</strong></div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-around', padding: '8px 0',
          backgroundColor: '#0f172a', borderTop: '1px solid #1e293b'
        }}>
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'trade', label: '⚡ Trade' },
            { id: 'ai', label: '🤖 AI' },
            { id: 'settings', label: '⚙️ Settings' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, fontWeight: 800,
                color: activeTab === t.id ? '#38bdf8' : '#64748b'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
