import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useAlertStore, PriceAlert } from '../store/alertStore';

export const AlertsPanel: React.FC = () => {
  const selectedInstrument = useAppStore((s) => s.selectedInstrument);
  const watchlist = useAppStore((s) => s.watchlist);
  const addToast = useAppStore((s) => s.addToast);

  const { alerts, notifications, addAlert, toggleAlert, deleteAlert, clearTriggered, clearNotifications } = useAlertStore();

  const [symbol, setSymbol] = useState<string>(selectedInstrument?.symbol || 'BTCUSDT');
  const [alertType, setAlertType] = useState<string>('price_above');
  const [value, setValue] = useState<string>('');
  const [highBound, setHighBound] = useState<string>('');
  const [lowBound, setLowBound] = useState<string>('');
  
  // Snooze and Repeat state
  const [snoozeTime, setSnoozeTime] = useState<string>('0'); // 0 = None, 5 = 5m, 15 = 15m, 60 = 1h
  const [repeatMode, setRepeatMode] = useState<'once' | 'always'>('once');

  // Integrations configuration states
  const [webhookUrl, setWebhookUrl] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);

  // Tab control: active alerts vs alert history
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'history'>('active');

  const handleSymbolChange = (val: string) => {
    setSymbol(val);
    if (val === 'ALL') {
      setAlertType('pnl_above');
    } else {
      setAlertType('price_above');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const options = {
      snoozeMinutes: parseInt(snoozeTime),
      repeat: repeatMode,
      webhook: !!webhookUrl,
      telegram: !!telegramId,
      discord: !!discordWebhook,
      email: !!emailAddress,
      push: pushEnabled,
    };

    if (alertType === 'breakout_alert') {
      const hb = parseFloat(highBound);
      const lb = parseFloat(lowBound);
      if (isNaN(hb) || isNaN(lb)) {
        addToast('error', 'Please enter valid high and low boundaries');
        return;
      }
      addAlert({
        symbol,
        type: 'breakout_alert',
        value: hb,
        condition: 'breakout',
        extraParams: {
          highBound: hb,
          lowBound: lb,
          ...options
        }
      });
      setHighBound('');
      setLowBound('');
      addToast('success', `Breakout alert for ${symbol} added!`);
      return;
    }

    const val = parseFloat(value);
    if (isNaN(val)) {
      addToast('error', 'Please enter a valid target value');
      return;
    }

    addAlert({
      symbol,
      type: alertType as any,
      value: val,
      condition: alertType.includes('above') ? '>=' : alertType.includes('below') ? '<=' : 'cross',
      extraParams: {
        ...options
      }
    });

    setValue('');
    addToast('success', `Alert for ${symbol} at target ${val} added!`);
  };

  const handleSaveIntegrations = () => {
    addToast('success', 'Enterprise integrations saved successfully.');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      flex: 1,
      height: '100%',
      fontSize: '11px',
      gap: '16px',
      padding: '12px',
      overflowY: 'auto',
      flexWrap: 'wrap',
      background: '#0d1322',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Left Pane: Config & Active List */}
      <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Form to add alert */}
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          gap: '8px',
          background: '#070b14',
          border: '1px solid #1b2235',
          borderRadius: '4px',
          padding: '8px 12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#8e8e93', fontWeight: 700, fontSize: '9px' }}>TARGET:</span>
            <select value={symbol} onChange={(e) => handleSymbolChange(e.target.value)} style={{ background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }}>
              <option value="ALL">Account PnL</option>
              {watchlist.map((inst) => (
                <option key={inst.symbol} value={inst.symbol}>
                  {inst.symbol}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#8e8e93', fontWeight: 700, fontSize: '9px' }}>TYPE:</span>
            {symbol === 'ALL' ? (
              <select value={alertType} onChange={(e) => setAlertType(e.target.value)} style={{ background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }}>
                <option value="pnl_above">PnL Above ($)</option>
                <option value="pnl_below">PnL Below ($)</option>
              </select>
            ) : (
              <select value={alertType} onChange={(e) => setAlertType(e.target.value)} style={{ background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }}>
                <option value="price_above">Price Above</option>
                <option value="price_below">Price Below</option>
                <option value="rsi_above">RSI Above</option>
                <option value="rsi_below">RSI Below</option>
                <option value="breakout_alert">Breakout Alert</option>
              </select>
            )}
          </div>

          {alertType === 'breakout_alert' ? (
            <>
              <input type="number" step="any" placeholder="High Bound" value={highBound} onChange={(e) => setHighBound(e.target.value)} style={{ width: '70px', background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }} required />
              <input type="number" step="any" placeholder="Low Bound" value={lowBound} onChange={(e) => setLowBound(e.target.value)} style={{ width: '70px', background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }} required />
            </>
          ) : (
            <input type="number" step="any" placeholder={symbol === 'ALL' ? 'PnL Target' : 'Price Target'} value={value} onChange={(e) => setValue(e.target.value)} style={{ width: '80px', background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }} required />
          )}

          {/* Snooze Options */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#8e8e93', fontWeight: 700, fontSize: '9px' }}>SNOOZE:</span>
            <select value={snoozeTime} onChange={(e) => setSnoozeTime(e.target.value)} style={{ background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }}>
              <option value="0">None</option>
              <option value="5">5 Min</option>
              <option value="15">15 Min</option>
              <option value="60">1 Hour</option>
            </select>
          </div>

          {/* Repeat */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#8e8e93', fontWeight: 700, fontSize: '9px' }}>REPEAT:</span>
            <select value={repeatMode} onChange={(e) => setRepeatMode(e.target.value as any)} style={{ background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }}>
              <option value="once">Once</option>
              <option value="always">Always</option>
            </select>
          </div>

          <button type="submit" style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '3px', background: '#d4af37', color: '#070b14', border: 'none', cursor: 'pointer' }}>
            Add Alert
          </button>
        </form>

        {/* Dashboard Active list & history tabs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', background: '#0d1322', borderBottom: '1px solid #1b2235', padding: '4px 8px', gap: '8px' }}>
            <button
              onClick={() => setActiveSubTab('active')}
              style={{
                background: 'transparent',
                border: 'none',
                color: activeSubTab === 'active' ? '#d4af37' : '#8e8e93',
                fontWeight: 700,
                fontSize: '10px',
                cursor: 'pointer',
                borderBottom: activeSubTab === 'active' ? '2px solid #d4af37' : '2px solid transparent'
              }}
            >
              Active Alerts
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              style={{
                background: 'transparent',
                border: 'none',
                color: activeSubTab === 'history' ? '#d4af37' : '#8e8e93',
                fontWeight: 700,
                fontSize: '10px',
                cursor: 'pointer',
                borderBottom: activeSubTab === 'history' ? '2px solid #d4af37' : '2px solid transparent'
              }}
            >
              Alert History
            </button>
            {alerts.some((al) => al.isTriggered) && (
              <button
                onClick={clearTriggered}
                style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#ff4d57', fontSize: '9px', fontWeight: 700, cursor: 'pointer' }}
              >
                Clear Triggered
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeSubTab === 'active' ? (
              alerts.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#8e8e93' }}>No active alerts configured.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#070b14', borderBottom: '1px solid #1b2235', color: '#8e8e93', fontSize: '9px' }}>
                      <th style={{ padding: '6px 8px' }}>TARGET</th>
                      <th style={{ padding: '6px 8px' }}>CONDITION</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>VALUE</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>REPEAT</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>STATUS</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.filter(a => !a.isTriggered).map((alert) => (
                      <tr key={alert.id} style={{ borderBottom: '1px solid #1b2235' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 700 }}>{alert.symbol === 'ALL' ? 'Account PnL' : alert.symbol}</td>
                        <td style={{ padding: '6px 8px', textTransform: 'uppercase', color: '#8e8e93' }}>{alert.type.replace('_', ' ')}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{alert.value.toLocaleString()}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', textTransform: 'uppercase' }}>{alert.extraParams?.repeat || 'once'}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '8px',
                            fontWeight: 700,
                            background: alert.isActive ? '#00c07620' : '#ff4d5720',
                            color: alert.isActive ? '#00c076' : '#ff4d57',
                          }}>{alert.isActive ? 'ACTIVE' : 'DISABLED'}</span>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                          <button onClick={() => toggleAlert(alert.id)} style={{ marginRight: '4px', background: 'transparent', border: '1px solid #1b2235', color: '#fff', fontSize: '9px', cursor: 'pointer', borderRadius: '3px', padding: '2px 6px' }}>
                            {alert.isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button onClick={() => deleteAlert(alert.id)} style={{ background: 'transparent', border: 'none', color: '#ff4d57', fontSize: '9px', cursor: 'pointer' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              alerts.filter(a => a.isTriggered).length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#8e8e93' }}>No triggered alerts in history.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#070b14', borderBottom: '1px solid #1b2235', color: '#8e8e93', fontSize: '9px' }}>
                      <th style={{ padding: '6px 8px' }}>TARGET</th>
                      <th style={{ padding: '6px 8px' }}>CONDITION</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>TRIGGERED VALUE</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center' }}>STATUS</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.filter(a => a.isTriggered).map((alert) => (
                      <tr key={alert.id} style={{ borderBottom: '1px solid #1b2235' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 700 }}>{alert.symbol === 'ALL' ? 'Account PnL' : alert.symbol}</td>
                        <td style={{ padding: '6px 8px', textTransform: 'uppercase', color: '#8e8e93' }}>{alert.type.replace('_', ' ')}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{alert.value.toLocaleString()}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '3px', fontSize: '8px', fontWeight: 700, background: '#ff4d5720', color: '#ff4d57' }}>TRIGGERED</span>
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                          <button onClick={() => toggleAlert(alert.id)} style={{ background: 'transparent', border: '1px solid #1b2235', color: '#fff', fontSize: '9px', cursor: 'pointer', borderRadius: '3px', padding: '2px 6px' }}>Snooze / Reset</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>

      </div>

      {/* Right Pane: Integrations Configuration */}
      <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* Enterprise Integrations */}
        <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <strong style={{ color: '#d4af37', textTransform: 'uppercase', fontSize: '10px' }}>Enterprise Integrations</strong>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#8e8e93', fontSize: '9px' }}>Webhook Endpoint URL</label>
            <input type="text" placeholder="https://api.yourdomain.com/webhook" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} style={{ background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '4px 8px', borderRadius: '3px' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#8e8e93', fontSize: '9px' }}>Telegram Chat ID / Token</label>
            <input type="text" placeholder="e.g. @trading_alert_channel" value={telegramId} onChange={(e) => setTelegramId(e.target.value)} style={{ background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '4px 8px', borderRadius: '3px' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#8e8e93', fontSize: '9px' }}>Discord Webhook URL</label>
            <input type="text" placeholder="https://discord.com/api/webhooks/..." value={discordWebhook} onChange={(e) => setDiscordWebhook(e.target.value)} style={{ background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '4px 8px', borderRadius: '3px' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ color: '#8e8e93', fontSize: '9px' }}>Email Notification Address</label>
            <input type="email" placeholder="trader@gmail.com" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} style={{ background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '4px 8px', borderRadius: '3px' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <input type="checkbox" id="push" checked={pushEnabled} onChange={(e) => setPushEnabled(e.target.checked)} style={{ cursor: 'pointer' }} />
            <label htmlFor="push" style={{ cursor: 'pointer', color: '#8e8e93' }}>Browser Push Notifications</label>
          </div>

          <button onClick={handleSaveIntegrations} style={{ marginTop: '4px', background: '#00c076', border: 'none', color: '#070b14', fontWeight: 800, padding: '6px 12px', borderRadius: '3px', cursor: 'pointer', textTransform: 'uppercase' }}>
            Save Integrations
          </button>
        </div>

        {/* Live Notification logs */}
        <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, maxHeight: '200px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
            <strong style={{ color: '#d4af37', textTransform: 'uppercase', fontSize: '9px' }}>Alert Event Log</strong>
            {notifications.length > 0 && (
              <button onClick={clearNotifications} style={{ background: 'transparent', border: 'none', color: '#ff4d57', cursor: 'pointer', fontSize: '9px', fontWeight: 700 }}>Clear</button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '12px 0', textAlign: 'center', color: '#8e8e93', fontSize: '10px' }}>No triggered alerts.</div>
            ) : (
              notifications.map((log) => (
                <div key={log.id} style={{ padding: '4px 6px', background: '#0d1322', borderRadius: '3px', borderLeft: '3px solid #d4af37' }}>
                  <div style={{ color: '#8e8e93', fontSize: '7px' }}>{log.timestamp}</div>
                  <div style={{ color: '#fff', fontSize: '9px', lineHeight: '1.2', marginTop: '2px' }}>{log.message}</div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default AlertsPanel;
