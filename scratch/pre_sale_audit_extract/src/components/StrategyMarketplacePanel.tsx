// src/components/StrategyMarketplacePanel.tsx
import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';

interface Strategy {
  id: string;
  name: string;
  type: string;
  winRate: number;
  profitFactor: number;
  sharpe: number;
  drawdown: number;
  installed: boolean;
  author: string;
}

const STRATEGIES: Strategy[] = [
  { id: '1', name: 'EMA Golden Cross', type: 'Trend', winRate: 64.2, profitFactor: 1.85, sharpe: 1.62, drawdown: 5.4, installed: true, author: 'System' },
  { id: '2', name: 'RSI Reversal Mean-Rev', type: 'Reversal', winRate: 71.5, profitFactor: 2.12, sharpe: 2.10, drawdown: 3.8, installed: false, author: 'System' },
  { id: '3', name: 'MACD Divergence Edge', type: 'Trend', winRate: 58.9, profitFactor: 1.65, sharpe: 1.42, drawdown: 6.8, installed: false, author: 'Community' },
  { id: '4', name: 'Opening Range Breakout', type: 'Breakout', winRate: 52.4, profitFactor: 1.55, sharpe: 1.15, drawdown: 12.5, installed: false, author: 'System' }
];

const StrategyMarketplacePanel: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>(STRATEGIES);
  const [importText, setImportText] = useState('');
  const addToast = useAppStore((state) => state.addToast);

  const handleInstallToggle = (id: string, name: string) => {
    setStrategies((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextState = !s.installed;
          addToast('success', nextState ? `Strategy ${name} installed in active workspace` : `Strategy ${name} removed`);
          return { ...s, installed: nextState };
        }
        return s;
      })
    );
  };

  const handleClone = (name: string) => {
    addToast('success', `Cloned ${name} template to custom workspace strategy.`);
  };

  const handleExport = (name: string) => {
    const data = { strategy: name, version: '1.0.0', created: Date.now() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.toLowerCase().replace(/ /g, '_')}_config.json`;
    link.click();
    addToast('success', `Exported Strategy file for ${name}`);
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText) {
      addToast('error', 'Import JSON template cannot be empty');
      return;
    }
    try {
      const parsed = JSON.parse(importText);
      const newStrat: Strategy = {
        id: Math.random().toString(),
        name: parsed.name || 'Imported Custom Strategy',
        type: parsed.type || 'Custom',
        winRate: parsed.winRate || 50.0,
        profitFactor: parsed.profitFactor || 1.0,
        sharpe: parsed.sharpe || 1.0,
        drawdown: parsed.drawdown || 5.0,
        installed: false,
        author: 'User'
      };
      setStrategies((prev) => [...prev, newStrat]);
      setImportText('');
      addToast('success', `Imported Strategy Template: ${newStrat.name}`);
    } catch {
      addToast('error', 'Invalid Strategy Template JSON format');
    }
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: '14px', color: '#f5f5f7' }}>Strategy Marketplace</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Browse, clone, import and install execution algorithms</span>
        </div>
      </div>

      {/* Main split */}
      <div style={{ flex: 1, display: 'flex', gap: '12px', overflow: 'hidden' }}>
        
        {/* Left: Strategies Grid */}
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ background: '#0d1322', padding: '6px 10px', borderBottom: '1px solid #1b2235', fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
            Available Templates
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1b2235', color: '#8e8e93' }}>
                  <th style={{ padding: '6px 4px' }}>Strategy Name</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Win Rate</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Profit Factor</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Sharpe</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Max DD</th>
                  <th style={{ padding: '6px 4px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {strategies.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(27,34,53,0.3)' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 600, color: '#f5f5f7' }}>
                      {s.name}
                      <span style={{ fontSize: '8px', display: 'block', color: '#8e8e93', fontWeight: 400 }}>Type: {s.type} | Author: {s.author}</span>
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{s.winRate.toFixed(1)}%</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#00c076' }}>{s.profitFactor.toFixed(2)}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{s.sharpe.toFixed(2)}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#ff4d57' }}>-{s.drawdown.toFixed(1)}%</td>
                    <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleInstallToggle(s.id, s.name)}
                          style={{
                            padding: '3px 6px',
                            fontSize: '9px',
                            background: s.installed ? '#ff4d57' : '#00c076',
                            border: 'none',
                            color: '#070b14',
                            fontWeight: 700,
                            borderRadius: 3,
                            cursor: 'pointer'
                          }}
                        >
                          {s.installed ? 'Remove' : 'Install'}
                        </button>
                        <button
                          onClick={() => handleClone(s.name)}
                          style={{ padding: '3px 6px', fontSize: '9px', background: 'transparent', border: '1px solid #1b2235', color: '#8e8e93', borderRadius: 3, cursor: 'pointer' }}
                        >
                          Clone
                        </button>
                        <button
                          onClick={() => handleExport(s.name)}
                          style={{ padding: '3px 6px', fontSize: '9px', background: 'transparent', border: '1px solid #1b2235', color: '#8e8e93', borderRadius: 3, cursor: 'pointer' }}
                        >
                          Export
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Import strategy */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', gap: '6px', overflowY: 'auto' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
            Import Strategy Template
          </span>
          <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '9px', color: '#8e8e93' }}>Paste strategy template JSON configuration file below:</span>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`{\n  "name": "My Custom Strategy",\n  "type": "Trend following",\n  "winRate": 60.0,\n  "profitFactor": 1.7\n}`}
              style={{
                width: '100%',
                height: '140px',
                background: '#0d1322',
                border: '1px solid #1b2235',
                color: '#f5f5f7',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                padding: '8px',
                borderRadius: '3px',
                resize: 'none',
                outline: 'none'
              }}
            />
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
                cursor: 'pointer'
              }}
            >
              Parse &amp; Import Strategy
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};

export default StrategyMarketplacePanel;
