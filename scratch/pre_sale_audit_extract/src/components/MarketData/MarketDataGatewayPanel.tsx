import React, { useState, useEffect } from 'react';

export const MarketDataGatewayPanel: React.FC = () => {
  const [providers, setProviders] = useState<any[]>([]);
  const [activeRoute, setActiveRoute] = useState<string>('Rithmic Institutional');
  const [failoverActive, setFailoverActive] = useState<boolean>(false);
  const [rawSymbol, setRawSymbol] = useState<string>('6E');
  const [resolvedSymbol, setResolvedSymbol] = useState<string>('EURUSD');
  const [depthData, setDepthData] = useState<any>(null);

  const fetchStatus = () => {
    fetch('/api/provider/status')
      .then(res => res.json())
      .then(d => {
        setProviders(d.providers || []);
        setActiveRoute(d.active_route);
        setFailoverActive(d.failover_active);
      })
      .catch(() => {});
  };

  const fetchDepth = () => {
    fetch(`/api/provider/depth?symbol=${resolvedSymbol}`)
      .then(res => res.json())
      .then(d => setDepthData(d))
      .catch(() => {});
  };

  useEffect(() => {
    fetchStatus();
    fetchDepth();
    const interval = setInterval(() => {
      fetchStatus();
      fetchDepth();
    }, 2000);
    return () => clearInterval(interval);
  }, [resolvedSymbol]);

  const handleResolveSymbol = (input: string) => {
    setRawSymbol(input);
    fetch(`/api/provider/resolve-symbol?symbol=${input}`)
      .then(res => res.json())
      .then(d => setResolvedSymbol(d.canonical_symbol))
      .catch(() => {});
  };

  const toggleConnection = async (provId: string, currentConnected: boolean) => {
    const endpoint = currentConnected ? '/api/provider/disconnect' : '/api/provider/connect';
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: provId })
      });
      fetchStatus();
    } catch {}
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#090d16',
      color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, padding: 16, gap: 14, overflowY: 'auto'
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
            📡 INSTITUTIONAL MARKET DATA GATEWAY (v2.8)
          </span>
          <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
            Active Route: <strong style={{ color: '#38bdf8' }}>{activeRoute}</strong> {failoverActive && <span style={{ color: '#ef4444', fontWeight: 800 }}>[AUTO-FAILOVER ACTIVE]</span>}
          </div>
        </div>

        {/* Symbol Resolver Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#94a3b8' }}>Symbol Mapper:</span>
          <input
            type="text"
            value={rawSymbol}
            onChange={e => handleResolveSymbol(e.target.value)}
            placeholder="EURUSD.c / 6E / XBTUSD..."
            style={{ width: 140, padding: 5, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: 10 }}
          />
          <span style={{ padding: '3px 8px', borderRadius: 4, backgroundColor: '#1e293b', color: '#10b981', fontWeight: 800 }}>
            ➔ {resolvedSymbol}
          </span>
        </div>
      </div>

      {/* Providers Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {providers.map((prov) => (
          <div key={prov.id} style={{
            padding: 12, borderRadius: 6, backgroundColor: prov.is_active_route ? '#0f172a' : '#111827',
            border: prov.is_active_route ? '2px solid #38bdf8' : '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 6
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, fontSize: 12, color: prov.is_active_route ? '#38bdf8' : '#f8fafc' }}>
                {prov.name}
              </span>
              <span style={{
                padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 800,
                backgroundColor: prov.connected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: prov.connected ? '#10b981' : '#ef4444'
              }}>
                {prov.connected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, color: '#94a3b8', fontSize: 10 }}>
              <div>Latency: <strong style={{ color: prov.latency_ms < 50 ? '#10b981' : '#f59e0b' }}>{prov.latency_ms} ms</strong></div>
              <div>Packet Loss: <strong style={{ color: '#fff' }}>{prov.packet_loss_pct}%</strong></div>
              <div>Heartbeat: <strong>{prov.heartbeat_age_sec}s ago</strong></div>
              <div>Reconnects: <strong>{prov.reconnects}</strong></div>
            </div>

            <button
              onClick={() => toggleConnection(prov.id, prov.connected)}
              style={{
                marginTop: 4, padding: '4px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 800,
                backgroundColor: prov.connected ? '#1e293b' : '#10b981',
                color: prov.connected ? '#ef4444' : '#0f172a'
              }}
            >
              {prov.connected ? 'Disconnect Provider' : 'Connect Provider'}
            </button>
          </div>
        ))}
      </div>

      {/* Level 2 Market Depth Panel */}
      {depthData && (
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: '#f59e0b' }}>
            📊 INSTITUTIONAL LEVEL 2 MARKET DEPTH ({depthData.symbol} via {depthData.provider})
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Bids */}
            <div style={{ border: '1px solid #1e293b', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 800, padding: 6, textAlign: 'center' }}>
                BUY BIDS
              </div>
              {depthData.bids?.map((b: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid #1e293b', backgroundColor: idx === 0 ? 'rgba(16, 185, 129, 0.1)' : 'transparent' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>${b.price}</span>
                  <span>Size: {b.size}</span>
                  <span style={{ color: '#64748b' }}>({b.orders} orders)</span>
                </div>
              ))}
            </div>

            {/* Asks */}
            <div style={{ border: '1px solid #1e293b', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontWeight: 800, padding: 6, textAlign: 'center' }}>
                SELL ASKS
              </div>
              {depthData.asks?.map((a: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid #1e293b', backgroundColor: idx === 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>${a.price}</span>
                  <span>Size: {a.size}</span>
                  <span style={{ color: '#64748b' }}>({a.orders} orders)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
