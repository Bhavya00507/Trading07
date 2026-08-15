import React, { useState, useEffect } from 'react';

export const EnterpriseDeveloperPortalPanel: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'apikeys' | 'sdks' | 'webhooks' | 'whitelabel'>('overview');
  const [newKeyName, setNewKeyName] = useState<string>('Quant Trading Bot');
  const [newKeyRole, setNewKeyRole] = useState<string>('DEVELOPER');
  const [testWebhookEvent, setTestWebhookEvent] = useState<string>('ORDER_EXECUTED');

  const fetchOverview = () => {
    fetch('/api/enterprise/overview')
      .then(res => res.json())
      .then(d => setOverview(d))
      .catch(() => {});
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleCreateAPIKey = async () => {
    try {
      const res = await fetch('/api/enterprise/developer/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName, role: newKeyRole })
      });
      if (res.ok) {
        const d = await res.json();
        alert(`🔑 New API Key Created: ${d.api_key}`);
        fetchOverview();
      }
    } catch {}
  };

  const handleDispatchTestWebhook = async () => {
    try {
      const res = await fetch('/api/enterprise/webhooks/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: testWebhookEvent, payload: { symbol: 'BTCUSDT', volume: 1.5, side: 'BUY' } })
      });
      if (res.ok) {
        const d = await res.json();
        alert(`✅ Signed Webhook Dispatched! HMAC SHA-256 Signature: ${d.signature_sha256}`);
        fetchOverview();
      }
    } catch {}
  };

  if (!overview) return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#090d16',
      color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, padding: 16, gap: 14, overflowY: 'auto'
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 8 }}>
            🌐 ENTERPRISE API, DEVELOPER PLATFORM & GLOBAL CLOUD INFRASTRUCTURE (v7.0)
          </span>
          <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
            Public REST & WebSocket APIs | HMAC Signed Webhooks | Official SDKs | White-Label Customization | Multi-Region Infra
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setActiveTab('overview')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10, backgroundColor: activeTab === 'overview' ? '#38bdf8' : '#1e293b', color: activeTab === 'overview' ? '#0f172a' : '#cbd5e1' }}>🌐 Overview</button>
          <button onClick={() => setActiveTab('apikeys')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10, backgroundColor: activeTab === 'apikeys' ? '#10b981' : '#1e293b', color: activeTab === 'apikeys' ? '#0f172a' : '#cbd5e1' }}>🔑 API Keys</button>
          <button onClick={() => setActiveTab('sdks')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10, backgroundColor: activeTab === 'sdks' ? '#a78bfa' : '#1e293b', color: activeTab === 'sdks' ? '#0f172a' : '#cbd5e1' }}>📦 SDKs</button>
          <button onClick={() => setActiveTab('webhooks')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10, backgroundColor: activeTab === 'webhooks' ? '#f59e0b' : '#1e293b', color: activeTab === 'webhooks' ? '#0f172a' : '#cbd5e1' }}>⚓ Webhooks</button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Cloud Infrastructure Multi-Region Status */}
          <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontWeight: 800, color: '#10b981', fontSize: 12 }}>⚡ GLOBAL CLOUD INFRASTRUCTURE & MULTI-REGION TELEMETRY</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {overview.cloud_infrastructure?.regions?.map((reg: any, i: number) => (
                <div key={i} style={{ padding: 10, backgroundColor: '#1e293b', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{reg.region}</div>
                    <div style={{ color: '#10b981', fontSize: 9 }}>Status: {reg.status}</div>
                  </div>
                  <span style={{ fontWeight: 900, color: '#38bdf8' }}>{reg.latency_ms} ms</span>
                </div>
              ))}
            </div>
          </div>

          {/* White-Label Customization Preview */}
          <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: 12 }}>🎨 WHITE-LABEL PLATFORM BRANDING</span>
            <div style={{ color: '#cbd5e1', fontSize: 10 }}>Brand: <strong>{overview.white_label?.brand_name}</strong> | Domain: <strong>{overview.white_label?.custom_domain}</strong></div>
          </div>
        </>
      )}

      {activeTab === 'sdks' && (
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontWeight: 800, color: '#a78bfa', fontSize: 12 }}>📦 OFFICIAL QUANTUM DEVELOPER SDKS</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {overview.developer_portal?.sdks?.map((sdk: any) => (
              <div key={sdk.language} style={{ padding: 10, borderRadius: 6, backgroundColor: '#1e293b', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontWeight: 800, color: '#38bdf8' }}>{sdk.language} SDK (v{sdk.version})</div>
                <div style={{ color: '#94a3b8', fontSize: 9 }}>Package: {sdk.package} • {sdk.downloads?.toLocaleString()} downloads</div>
                <div style={{ padding: 4, backgroundColor: '#0f172a', borderRadius: 4, fontFamily: 'monospace', color: '#10b981', fontSize: 9 }}>{sdk.install}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'apikeys' && (
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: '#10b981', fontSize: 12 }}>🔑 DEVELOPER REST & WEBSOCKET API KEYS</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} style={{ padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
              <button onClick={handleCreateAPIKey} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#0f172a', fontWeight: 900, cursor: 'pointer', fontSize: 10 }}>Create API Key</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: 12 }}>⚓ HMAC SHA-256 SIGNED WEBHOOK DISPATCHER</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={testWebhookEvent} onChange={e => setTestWebhookEvent(e.target.value)} style={{ padding: 6, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }}>
              <option value="ORDER_EXECUTED">ORDER_EXECUTED</option>
              <option value="AI_SIGNAL_GENERATED">AI_SIGNAL_GENERATED</option>
              <option value="MARGIN_CALL">MARGIN_CALL</option>
            </select>
            <button onClick={handleDispatchTestWebhook} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', backgroundColor: '#f59e0b', color: '#0f172a', fontWeight: 900, cursor: 'pointer', fontSize: 10 }}>
              Dispatch Signed Test Webhook
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
