import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../services/config';

interface WebhookKeyItem {
  id: string;
  name: string;
  api_key_prefix: string;
  broker: string;
  enabled: bool;
  created_at: string;
  last_used?: string;
  raw_api_key?: string;
}

interface WebhookLogItem {
  id: string;
  timestamp: string;
  symbol: string;
  action: string;
  status: string;
  broker: string;
  latency_ms: number;
  error?: string;
  request_payload?: string;
  response_payload?: string;
}

export const AutomationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'webhooks' | 'logs' | 'guide'>('webhooks');
  const [keys, setKeys] = useState<WebhookKeyItem[]>([]);
  const [logs, setLogs] = useState<WebhookLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [newKeyBroker, setNewKeyBroker] = useState<string>('paper');
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ status: string; latency_ms: number } | null>(null);
  const [testing, setTesting] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const baseUrl = getApiUrl();
  const webhookExecUrl = `${baseUrl}/api/webhooks/execute`;

  const fetchKeys = async () => {
    try {
      const token = localStorage.getItem('quantum_token') || localStorage.getItem('access_token');
      const res = await fetch(`${baseUrl}/api/webhooks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      }
    } catch (e) {
      console.error('Error fetching webhook keys:', e);
    }
  };

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('quantum_token') || localStorage.getItem('access_token');
      const res = await fetch(`${baseUrl}/api/webhooks/logs?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Error fetching webhook logs:', e);
    }
  };

  useEffect(() => {
    fetchKeys();
    fetchLogs();
    const interval = setInterval(() => {
      fetchLogs();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('quantum_token') || localStorage.getItem('access_token');
      const res = await fetch(`${baseUrl}/api/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newKeyName, broker: newKeyBroker })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedRawKey(data.raw_api_key);
        setNewKeyName('');
        fetchKeys();
      }
    } catch (e) {
      console.error('Error creating key:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const token = localStorage.getItem('quantum_token') || localStorage.getItem('access_token');
      await fetch(`${baseUrl}/api/webhooks/${id}/toggle`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchKeys();
    } catch (e) {
      console.error('Error toggling key:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this webhook key?')) return;
    try {
      const token = localStorage.getItem('quantum_token') || localStorage.getItem('access_token');
      await fetch(`${baseUrl}/api/webhooks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchKeys();
    } catch (e) {
      console.error('Error deleting key:', e);
    }
  };

  const handleTestWebhook = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('quantum_token') || localStorage.getItem('access_token');
      const res = await fetch(`${baseUrl}/api/webhooks/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
        fetchLogs();
      }
    } catch (e) {
      console.error('Error testing webhook:', e);
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#090d16',
      color: '#e0e0e0',
      fontFamily: "'Inter', sans-serif",
      padding: '20px',
      overflowY: 'auto'
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#00f0ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚡ TradingView & Webhook Execution Gateway
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#8e8e93' }}>
            Automate live executions from TradingView, PineScript, Python, or NinjaTrader directly into Quantum Terminal engine.
          </p>
        </div>

        <button
          onClick={handleTestWebhook}
          disabled={testing}
          style={{
            backgroundColor: testing ? '#333' : '#00f0ff',
            color: testing ? '#888' : '#000',
            fontWeight: 600,
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: testing ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {testing ? 'Sending Test...' : '🧪 Send Test Webhook'}
        </button>
      </div>

      {testResult && (
        <div style={{
          backgroundColor: '#121824',
          border: '1px solid #00f0ff',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '20px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong style={{ color: '#00f0ff' }}>Test Webhook Executed Successfully!</strong>
            <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
              Simulated Market Order placed on Paper account.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#00e676' }}>
              ⚡ {testResult.latency_ms} ms
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #1e2638', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('webhooks')}
          style={{
            padding: '8px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'webhooks' ? '2px solid #00f0ff' : '2px solid transparent',
            color: activeTab === 'webhooks' ? '#00f0ff' : '#8e8e93',
            fontWeight: activeTab === 'webhooks' ? 600 : 400,
            cursor: 'pointer'
          }}
        >
          API Keys & Webhooks ({keys.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          style={{
            padding: '8px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'logs' ? '2px solid #00f0ff' : '2px solid transparent',
            color: activeTab === 'logs' ? '#00f0ff' : '#8e8e93',
            fontWeight: activeTab === 'logs' ? 600 : 400,
            cursor: 'pointer'
          }}
        >
          Live Execution Logs ({logs.length})
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          style={{
            padding: '8px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'guide' ? '2px solid #00f0ff' : '2px solid transparent',
            color: activeTab === 'guide' ? '#00f0ff' : '#8e8e93',
            fontWeight: activeTab === 'guide' ? 600 : 400,
            cursor: 'pointer'
          }}
        >
          📖 Integration Guide & Code Snippets
        </button>
      </div>

      {/* TAB 1: WEBHOOK KEYS */}
      {activeTab === 'webhooks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Create Key Form */}
          <form onSubmit={handleCreateKey} style={{
            backgroundColor: '#121824',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #1e2638',
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <input
              type="text"
              placeholder="Webhook Key Name (e.g. TradingView PineScript Bot)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                backgroundColor: '#090d16',
                border: '1px solid #1e2638',
                borderRadius: '6px',
                color: '#fff'
              }}
              required
            />

            <select
              value={newKeyBroker}
              onChange={(e) => setNewKeyBroker(e.target.value)}
              style={{
                padding: '10px 14px',
                backgroundColor: '#090d16',
                border: '1px solid #1e2638',
                borderRadius: '6px',
                color: '#fff'
              }}
            >
              <option value="paper">Paper Trading Account</option>
              <option value="mt5">MetaTrader 5 (MT5)</option>
              <option value="binance">Binance Futures</option>
              <option value="bybit">Bybit Derivatives</option>
              <option value="alpaca">Alpaca Securities</option>
            </select>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#00f0ff',
                color: '#000',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Generating...' : '+ Generate API Key'}
            </button>
          </form>

          {generatedRawKey && (
            <div style={{
              backgroundColor: '#1e2814',
              border: '1px solid #00e676',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <strong style={{ color: '#00e676', fontSize: '14px' }}>
                ⚠️ Save Your API Key Now (It will not be displayed again):
              </strong>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '10px',
                backgroundColor: '#090d16',
                padding: '10px',
                borderRadius: '6px',
                fontFamily: 'monospace'
              }}>
                <span style={{ flex: 1, color: '#00f0ff', wordBreak: 'break-all' }}>{generatedRawKey}</span>
                <button
                  onClick={() => copyToClipboard(generatedRawKey, 'raw_key')}
                  style={{
                    backgroundColor: '#1e2638',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {copiedField === 'raw_key' ? 'Copied!' : 'Copy Key'}
                </button>
              </div>
            </div>
          )}

          {/* Webhook Keys Table */}
          <div style={{ backgroundColor: '#121824', borderRadius: '8px', border: '1px solid #1e2638', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0e1420', textAlign: 'left', color: '#8e8e93', borderBottom: '1px solid #1e2638' }}>
                  <th style={{ padding: '12px 16px' }}>Name</th>
                  <th style={{ padding: '12px 16px' }}>API Key Prefix</th>
                  <th style={{ padding: '12px 16px' }}>Target Broker</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Created</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                      No webhook API keys created yet. Click "+ Generate API Key" above.
                    </td>
                  </tr>
                ) : (
                  keys.map((k) => (
                    <tr key={k.id} style={{ borderBottom: '1px solid #1e2638' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{k.name}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#00f0ff' }}>
                        {k.api_key_prefix}...
                      </td>
                      <td style={{ padding: '12px 16px', textTransform: 'uppercase' }}>{k.broker}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          backgroundColor: k.enabled ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)',
                          color: k.enabled ? '#00e676' : '#ff5252'
                        }}>
                          {k.enabled ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#888' }}>
                        {new Date(k.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleToggle(k.id)}
                          style={{
                            marginRight: '8px',
                            padding: '4px 10px',
                            backgroundColor: '#1e2638',
                            color: '#e0e0e0',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          {k.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDelete(k.id)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: 'rgba(255,82,82,0.2)',
                            color: '#ff5252',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EXECUTION LOGS */}
      {activeTab === 'logs' && (
        <div style={{ backgroundColor: '#121824', borderRadius: '8px', border: '1px solid #1e2638', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0e1420', textAlign: 'left', color: '#8e8e93', borderBottom: '1px solid #1e2638' }}>
                <th style={{ padding: '12px 16px' }}>Time</th>
                <th style={{ padding: '12px 16px' }}>Symbol</th>
                <th style={{ padding: '12px 16px' }}>Action</th>
                <th style={{ padding: '12px 16px' }}>Broker</th>
                <th style={{ padding: '12px 16px' }}>Latency</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Error Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                    No execution logs captured yet. Send a test webhook to generate logs.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #1e2638' }}>
                    <td style={{ padding: '12px 16px', color: '#888' }}>
                      {new Date(l.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{l.symbol}</td>
                    <td style={{ padding: '12px 16px', textTransform: 'uppercase', color: l.action.includes('buy') ? '#00e676' : '#ff5252' }}>
                      {l.action}
                    </td>
                    <td style={{ padding: '12px 16px', textTransform: 'uppercase' }}>{l.broker}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#00f0ff' }}>
                      ⚡ {l.latency_ms} ms
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        backgroundColor: l.status === 'success' ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)',
                        color: l.status === 'success' ? '#00e676' : '#ff5252'
                      }}>
                        {l.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#ff5252', fontSize: '12px' }}>
                      {l.error || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: INTEGRATION GUIDE */}
      {activeTab === 'guide' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Webhook Execution URL */}
          <div style={{ backgroundColor: '#121824', padding: '16px', borderRadius: '8px', border: '1px solid #1e2638' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#00f0ff' }}>1. Endpoint URL</h4>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#090d16',
              padding: '10px 14px',
              borderRadius: '6px',
              fontFamily: 'monospace'
            }}>
              <span style={{ flex: 1, color: '#fff' }}>POST {webhookExecUrl}</span>
              <button
                onClick={() => copyToClipboard(webhookExecUrl, 'url')}
                style={{ backgroundColor: '#1e2638', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
              >
                {copiedField === 'url' ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
          </div>

          {/* TradingView PineScript Example */}
          <div style={{ backgroundColor: '#121824', padding: '16px', borderRadius: '8px', border: '1px solid #1e2638' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#00f0ff' }}>2. TradingView Alert Message JSON Payload</h4>
            <pre style={{
              backgroundColor: '#090d16',
              padding: '14px',
              borderRadius: '6px',
              color: '#00e676',
              fontFamily: 'monospace',
              fontSize: '12px',
              overflowX: 'auto'
            }}>
{`{
  "api_key": "YOUR_GENERATED_64_CHAR_KEY",
  "broker": "paper",
  "symbol": "{{ticker}}",
  "action": "buy",
  "type": "market",
  "volume": 0.05,
  "sl": 62000,
  "tp": 65000,
  "comment": "TradingView Alert Strategy"
}`}
            </pre>
          </div>

          {/* Python Example */}
          <div style={{ backgroundColor: '#121824', padding: '16px', borderRadius: '8px', border: '1px solid #1e2638' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#00f0ff' }}>3. Python `requests` Execution Example</h4>
            <pre style={{
              backgroundColor: '#090d16',
              padding: '14px',
              borderRadius: '6px',
              color: '#9cdcfe',
              fontFamily: 'monospace',
              fontSize: '12px',
              overflowX: 'auto'
            }}>
{`import requests

url = "${webhookExecUrl}"
payload = {
    "api_key": "YOUR_GENERATED_64_CHAR_KEY",
    "broker": "paper",
    "symbol": "BTCUSDT",
    "action": "buy",
    "type": "market",
    "volume": 0.01
}

response = requests.post(url, json=payload)
print(response.json())`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
