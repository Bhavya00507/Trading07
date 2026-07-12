// src/components/AutomationPanel.tsx
import React, { useEffect } from 'react';
import { useAutomationStore, BotConfig } from '../store/automationStore';
import { useAppStore } from '../store/appStore';

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1D'];
const SESSIONS = ['Asian', 'London', 'New York'];

const AutomationPanel: React.FC = () => {
  const { bots, toggleBot, updateBot, tickBotsSimulation } = useAutomationStore();
  const watchlist = useAppStore((state) => state.watchlist);

  // Background simulation ticks when panel is active
  useEffect(() => {
    const interval = setInterval(() => {
      tickBotsSimulation();
    }, 3000);
    return () => clearInterval(interval);
  }, [tickBotsSimulation]);

  const getStatusColor = (status: string) => {
    if (status === 'running') return '#00c076';
    if (status === 'paused') return '#ffb74d';
    return '#ff4d57';
  };

  const handleToggleSession = (bot: BotConfig, sessionName: string) => {
    const exists = bot.sessions.includes(sessionName);
    const updated = exists 
      ? bot.sessions.filter((s) => s !== sessionName) 
      : [...bot.sessions, sessionName];
    updateBot(bot.id, { sessions: updated });
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto', background: '#070b14', fontFamily: 'var(--font-sans)' }}>
      
      {/* Panel Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '8px' }}>
        <div>
          <h3 style={{ fontSize: '15px', color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
            Smart Trading &amp; Automation
          </h3>
          <span style={{ fontSize: '10px', color: '#8e8e93' }}>Configure and monitor quantitative algorithmic bots</span>
        </div>
        <span style={{ fontSize: '10px', color: '#8e8e93', border: '1px solid #1b2235', padding: '2px 6px', borderRadius: '3px' }}>
          Simulated Engine Live
        </span>
      </div>

      {/* Grid of Strategy Bots */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {bots.map((bot) => (
          <div
            key={bot.id}
            style={{
              background: '#0d1322',
              border: bot.enabled ? '1px solid #d4af37' : '1px solid #1b2235',
              borderRadius: '6px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              position: 'relative'
            }}
          >
            {/* Header info / switch */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '14px', color: '#f5f5f7' }}>{bot.name}</strong>
                <span style={{
                  display: 'inline-block',
                  marginLeft: '8px',
                  fontSize: '8px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  textTransform: 'uppercase',
                  color: getStatusColor(bot.status),
                  backgroundColor: `${getStatusColor(bot.status)}15`,
                  border: `1px solid ${getStatusColor(bot.status)}30`
                }}>
                  {bot.status}
                </span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '6px', fontSize: '11px', color: '#8e8e93' }}>
                <span>{bot.enabled ? 'Enabled' : 'Disabled'}</span>
                <input
                  type="checkbox"
                  checked={bot.enabled}
                  onChange={() => toggleBot(bot.id)}
                  style={{ cursor: 'pointer' }}
                />
              </label>
            </div>

            {/* Simulated execution metrics */}
            <div style={{ background: '#070b14', borderRadius: '4px', padding: '8px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px' }}>
              <div>
                <span style={{ color: '#8e8e93', display: 'block', fontSize: '8px' }}>P&amp;L</span>
                <strong style={{ color: bot.pnl >= 0 ? '#00c076' : '#ff4d57', fontFamily: 'var(--font-mono)' }}>
                  {bot.pnl >= 0 ? '+' : ''}${bot.pnl.toFixed(2)}
                </strong>
              </div>
              <div>
                <span style={{ color: '#8e8e93', display: 'block', fontSize: '8px' }}>Win Rate</span>
                <strong style={{ color: '#d4af37', fontFamily: 'var(--font-mono)' }}>{bot.winRate}%</strong>
              </div>
              <div>
                <span style={{ color: '#8e8e93', display: 'block', fontSize: '8px' }}>Trades</span>
                <strong style={{ color: '#f5f5f7', fontFamily: 'var(--font-mono)' }}>{bot.tradeCount}</strong>
              </div>
            </div>

            <div style={{ fontSize: '10px', color: '#8e8e93', borderBottom: '1px dashed #1b2235', paddingBottom: '6px' }}>
              Last Trade: <strong style={{ color: '#f5f5f7', fontFamily: 'var(--font-mono)' }}>{bot.lastTrade || 'None'}</strong>
            </div>

            {/* Configurations inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px' }}>
              {/* Symbol */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ color: '#8e8e93', fontSize: '9px' }}>Instrument Symbol</label>
                <select
                  value={bot.symbol}
                  onChange={(e) => updateBot(bot.id, { symbol: e.target.value })}
                  style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '3px', color: '#f5f5f7', padding: '3px 4px', fontSize: '10px', outline: 'none' }}
                >
                  {watchlist.map((w) => <option key={w.symbol} value={w.symbol}>{w.symbol}</option>)}
                </select>
              </div>

              {/* Timeframe */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ color: '#8e8e93', fontSize: '9px' }}>Timeframe</label>
                <select
                  value={bot.timeframe}
                  onChange={(e) => updateBot(bot.id, { timeframe: e.target.value })}
                  style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '3px', color: '#f5f5f7', padding: '3px 4px', fontSize: '10px', outline: 'none' }}
                >
                  {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
                </select>
              </div>

              {/* Position Size */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ color: '#8e8e93', fontSize: '9px' }}>Position Size (Lots)</label>
                <input
                  type="number"
                  step="0.01"
                  value={bot.positionSize}
                  onChange={(e) => updateBot(bot.id, { positionSize: Math.max(0.01, parseFloat(e.target.value) || 0.1) })}
                  style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '3px', color: '#f5f5f7', padding: '3px 4px', fontSize: '10px', outline: 'none' }}
                />
              </div>

              {/* Risk % */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ color: '#8e8e93', fontSize: '9px' }}>Risk per trade %</label>
                <input
                  type="number"
                  step="0.1"
                  value={bot.riskPct}
                  onChange={(e) => updateBot(bot.id, { riskPct: Math.max(0.1, parseFloat(e.target.value) || 1) })}
                  style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '3px', color: '#f5f5f7', padding: '3px 4px', fontSize: '10px', outline: 'none' }}
                />
              </div>

              {/* TP pips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ color: '#8e8e93', fontSize: '9px' }}>Take Profit (Pips)</label>
                <input
                  type="number"
                  value={bot.tpPips}
                  onChange={(e) => updateBot(bot.id, { tpPips: Math.max(1, parseInt(e.target.value) || 10) })}
                  style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '3px', color: '#f5f5f7', padding: '3px 4px', fontSize: '10px', outline: 'none' }}
                />
              </div>

              {/* SL pips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ color: '#8e8e93', fontSize: '9px' }}>Stop Loss (Pips)</label>
                <input
                  type="number"
                  value={bot.slPips}
                  onChange={(e) => updateBot(bot.id, { slPips: Math.max(1, parseInt(e.target.value) || 10) })}
                  style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '3px', color: '#f5f5f7', padding: '3px 4px', fontSize: '10px', outline: 'none' }}
                />
              </div>

              {/* Max daily trades */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ color: '#8e8e93', fontSize: '9px' }}>Max Trades / Day</label>
                <input
                  type="number"
                  value={bot.maxTradesPerDay}
                  onChange={(e) => updateBot(bot.id, { maxTradesPerDay: Math.max(1, parseInt(e.target.value) || 5) })}
                  style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '3px', color: '#f5f5f7', padding: '3px 4px', fontSize: '10px', outline: 'none' }}
                />
              </div>

              {/* Max daily loss */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={{ color: '#8e8e93', fontSize: '9px' }}>Max Daily Loss ($)</label>
                <input
                  type="number"
                  value={bot.maxDailyLoss}
                  onChange={(e) => updateBot(bot.id, { maxDailyLoss: Math.max(10, parseInt(e.target.value) || 500) })}
                  style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '3px', color: '#f5f5f7', padding: '3px 4px', fontSize: '10px', outline: 'none' }}
                />
              </div>
            </div>

            {/* Active Sessions Selectors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              <span style={{ color: '#8e8e93', fontSize: '9px' }}>Allowed Trading Sessions</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {SESSIONS.map((sess) => {
                  const active = bot.sessions.includes(sess);
                  return (
                    <label key={sess} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#f5f5f7', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => handleToggleSession(bot, sess)}
                        style={{ cursor: 'pointer' }}
                      />
                      {sess}
                    </label>
                  );
                })}
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};

export default AutomationPanel;
