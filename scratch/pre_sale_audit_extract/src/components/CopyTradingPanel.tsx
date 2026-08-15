// src/components/CopyTradingPanel.tsx
import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';

interface MasterTrader {
  id: string;
  name: string;
  winRate: number;
  maxDrawdown: number;
  profitFactor: number;
  monthlyReturn: number;
  copiers: number;
  aum: number;
  isFollowing?: boolean;
}

const MASTER_TRADERS: MasterTrader[] = [
  { id: '1', name: 'Alpha Horizon (Trend)', winRate: 68.4, maxDrawdown: 4.8, profitFactor: 2.14, monthlyReturn: 12.4, copiers: 412, aum: 124000, isFollowing: true },
  { id: '2', name: 'Macro Edge (Scalping)', winRate: 74.2, maxDrawdown: 8.5, profitFactor: 1.95, monthlyReturn: 18.2, copiers: 852, aum: 489000, isFollowing: false },
  { id: '3', name: 'VIX Volatility Arbitrage', winRate: 62.1, maxDrawdown: 3.2, profitFactor: 2.45, monthlyReturn: 8.9, copiers: 320, aum: 215000, isFollowing: false },
  { id: '4', name: 'Quantum Momentum HFT', winRate: 81.5, maxDrawdown: 12.4, profitFactor: 1.82, monthlyReturn: 28.5, copiers: 1240, aum: 890000, isFollowing: false },
  { id: '5', name: 'G10 Forex Flow Grid', winRate: 59.8, maxDrawdown: 2.9, profitFactor: 1.68, monthlyReturn: 5.4, copiers: 148, aum: 65000, isFollowing: false }
];

const CopyTradingPanel: React.FC = () => {
  const [traders, setTraders] = useState<MasterTrader[]>(MASTER_TRADERS);
  const [selectedId, setSelectedId] = useState<string>('1');

  // Copy settings for the selected trader
  const [copyMode, setCopyMode] = useState<'multiplier' | 'fixed' | 'percentage'>('multiplier');
  const [copySize, setCopySize] = useState<number>(1.0);
  const [blacklist, setBlacklist] = useState<string>('GER40, GER40T');
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const addToast = useAppStore((state) => state.addToast);

  const activeTrader = traders.find((t) => t.id === selectedId) || traders[0];

  const handleToggleFollow = (id: string) => {
    setTraders((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextState = !t.isFollowing;
          if (nextState) {
            addToast('success', `Now following Master Trader: ${t.name}`);
          } else {
            addToast('info', `Stopped following Master Trader: ${t.name}`);
          }
          return { ...t, isFollowing: nextState };
        }
        return t;
      })
    );
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('success', `Copy settings updated for ${activeTrader.name}`);
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: '14px', color: '#f5f5f7' }}>Institutional Copy Trading</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Follow professional master traders with strict risk control parameters</span>
        </div>
      </div>

      {/* Main split view */}
      <div style={{ flex: 1, display: 'flex', gap: '12px', overflow: 'hidden' }}>
        
        {/* Left: Master Leaderboard list */}
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ background: '#0d1322', padding: '6px 10px', borderBottom: '1px solid #1b2235', fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
            Master Leaderboards
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1b2235', color: '#8e8e93' }}>
                  <th style={{ padding: '6px 4px' }}>Master Name</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Win Rate</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Max DD</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Profit Factor</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Mon Return</th>
                  <th style={{ padding: '6px 4px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {traders.map((t) => {
                  const isSel = t.id === selectedId;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      style={{
                        borderBottom: '1px solid rgba(27,34,53,0.3)',
                        cursor: 'pointer',
                        background: isSel ? 'rgba(212,175,55,0.04)' : 'transparent',
                        transition: 'background 0.1s'
                      }}
                    >
                      <td style={{ padding: '8px 4px', fontWeight: 600, color: isSel ? 'var(--accent)' : '#f5f5f7' }}>
                        {t.name}
                        <span style={{ fontSize: '8px', display: 'block', color: '#8e8e93', fontWeight: 400 }}>Copiers: {t.copiers} | AUM: ${t.aum.toLocaleString()}</span>
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{t.winRate}%</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#ff4d57' }}>-{t.maxDrawdown}%</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#00c076' }}>{t.profitFactor}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#00c076' }}>+{t.monthlyReturn}%</td>
                      <td style={{ padding: '8px 4px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleFollow(t.id)}
                          style={{
                            padding: '3px 8px',
                            fontSize: '9px',
                            background: t.isFollowing ? '#ff4d57' : '#00c076',
                            border: 'none',
                            color: '#070b14',
                            fontWeight: 700,
                            borderRadius: 3,
                            cursor: 'pointer'
                          }}
                        >
                          {t.isFollowing ? 'Unfollow' : 'Follow'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Copy Config parameters */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', gap: '8px', overflowY: 'auto' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
            Risk Configuration: {activeTrader.name}
          </span>

          {!activeTrader.isFollowing ? (
            <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '11px', color: '#8e8e93', textTransform: 'uppercase' }}>
              Follow this master trader to configure copy trading parameters.
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Copy Allocation Mode */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '10px', color: '#8e8e93' }}>Copy Type</label>
                <select
                  value={copyMode}
                  onChange={(e: any) => setCopyMode(e.target.value)}
                  style={{ padding: '5px 8px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px', cursor: 'pointer' }}
                >
                  <option value="multiplier">Risk Multiplier</option>
                  <option value="fixed">Fixed Lot Allocation</option>
                  <option value="percentage">Percentage Allocation</option>
                </select>
              </div>

              {/* Value size depending on mode */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '10px', color: '#8e8e93' }}>
                  {copyMode === 'multiplier' && 'Multiplier Value (e.g. 1.5x master size)'}
                  {copyMode === 'fixed' && 'Lot Size (e.g. 0.10 lots per master trade)'}
                  {copyMode === 'percentage' && 'Percentage Allocation (e.g. 10% of account balance)'}
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={copySize}
                  onChange={(e) => setCopySize(parseFloat(e.target.value) || 0.1)}
                  style={{ padding: '5px 8px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                />
              </div>

              {/* Blacklisted symbols */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '10px', color: '#8e8e93' }}>Excluded Blacklist Symbols</label>
                <input
                  type="text"
                  value={blacklist}
                  onChange={(e) => setBlacklist(e.target.value)}
                  style={{ padding: '5px 8px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                />
              </div>

              {/* Pause Toggles */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0' }}>
                <span style={{ fontSize: '11px', color: '#f5f5f7' }}>Pause Trade Copying</span>
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '10px',
                    background: isPaused ? '#ff4d57' : '#1b2235',
                    border: 'none',
                    borderRadius: '3px',
                    color: isPaused ? '#070b14' : '#8e8e93',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {isPaused ? 'PAUSED' : 'ACTIVE'}
                </button>
              </div>

              {/* Save Settings */}
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
                  marginTop: '4px'
                }}
              >
                Save Settings
              </button>
            </form>
          )}
        </div>

      </div>

    </div>
  );
};

export default CopyTradingPanel;
