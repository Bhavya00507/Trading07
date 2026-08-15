import React, { useState, useEffect } from 'react';

export const SmartOrderRouterPanel: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [workingOrders, setWorkingOrders] = useState<any[]>([]);
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState<number>(10.0);
  const [algoType, setAlgoType] = useState<string>('TWAP');
  const [visibleQty, setVisibleQty] = useState<number>(1.0);
  const [durationMin, setDurationMin] = useState<number>(15);

  const fetchRouterState = () => {
    fetch('/api/router/status')
      .then(res => res.json())
      .then(d => setMetrics(d))
      .catch(() => {});

    fetch('/api/router/orders')
      .then(res => res.json())
      .then(d => setWorkingOrders(d.active_orders || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchRouterState();
    const interval = setInterval(fetchRouterState, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStageAlgo = async () => {
    let endpoint = '/api/router/execute';
    let payload: any = { symbol, side, quantity, algo_type: algoType };

    if (algoType === 'TWAP') {
      endpoint = '/api/router/twap';
      payload = { symbol, side, total_quantity: quantity, duration_minutes: durationMin };
    } else if (algoType === 'VWAP') {
      endpoint = '/api/router/vwap';
      payload = { symbol, side, total_quantity: quantity };
    } else if (algoType === 'ICEBERG') {
      endpoint = '/api/router/iceberg';
      payload = { symbol, side, total_quantity: quantity, visible_quantity: visibleQty };
    }

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      fetchRouterState();
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
          <span style={{ fontWeight: 800, fontSize: 14, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚡ SMART ORDER ROUTER & INSTITUTIONAL EXECUTION ENGINE (v3.0)
          </span>
          <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
            Low-Latency Venue Routing | Sub-millisecond Execution | TWAP / VWAP / Iceberg / POV / Adaptive
          </div>
        </div>

        {metrics && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>SPEED</div>
              <div style={{ fontWeight: 800, color: '#10b981' }}>{metrics.average_routing_speed_ms} ms</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>SLIPPAGE</div>
              <div style={{ fontWeight: 800, color: '#38bdf8' }}>{metrics.average_slippage_bps} bps</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>FILL RATE</div>
              <div style={{ fontWeight: 800, color: '#f59e0b' }}>{metrics.fill_rate_pct}%</div>
            </div>
          </div>
        )}
      </div>

      {/* Algo Stager Form */}
      <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 12, color: '#f59e0b' }}>🎯 INSTITUTIONAL ALGORITHMIC STAGER</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 9 }}>Symbol:</label>
            <input type="text" value={symbol} onChange={e => setSymbol(e.target.value)} style={{ width: '100%', padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 9 }}>Side:</label>
            <select value={side} onChange={e => setSide(e.target.value as any)} style={{ width: '100%', padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }}>
              <option value="buy">BUY</option>
              <option value="sell">SELL</option>
            </select>
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 9 }}>Total Quantity:</label>
            <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} style={{ width: '100%', padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 9 }}>Execution Algo:</label>
            <select value={algoType} onChange={e => setAlgoType(e.target.value)} style={{ width: '100%', padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }}>
              <option value="TWAP">TWAP (Time-Weighted)</option>
              <option value="VWAP">VWAP (Volume-Weighted)</option>
              <option value="ICEBERG">Iceberg (Hidden Liquidity)</option>
              <option value="POV">POV (Percentage of Volume)</option>
              <option value="ADAPTIVE">Adaptive Smart Routing</option>
            </select>
          </div>

          {algoType === 'ICEBERG' && (
            <div>
              <label style={{ color: '#94a3b8', fontSize: 9 }}>Visible Qty:</label>
              <input type="number" value={visibleQty} onChange={e => setVisibleQty(Number(e.target.value))} style={{ width: '100%', padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
            </div>
          )}

          {algoType === 'TWAP' && (
            <div>
              <label style={{ color: '#94a3b8', fontSize: 9 }}>Duration (Mins):</label>
              <input type="number" value={durationMin} onChange={e => setDurationMin(Number(e.target.value))} style={{ width: '100%', padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={handleStageAlgo} style={{ width: '100%', padding: '6px', borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#0f172a', fontWeight: 900, cursor: 'pointer' }}>
              Stage Algo Execution
            </button>
          </div>
        </div>
      </div>

      {/* Active Working Algo Orders Table */}
      <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 12, color: '#38bdf8' }}>
          📋 ACTIVE ALGORITHMIC WORKING ORDERS ({workingOrders.length})
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr style={{ backgroundColor: '#111827', color: '#94a3b8', textAlign: 'left' }}>
              <th style={{ padding: 6 }}>Order ID</th>
              <th style={{ padding: 6 }}>Symbol</th>
              <th style={{ padding: 6 }}>Side</th>
              <th style={{ padding: 6 }}>Algo Type</th>
              <th style={{ padding: 6 }}>Progress (Filled / Total)</th>
              <th style={{ padding: 6 }}>Avg Price</th>
              <th style={{ padding: 6 }}>Venue</th>
              <th style={{ padding: 6 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {workingOrders.map((ord) => {
              const progressPct = Math.round((ord.filled_quantity / ord.quantity) * 100);
              return (
                <tr key={ord.order_id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: 6, fontWeight: 700 }}>{ord.order_id}</td>
                  <td style={{ padding: 6, color: '#f59e0b', fontWeight: 800 }}>{ord.symbol}</td>
                  <td style={{ padding: 6, color: ord.side === 'BUY' ? '#10b981' : '#ef4444', fontWeight: 800 }}>{ord.side}</td>
                  <td style={{ padding: 6, color: '#a78bfa', fontWeight: 700 }}>{ord.algo_type || 'MARKET'}</td>
                  <td style={{ padding: 6, width: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 6, backgroundColor: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', backgroundColor: '#10b981' }} />
                      </div>
                      <span style={{ fontSize: 9 }}>{ord.filled_quantity} / {ord.quantity} ({progressPct}%)</span>
                    </div>
                  </td>
                  <td style={{ padding: 6, fontWeight: 700 }}>${ord.average_fill_price}</td>
                  <td style={{ padding: 6, color: '#38bdf8' }}>{ord.venue}</td>
                  <td style={{ padding: 6 }}>
                    <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 800, backgroundColor: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                      {ord.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Venues Health Grid */}
      {metrics?.venues_health && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {metrics.venues_health.map((v: any, idx: number) => (
            <div key={idx} style={{ padding: 8, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontWeight: 800, color: '#cbd5e1' }}>{v.venue}</div>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>Latency: <strong style={{ color: '#10b981' }}>{v.latency_ms} ms</strong></div>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>Quality: <strong style={{ color: '#38bdf8' }}>{v.fill_quality}</strong></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
