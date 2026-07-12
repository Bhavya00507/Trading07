// src/components/SettingsPanel.tsx
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { getApiUrl } from '../services/config';

type SettingsTab =
  | 'general'
  | 'trading'
  | 'charts'
  | 'workspace'
  | 'notifications'
  | 'appearance'
  | 'performance'
  | 'api'
  | 'shortcuts'
  | 'experimental';

export const SettingsPanel: React.FC = () => {
  const settings = useAppStore((s) => s.settings);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const addToast = useAppStore((s) => s.addToast);

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // General States
  const [lang, setLang] = useState('en');
  const [autosave, setAutosave] = useState(true);
  const [timezone, setTimezone] = useState('UTC');

  // Trading States
  const [oneClickTrading, setOneClickTrading] = useState(true);
  const [defaultTp, setDefaultTp] = useState('50');
  const [defaultSl, setDefaultSl] = useState('30');
  const [slippage, setSlippage] = useState('0.5');

  // Charts States
  const [crosshairStyle, setCrosshairStyle] = useState('cross');
  const [showGrids, setShowGrids] = useState(true);

  // Notifications States
  const [desktopAlerts, setDesktopAlerts] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');

  // Appearance States
  const [activeTheme, setActiveTheme] = useState('bloomberg');
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('accessibility-high-contrast') === 'true';
  });

  // Performance States
  const [maxFps, setMaxFps] = useState('60');
  const [virtualization, setVirtualization] = useState(true);
  const [workersCount, setWorkersCount] = useState('4');

  // API Connections States
  const [binanceKey, setBinanceKey] = useState('');
  const [bybitKey, setBybitKey] = useState('');
  const [coinbaseKey, setCoinbaseKey] = useState('');
  const [oandaToken, setOandaToken] = useState('');

  // Experimental States
  const [icebergSlicePct, setIcebergSlicePct] = useState('10');
  const [domIntensity, setDomIntensity] = useState('medium');

  // Apply high contrast theme class to body
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    localStorage.setItem('accessibility-high-contrast', highContrast.toString());
  }, [highContrast]);

  const handleSaveSettings = () => {
    addToast('success', 'Enterprise settings saved successfully!');
  };

  // Export Workspace to file
  const handleExportWorkspace = () => {
    const keysToExport = [
      'layout-watchlist-width',
      'layout-order-width',
      'layout-bottom-height',
      'layout-watchlist-open',
      'layout-order-open',
      'layout-bottom-open',
      'layout-fullscreen-chart',
      'trading-chart-layout',
      'trading-chart-cells',
      'bottom-panel-active-tab',
      'order-settings-type',
      'order-settings-qty',
      'order-settings-leverage',
      'accessibility-high-contrast'
    ];
    
    const data: Record<string, string | null> = {};
    keysToExport.forEach((key) => {
      data[key] = localStorage.getItem(key);
    });

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace_profile_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('success', 'Workspace exported to profile file!');
  };

  // Import Workspace from file
  const handleImportWorkspace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        Object.entries(data).forEach(([key, val]) => {
          if (val !== null) {
            localStorage.setItem(key, val as string);
          }
        });
        addToast('success', 'Workspace profile imported! Reloading view...');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        addToast('error', 'Failed to parse workspace profile file.');
      }
    };
    reader.readAsText(file);
  };

  // Reset Workspace
  const handleResetWorkspace = () => {
    const keysToRemove = [
      'layout-watchlist-width',
      'layout-order-width',
      'layout-bottom-height',
      'layout-watchlist-open',
      'layout-order-open',
      'layout-bottom-open',
      'layout-fullscreen-chart',
      'trading-chart-layout',
      'trading-chart-cells',
      'bottom-panel-active-tab',
      'order-settings-type',
      'order-settings-qty',
      'order-settings-leverage',
      'accessibility-high-contrast'
    ];
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    addToast('success', 'Workspace configurations reset to default. Reloading view...');
    setTimeout(() => window.location.reload(), 1000);
  };

  // Reset Paper Account
  const handleResetPaperAccount = async () => {
    try {
      const token = useAppStore.getState().token;
      const API_BASE = getApiUrl();
      const res = await fetch(`${API_BASE}/paper/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to reset paper account');
      }
      addToast('success', 'Demo & Paper accounts have been reset successfully!');
      await useAppStore.getState().syncState();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to reset paper account');
    }
  };

  const applyLayoutPreset = (preset: 'default' | 'chart-only' | 'trading' | 'analytics') => {
    switch (preset) {
      case 'default':
        localStorage.setItem('layout-watchlist-open', 'true');
        localStorage.setItem('layout-order-open', 'true');
        localStorage.setItem('layout-bottom-open', 'true');
        localStorage.setItem('layout-fullscreen-chart', 'false');
        localStorage.setItem('layout-watchlist-width', '260');
        localStorage.setItem('layout-order-width', '280');
        localStorage.setItem('layout-bottom-height', '280');
        break;
      case 'chart-only':
        localStorage.setItem('layout-watchlist-open', 'false');
        localStorage.setItem('layout-order-open', 'false');
        localStorage.setItem('layout-bottom-open', 'false');
        localStorage.setItem('layout-fullscreen-chart', 'true');
        break;
      case 'trading':
        localStorage.setItem('layout-watchlist-open', 'true');
        localStorage.setItem('layout-order-open', 'true');
        localStorage.setItem('layout-bottom-open', 'false');
        localStorage.setItem('layout-fullscreen-chart', 'false');
        localStorage.setItem('layout-watchlist-width', '220');
        localStorage.setItem('layout-order-width', '320');
        break;
      case 'analytics':
        localStorage.setItem('layout-watchlist-open', 'false');
        localStorage.setItem('layout-order-open', 'false');
        localStorage.setItem('layout-bottom-open', 'true');
        localStorage.setItem('layout-fullscreen-chart', 'false');
        localStorage.setItem('layout-bottom-height', '450');
        break;
    }
    addToast('success', `Applied ${preset.toUpperCase()} layout preset! Reloading view.`);
    setTimeout(() => window.location.reload(), 1000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '13px', color: '#d4af37', textTransform: 'uppercase' }}>General System Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#8e8e93', fontWeight: 600 }}>System Language</label>
                <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ padding: '6px', background: '#070b14', border: '1px solid #1b2235', color: '#fff', borderRadius: '3px' }}>
                  <option value="en">English (US)</option>
                  <option value="de">Deutsch</option>
                  <option value="ja">日本語</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#8e8e93', fontWeight: 600 }}>Default Timezone</label>
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)} style={{ padding: '6px', background: '#070b14', border: '1px solid #1b2235', color: '#fff', borderRadius: '3px' }}>
                  <option value="UTC">UTC (Greenwich Mean Time)</option>
                  <option value="EST">EST (Eastern Standard Time)</option>
                  <option value="IST">IST (Indian Standard Time)</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <input type="checkbox" id="gen-autosave" checked={autosave} onChange={(e) => setAutosave(e.target.checked)} />
                <label htmlFor="gen-autosave" style={{ color: '#8e8e93', cursor: 'pointer' }}>Automatically save layout workspace changes</label>
              </div>
            </div>
          </div>
        );
      case 'trading':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '13px', color: '#d4af37', textTransform: 'uppercase' }}>Execution & Trading Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="oneclick" checked={oneClickTrading} onChange={(e) => setOneClickTrading(e.target.checked)} />
                <label htmlFor="oneclick" style={{ color: '#8e8e93', cursor: 'pointer', fontWeight: 600 }}>Enable One-Click Trading (MKT order execution on click)</label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                <label style={{ color: '#8e8e93', fontWeight: 600 }}>Default Take Profit Distance (pips/ticks)</label>
                <input type="number" value={defaultTp} onChange={(e) => setDefaultTp(e.target.value)} style={{ padding: '6px', background: '#070b14', border: '1px solid #1b2235', color: '#fff', borderRadius: '3px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#8e8e93', fontWeight: 600 }}>Default Stop Loss Distance (pips/ticks)</label>
                <input type="number" value={defaultSl} onChange={(e) => setDefaultSl(e.target.value)} style={{ padding: '6px', background: '#070b14', border: '1px solid #1b2235', color: '#fff', borderRadius: '3px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#8e8e93', fontWeight: 600 }}>Slippage Tolerance (%)</label>
                <input type="number" step="0.1" value={slippage} onChange={(e) => setSlippage(e.target.value)} style={{ padding: '6px', background: '#070b14', border: '1px solid #1b2235', color: '#fff', borderRadius: '3px' }} />
              </div>
            </div>
          </div>
        );
      case 'charts':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '13px', color: '#d4af37', textTransform: 'uppercase' }}>Chart Parameters</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#8e8e93', fontWeight: 600 }}>Crosshair Style</label>
                <select value={crosshairStyle} onChange={(e) => setCrosshairStyle(e.target.value)} style={{ padding: '6px', background: '#070b14', border: '1px solid #1b2235', color: '#fff', borderRadius: '3px' }}>
                  <option value="cross">Standard Crosshair (X and Y Lines)</option>
                  <option value="dot">Target Dot Pointer</option>
                  <option value="hidden">Hidden cursor tracking</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <input type="checkbox" id="show-grids" checked={showGrids} onChange={(e) => setShowGrids(e.target.checked)} />
                <label htmlFor="show-grids" style={{ color: '#8e8e93', cursor: 'pointer' }}>Render horizontal and vertical chart gridlines</label>
              </div>
            </div>
          </div>
        );
      case 'workspace':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '13px', color: '#d4af37', textTransform: 'uppercase' }}>Workspace Profile Management</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', color: '#8e8e93', fontWeight: 600, marginBottom: '6px' }}>Layout Preset Templates</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['default', 'chart-only', 'trading', 'analytics'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => applyLayoutPreset(preset as any)}
                      style={{
                        padding: '6px 10px',
                        background: '#070b14',
                        color: '#fff',
                        border: '1px solid #1b2235',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '9px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      {preset.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid #1b2235', paddingTop: '12px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ color: '#8e8e93', fontWeight: 600 }}>Backup, Restore & Reset</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleExportWorkspace} style={{ flex: 1, padding: '8px 12px', background: '#00c076', color: '#070b14', border: 'none', borderRadius: '3px', fontWeight: 700, cursor: 'pointer' }}>
                    Export Profile File
                  </button>
                  <label style={{ flex: 1, padding: '8px 12px', background: 'transparent', color: '#fff', border: '1px solid #1b2235', borderRadius: '3px', fontWeight: 700, cursor: 'pointer', textAlign: 'center', fontSize: '11px' }}>
                    Import Profile File
                    <input type="file" accept=".json" onChange={handleImportWorkspace} style={{ display: 'none' }} />
                  </label>
                </div>
                <button onClick={handleResetPaperAccount} style={{ padding: '8px 12px', background: '#ffc107', color: '#070b14', border: 'none', borderRadius: '3px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}>
                  Reset Paper Account (Drawdown & Positions)
                </button>
                <button onClick={handleResetWorkspace} style={{ padding: '8px 12px', background: '#ff4d57', color: '#fff', border: 'none', borderRadius: '3px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}>
                  Reset Workspace to Factory Defaults
                </button>
              </div>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '13px', color: '#d4af37', textTransform: 'uppercase' }}>Alert Notifications</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="desktop-alerts" checked={desktopAlerts} onChange={(e) => setDesktopAlerts(e.target.checked)} />
                <label htmlFor="desktop-alerts" style={{ color: '#8e8e93', cursor: 'pointer' }}>Enable System HTML5 Desktop Notifications</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="sound-alerts" checked={soundsEnabled} onChange={(e) => setSoundsEnabled(e.target.checked)} />
                <label htmlFor="sound-alerts" style={{ color: '#8e8e93', cursor: 'pointer' }}>Enable execution and price alert sound triggers</label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                <label style={{ color: '#8e8e93', fontWeight: 600 }}>Discord Integration (Webhook URL)</label>
                <input type="text" value={discordWebhook} onChange={(e) => setDiscordWebhook(e.target.value)} placeholder="https://discord.com/api/webhooks/..." style={{ padding: '6px', background: '#070b14', border: '1px solid #1b2235', color: '#fff', borderRadius: '3px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#8e8e93', fontWeight: 600 }}>Telegram Channel / Chat ID</label>
                <input type="text" value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} placeholder="e.g. -100123456789" style={{ padding: '6px', background: '#070b14', border: '1px solid #1b2235', color: '#fff', borderRadius: '3px' }} />
              </div>
            </div>
          </div>
        );
      case 'appearance':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '13px', color: '#d4af37', textTransform: 'uppercase' }}>Appearance & Theme Editor</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', color: '#8e8e93', fontWeight: 600, marginBottom: '6px' }}>Theme Presets</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['bloomberg', 'cyberpunk', 'classic_dark', 'ice_blue'].map((theme) => (
                    <button
                      key={theme}
                      onClick={() => {
                        setActiveTheme(theme);
                        toggleTheme();
                        addToast('info', `Switched theme to: ${theme.toUpperCase()}`);
                      }}
                      style={{
                        background: activeTheme === theme ? '#d4af37' : '#070b14',
                        color: activeTheme === theme ? '#070b14' : '#8e8e93',
                        border: '1px solid #1b2235',
                        padding: '6px 12px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        fontSize: '9px',
                      }}
                    >
                      {theme.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #1b2235', paddingTop: '12px', marginTop: '6px' }}>
                <span style={{ color: '#8e8e93', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Accessibility Tools</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="high-contrast-toggle" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />
                  <label htmlFor="high-contrast-toggle" style={{ color: '#ffeb3b', cursor: 'pointer', fontWeight: 700 }}>Enable High Contrast Accessibility Theme</label>
                </div>
              </div>
            </div>
          </div>
        );
      case 'performance':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '13px', color: '#d4af37', textTransform: 'uppercase' }}>Performance Capping</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#8e8e93', fontWeight: 600 }}>Chart Frame Rate Cap (FPS)</label>
                <select value={maxFps} onChange={(e) => setMaxFps(e.target.value)} style={{ padding: '6px', background: '#070b14', border: '1px solid #1b2235', color: '#fff', borderRadius: '3px' }}>
                  <option value="60">60 FPS (Super Smooth)</option>
                  <option value="30">30 FPS (Power Saving / Performance Mode)</option>
                  <option value="15">15 FPS (Battery Saver)</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <input type="checkbox" id="virtualize" checked={virtualization} onChange={(e) => setVirtualization(e.target.checked)} />
                <label htmlFor="virtualize" style={{ color: '#8e8e93', cursor: 'pointer' }}>Enable DOM table virtualization for order lists (Faster rendering)</label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                <label style={{ color: '#8e8e93', fontWeight: 600 }}>Web Worker Threads allocated for technical indicators calculations</label>
                <input type="number" value={workersCount} onChange={(e) => setWorkersCount(e.target.value)} style={{ padding: '6px', background: '#070b14', border: '1px solid #1b2235', color: '#fff', borderRadius: '3px' }} />
              </div>
            </div>
          </div>
        );
      case 'api':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '13px', color: '#d4af37', textTransform: 'uppercase' }}>External Broker API Connections</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#8e8e93', fontWeight: 600 }}>Binance API Key</label>
                <input type="text" value={binanceKey} onChange={(e) => setBinanceKey(e.target.value)} placeholder="Paste key..." style={{ padding: '6px', background: '#070b14', border: '1px solid #1b2235', color: '#fff', borderRadius: '3px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#8e8e93', fontWeight: 600 }}>Bybit API Key</label>
                <input type="text" value={bybitKey} onChange={(e) => setBybitKey(e.target.value)} placeholder="Paste key..." style={{ padding: '6px', background: '#070b14', border: '1px solid #1b2235', color: '#fff', borderRadius: '3px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#8e8e93', fontWeight: 600 }}>Coinbase Pro API Secret Key</label>
                <input type="password" value={coinbaseKey} onChange={(e) => setCoinbaseKey(e.target.value)} placeholder="••••••••••••••••" style={{ padding: '6px', background: '#070b14', border: '1px solid #1b2235', color: '#fff', borderRadius: '3px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#8e8e93', fontWeight: 600 }}>OANDA Access Token</label>
                <input type="text" value={oandaToken} onChange={(e) => setOandaToken(e.target.value)} placeholder="Paste bearer token..." style={{ padding: '6px', background: '#070b14', border: '1px solid #1b2235', color: '#fff', borderRadius: '3px' }} />
              </div>
            </div>
          </div>
        );
      case 'shortcuts':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '13px', color: '#d4af37', textTransform: 'uppercase' }}>Professional Keyboard Keybinds</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ background: '#070b14', color: '#8e8e93' }}>
                  <th style={{ padding: '4px 6px' }}>KEY SHORTCUT</th>
                  <th style={{ padding: '4px 6px' }}>ACTION DESCRIPTION</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #1b2235' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 700, color: 'var(--accent)' }}>Space</td>
                  <td style={{ padding: '5px 6px' }}>Quick buy market order on selected instrument (0.1 quantity)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1b2235' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 700, color: 'var(--accent)' }}>Shift + Space</td>
                  <td style={{ padding: '5px 6px' }}>Quick sell market order on selected instrument (0.1 quantity)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1b2235' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 700, color: 'var(--accent)' }}>Ctrl + 1</td>
                  <td style={{ padding: '5px 6px' }}>Open Bottom Panel and switch to Positions tab</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1b2235' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 700, color: 'var(--accent)' }}>Ctrl + 2</td>
                  <td style={{ padding: '5px 6px' }}>Open Bottom Panel and switch to Orders tab</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1b2235' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 700, color: 'var(--accent)' }}>Ctrl + 3</td>
                  <td style={{ padding: '5px 6px' }}>Open Bottom Panel and switch to History tab</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1b2235' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 700, color: 'var(--accent)' }}>Ctrl + K</td>
                  <td style={{ padding: '5px 6px' }}>Open global institutional Command Palette</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1b2235' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 700, color: 'var(--accent)' }}>F1</td>
                  <td style={{ padding: '5px 6px' }}>Open Settings page</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1b2235' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 700, color: 'var(--accent)' }}>F2</td>
                  <td style={{ padding: '5px 6px' }}>Open quick SL/TP modification prompt for active position</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1b2235' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 700, color: 'var(--accent)' }}>F5</td>
                  <td style={{ padding: '5px 6px' }}>Force reconnect data feeds & synchronize terminal state</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1b2235' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 700, color: 'var(--accent)' }}>F9</td>
                  <td style={{ padding: '5px 6px' }}>Toggle Right Order Entry panel</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1b2235' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 700, color: 'var(--accent)' }}>Delete</td>
                  <td style={{ padding: '5px 6px' }}>Cancel last pending order</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1b2235' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 700, color: 'var(--accent)' }}>Esc</td>
                  <td style={{ padding: '5px 6px' }}>Close active floating panels & menus</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1b2235' }}>
                  <td style={{ padding: '5px 6px', fontWeight: 700, color: 'var(--accent)' }}>Alt + Click</td>
                  <td style={{ padding: '5px 6px' }}>Create custom Price Alert trigger on the chart cell canvas</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      case 'experimental':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '13px', color: '#d4af37', textTransform: 'uppercase' }}>Experimental Features</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#8e8e93', fontWeight: 600 }}>Iceberg Order Auto-Slice ratio (%)</label>
                <input type="number" value={icebergSlicePct} onChange={(e) => setIcebergSlicePct(e.target.value)} style={{ padding: '6px', background: '#070b14', border: '1px solid #1b2235', color: '#fff', borderRadius: '3px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ color: '#8e8e93', fontWeight: 600 }}>DOM book order depth contrast level</label>
                <select value={domIntensity} onChange={(e) => setDomIntensity(e.target.value)} style={{ padding: '6px', background: '#070b14', border: '1px solid #1b2235', color: '#fff', borderRadius: '3px' }}>
                  <option value="low">Low contrast highlighting</option>
                  <option value="medium">Medium</option>
                  <option value="high">High contrast (Bloomberg mode)</option>
                </select>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'trading', label: 'Trading' },
    { key: 'charts', label: 'Charts' },
    { key: 'workspace', label: 'Workspace' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'appearance', label: 'Appearance' },
    { key: 'performance', label: 'Performance' },
    { key: 'api', label: 'API Connections' },
    { key: 'shortcuts', label: 'Shortcuts cheatsheet' },
    { key: 'experimental', label: 'Experimental' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      height: '100%',
      background: '#0d1322',
      color: '#fff',
      padding: '16px',
      gap: '24px',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      fontSize: '11px',
    }}>
      {/* Sidebar navigation */}
      <div style={{
        width: '180px',
        borderRight: '1px solid #1b2235',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        paddingRight: '16px',
        overflowY: 'auto'
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: '#d4af37' }}>Settings Center</h2>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 12px',
              textAlign: 'left',
              background: activeTab === t.key ? 'var(--accent-glow)' : 'transparent',
              color: activeTab === t.key ? 'var(--accent)' : '#8e8e93',
              border: activeTab === t.key ? '1px solid var(--accent)' : '1px solid transparent',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '10px',
              textTransform: 'uppercase',
              transition: 'all 0.15s ease'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main settings options content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        maxHeight: '100%',
        paddingRight: '6px'
      }}>
        <div style={{ flex: 1 }}>{renderContent()}</div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          borderTop: '1px solid #1b2235',
          paddingTop: '16px',
          marginTop: '24px'
        }}>
          <button
            onClick={handleSaveSettings}
            style={{
              padding: '8px 24px',
              background: 'var(--accent)',
              color: '#070b14',
              border: 'none',
              borderRadius: '3px',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SettingsPanel);
